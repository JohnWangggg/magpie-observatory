/* ==========================================================================
   Magpie Observatory — 额度预算 (budget bullets) view module.
   Standalone classic script: registers window.ObservatoryViews.budget.

   One row per account × window, riskiest first. Every row is a bullet chart:
   a 0–100 usage track, the translucent 70 / 88 threshold zones, the used bar
   (green / amber / red), and — when /v1/magpie/quotas/history carries the
   matching account + window — a cyan pace triangle (how much of the window
   has already elapsed) plus a dotted projection to the reset.
   ========================================================================== */
(function () {
  "use strict";

  const MAX_ROWS = 8;          // rows that fit the hero without scrolling forever
  const WARN = 70;             // amber threshold
  const HOT = 88;              // red threshold
  const EVEN = 4;              // |used - expected| below this reads as "on pace"
  const MIN_BAR = 2.5;         // px, so a used=1% row still shows something

  const HOSTS = new WeakMap();
  let selection = null;        // pinned row key, survives every data tick

  /* ------------------------------------------------------------- helpers --- */
  const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
  const pad2 = (n) => String(n).padStart(2, "0");
  const toneOf = (used) => (used >= HOT ? "red" : used >= WARN ? "amber" : "green");

  // Minutes until the window resets. `null` = a balance window that never
  // resets, so it reads "—" instead of a countdown.
  function countdown(min) {
    if (min == null || !isFinite(min)) return "—";
    if (min <= 0) return "重置中";
    if (min < 60) return Math.round(min) + "m";
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    if (h < 24) return h + "h" + (m ? pad2(m) : "");
    const d = Math.floor(h / 24), rh = h % 24;
    return d + "d" + (rh ? rh + "h" : "");
  }

  const norm = (v) => String(v == null ? "" : v).trim().toLowerCase();

  // Same account? Prefer the e-mail/login the gateway reports, fall back to the
  // account label when either side leaves `user` empty.
  function sameAccount(entry, q) {
    const eu = norm(entry.user), qu = norm(q.user);
    if (eu && qu) return eu === qu;
    return norm(entry.name) === norm(q.name);
  }

  function findLine(history, q, w) {
    const want = norm(w.name);
    for (const entry of history) {
      if (!entry || norm(entry.provider) !== norm(q.provider)) continue;
      if (!sameAccount(entry, q)) continue;
      for (const line of entry.lines || []) {
        if (line && norm(line.name) === want) return line;
      }
    }
    return null;
  }

  // Points that belong to the window in flight. The gateway stamps every point
  // with its window start, so that stamp is the reliable cut; when it is
  // missing, fall back to time — where the previous window can leave a point
  // exactly on the start stamp, so the later of the two is kept.
  function windowPoints(pts, last, startMs) {
    if (last.start) {
      const stamp = String(last.start);
      const win = pts.filter(p => p.start && String(p.start) === stamp);
      if (win.length >= 2) return win;
    }
    const win = pts.filter(p => Date.parse(p.at) >= startMs);
    while (win.length >= 2 && win[0].at === win[1].at) win.shift();
    return win;
  }

  // Pace from the history line of the window in flight: how far into the window
  // we are (`expected`) and where the current burn rate lands at the reset
  // (`projected`, allowed past 100 — that is the overspend).
  function paceOf(line, usedNow, nowMs) {
    const pts = ((line && line.points) || []).filter(p => p && p.at && isFinite(Number(p.left)));
    if (pts.length < 2) return null;
    const last = pts[pts.length - 1];
    const resetMs = last.resetsAt ? Date.parse(last.resetsAt) : NaN;
    const startMs = Date.parse(last.start || pts[0].at);
    if (!isFinite(resetMs) || !isFinite(startMs) || resetMs <= startMs) return null;
    const elapsed = Math.max(0, Math.min(1, (nowMs - startMs) / (resetMs - startMs)));
    const expected = elapsed * 100;

    // Burn rate over the window in flight only — averaging a previous reset's
    // fresh 100% back in would flatten the slope.
    const win = windowPoints(pts, last, startMs);
    const from = win.length ? win[0] : last;
    const hours = win.length >= 2 ? (Date.parse(last.at) - Date.parse(from.at)) / 3600000 : 0;
    const rate = hours > 0.1 ? Math.max(0, (num(from.left) - num(last.left)) / hours) : 0;
    const toResetH = Math.max(0, (resetMs - nowMs) / 3600000);
    return {
      expected,
      elapsed,
      rate,
      projected: usedNow + rate * toResetH,
      resetMs,
      toResetH,
      delta: usedNow - expected
    };
  }

  /* --------------------------------------------------------------- model --- */
  function buildModel(ctx) {
    const quotas = Array.isArray(ctx.quotas) ? ctx.quotas : [];
    const history = (ctx.data && ctx.data.quotaHistory) || [];
    const nowMs = Date.now();
    const pMeta = ctx.providerMeta || (() => ({ name: "", color: "" }));
    const pIcon = ctx.providerIcon || (() => "");
    const clampFn = ctx.clamp || ((v, a, b) => Math.max(a, Math.min(b, v)));

    const all = [];
    for (const q of quotas) {
      if (!q) continue;
      const meta = pMeta(q.provider);
      const wins = (Array.isArray(q.windows) && q.windows.length) ? q.windows : [{ name: "额度" }];
      for (const w of wins) {
        if (!w) continue;
        const raw = w.used == null ? 0 : num(w.used);
        const used = clampFn(raw, 0, 100);
        const resetsIn = w.resetsIn == null ? null : num(w.resetsIn);
        const line = findLine(history, q, w);
        const pace = paceOf(line, used, nowMs);
        const window = String(w.name == null || w.name === "" ? "额度" : w.name);
        all.push({
          key: norm(q.provider) + "|" + norm(q.user || q.name) + "|" + norm(window),
          provider: q.provider,
          providerName: meta.name || String(q.provider || ""),
          color: meta.color || "var(--accent)",
          icon: pIcon(q.provider),
          account: q.name || q.user || meta.name || "—",
          user: q.user || "",
          plan: q.plan || "",
          balance: q.balance == null || q.balance === "" ? null : q.balance,
          window,
          used,
          usedRaw: raw,
          resetsIn,
          resetLabel: countdown(resetsIn),
          resetSoon: resetsIn != null && resetsIn <= 60,
          pace,
          tone: toneOf(used),
          hist: !!(line && (line.points || []).length >= 2),
          line
        });
      }
    }

    // Riskiest first: fullest window, then the one that resets soonest.
    all.sort((a, b) =>
      (b.used - a.used) ||
      ((a.resetsIn == null ? Infinity : a.resetsIn) - (b.resetsIn == null ? Infinity : b.resetsIn)) ||
      a.account.localeCompare(b.account) ||
      a.window.localeCompare(b.window));

    const rows = all.slice(0, MAX_ROWS);
    const head = rows.reduce((s, r) => s + (100 - r.used), 0);
    const paced = rows.filter(r => r.pace);
    return {
      rows,
      total: all.length,
      hidden: all.length - rows.length,
      empty: !rows.length,
      atRisk: rows.filter(r => r.used >= WARN).length,
      hot: rows.filter(r => r.used >= HOT).length,
      over: paced.filter(r => r.pace.projected >= 100).length,
      paced: paced.length,
      headroom: rows.length ? head / rows.length : 0,
      noPace: rows.filter(r => !r.pace).length
    };
  }

  function signature(m, ctx) {
    return [
      m.empty ? "e" : "d", m.total, selection || "", ctx.motion || "full",
      Math.round(Date.now() / 60000),
      m.rows.map(r => [
        r.key, r.used, r.resetsIn == null ? "n" : r.resetsIn, r.balance || "",
        r.pace ? r.pace.expected.toFixed(1) : "-",
        r.pace ? Math.round(r.pace.projected) : "-"
      ].join(",")).join("|")
    ].join("~");
  }

  /* --------------------------------------------------------------- shell --- */
  function stateFor(host) {
    let st = HOSTS.get(host);
    if (!st) {
      st = { host, root: null, rows: null, side: null, tip: null, ro: null, raf: 0, sig: null, model: null, ctx: null, entered: false };
      HOSTS.set(host, st);
    }
    return st;
  }

  function mount(host, st) {
    host.innerHTML = "";
    const root = document.createElement("div");
    root.className = "budget-root";
    root.innerHTML =
      '<div class="budget-main">' +
        '<div class="budget-cols" aria-hidden="true">' +
          "<span>账号</span><span>用量 / 阈值</span><span>余量</span>" +
        "</div>" +
        '<div class="budget-rows"></div>' +
      "</div>" +
      '<aside class="budget-side" aria-label="预算面板"></aside>' +
      '<div class="budget-tip" role="tooltip" hidden></div>';
    host.appendChild(root);
    st.root = root;
    st.rows = root.querySelector(".budget-rows");
    st.side = root.querySelector(".budget-side");
    st.tip = root.querySelector(".budget-tip");
    bind(st);
    if (typeof ResizeObserver === "function" && !st.ro) {
      // The bullet is drawn in real pixels; a width change only needs a redraw.
      st.ro = new ResizeObserver(() => { if (st.model) draw(st); });
      st.ro.observe(host);
      st.ro.observe(st.rows);
    }
  }

  function bind(st) {
    const root = st.root;
    root.addEventListener("pointermove", (e) => {
      const row = e.target && e.target.closest ? e.target.closest(".budget-row") : null;
      if (!row) { hideTip(st); return; }
      const rect = root.getBoundingClientRect();
      showTip(st, row, e.clientX - rect.left, e.clientY - rect.top);
    });
    root.addEventListener("pointerleave", () => hideTip(st));
    root.addEventListener("focusin", (e) => {
      const row = e.target && e.target.closest ? e.target.closest(".budget-row") : null;
      if (!row) return;
      const rect = root.getBoundingClientRect();
      const b = row.getBoundingClientRect();
      showTip(st, row, b.left + b.width / 2 - rect.left, b.top - rect.top + 6);
    });
    root.addEventListener("focusout", () => hideTip(st));
    root.addEventListener("click", (e) => {
      const row = e.target && e.target.closest ? e.target.closest(".budget-row") : null;
      if (!row) return;
      const r = st.model && st.model.rows[Number(row.dataset.bi)];
      if (!r) return;
      selection = selection === r.key ? null : r.key;
      if (st.ctx) render(st.host, st.ctx);
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && selection) {
        selection = null;
        if (st.ctx) render(st.host, st.ctx);
        return;
      }
      if (e.key !== "Enter" && e.key !== " ") return;
      const row = e.target && e.target.closest ? e.target.closest(".budget-row") : null;
      if (!row) return;
      e.preventDefault();
      const r = st.model && st.model.rows[Number(row.dataset.bi)];
      if (!r) return;
      selection = selection === r.key ? null : r.key;
      if (st.ctx) render(st.host, st.ctx);
    });
  }

  /* ------------------------------------------------------------- tooltip --- */
  function pctText(v) {
    if (v == null || !isFinite(v)) return "—";
    return Math.round(v) + "%";
  }

  function paceText(pace) {
    if (!pace) return "无节奏数据";
    const d = pace.delta;
    if (Math.abs(d) <= EVEN) return "基本同步 " + (d >= 0 ? "+" : "") + d.toFixed(1) + "pt";
    return (d > 0 ? "超前 +" : "落后 ") + d.toFixed(1) + "pt";
  }

  function showTip(st, row, x, y) {
    const m = st.model;
    if (!m || !st.tip) return;
    const r = m.rows[Number(row.dataset.bi)];
    if (!r) { hideTip(st); return; }
    const ctx = st.ctx || {};
    const esc = ctx.esc || ((v) => String(v == null ? "" : v));
    const clampFn = ctx.clamp || ((v, a, b) => Math.max(a, Math.min(b, v)));
    st.tip.innerHTML =
      "<b>" + esc(r.providerName) + " · " + esc(r.account) + "</b>" +
      "<span>窗口 <b>" + esc(r.window) + "</b>" + (r.plan ? " · " + esc(r.plan) : "") +
      (r.balance ? " · 余额 <b>" + esc(r.balance) + "</b>" : "") + "</span>" +
      "<span>用量 <b>" + pctText(r.used) + "</b> · 节奏 <b>" + esc(paceText(r.pace)) + "</b></span>" +
      "<span>重置时预计 <b>" + (r.pace ? pctText(r.pace.projected) : "—") + "</b></span>" +
      "<span>重置 <b>" + esc(r.resetLabel) + "</b>" +
      (r.pace ? " · 期望 " + r.pace.expected.toFixed(0) + "%" : "") + "</span>";
    st.tip.hidden = false;
    const rect = st.root.getBoundingClientRect();
    // The tip is centred above the pointer: keep its measured height inside the
    // stage so the first row's tooltip is not clipped away.
    const minTop = st.tip.offsetHeight * 1.18 + 2;
    st.tip.style.left = clampFn(x, 116, Math.max(116, rect.width - 116)) + "px";
    st.tip.style.top = clampFn(y - 14, minTop, Math.max(minTop, rect.height - 8)) + "px";
  }

  function hideTip(st) { if (st.tip && !st.tip.hidden) st.tip.hidden = true; }

  /* --------------------------------------------------------------- paint --- */
  function rowHTML(r, i, st) {
    const esc = (st.ctx && st.ctx.esc) || ((v) => String(v == null ? "" : v));
    const sel = selection === r.key;
    const dim = !!selection && !sel;
    const tags =
      '<span class="budget-tags">' +
        (r.plan ? '<span class="budget-tag budget-plan">' + esc(r.plan) + "</span>" : "") +
        '<span class="budget-tag budget-win">' + esc(r.window) + "</span>" +
        (r.balance ? '<span class="budget-tag budget-bal">' + esc(r.balance) + "</span>" : "") +
      "</span>";
    const nums =
      '<div class="budget-nums">' +
        '<b class="budget-used budget-c-' + r.tone + '">' + pctText(r.used) + "</b>" +
        (r.pace
          ? '<span class="budget-end">重置 ' + pctText(r.pace.projected) + "</span>"
          : '<span class="budget-nopace">无节奏</span>') +
        '<span class="budget-reset' + (r.resetSoon ? " is-soon" : "") + '">' + esc(r.resetLabel) + "</span>" +
      "</div>";
    const label = r.providerName + " " + r.account + " " + r.window + " 用量 " + pctText(r.used) +
      (r.pace ? " 重置时预计 " + pctText(r.pace.projected) : " 无节奏数据") + " 重置 " + r.resetLabel;
    return '<div class="budget-row budget-t-' + r.tone + (sel ? " is-sel" : "") + (dim ? " is-dim" : "") +
      '" data-bi="' + i + '" tabindex="0" style="--i:' + i + '" aria-label="' + esc(label) + '">' +
        '<div class="budget-who">' +
          '<span class="budget-ic"><img src="' + esc(r.icon) + '" alt="" loading="lazy"></span>' +
          '<span class="budget-copy">' +
            '<b class="budget-acct">' + esc(r.account) + "</b>" +
            tags +
          "</span>" +
        "</div>" +
        '<div class="budget-bullet">' +
          '<div class="budget-tlabel">' +
            '<span class="budget-tmark" style="left:' + WARN + '%">' + WARN + "</span>" +
            '<span class="budget-tmark" style="left:' + HOT + '%">' + HOT + "</span>" +
          "</div>" +
          '<svg class="budget-svg" role="img" aria-label="' + esc(label) + '"></svg>' +
        "</div>" +
        nums +
      "</div>";
  }

  const fmt1 = (v) => (Math.round(v * 10) / 10).toFixed(1);

  // Drawn in real pixels so the 1px ticks, the triangle and the dotted
  // projection keep their weight at any row width.
  function bullet(r, w, h, clampFn) {
    // Vertical budget: the pace triangle on top, the usage track, the dotted
    // projection line underneath — all in real pixels, so it scales with `h`.
    const barH = Math.max(6, Math.min(11, Math.round(h * 0.42)));
    const projY = h - 2;
    const bottom = Math.max(barH + 4, projY - 3);
    const y = bottom - barH;
    const rx = fmt1(barH / 2);
    const x70 = w * WARN / 100, x88 = w * HOT / 100;
    const usedW = r.used <= 0 ? 0 : Math.max(MIN_BAR, w * r.used / 100);
    let out = '<rect class="budget-track" x="0.5" y="' + fmt1(y) + '" width="' + fmt1(w - 1) +
      '" height="' + fmt1(barH) + '" rx="' + rx + '"/>';
    out += '<rect class="budget-zone budget-zone-a" x="' + fmt1(x70) + '" y="' + fmt1(y) +
      '" width="' + fmt1(x88 - x70) + '" height="' + fmt1(barH) + '" rx="' + rx + '"/>';
    out += '<rect class="budget-zone budget-zone-b" x="' + fmt1(x88) + '" y="' + fmt1(y) +
      '" width="' + fmt1(w - x88 - 0.5) + '" height="' + fmt1(barH) + '" rx="' + rx + '"/>';
    if (usedW > 0) {
      out += '<rect class="budget-bar budget-fill-' + r.tone + '" x="0.5" y="' + fmt1(y) +
        '" width="' + fmt1(usedW) + '" height="' + fmt1(barH) + '" rx="' + rx + '"/>';
    }
    [WARN, HOT].forEach(v => {
      const x = fmt1(w * v / 100);
      out += '<line class="budget-tickline" x1="' + x + '" y1="' + fmt1(y - 2) + '" x2="' + x +
        '" y2="' + fmt1(bottom + 2) + '"/>';
    });
    if (r.pace) {
      const px = clampFn(w * r.pace.expected / 100, 2, w - 2);
      const apex = y - 0.5, baseY = Math.max(0.5, apex - 6);
      out += '<polygon class="budget-pace" points="' + fmt1(px - 4.5) + "," + fmt1(baseY) + " " +
        fmt1(px + 4.5) + "," + fmt1(baseY) + " " + fmt1(px) + "," + fmt1(apex) + '"/>';
      const from = usedW > 0 ? usedW : 0.5;
      const to = clampFn(w * r.pace.projected / 100, from, w - 1.5);
      if (to - from > 1) {
        out += '<line class="budget-proj" x1="' + fmt1(from) + '" y1="' + fmt1(projY) + '" x2="' +
          fmt1(to) + '" y2="' + fmt1(projY) + '"/>';
        out += '<polygon class="budget-proj-head" points="' + fmt1(to - 3.4) + "," + fmt1(projY - 2.6) +
          " " + fmt1(to) + "," + fmt1(projY) + " " + fmt1(to - 3.4) + "," + fmt1(projY + 2.6) + '"/>';
      }
    }
    return out;
  }

  // A scrollbar or a late layout pass can settle after paint; one extra frame
  // redraws the bullets at the width that actually landed.
  function scheduleDraw(st) {
    if (st.raf || typeof requestAnimationFrame !== "function") return;
    st.raf = requestAnimationFrame(() => {
      st.raf = 0;
      if (st.model) draw(st);
    });
  }

  function draw(st) {
    const m = st.model;
    if (!st.rows || !m) return;
    const ctx = st.ctx || {};
    const clampFn = ctx.clamp || ((v, a, b) => Math.max(a, Math.min(b, v)));
    const els = st.rows.querySelectorAll(".budget-row");
    for (let i = 0; i < els.length; i++) {
      const r = m.rows[i];
      const svg = els[i].querySelector(".budget-svg");
      if (!r || !svg) continue;
      const w = Math.round(svg.clientWidth || 0);
      const h = Math.round(svg.clientHeight || 0);
      if (!(w > 40) || !(h > 9)) { svg.removeAttribute("viewBox"); svg.innerHTML = ""; continue; }
      svg.setAttribute("viewBox", "0 0 " + w + " " + h);
      svg.setAttribute("preserveAspectRatio", "none");
      svg.classList.toggle("is-over", !!r.pace && r.pace.projected >= 100);
      svg.innerHTML = bullet(r, w, h, clampFn);
    }
  }

  function sideEmpty(ctx) {
    return '<div class="budget-empty">' +
      '<svg viewBox="0 0 76 34" aria-hidden="true">' +
        '<rect x="4" y="6" width="68" height="8" rx="4"/>' +
        '<rect x="4" y="6" width="30" height="8" rx="4" class="budget-empty-fill"/>' +
        '<rect x="4" y="20" width="68" height="8" rx="4"/>' +
        '<rect x="4" y="20" width="52" height="8" rx="4" class="budget-empty-fill"/>' +
      "</svg>" +
      "<b>还没有可换算的额度窗口</b>" +
      "<span>这个视图读取 <code>/v1/magpie/quotas</code>：每个账号 × 窗口一行，" +
      "用量条 0–100%，70 / 88 是阈值，青色三角是从 <code>/quotas/history</code> 推算的节奏。" +
      "网关不返回额度时这里保持为空。</span>" +
      "</div>";
  }

  function statHTML(label, value, note, tone) {
    return '<div class="budget-stat' + (tone ? " budget-s-" + tone : "") + '">' +
      "<span>" + label + "</span>" +
      "<b>" + value + "</b>" +
      "<small>" + note + "</small>" +
      "</div>";
  }

  function sideHTML(m) {
    const legend =
      '<div class="budget-legend">' +
        '<span class="budget-key"><i class="budget-sw-track"></i>轨道 0–100%</span>' +
        '<span class="budget-key"><i class="budget-sw-used"></i>已用（绿/琥珀/红）</span>' +
        '<span class="budget-key"><i class="budget-sw-zone"></i>阈值 70 / 88</span>' +
        '<span class="budget-key"><i class="budget-sw-pace"></i>节奏标记</span>' +
        (m.paced ? '<span class="budget-key"><i class="budget-sw-proj"></i>重置投影</span>' : "") +
      "</div>";
    const note = m.paced
      ? "节奏 = 窗口已流逝的比例；用量条越过三角说明烧得比时间快。" +
        (m.noPace ? "没有历史曲线的窗口不画三角。" : "")
      : "网关未提供 <code>/quotas/history</code>，暂不推算节奏与重置投影。";
    return '<div class="budget-side-title">BUDGET</div>' +
      '<div class="budget-sum">' +
        statHTML("窗口", String(m.rows.length), m.hidden ? "另有 " + m.hidden + " 个未显示" : "共 " + m.total + " 个") +
        statHTML("风险", String(m.atRisk), m.hot ? m.hot + " 个已达 88%" : "用量 ≥ 70% 的窗口",
          m.hot ? "red" : m.atRisk ? "amber" : "green") +
        statHTML("平均余量", Math.round(m.headroom) + "%", "距 100% 的平均余量") +
        statHTML("预计越界", String(m.over), m.paced ? "重置前会打满的窗口" : "缺少历史曲线",
          m.over ? "red" : "green") +
      "</div>" + legend +
      '<p class="budget-note">' + note + "</p>";
  }

  function paint(st, m, ctx) {
    const root = st.root;
    root.dataset.motion = ctx.motion || "full";
    root.classList.toggle("is-empty", !!m.empty);
    // Entrance only on the first paint of this host — every later tick would
    // otherwise replay the stagger. The class is dropped once the stagger is
    // over, so a later SVG-only redraw cannot restart it.
    const enter = !st.entered && (ctx.motion || "full") !== "off";
    root.classList.toggle("budget-enter", enter);
    clearTimeout(st.enterTimer);
    if (enter) st.enterTimer = setTimeout(() => root.classList.remove("budget-enter"), 1400);
    st.entered = true;

    if (m.empty) {
      st.rows.innerHTML = "";
      st.side.innerHTML = sideEmpty(ctx);
      hideTip(st);
      return;
    }

    st.rows.innerHTML = m.rows.map((r, i) => rowHTML(r, i, st)).join("");
    st.side.innerHTML = sideHTML(m);
    draw(st);
    scheduleDraw(st);
  }

  /* ---------------------------------------------------------------- api --- */
  function render(host, ctx) {
    ctx = ctx || {};
    const st = stateFor(host);
    if (!st.root) mount(host, st);
    st.host = host;
    st.ctx = ctx;
    const m = buildModel(ctx);
    const sig = signature(m, ctx);
    if (sig === st.sig && st.model) return;
    st.sig = sig;
    st.model = m;
    paint(st, m, ctx);
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["budget"] = {
    title: "额度预算",
    eyebrow: "BUDGET BULLETS",
    render
  };
})();
