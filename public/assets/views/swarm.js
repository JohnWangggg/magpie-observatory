/* ==========================================================================
   Magpie Observatory — hero view module: latency swarm (ridgeline beeswarm)
   Standalone classic script. Registers window.ObservatoryViews["swarm"].
   x = TTFT (first-token latency, ms), y = one lane per provider,
   dot area = output tokens, colour = provider brand, stroke = request status.
   ========================================================================== */
(function () {
  "use strict";

  const OTHER = "__other__";
  const TOP_N = 5;
  const MAX_ROWS = 80;
  const PAD = { l: 84, r: 22, t: 14, b: 32 };
  const MIN_H = 120;
  const LANE_PAD = 4;
  const STATUS_TEXT = { ok: "完成", err: "失败", run: "运行中", retry: "重试" };

  // Per-host UI state (focus / hover / last signature) lives in closures, never global.
  const states = new WeakMap();

  function num(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }

  // Primary metric: TTFT. `0` and null both mean "unknown" (no first token yet,
  // or the ledger only kept the round trip), never a real 0 ms sample.
  // Rows that only carry `ms` fall back to an estimated first-token latency.
  function ttftOf(row) {
    if (!row) return { real: 0, est: 0 };
    const real = num(row.ttft);
    if (real) return { real: real, est: 0 };
    const ms = num(row.ms);
    return { real: 0, est: ms ? ms * 0.35 : 0 };
  }

  function quantile(sorted, q) {
    if (!sorted.length) return 0;
    if (sorted.length === 1) return sorted[0];
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  function fmtMs(v) {
    const n = Math.round(num(v));
    if (n < 10000) return n + "ms";
    return (n / 1000).toFixed(1) + "s";
  }

  function fmtCount(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }

  function niceStep(raw) {
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const mult = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return mag * mult;
  }

  // 3–4 ticks on the ms axis, all of them round numbers.
  function axisPlan(max) {
    const mag0 = Math.pow(10, Math.floor(Math.log10(Math.max(1, max / 4))));
    const candidates = [0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100].map(m => mag0 * m);
    for (let i = 0; i < candidates.length; i++) {
      const step = candidates[i];
      const count = Math.ceil(max / step);
      if (count >= 3 && count <= 4) return { step: step, count: count, xMax: step * count };
    }
    const step = max / 3;
    return { step: step, count: 3, xMax: max };
  }

  function buildModel(ctx) {
    const logs = Array.isArray(ctx.logs) ? ctx.logs : [];
    const meta = k => ctx.providerMeta(k);

    const rows = [];
    logs.slice(0, MAX_ROWS).forEach((row, i) => {
      const lat = ttftOf(row);
      const ttft = lat.real || lat.est;
      if (ttft <= 0) return;
      rows.push({
        row: row, i: i, ttft: ttft, est: !lat.real, provider: row.provider || "unknown", tokens: num(row.tokens)
      });
    });

    const counts = new Map();
    rows.forEach(r => counts.set(r.provider, (counts.get(r.provider) || 0) + 1));
    const ranked = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
    const topKeys = ranked.slice(0, TOP_N).map(x => x[0]);
    const topSet = new Set(topKeys);

    const lanes = topKeys.map(key => ({
      key: key, name: meta(key).name, color: meta(key).color, folded: false, pts: []
    }));
    let fold = null;
    rows.forEach(r => {
      let lane = null;
      if (topSet.has(r.provider)) lane = lanes.find(l => l.key === r.provider);
      else {
        if (!fold) {
          fold = { key: OTHER, name: "其他", color: "", folded: true, pts: [] };
          lanes.push(fold);
        }
        lane = fold;
      }
      lane.pts.push(r);
      r.lane = lane;
    });

    let maxTokens = 1;
    lanes.forEach(l => l.pts.forEach(p => { maxTokens = Math.max(maxTokens, p.tokens); }));

    const allReal = rows.filter(r => !r.est);
    const estCount = rows.length - allReal.length;
    lanes.forEach(l => {
      const real = l.pts.filter(p => !p.est);
      // Estimated points only stand in when the lane has no real TTFT at all.
      const src = (real.length ? real : l.pts).map(p => p.ttft).sort((a, b) => a - b);
      l.count = l.pts.length;
      l.estCount = l.pts.length - real.length;
      l.estimated = !real.length && l.estCount > 0;
      l.median = quantile(src, 0.5);
      l.p90 = quantile(src, 0.9);
      l.worst = src.length ? src[src.length - 1] : 0;
    });

    const providers = ranked.length;
    const statSrc = (allReal.length ? allReal : rows).map(r => r.ttft).sort((a, b) => a - b);
    // The x axis spans every plotted dot, including estimated ones.
    const maxTtft = rows.reduce((a, r) => Math.max(a, r.ttft), 1);
    return {
      rows: rows, lanes: lanes, maxTokens: maxTokens,
      total: rows.length, providers: providers, logCount: logs.length,
      estCount: estCount, estimated: !allReal.length && estCount > 0,
      median: quantile(statSrc, 0.5), p90: quantile(statSrc, 0.9), axis: axisPlan(maxTtft)
    };
  }

  function ensureState(host) {
    let st = states.get(host);
    if (!st) { st = { focus: null, sig: "", geom: [], ctx: null, ro: null }; states.set(host, st); }
    return st;
  }

  function applyLanes(host, st) {
    const board = host.firstElementChild;
    if (!board) return;
    Array.from(board.querySelectorAll("[data-lane]")).forEach(el => {
      const on = st.focus != null && st.focus === el.dataset.lane;
      el.classList.toggle("swarm-on", on);
      el.classList.toggle("swarm-fade", st.focus != null && !on);
    });
    Array.from(board.querySelectorAll(".swarm-row")).forEach(el => {
      el.classList.toggle("is-on", st.focus != null && el.dataset.p === st.focus);
      el.setAttribute("aria-pressed", el.dataset.p === st.focus ? "true" : "false");
    });
  }

  function setHot(host, st, key) {
    const board = host.firstElementChild;
    if (!board) return;
    Array.from(board.querySelectorAll(".swarm-lane")).forEach(el => {
      el.classList.toggle("swarm-hot", key != null && el.dataset.lane === key);
    });
  }

  function emptyHtml(m) {
    return '<div class="swarm-empty">' +
      '<b>蜂群还没有足够的首字延迟样本</b>' +
      '<span>点按 TTFT（首 token 延迟）布点。TTFT 只在首个 token 真正到达时写入账本，排队中、路由重试或未开始流式输出的请求不会带这个值。</span>' +
      '<span>等账本再积累几条带 TTFT 的请求（≥3 条），这里就会自动长出泳道、P50 / P90 参考线和点群。</span>' +
      '<span class="swarm-empty-note">当前日志 ' + fmtCount(m.logCount) + ' 条 · 可用样本 ' + m.total + ' 条</span>' +
      '</div>';
  }

  function laneMarkup(lane, idx, geom, ctx) {
    const top = geom.laneTop[idx], bottom = top + geom.laneH;
    const cy = top + geom.laneH / 2;
    const xOf = geom.xOf;
    const labelY = cy + 3.4;
    const color = lane.folded ? "var(--muted)" : lane.color;

    let out = '<g class="swarm-lane' + (lane.folded ? " swarm-folded" : "") + '" data-lane="' + ctx.esc(lane.key) + '">' +
      '<rect class="swarm-lane-bg" x="' + PAD.l + '" y="' + top.toFixed(1) + '" width="' + geom.innerW.toFixed(1) +
      '" height="' + geom.laneH.toFixed(1) + '" rx="8"/>' +
      '<text class="swarm-lane-label" x="' + (PAD.l - 12) + '" y="' + labelY.toFixed(1) + '" text-anchor="end">' +
      ctx.esc(lane.name) + '</text>' +
      '<text class="swarm-lane-count" x="' + (PAD.l - 12) + '" y="' + (labelY + 11).toFixed(1) + '" text-anchor="end">' +
      lane.count + ' 次</text>';

    const p50x = xOf(lane.median), p90x = xOf(lane.p90);
    const estMark = lane.estimated ? "≈" : "";
    const refColor = lane.folded ? "var(--muted)" : color;
    if (p50x > 0) {
      out += '<line class="swarm-ref swarm-ref-p50" style="--c:' + refColor + '" x1="' + p50x.toFixed(1) +
        '" y1="' + top.toFixed(1) + '" x2="' + p50x.toFixed(1) + '" y2="' + bottom.toFixed(1) + '"/>' +
        '<text class="swarm-tag swarm-tag-p50" x="' + (p50x + 3).toFixed(1) + '" y="' + (top + 9.5).toFixed(1) + '">' +
        estMark + 'P50 ' + fmtMs(lane.median) + '</text>';
    }
    if (p90x > 0 && p90x !== p50x) {
      out += '<line class="swarm-ref swarm-ref-p90" style="--c:' + refColor + '" x1="' + p90x.toFixed(1) +
        '" y1="' + top.toFixed(1) + '" x2="' + p90x.toFixed(1) + '" y2="' + bottom.toFixed(1) + '"/>' +
        '<text class="swarm-tag swarm-tag-p90" x="' + (p90x + 3).toFixed(1) + '" y="' + (bottom - 3.5).toFixed(1) + '">' +
        estMark + 'P90 ' + fmtMs(lane.p90) + '</text>';
    }
    out += '</g>';

    // Dots sit in their own layer so lane hover rects never swallow pointer events.
    out += '<g class="swarm-pts" data-lane="' + ctx.esc(lane.key) + '">';
    lane.pts.forEach((p, j) => {
      const r = 2.6 + Math.sqrt(p.tokens / geom.maxTokens) * 5.2;
      const jitter = Math.sin(p.i * 12.9898) * 0.42 * geom.laneH;
      const y = ctx.clamp(cy + jitter, top + LANE_PAD + 2, bottom - LANE_PAD - 2);
      const x = xOf(p.ttft);
      const fill = lane.folded ? ctx.providerMeta(p.provider).color : lane.color;
      const extra = ' fill="' + fill + '" style="--i:' + j + '"';
      out += '<circle class="swarm-pt swarm-st-' + ctx.esc(p.row.status || "ok") + (p.est ? ' swarm-pt-est' : '') + '"' +
        ' data-gi="' + geom.dots.length + '" r="' + r.toFixed(2) + '" cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '"' + extra + '/>';
      geom.dots.push({
        x: x, y: y, r: r, row: p.row, ttft: p.ttft, est: p.est, provider: p.provider, lane: lane.key,
        name: lane.folded ? ctx.providerMeta(p.provider).name : lane.name
      });
    });
    out += '</g>';
    return out;
  }

  function svgMarkup(m, geom, ctx) {
    const axis = geom.axis;
    let out = '<svg class="swarm-svg" width="' + geom.w + '" height="' + geom.h + '" aria-label="延迟蜂群：TTFT 分布">';

    // Vertical grid + axis labels (ms).
    for (let i = 1; i <= axis.count; i++) {
      const v = axis.step * i;
      const x = geom.xOf(v);
      if (x > geom.w - 4) continue;
      out += '<line class="swarm-grid" x1="' + x.toFixed(1) + '" y1="' + PAD.t + '" x2="' + x.toFixed(1) + '" y2="' + (geom.h - PAD.b).toFixed(1) + '"/>' +
        '<text class="swarm-axis-tick" x="' + x.toFixed(1) + '" y="' + (geom.h - PAD.b + 14) + '" text-anchor="middle">' + fmtMs(v) + '</text>';
    }
    out += '<line class="swarm-axis" x1="' + PAD.l + '" y1="' + (geom.h - PAD.b).toFixed(1) + '" x2="' + (geom.w - PAD.r).toFixed(1) + '" y2="' + (geom.h - PAD.b).toFixed(1) + '"/>';
    out += '<text class="swarm-axis-title" x="' + (geom.w - PAD.r) + '" y="' + (geom.h - PAD.b + 14) + '" text-anchor="end">首 token 延迟 →</text>';
    out += '<line class="swarm-baseline" x1="' + PAD.l + '" y1="' + PAD.t + '" x2="' + PAD.l + '" y2="' + (geom.h - PAD.b).toFixed(1) + '"/>';

    m.lanes.forEach((lane, idx) => { out += laneMarkup(lane, idx, geom, ctx); });
    out += '</svg>';
    return out;
  }

  function tableRows(m, ctx) {
    return m.lanes.map(lane => {
      const icon = lane.folded ? "" :
        '<img src="' + ctx.esc(ctx.providerIcon(lane.key)) + '" alt="">';
      const dotCls = lane.folded ? "swarm-dot swarm-dot-fold" : "swarm-dot";
      const style = lane.folded ? "" : ' style="--c:' + lane.color + '"';
      const est = lane.estimated ? "≈" : "";
      return '<button type="button" class="swarm-row" data-p="' + ctx.esc(lane.key) + '" aria-pressed="false" title="' +
        ctx.esc(lane.name) + ' · ' + lane.count + ' 次 · P50 ' + fmtMs(lane.median) + ' · P90 ' + fmtMs(lane.p90) +
        (lane.estimated ? ' · 估计值（该提供商暂无真实 TTFT）' : '') + '">' +
        '<span class="' + dotCls + '"' + style + '></span>' +
        '<span class="swarm-prov">' + icon + '<b>' + ctx.esc(lane.name) + '</b></span>' +
        '<span class="swarm-cell">' + lane.count + '</span>' +
        '<span class="swarm-cell">' + est + fmtMs(lane.median) + '</span>' +
        '<span class="swarm-cell">' + est + fmtMs(lane.p90) + '</span>' +
        '<span class="swarm-cell swarm-worst">' + est + fmtMs(lane.worst) + '</span>' +
        '</button>';
    }).join("");
  }

  function boardMarkup(m, ctx, still) {
    const foldCount = m.lanes.filter(l => l.folded).length;
    return '<div class="swarm-board' + (still ? "" : " swarm-anim") + '" data-focus="">' +
      '<div class="swarm-main">' +
        '<div class="swarm-head"><span><b>LATENCY SWARM</b> · 首 token 延迟蜂群</span>' +
        '<span>' + m.total + ' 个样本 · ' + fmtCount(m.logCount) + ' 条日志 · 点面积 = tokens' +
          (m.estCount ? ' · ' + m.estCount + ' 个估计' : '') + '</span></div>' +
        '<div class="swarm-plot"></div>' +
      '</div>' +
      '<aside class="swarm-side">' +
        '<div class="swarm-side-head"><span><b>LATENCY SWARM</b></span><span>TTFT · ' + m.total + ' 样本</span></div>' +
        '<div class="swarm-stats">' +
          '<div class="swarm-stat"><span>请求</span><b>' + m.total + '</b><small>带 TTFT 的样本</small></div>' +
          '<div class="swarm-stat"><span>提供商</span><b>' + m.providers + '</b><small>' + m.lanes.length + ' 条泳道' +
            (foldCount ? ' · 含合并' : '') + '</small></div>' +
          '<div class="swarm-stat"><span>中位 TTFT</span><b>' + (m.estimated ? "≈" : "") + fmtMs(m.median) + '</b><small>' +
            (m.estimated ? "P50 · 估计" : "P50") + '</small></div>' +
          '<div class="swarm-stat"><span>P90 TTFT</span><b>' + (m.estimated ? "≈" : "") + fmtMs(m.p90) + '</b><small>' +
            (m.estimated ? "长尾 · 估计" : "长尾") + '</small></div>' +
        '</div>' +
        '<div class="swarm-table">' +
          '<div class="swarm-row swarm-row-head"><span></span><span>提供商</span><span>请求</span><span>P50</span><span>P90</span><span>最差</span></div>' +
          tableRows(m, ctx) +
        '</div>' +
        '<div class="swarm-legend">' +
          '<span><i class="swarm-key swarm-key-err"></i>失败</span>' +
          '<span><i class="swarm-key swarm-key-retry"></i>重试</span>' +
          (m.estCount ? '<span><i class="swarm-key swarm-key-est"></i>估计（无 TTFT）</span>' : '') +
          '<span class="swarm-legend-note">竖线 = P50 / P90 · 点击行可聚焦泳道</span>' +
        '</div>' +
      '</aside>' +
    '</div>' +
    '<div class="swarm-tip" hidden></div>';
  }

  function layout(host, st, m, ctx) {
    const plot = host.querySelector(".swarm-plot");
    if (!plot) return;
    const w = plot.clientWidth || host.clientWidth;
    const h = plot.clientHeight || host.clientHeight;
    if (w < 60 || h < MIN_H) { st.geom = []; plot.innerHTML = '<div class="swarm-plot-pending"></div>'; return; }

    const laneH = Math.max(18, (h - PAD.t - PAD.b) / Math.max(1, m.lanes.length));
    const innerW = Math.max(20, w - PAD.l - PAD.r);
    const axis = m.axis;
    const geom = {
      w: w, h: h, innerW: innerW, laneH: laneH, axis: axis, dots: [], maxTokens: m.maxTokens,
      laneTop: m.lanes.map((l, i) => PAD.t + laneH * i),
      xOf: v => PAD.l + Math.min(1, Math.max(0, v / axis.xMax)) * innerW
    };
    plot.innerHTML = svgMarkup(m, geom, ctx);
    st.geom = geom.dots;
    applyLanes(host, st);
  }

  function bind(host, st, m, ctx) {
    const plot = host.querySelector(".swarm-plot");
    const tip = host.querySelector(".swarm-tip");
    const board = host.querySelector(".swarm-board");
    if (!plot || !tip || !board) return;

    plot.addEventListener("pointermove", e => {
      const box = host.getBoundingClientRect();
      const plotBox = plot.getBoundingClientRect();
      const px = e.clientX - plotBox.left, py = e.clientY - plotBox.top;
      let best = null, bestD = Infinity;
      for (let i = 0; i < st.geom.length; i++) {
        const d = st.geom[i];
        const dist = Math.hypot(d.x - px, d.y - py);
        if (dist <= d.r + 6 && dist < bestD) { bestD = dist; best = d; }
      }
      if (!best) { tip.hidden = true; setHot(host, st, null); return; }
      const row = best.row;
      const tps = num(row.tps);
      const status = row.status || "ok";
      tip.innerHTML = '<b>' + ctx.esc(row.model || "—") + '</b>' +
        '<span>' + ctx.esc(best.name) + ' · TTFT ' + fmtMs(best.ttft) + (best.est ? ' · est' : '') + '</span>' +
        '<span>' + (tps ? Math.round(tps) + ' TPS' : 'TPS —') + ' · ' + ctx.esc(ctx.fmtTokens(row.tokens || 0)) + ' tokens</span>' +
        '<span class="swarm-tip-status swarm-st-' + ctx.esc(status) + '">' + ctx.esc(STATUS_TEXT[status] || status) +
        (num(row.cost) ? ' · ' + ctx.esc(ctx.fmtMoney(row.cost)) : '') + '</span>';
      tip.hidden = false;
      const lx = ctx.clamp(e.clientX - box.left, 76, Math.max(76, box.width - 76));
      const ly = ctx.clamp(e.clientY - box.top - 14, 56, host.clientHeight - 8);
      tip.style.left = lx + "px";
      tip.style.top = ly + "px";
      setHot(host, st, best.lane);
    });
    plot.addEventListener("pointerleave", () => { tip.hidden = true; setHot(host, st, null); });

    Array.from(board.querySelectorAll(".swarm-row")).forEach(el => {
      if (el.classList.contains("swarm-row-head")) return;
      const key = el.dataset.p;
      el.addEventListener("mouseenter", () => setHot(host, st, key));
      el.addEventListener("mouseleave", () => setHot(host, st, null));
      el.addEventListener("focus", () => setHot(host, st, key));
      el.addEventListener("blur", () => setHot(host, st, null));
      el.addEventListener("click", () => {
        st.focus = st.focus === key ? null : key;
        board.dataset.focus = st.focus || "";
        applyLanes(host, st);
      });
    });
  }

  function render(host, ctx) {
    if (!host) return;
    ctx = ctx || {};
    const st = ensureState(host);
    st.ctx = ctx;
    const motion = ctx.motion || "full";
    const reduced = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const still = motion === "off" || reduced;

    const m = buildModel(ctx);
    const rowsSig = m.rows.map(r => r.row.id + ":" + r.row.status + ":" + r.row.tokens + ":" + r.ttft).join("|");
    const sig = [m.lanes.length, m.total, ctx.logs ? ctx.logs.length : 0, rowsSig,
      host.clientWidth, host.clientHeight, still ? "s" : "m"].join("~");

    if (!m.lanes.length || m.total < 3) {
      if (st.sig === "empty~" + sig && host.firstChild) return;
      st.sig = "empty~" + sig;
      st.geom = [];
      host.innerHTML = emptyHtml(m);
      return;
    }

    if (st.sig === sig && host.firstChild) return;
    st.sig = sig;
    if (st.focus && !m.lanes.some(l => l.key === st.focus)) st.focus = null;

    host.innerHTML = boardMarkup(m, ctx, still);
    host.querySelector(".swarm-board").dataset.focus = st.focus || "";
    layout(host, st, m, ctx);
    bind(host, st, m, ctx);

    // The hero stage can be display:none / zero-width on first paint; re-layout
    // when it becomes visible instead of waiting for the next data tick.
    if (!st.ro && typeof ResizeObserver === "function") {
      st.ro = new ResizeObserver(() => { st.sig = ""; render(host, st.ctx); });
      st.ro.observe(host);
    }
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["swarm"] = {
    title: "延迟蜂群",
    eyebrow: "LATENCY SWARM",
    render: render
  };
})();
