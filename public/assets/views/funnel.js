/* ==========================================================================
   Magpie Observatory — 请求漏斗 (request funnel) view module.
   Standalone classic script. Registers window.ObservatoryViews["funnel"].

   Four stages — 发出请求 → 未取消 → 首字到达 → 成功 — drawn as a centred column
   of trapezoids, each one carrying its count and its share of the stage above.
   Every stage is clamped to the stage above it, so the funnel never widens;
   inputs that had to be clamped (or that came from the ledger sample) are
   reported in the side panel instead of being silently smoothed away.
   ========================================================================== */
(function () {
  "use strict";

  const HOSTS = new WeakMap();

  const STAGES = [
    { cn: "发出请求", en: "CALLS ISSUED" },
    { cn: "未取消", en: "NOT CANCELED" },
    { cn: "首字到达", en: "FIRST TOKEN" },
    { cn: "成功", en: "SUCCEEDED" }
  ];
  const REASONS = ["取消", "无首字", "失败"];   // why each boundary drops
  const BAND_MIN = 0.16;    // narrowest band, so a collapsed funnel stays readable
  const TIP = 0.76;         // the funnel mouth drawn under the last stage
  const RING_MAX = 24;      // reach samples kept per host

  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const has = (v) => v != null && v !== "" && isFinite(Number(v));
  const frac = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);
  const fmtCount = (v) => Math.round(num(v)).toLocaleString("en-US");

  function pctText(v) {
    if (!(v > 0)) return "0%";
    if (v < 0.1) return "<0.1%";
    if (v > 99.95) return "100%";
    return v.toFixed(1) + "%";
  }

  /* --------------------------------------------------------------- model --- */
  // A metric the usage totals do not carry yet falls back to the ledger sample,
  // scaled to the call total (the ledger is a sample, not the whole day).
  function metric(kpiVal, led, scale) {
    if (has(kpiVal)) return { v: Math.max(0, Math.round(num(kpiVal))), est: false };
    return { v: Math.max(0, Math.round(led * scale)), est: scale !== 1 };
  }

  function buildModel(ctx) {
    const kpis = ctx.kpis || {};
    const logs = ctx.logs || [];
    const demo = !!(ctx.data && ctx.data.mode === "demo");
    const fromTotals = has(kpis.calls) || has(kpis.requests);
    const calls = Math.max(0, Math.round(has(kpis.calls) ? num(kpis.calls)
      : has(kpis.requests) ? num(kpis.requests) : logs.length));
    const scale = fromTotals && logs.length > 0 && calls > logs.length ? calls / logs.length : 1;
    const scaled = scale !== 1;

    let ledErr = 0, ledRetry = 0, ledTimed = 0, ledCanceled = 0;
    for (let i = 0; i < logs.length; i++) {
      const r = logs[i];
      if (r.status === "err") ledErr++;
      else if (r.status === "retry") ledRetry++;
      if (r.status === "canceled" || r.status === "cancelled" || r.status === "abort") ledCanceled++;
      if (num(r.ttft) > 0) ledTimed++;
    }
    const canceled = metric(kpis.canceled, ledCanceled, scale);
    const errors = metric(kpis.errors, ledErr, scale);
    const timed = metric(kpis.timed, ledTimed, scale);
    const retried = metric(kpis.retried, ledRetry, scale);

    const raw = [
      calls,                          // 发出请求
      calls - canceled.v,             // 未取消
      timed.v,                        // 首字到达
      calls - errors.v - canceled.v   // 成功
    ];

    const values = [];
    const notes = [];
    for (let i = 0; i < raw.length; i++) {
      let v = raw[i];
      if (v < 0) {
        notes.push({ kind: "clamp", text: STAGES[i].cn + " 算出负数（" + fmtCount(raw[i]) + "），按 0 计" });
        v = 0;
      }
      if (i > 0 && v > values[i - 1]) {
        notes.push({
          kind: "clamp",
          text: STAGES[i].cn + " " + fmtCount(v) + " 高于上一级 " + fmtCount(values[i - 1]) + "，已收敛"
        });
        v = values[i - 1];
      }
      values.push(v);
    }

    const base = values[0];
    const stages = STAGES.map((s, i) => {
      const w = base > 0 ? values[i] / base : 0;
      return {
        cn: s.cn,
        en: s.en,
        i: i,
        value: values[i],
        raw: raw[i],
        share: frac(values[i], base),
        ofPrev: i ? frac(values[i], values[i - 1]) : 100,
        w: Math.max(BAND_MIN, w),
        floored: w < BAND_MIN,
        clamped: values[i] !== Math.max(0, raw[i]),
        est: i === 1 ? canceled.est : i === 2 ? timed.est : i === 3 ? (errors.est || canceled.est) : false
      };
    });

    const drops = [];
    for (let k = 0; k < STAGES.length - 1; k++) {
      const from = stages[k], to = stages[k + 1];
      const count = Math.max(0, from.value - to.value);
      drops.push({ i: k, reason: REASONS[k], from: from.cn, to: to.cn, count: count, pct: frac(count, from.value) });
    }
    let big = drops[0];
    for (let k = 1; k < drops.length; k++) {
      if (drops[k].count > big.count || (drops[k].count === big.count && drops[k].pct > big.pct)) big = drops[k];
    }

    if (scaled) {
      notes.push({
        kind: "est",
        text: "取消 / 错误 / 首字 / 重试 取自账本样本（" + logs.length + " 条），按总量等比放大"
      });
    }

    const success = stages[3].value;
    return {
      empty: base <= 0,
      demo: demo,
      calls: calls,
      canceled: canceled,
      errors: errors,
      timed: timed,
      retried: retried,
      stages: stages,
      drops: drops,
      big: big,
      notes: notes,
      scaled: scaled,
      success: success,
      reachRate: frac(success, base),
      errRate: frac(errors.v, base),
      source: scaled ? "总量来自用量统计 · 子口径按账本等比放大"
        : fromTotals ? "实时用量总计"
        : "账本样本 " + logs.length + " 条"
    };
  }

  // Reach-rate history: one sample per real change, so the sparkline only ever
  // shows movement that actually happened (never a synthesised series).
  function pushRing(st, m) {
    const last = st.ring[st.ring.length - 1];
    if (last && last.calls === m.calls && Math.abs(last.rate - m.reachRate) <= 0.005) return;
    st.ring.push({ calls: m.calls, rate: m.reachRate });
    if (st.ring.length > RING_MAX) st.ring.shift();
  }

  function signature(m, st, ctx) {
    if (m.empty) return "e~" + (ctx.motion || "full") + "~" + (m.demo ? 1 : 0);
    return [
      m.calls, m.canceled.v, m.errors.v, m.timed.v, m.retried.v,
      m.stages.map((s) => s.value).join(","),
      m.notes.length, st.ring.length, ctx.motion || "full"
    ].join("~");
  }

  /* --------------------------------------------------------------- shell --- */
  function stateFor(host) {
    let st = HOSTS.get(host);
    if (!st) {
      st = {
        root: null, tip: null, bands: null, rail: null, side: null, foot: null, chart: null,
        model: null, ctx: null, host: null, sig: null,
        hot: null, timer: null, entered: false, motion: null, ring: []
      };
      HOSTS.set(host, st);
    }
    return st;
  }

  function mount(host, st) {
    host.innerHTML = "";
    const root = document.createElement("div");
    root.className = "funnel-root";
    root.innerHTML =
      '<div class="funnel-main">' +
        '<div class="funnel-chart">' +
          '<div class="funnel-bands" role="list" aria-label="请求漏斗阶段"></div>' +
          '<div class="funnel-rail" role="list" aria-label="各阶段流失"></div>' +
        "</div>" +
        '<div class="funnel-foot"></div>' +
      "</div>" +
      '<aside class="funnel-side" aria-label="漏斗指标"></aside>' +
      '<div class="funnel-tip" role="tooltip" hidden></div>';
    host.appendChild(root);
    st.root = root;
    st.tip = root.querySelector(".funnel-tip");
    st.bands = root.querySelector(".funnel-bands");
    st.rail = root.querySelector(".funnel-rail");
    st.side = root.querySelector(".funnel-side");
    st.foot = root.querySelector(".funnel-foot");
    st.chart = root.querySelector(".funnel-chart");
    bind(root, st);
  }

  function bandIndex(el) {
    const band = el && el.closest ? el.closest(".funnel-band") : null;
    return band ? Number(band.dataset.i) : null;
  }

  function bind(root, st) {
    root.addEventListener("pointermove", (e) => {
      const i = bandIndex(e.target);
      if (i == null || !st.model || st.model.empty) { clearHot(st); return; }
      const r = root.getBoundingClientRect();
      if (st.hot !== i) applyHot(st, i);
      showTip(st, i, e.clientX - r.left, e.clientY - r.top);
    });
    root.addEventListener("pointerleave", () => { clearHot(st); hideTip(st); });
    root.addEventListener("focusin", (e) => {
      const i = bandIndex(e.target);
      if (i == null || !st.model || st.model.empty) return;
      applyHot(st, i);
      const r = root.getBoundingClientRect();
      const b = e.target.getBoundingClientRect();
      showTip(st, i, b.left + b.width / 2 - r.left, b.top + b.height * 0.42 - r.top);
    });
    root.addEventListener("focusout", () => { clearHot(st); hideTip(st); });
  }

  function applyHot(st, i) {
    st.hot = i;
    if (!st.chart) return;
    st.chart.classList.toggle("is-hot", i != null);
    let n = st.bands.children.length;
    for (let k = 0; k < n; k++) {
      const el = st.bands.children[k];
      el.classList.toggle("is-hot", Number(el.dataset.i) === i);
    }
    n = st.rail.children.length;
    for (let k = 0; k < n; k++) {
      const el = st.rail.children[k];
      el.classList.toggle("is-hot", Number(el.dataset.i) === i);
      el.classList.toggle("is-dim", i != null && Number(el.dataset.i) !== i);
    }
  }

  function clearHot(st) {
    if (st.hot == null) return;
    applyHot(st, null);
  }

  function showTip(st, i, x, y) {
    const m = st.model;
    if (!m || m.empty || !st.tip) { hideTip(st); return; }
    const s = m.stages[i];
    if (!s) { hideTip(st); return; }
    const ctx = st.ctx || {};
    const esc = ctx.esc || ((v) => String(v == null ? "" : v));
    const clamp = ctx.clamp || ((n, a, b) => Math.max(a, Math.min(b, n)));
    const prev = i > 0 ? m.stages[i - 1] : null;
    const drop = prev ? Math.max(0, prev.value - s.value) : 0;
    st.tip.innerHTML =
      "<b>" + esc(s.cn) + " · " + esc(s.en) + "</b>" +
      "<span>" + esc(fmtCount(s.value)) + (s.est ? " ≈" : "") + " 次 · 占总量 <b>" + pctText(s.share) + "</b></span>" +
      "<span>" + (prev
        ? "较上一级 " + (drop > 0
          ? "<b>−" + esc(fmtCount(drop)) + "（" + pctText(frac(drop, prev.value)) + "）</b>"
          : "<b>持平</b>")
        : "漏斗入口 · 全部 <b>" + esc(fmtCount(m.calls)) + "</b> 次请求") + "</span>" +
      (s.clamped ? "<span>已按上一级收敛（原始 <b>" + esc(fmtCount(s.raw)) + "</b>）</span>" : "");
    st.tip.hidden = false;
    const r = st.root.getBoundingClientRect();
    st.tip.style.left = clamp(x, 106, Math.max(106, r.width - 106)) + "px";
    st.tip.style.top = clamp(y - 12, 34, Math.max(34, r.height - 6)) + "px";
  }

  function hideTip(st) { if (st.tip && !st.tip.hidden) st.tip.hidden = true; }

  /* --------------------------------------------------------------- paint --- */
  function bandHTML(m, ctx, s, i) {
    const esc = ctx.esc || ((v) => String(v == null ? "" : v));
    const last = i === m.stages.length - 1;
    const bot = last ? s.w * TIP : m.stages[i + 1].w;
    const clip = "polygon(" +
      (50 - s.w * 50).toFixed(2) + "% 0, " +
      (50 + s.w * 50).toFixed(2) + "% 0, " +
      (50 + bot * 50).toFixed(2) + "% 100%, " +
      (50 - bot * 50).toFixed(2) + "% 100%)";
    const prev = i ? m.stages[i - 1] : null;
    const drop = prev ? Math.max(0, prev.value - s.value) : 0;
    const flag = s.clamped ? '<u class="funnel-flag is-clamp">已收敛</u>'
      : s.est ? '<u class="funnel-flag is-est">≈ 估算</u>' : "";
    const aria = s.cn + " " + fmtCount(s.value) + " 次，占总量 " + pctText(s.share) +
      (prev ? "，较上一级 " + (drop > 0 ? "减少 " + fmtCount(drop) + "（" + pctText(frac(drop, prev.value)) + "）" : "持平") : "");

    return '<div class="funnel-band' + (s.floored ? " is-floored" : "") + '" data-i="' + i + '" role="listitem"' +
      ' tabindex="0" aria-label="' + esc(aria) + '" style="--i:' + i + '">' +
      '<span class="funnel-shape" style="clip-path:' + clip + '"></span>' +
      '<span class="funnel-band-label">' +
        "<b>" + esc(fmtCount(s.value)) + "</b>" +
        "<small><em>" + esc(s.cn) + "</em><i>· " + pctText(s.ofPrev) + "</i>" + flag + "</small>" +
      "</span>" +
    "</div>";
  }

  function dropHTML(ctx, d, k) {
    const esc = ctx.esc || ((v) => String(v == null ? "" : v));
    const zero = d.count <= 0;
    const text = d.from + " → " + d.to;
    return '<div class="funnel-drop' + (zero ? " is-zero" : "") + '" data-i="' + k + '" role="listitem"' +
      ' style="--i:' + k + ";top:" + ((k + 1) * 25) + '%"' +
      ' title="' + esc(text + " · " + d.reason + " " + (zero ? "0" : "−" + fmtCount(d.count)) + " · " + pctText(d.pct)) + '">' +
      "<b>" + (zero ? "持平" : "−" + esc(fmtCount(d.count))) + "</b>" +
      "<small>" + pctText(d.pct) + " · " + esc(d.reason) + "</small>" +
    "</div>";
  }

  function footHTML(m, ctx) {
    const esc = ctx.esc || ((v) => String(v == null ? "" : v));
    return '<span class="funnel-foot-flow">' +
        m.stages.map((s) => esc(fmtCount(s.value))).join(" → ") + "</span>" +
      '<span class="funnel-foot-src">' + esc(m.source) + "</span>";
  }

  function sideEmpty(ctx) {
    const esc = ctx.esc || ((v) => String(v == null ? "" : v));
    return '<span class="funnel-side-title">' + esc("FUNNEL") + "</span>" +
      '<p class="funnel-side-note">暂无请求。<br>' +
      "漏斗读取实时用量总计（calls / canceled / errors / timed / retried），" +
      "演示模式下用账本样本按总量等比换算。</p>";
  }

  function sparkHTML(ring) {
    if (!ring || ring.length < 2) return "";
    const w = 56, h = 16;
    const vals = ring.map((p) => p.rate);
    let min = vals[0], max = vals[0];
    for (let i = 1; i < vals.length; i++) {
      if (vals[i] < min) min = vals[i];
      if (vals[i] > max) max = vals[i];
    }
    const span = Math.max(0.0001, max - min);
    let pts = "";
    for (let i = 0; i < vals.length; i++) {
      pts += (i ? " " : "") + ((i / (vals.length - 1)) * w).toFixed(1) + "," +
        (h - 2 - ((vals[i] - min) / span) * (h - 4)).toFixed(1);
    }
    const d = vals[vals.length - 1] - vals[vals.length - 2];
    const cls = d < -0.005 ? "is-down" : d > 0.005 ? "is-up" : "";
    return '<span class="funnel-spark">' +
        '<svg viewBox="0 0 ' + w + " " + h + '" preserveAspectRatio="none" aria-hidden="true">' +
          '<polyline points="' + pts + '"/>' +
        "</svg>" +
        '<span class="' + cls + '">' + (d >= 0 ? "+" : "") + d.toFixed(2) + "pp</span>" +
      "</span>";
  }

  function sideHTML(m, ctx, ring) {
    const esc = ctx.esc || ((v) => String(v == null ? "" : v));
    const big = m.big;
    const notes = m.notes.map((n) =>
      '<p class="funnel-note' + (n.kind === "est" ? " is-est" : "") + '">' + esc(n.text) + "</p>").join("");

    return '<span class="funnel-side-title">' + esc("FUNNEL") + "</span>" +
      '<div class="funnel-stats">' +
        '<div class="funnel-stat"><span>请求总数</span><b>' + esc(fmtCount(m.calls)) + "</b><small>CALLS</small></div>" +
        '<div class="funnel-stat is-good"><span>成功率</span><b>' + pctText(m.reachRate) + "</b>" +
          "<small>" + esc(fmtCount(m.success)) + " 次到达</small>" + sparkHTML(ring) + "</div>" +
        '<div class="funnel-stat is-bad"><span>错误率</span><b>' + pctText(m.errRate) + "</b>" +
          "<small>" + esc(fmtCount(m.errors.v)) + " 次失败</small></div>" +
        '<div class="funnel-stat funnel-stat-2"><span>取消</span><b>' + esc(fmtCount(m.canceled.v)) + "</b><small>CANCELED</small></div>" +
        '<div class="funnel-stat funnel-stat-2"><span>改道重试</span><b>' + esc(fmtCount(m.retried.v)) + "</b>" +
          '<small><i class="funnel-chip">不计失败</i></small></div>' +
        '<div class="funnel-stat funnel-stat-2"><span>首字到达</span><b>' + esc(fmtCount(m.timed.v)) + (m.timed.est ? " ≈" : "") + "</b><small>TIMED</small></div>" +
      "</div>" +
      '<div class="funnel-facts">' +
        '<div class="funnel-big">' +
          "<span>最大流失</span>" +
          '<span class="funnel-big-row">' +
            "<b>" + esc(big.count > 0 ? big.reason : "无流失") + "</b>" +
            (big.count > 0 ? "<em>−" + esc(fmtCount(big.count)) + "</em><small>" + pctText(big.pct) + "</small>" : "") +
          "</span>" +
          '<small class="funnel-big-path">' + esc(big.from + " → " + big.to) + "</small>" +
        "</div>" +
        (notes ? '<div class="funnel-notes">' + notes + "</div>" : "") +
        '<p class="funnel-side-note">每级不得高于上一级，被收敛的口径记在上方；改道重试算成功路径，不算失败。</p>' +
      "</div>";
  }

  function emptyHTML(ctx, m) {
    const esc = ctx.esc || ((v) => String(v == null ? "" : v));
    const src = m.demo
      ? "演示模式下先用账本样本按总量等比换算。"
      : "子口径缺失时会退回账本样本。";
    return '<div class="funnel-empty">' +
        '<svg viewBox="0 0 64 40" aria-hidden="true">' +
          '<path d="M5 7h54L33 21v13h-2V21z"/>' +
          '<path d="M5 7h54l-7 5H12z"/>' +
        "</svg>" +
        "<b>" + esc("还没有请求进入漏斗") + "</b>" +
        "<span>" + esc("漏斗读取实时用量总计（calls / canceled / errors / timed / retried），从发出请求一路收窄到成功；" + src) +
        "网关写入请求后这里会立即展开。</span>" +
      "</div>";
  }

  function paint(st, m, ctx) {
    const root = st.root;
    root.dataset.motion = ctx.motion || "full";
    root.classList.toggle("is-empty", !!m.empty);

    if (m.empty) {
      st.bands.innerHTML = emptyHTML(ctx, m);
      st.rail.innerHTML = "";
      st.foot.innerHTML = "";
      st.side.innerHTML = sideEmpty(ctx);
      hideTip(st);
      return;
    }

    st.bands.innerHTML = m.stages.map((s, i) => bandHTML(m, ctx, s, i)).join("");
    st.rail.innerHTML = m.drops.map((d, k) => dropHTML(ctx, d, k)).join("");
    st.foot.innerHTML = footHTML(m, ctx);
    st.side.innerHTML = sideHTML(m, ctx, st.ring);
    applyHot(st, st.hot);
    hideTip(st);
  }

  /* ---------------------------------------------------------------- api --- */
  function render(host, ctx) {
    if (!host) return;
    ctx = ctx || {};
    const st = stateFor(host);
    st.host = host;
    st.ctx = ctx;
    if (!st.root || !host.contains(st.root)) {
      mount(host, st);
      st.sig = null;
      st.entered = false;
      st.hot = null;
    }

    const motion = ctx.motion || "full";
    const model = buildModel(ctx);
    if (!model.empty) pushRing(st, model);
    const sig = signature(model, st, ctx);
    if (sig === st.sig) return;
    st.sig = sig;

    if (motion !== st.motion) st.entered = false;
    st.motion = motion;
    st.model = model;
    paint(st, model, ctx);

    const still = !model.empty && !st.entered && motion !== "off";
    st.root.classList.toggle("funnel-enter", still);
    if (still) {
      clearTimeout(st.timer);
      st.timer = setTimeout(() => st.root.classList.remove("funnel-enter"), 700 + model.stages.length * 110);
    }
    st.entered = true;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["funnel"] = { title: "请求漏斗", eyebrow: "REQUEST FUNNEL", render: render };
})();
