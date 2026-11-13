/* ==========================================================================
   Magpie Observatory — 流量河流 (provider streamgraph) view module.
   Standalone classic script: registers window.ObservatoryViews.stream.

   Every data snapshot appends one column to a per-host ring buffer (40 max):
   x = snapshot, y = the tokens that provider moved in that snapshot, stacked
   by provider and drawn as smooth bands — a river whose width is the routed
   volume. A Δ comes from the cumulative `data.models` totals (now − previous);
   when those never move (the demo snapshot is fixed) there is no poll delta to
   draw, so the column falls back to summing the ledger rows for that snapshot.
   The first snapshot of a cumulative stream has no baseline at all and lands as
   an empty `seed` column; a Δ stream that went quiet lands as `idle` (Δ 0).
   One caveat is left in `accumulate`: at the moment the source switches from
   ledger sums to poll deltas the older, differently-scaled rows are dropped.
   `Horizon` swaps the river for one normalised band per provider, stacked as
   rows; both modes share the same buffer and hover column.
   ========================================================================== */
(function () {
  "use strict";

  const MAX_ROWS = 40;          // snapshots kept; the oldest column is dropped
  const LABEL_EVERY = 8;        // a time label roughly every 8 columns
  const COL_MIN = 14;           // px per column before the plot scrolls sideways
  const TOP_TIP = 3;            // providers listed in the tooltip
  const GRID = 4;               // horizontal grid lines in Stream mode
  const ROW_GAP = 8;            // gap between Horizon rows
  const TENSION = 0.9;          // cardinal spline tension for the band edges
  const PAD_STREAM = { l: 50, r: 20, t: 14, b: 22 };
  const PAD_HORIZON = { l: 112, r: 20, t: 14, b: 22 };
  const FALLBACK_COLOR = "#8b7cf6";

  const HOSTS = new WeakMap();  // per-host ring buffer + hover / mode state

  /* ------------------------------------------------------------- helpers --- */
  function num(v) { const n = Number(v); return isFinite(n) ? n : 0; }
  function plain(v) { return String(v == null ? "" : v); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function clock(ms) {
    const d = new Date(num(ms));
    return pad2(d.getHours()) + ":" + pad2(d.getMinutes()) + ":" + pad2(d.getSeconds());
  }
  function age(ms) {
    const s = Math.max(0, Math.round((Date.now() - num(ms)) / 1000));
    if (s < 60) return s + "s 前";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m" + pad2(s % 60) + "s 前";
    return Math.floor(m / 60) + "h" + pad2(m % 60) + "m 前";
  }
  function count(n) {
    return String(Math.round(num(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function trim(v, d) { return String(Number(v.toFixed(d))); }
  // Compact token labels come from ctx.fmtTokens; the local copy only keeps a
  // bare harness (or a host without the shared formatter) readable.
  function tokens(v, ctx) {
    const n = num(v);
    if (ctx && typeof ctx.fmtTokens === "function") return ctx.fmtTokens(n);
    if (n >= 1e9) return trim(n / 1e9, 2) + "B";
    if (n >= 1e6) return trim(n / 1e6, n >= 1e7 ? 1 : 2) + "M";
    if (n >= 1e3) return trim(n / 1e3, n >= 1e4 ? 0 : 1) + "K";
    return String(Math.round(n));
  }
  // Only colours that came from the provider map may reach a style attribute.
  function color(v) {
    const s = plain(v).trim();
    return /^#[0-9a-f]{3,8}$/i.test(s) ? s : FALLBACK_COLOR;
  }
  // Rough glyph width (CJK/full-width ≈ 1em, latin ≈ 0.56em): enough to clip a
  // provider name into the Horizon gutter without measuring the DOM.
  function textW(str, size) {
    const s = plain(str);
    let w = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      w += (c >= 0x2e80 && c <= 0xa4cf) || (c >= 0xac00 && c <= 0xd7a3) ||
           (c >= 0xf900 && c <= 0xfaff) || (c >= 0xfe30 && c <= 0xfe6f) ||
           (c >= 0xff00 && c <= 0xff60) ? size : size * 0.56;
    }
    return w;
  }
  function clip(str, maxW, size) {
    const s = plain(str);
    if (textW(s, size) <= maxW) return s;
    let out = "";
    for (let i = 0; i < s.length; i++) {
      if (textW(out + s[i] + "…", size) > maxW) break;
      out += s[i];
    }
    return out + "…";
  }
  // Axis ceiling: the next 1 / 1.5 / 2 / 2.5 / 3 / 4 / 5 / 7.5 / 10 step.
  function niceMax(v) {
    v = num(v);
    if (v <= 0) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / mag;
    const step = f <= 1 ? 1 : f <= 1.5 ? 1.5 : f <= 2 ? 2 : f <= 2.5 ? 2.5 :
                 f <= 3 ? 3 : f <= 4 ? 4 : f <= 5 ? 5 : f <= 7.5 ? 7.5 : 10;
    return step * mag;
  }
  function tot(map) {
    let t = 0;
    for (const k in map) t += num(map[k]);
    return t;
  }

  /* ---------------------------------------------------------------- state --- */
  function stateFor(host) {
    let st = HOSTS.get(host);
    if (!st) {
      st = {
        host: host, ctx: null, root: null, scroll: null, pane: null, svg: null, hotG: null,
        tip: null, cap: null, legend: null, side: null, empty: null, segBtns: [],
        rows: [], cum: null, lastKey: null, calib: "ledger", src: "ledger", version: 0,
        sig: null, mode: "stream", hover: null, dims: null, model: null,
        entered: false, timer: null, ro: null
      };
      HOSTS.set(host, st);
    }
    return st;
  }

  /* -------------------------------------------------------------- snapshot --- */
  // Snapshot identity: the live fetch stamp plus the newest ledger id. Demo data
  // moves neither, so the KPI counters join the key — they tick with every
  // simulated request, which is what keeps the river moving while a page stays
  // open. A second render of the same snapshot therefore never doubles a column.
  function keyOf(ctx) {
    const d = (ctx.data || {});
    const logs = ctx.logs || [];
    const k = ctx.kpis || d.kpis || {};
    return [num(d.fetchedAt), logs.length ? plain(logs[0] && logs[0].id) : "",
      Math.round(num(k.tokens)), Math.round(num(k.requests))].join("|");
  }

  function providerOf(ctx, model, provider) {
    let p = "";
    if (typeof ctx.providerOfModel === "function") p = plain(ctx.providerOfModel(model, provider));
    if (!p) p = plain(provider).toLowerCase().trim();
    return p || "unknown";
  }

  // Tokens a provider has routed over the whole period (cumulative counters).
  function cumulative(ctx, out) {
    const models = (ctx.data && ctx.data.models) || [];
    for (let i = 0; i < models.length; i++) {
      const m = models[i];
      if (!m) continue;
      const k = providerOf(ctx, m.name, m.provider);
      out[k] = (out[k] || 0) + num(m.tokens);
    }
    return out;
  }

  // Tokens carried by the ledger rows of this snapshot alone.
  function ledger(ctx, out) {
    const logs = ctx.logs || [];
    for (let i = 0; i < logs.length; i++) {
      const row = logs[i];
      if (!row) continue;
      const k = providerOf(ctx, row.model, row.provider);
      out[k] = (out[k] || 0) + num(row.tokens);
    }
    return out;
  }

  // Sources of one column. `delta` and `idle` are poll-to-poll differences;
  // `ledger` is the per-snapshot sum of the visible ledger; `seed` is the first
  // snapshot of a cumulative stream, which has no baseline to diff against and
  // therefore carries no tokens rather than a whole period's total.
  const SRC_TEXT = {
    delta: "models 累计差值",
    idle: "本快照无新增 token",
    ledger: "账本逐行求和",
    seed: "基线列 · 尚无快照可比较"
  };

  function accumulate(st, ctx) {
    const key = keyOf(ctx);
    if (key === st.lastKey) return;
    st.lastKey = key;

    const baseline = st.cum;
    const cum = cumulative(ctx, {});
    let values = null, moved = 0;
    if (baseline) {
      values = {};
      for (const k in cum) {
        const d = Math.max(0, num(cum[k]) - num(baseline[k]));
        if (d > 0) { values[k] = d; moved += d; }
      }
    }
    st.cum = cum;

    let src;
    if (moved > 0) src = "delta";
    else if (baseline && st.calib === "delta") src = "idle";       // a Δ stream gone quiet
    else if (baseline && tot(cum) > 0) src = "ledger";             // cumulative counters frozen
    else if (!baseline && tot(cum) > 0) src = "seed";              // first cumulative snapshot
    else src = "ledger";                                          // no cumulative counters at all
    if (src === "ledger") values = ledger(ctx, {});
    else if (!values) values = {};

    if (src === "delta" && st.calib !== "delta") {
      // A ledger window sum is a different unit than a poll delta, so the rows
      // collected in it are dropped at the switch: one such column would
      // otherwise dwarf every poll delta after it.
      for (let i = st.rows.length - 1; i >= 0; i--) if (st.rows[i].src === "ledger") st.rows.splice(i, 1);
      st.calib = "delta";
    }

    st.rows.push({ at: Date.now(), key: key, values: values, total: tot(values), src: src });
    if (st.rows.length > MAX_ROWS) st.rows.splice(0, st.rows.length - MAX_ROWS);
    st.src = src;
    st.version++;
  }

  /* ---------------------------------------------------------------- model --- */
  function buildModel(st, ctx) {
    const rows = st.rows;
    const n = rows.length;
    const meta = { name: "Magpie", color: FALLBACK_COLOR };
    const keys = [];
    for (let i = 0; i < n; i++) {
      const v = rows[i].values || {};
      for (const k in v) if (keys.indexOf(k) < 0) keys.push(k);
    }
    const layers = keys.map(function (k) {
      const m = (typeof ctx.providerMeta === "function" ? ctx.providerMeta(k) : null) || meta;
      return { key: k, name: m.name || k, color: color(m.color), values: new Float64Array(n), total: 0, peak: 0 };
    });
    const pos = {};
    for (let i = 0; i < layers.length; i++) pos[layers[i].key] = i;

    const col = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const v = rows[i].values || {};
      for (const k in v) {
        const L = layers[pos[k]];
        const x = num(v[k]);
        L.values[i] = x;
        L.total += x;
        if (x > L.peak) L.peak = x;
        col[i] += x;
      }
    }
    // The busiest provider sits at the base of the stack; order stays fixed for
    // the whole buffer so a colour never jumps layers between snapshots.
    layers.sort(function (a, b) { return b.total - a.total || (a.key < b.key ? -1 : 1); });

    let totalMax = 0, bufTotal = 0, peakCol = 0;
    for (let i = 0; i < n; i++) {
      if (col[i] > totalMax) { totalMax = col[i]; peakCol = i; }
      bufTotal += col[i];
    }
    let top = null;
    for (let i = 0; i < layers.length; i++) if (!top || layers[i].total > top.total) top = layers[i];
    return {
      rows: rows, layers: layers, col: col, n: n, totalMax: totalMax, bufTotal: bufTotal,
      peakCol: n ? peakCol : -1, top: top, src: st.src,
      axisMax: niceMax(totalMax * 1.06),
      empty: n < 2, flat: totalMax <= 0,
      keys: keys.length
    };
  }

  /* --------------------------------------------------------------- layout --- */
  function layout(st, model) {
    const PAD = st.mode === "horizon" ? PAD_HORIZON : PAD_STREAM;
    const viewW = Math.max(160, st.scroll.clientWidth || 0);
    const viewH = Math.max(140, st.scroll.clientHeight || 0);
    const cols = Math.max(1, model.n);
    const svgW = Math.max(viewW, cols * COL_MIN + PAD.l + PAD.r);
    const plotW = Math.max(24, svgW - PAD.l - PAD.r);
    const plotH = Math.max(40, viewH - PAD.t - PAD.b);
    const step = plotW / cols;
    st.dims = {
      PAD: PAD, svgW: svgW, svgH: viewH, plotW: plotW, plotH: plotH, step: step, cols: cols,
      top: PAD.t, bottom: PAD.t + plotH,
      cx: function (i) { return PAD.l + step * (i + 0.5); }
    };
    return st.dims;
  }

  /* ---------------------------------------------------------------- paths --- */
  // One stacked layer: the baseline is a cardinal spline clamped into the plot,
  // and the band rides that same segment (thickness interpolates linearly in the
  // curve parameter), so the upper edge can never cross the lower one.
  function layerPath(d, lo, th, axisMax, scale) {
    const n = lo.length;
    const yOf = function (v) { return d.top + d.plotH - v * scale; };
    if (n < 2) {
      const top = yOf(lo[0] + th[0]), bot = yOf(lo[0]);
      return "M" + r2(d.PAD.l) + " " + r2(top) + "H" + r2(d.PAD.l + d.plotW) +
        "V" + r2(bot) + "H" + r2(d.PAD.l) + "Z";
    }
    let path = "M" + r2(d.cx(0)) + " " + r2(yOf(lo[0] + th[0]));
    const cps = new Float64Array(4 * (n - 1));   // clamped baseline controls
    for (let i = 0; i < n - 1; i++) {
      const l0 = lo[i > 0 ? i - 1 : i], l1 = lo[i], l2 = lo[i + 1], l3 = lo[i + 2 < n ? i + 2 : i + 1];
      const t1 = (2 * th[i] + th[i + 1]) / 3;
      const t2 = (th[i] + 2 * th[i + 1]) / 3;
      const c1 = Math.max(0, Math.min(l1 + (l2 - l0) / 6 * TENSION, axisMax - t1));
      const c2 = Math.max(0, Math.min(l2 - (l3 - l1) / 6 * TENSION, axisMax - t2));
      cps[i * 4] = c1; cps[i * 4 + 1] = t1; cps[i * 4 + 2] = c2; cps[i * 4 + 3] = t2;
      path += "C" + r2(d.cx(i) + d.step / 3) + " " + r2(yOf(c1 + t1)) +
        " " + r2(d.cx(i + 1) - d.step / 3) + " " + r2(yOf(c2 + t2)) +
        " " + r2(d.cx(i + 1)) + " " + r2(yOf(l2 + th[i + 1]));
    }
    path += "L" + r2(d.cx(n - 1)) + " " + r2(yOf(lo[n - 1]));
    for (let i = n - 2; i >= 0; i--) {
      path += "C" + r2(d.cx(i + 1) - d.step / 3) + " " + r2(yOf(cps[i * 4 + 2])) +
        " " + r2(d.cx(i) + d.step / 3) + " " + r2(yOf(cps[i * 4])) +
        " " + r2(d.cx(i)) + " " + r2(yOf(lo[i]));
    }
    return path + "Z";
  }

  // Horizon row: values normalised by that provider's own peak, grown from the
  // row's baseline. Overshoot is clamped inside the row.
  function horizonPath(d, vals, peak, rowTop, rowH) {
    const n = vals.length;
    const frac = function (v) { return peak > 0 ? Math.max(0, Math.min(1, num(v) / peak)) : 0; };
    const yOf = function (v) { return rowTop + rowH - frac(v) * rowH; };
    if (n < 2) {
      const y = yOf(vals[0]);
      return "M" + r2(d.PAD.l) + " " + r2(y) + "H" + r2(d.PAD.l + d.plotW) +
        "V" + r2(rowTop + rowH) + "H" + r2(d.PAD.l) + "Z";
    }
    let path = "M" + r2(d.cx(0)) + " " + r2(yOf(vals[0]));
    for (let i = 0; i < n - 1; i++) {
      const v0 = vals[i > 0 ? i - 1 : i], v1 = vals[i], v2 = vals[i + 1], v3 = vals[i + 2 < n ? i + 2 : i + 1];

      const c1 = Math.max(rowTop, Math.min(yOf(v1) + (yOf(v2) - yOf(v0)) / 6 * TENSION, rowTop + rowH));
      const c2 = Math.max(rowTop, Math.min(yOf(v2) - (yOf(v3) - yOf(v1)) / 6 * TENSION, rowTop + rowH));
      path += "C" + r2(d.cx(i) + d.step / 3) + " " + r2(c1) +
        " " + r2(d.cx(i + 1) - d.step / 3) + " " + r2(c2) +
        " " + r2(d.cx(i + 1)) + " " + r2(yOf(vals[i + 1]));
    }
    path += "L" + r2(d.cx(n - 1)) + " " + r2(rowTop + rowH) +
      "L" + r2(d.cx(0)) + " " + r2(rowTop + rowH) + "Z";
    return path;
  }

  /* ---------------------------------------------------------------- markup --- */
  function ticksHTML(m, d, esc) {
    const cols = d.cols;
    if (cols < 2) return "";
    const prevLab = Math.floor((cols - 1) / LABEL_EVERY) * LABEL_EVERY;
    const showLast = (cols - 1) % LABEL_EVERY !== 0 && (cols - 1) - prevLab >= 3;
    let out = "";
    for (let c = 0; c < cols; c++) {
      const last = c === cols - 1;
      if (c !== 0 && c % LABEL_EVERY !== 0 && !(last && showLast)) continue;
      const anchor = c === 0 ? "start" : last ? "end" : "middle";
      const x = c === 0 ? d.PAD.l : last ? d.PAD.l + d.plotW : d.cx(c);
      out += '<text class="stream-xlab' + (last ? " is-last" : "") + '" x="' + r2(x) + '" y="' +
        r2(d.bottom + 13) + '" text-anchor="' + anchor + '">' + esc(clock(m.rows[c].at)) + "</text>";
    }
    return out;
  }

  function streamPlot(m, d, st, ctx) {
    const esc = ctx.esc || plain;
    const cols = d.cols, scale = d.plotH / m.axisMax;
    let grid = "";
    for (let s = 0; s <= GRID; s++) {
      const v = m.axisMax * s / GRID;
      const y = r2(d.bottom - (v / m.axisMax) * d.plotH);
      grid += '<line class="stream-grid" x1="' + r2(d.PAD.l) + '" x2="' + r2(d.PAD.l + d.plotW) +
        '" y1="' + y + '" y2="' + y + '"/>' +
        '<text class="stream-ylab" x="' + r2(d.PAD.l - 8) + '" y="' + r2(d.bottom - (v / m.axisMax) * d.plotH + 3) + '">' +
        esc(tokens(v, ctx)) + "</text>";
    }
    const lo = new Float64Array(cols), th = new Float64Array(cols);
    let bodies = "";
    for (let k = 0; k < m.layers.length; k++) {
      const L = m.layers[k];
      for (let i = 0; i < cols; i++) th[i] = L.values[i];
      const path = layerPath(d, lo, th, m.axisMax, scale);
      bodies += '<g class="stream-layer" style="--i:' + k + '" data-p="' + esc(L.key) + '">' +
        '<path d="' + path + '" fill="' + L.color + '" stroke="' + L.color + '" stroke-width="1.1"/>' +
        "</g>";
      for (let i = 0; i < cols; i++) lo[i] += L.values[i];
    }
    return grid + '<line class="stream-base" x1="' + r2(d.PAD.l) + '" x2="' + r2(d.PAD.l + d.plotW) +
      '" y1="' + r2(d.bottom) + '" y2="' + r2(d.bottom) + '"/>' +
      '<g class="stream-layers">' + bodies + "</g>" + ticksHTML(m, d, esc);
  }

  function horizonPlot(m, d, st, ctx) {
    const esc = ctx.esc || plain;
    const cols = d.cols;
    const layers = m.layers;
    const n = layers.length;
    if (!n) return ticksHTML(m, d, esc);
    const gap = n > 1 ? Math.min(ROW_GAP, Math.max(2, (d.plotH * 0.25) / (n - 1))) : 0;
    const rowH = Math.max(12, (d.plotH - gap * (n - 1)) / n);
    const gutter = d.PAD.l - 14;
    let out = "";
    for (let k = 0; k < n; k++) {
      const L = layers[k];
      const rowTop = d.top + k * (rowH + gap);
      const mid = rowTop + rowH / 2;
      const gid = "stream-hg-" + k;
      if (k > 0) {
        out += '<line class="stream-hsep" x1="' + r2(d.PAD.l) + '" x2="' + r2(d.PAD.l + d.plotW) +
          '" y1="' + r2(rowTop - gap / 2) + '" y2="' + r2(rowTop - gap / 2) + '"/>';
      }
      out += '<g class="stream-hg" style="--i:' + k + '" data-p="' + esc(L.key) + '">' +
        '<defs><linearGradient id="' + gid + '" x1="0" y1="1" x2="0" y2="0">' +
          '<stop offset="0" stop-color="' + L.color + '" stop-opacity=".1"/>' +
          '<stop offset=".55" stop-color="' + L.color + '" stop-opacity=".38"/>' +
          '<stop offset="1" stop-color="' + L.color + '" stop-opacity=".8"/>' +
        "</linearGradient></defs>" +
        '<path d="' + horizonPath(d, L.values, L.peak, rowTop, rowH) + '" fill="url(#' + gid +
          ')" stroke="' + L.color + '" stroke-width="1.2" stroke-opacity=".9"/>' +
        '<text class="stream-hname" x="4" y="' + r2(mid - 1) + '">' +
          esc(clip(L.name, gutter, 9.5)) + "</text>" +
        '<text class="stream-hval" x="4" y="' + r2(mid + 11) + '">峰值 ' +
          esc(tokens(L.peak, ctx)) + "</text>" +
        "</g>";
    }
    return out + ticksHTML(m, d, esc);
  }

  function legendHTML(m, ctx) {
    const esc = ctx.esc || plain;
    if (!m.layers.length) return "";
    let out = "";
    for (let i = 0; i < m.layers.length; i++) {
      const L = m.layers[i];
      const share = m.bufTotal ? L.total / m.bufTotal : 0;
      out += '<span class="stream-key" data-p="' + esc(L.key) + '" title="' +
        esc(L.name + " · Δ" + count(L.total) + " tokens") + '">' +
        '<i class="stream-sw" style="background:' + L.color + '"></i>' +
        '<b class="stream-kname">' + esc(L.name) + "</b>" +
        '<em class="stream-kval">' + esc(tokens(L.total, ctx)) + "</em>" +
        '<em class="stream-kshare">' + Math.round(share * 100) + "%</em>" +
        "</span>";
    }
    return '<div class="stream-legend">' + out + "</div>";
  }

  function sideHTML(m, st, ctx) {
    const esc = ctx.esc || plain;
    const n = m.n;
    const head = '<span class="stream-side-title">STREAMGRAPH</span>';
    const horizon = st.mode === "horizon";
    const modeNote = horizon
      ? "<b>地平线模式</b>：每位 provider 一条独立条带，按自身峰值归一化（<code>v / max</code>），" +
        "叠成行便于逐家比较起伏；悬停任一列可读取全部 provider 的 Δ。"
      : "<b>河流模式</b>：所有 provider 堆成平滑面积，带宽 = 该快照的 Δtoken，" +
        "面积越厚说明这段时间这家路由得越多。";
    const srcNote = "Δ 口径：" + (SRC_TEXT[st.src] || SRC_TEXT.ledger);
    const stats =
      '<div class="stream-stats">' +
        '<div class="stream-stat"><span>快照</span><b>' + n + " / " + MAX_ROWS +
          "</b><small>页面打开后累积</small></div>" +
        '<div class="stream-stat"><span>Δtokens 合计</span><b>' + esc(tokens(m.bufTotal, ctx)) +
          "</b><small>窗口内全部 provider</small></div>" +
        '<div class="stream-stat is-top"><span>头部 provider</span><b>' +
          esc(m.top && m.top.total > 0 ? m.top.name : "—") + "</b><small>" +
          (m.top && m.top.total > 0 && m.bufTotal ? Math.round(m.top.total / m.bufTotal * 100) + "% · " +
            esc(tokens(m.top.total, ctx)) + " tokens" : "窗口内无 Δtoken") + "</small></div>" +
        '<div class="stream-stat"><span>峰值列</span><b>' +
          (m.peakCol >= 0 && m.rows[m.peakCol] ? esc(tokens(m.col[m.peakCol], ctx)) : "—") +
          "</b><small>" + (m.peakCol >= 0 && m.rows[m.peakCol] ? esc(clock(m.rows[m.peakCol].at)) + " · " +
            esc(age(m.rows[m.peakCol].at)) : "还没有数据") + "</small></div>" +
        '<div class="stream-stat wide"><span>模式</span><b>' + (horizon ? "地平线" : "河流") +
          "</b><small>" + esc(m.layers.length + " 个 provider · " + (m.flat ? "窗口内 Δ 为 0" : "峰值列 " +
            tokens(m.totalMax, ctx))) + "</small></div>" +
      "</div>";

    if (m.empty) {
      return head + stats +
        '<p class="stream-note">累积中：已有 <b>' + n + '</b> 个快照，至少 2 个才能铺开。' +
        "页面打开期间每次数据刷新会追加一列，最多保留 <b>" + MAX_ROWS + "</b> 列，超出后丢弃最早一列。</p>" +
        '<p class="stream-note">' + modeNote + "</p>" +
        '<span class="stream-src">' + srcNote + "</span>";
    }
    return head + stats +
      '<p class="stream-note">' + modeNote + "</p>" +
      '<span class="stream-src">' + srcNote + " · 最多保留 " + MAX_ROWS + " 列</span>";
  }

  function emptyHTML(m) {
    const n = m.n;
    return "<b>河流还没铺开 · 已有 " + n + " / " + MAX_ROWS + " 个快照</b>" +
      "<span>每次数据刷新会往缓冲区追加一列（最多 " + MAX_ROWS + " 列），至少 2 列才能画出水流。" +
      "页面打开期间它会一直累积；悬停任意一列可以读取那一刻各 provider 的 Δtoken，" +
      "右上角可在 <code>Stream</code> 与 <code>Horizon</code> 两种形态之间切换。</span>";
  }

  /* -------------------------------------------------------------- tooltip --- */
  function hideTip(st) {
    if (st.tip && !st.tip.hidden) st.tip.hidden = true;
  }

  function showTip(st, i, x, y) {
    const m = st.model, ctx = st.ctx || {};
    if (!m || !st.tip || !m.rows[i]) { hideTip(st); return; }
    const esc = ctx.esc || plain;
    const row = m.rows[i];
    const ranked = [];
    for (const k in row.values) ranked.push([k, num(row.values[k])]);
    ranked.sort(function (a, b) { return b[1] - a[1]; });
    const nameOf = {};
    for (let j = 0; j < m.layers.length; j++) nameOf[m.layers[j].key] = m.layers[j];
    let list = "";
    for (let j = 0; j < ranked.length && j < TOP_TIP; j++) {
      const L = nameOf[ranked[j][0]] || { name: ranked[j][0], color: FALLBACK_COLOR };
      const v = ranked[j][1];
      list += '<span class="stream-tip-row"><i style="background:' + L.color + '"></i>' +
        "<em>" + esc(L.name) + "</em><b>" + esc(tokens(v, ctx)) + "</b><u>" +
        (row.total ? Math.round(v / row.total * 100) + "%" : "0%") + "</u></span>";
    }
    st.tip.innerHTML =
      "<b>" + esc(clock(row.at)) + " · " + esc(age(row.at)) + " · 第 " + (i + 1) + "/" + m.n + " 列</b>" +
      "<span>本次快照 Δ <b>" + esc(tokens(row.total, ctx)) + "</b> tokens · " +
        esc(count(row.total)) + "</span>" +
      list +
      "<span>来源：" + esc(SRC_TEXT[row.src] || SRC_TEXT.ledger) + "</span>";
    st.tip.hidden = false;
    const rect = st.root.getBoundingClientRect();
    const clamp = ctx.clamp || function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    st.tip.style.left = clamp(x - rect.left, 130, Math.max(130, rect.width - 130)) + "px";
    st.tip.style.top = clamp(y - rect.top - 10, 46, Math.max(46, rect.height - 8)) + "px";
  }

  function placeHover(st) {
    const g = st.hotG, m = st.model, d = st.dims;
    if (!g) return;
    const i = st.hover;
    if (i == null || !m || !d || m.empty || !m.rows || !m.rows[i]) {
      g.setAttribute("hidden", "");
      return;
    }
    g.removeAttribute("hidden");
    const x = d.PAD.l + d.step * i;
    const w = Math.max(2, d.step);
    const rect = g.querySelector(".stream-hot-col");
    const rule = g.querySelector(".stream-hot-rule");
    const dot = g.querySelector(".stream-hot-dot");
    const ly = d.top + d.plotH - (m.col[i] / m.axisMax) * d.plotH;
    rect.setAttribute("x", r2(x));
    rect.setAttribute("y", r2(d.top));
    rect.setAttribute("width", r2(w));
    rect.setAttribute("height", r2(d.plotH));
    rule.setAttribute("x1", r2(x + w / 2));
    rule.setAttribute("x2", r2(x + w / 2));
    dot.setAttribute("cx", r2(x + w / 2));
    dot.setAttribute("cy", r2(Math.max(d.top + 2, ly - 3)));
  }

  /* ----------------------------------------------------------------- paint --- */
  function mount(host, st) {
    host.innerHTML = "";
    const root = document.createElement("div");
    root.className = "stream-root";
    root.innerHTML =
      '<div class="stream-main">' +
        '<div class="stream-head">' +
          '<span class="stream-cap"></span>' +
          '<div class="stream-seg" role="group" aria-label="图形形态">' +
            '<button type="button" class="stream-seg-btn" data-mode="stream">Stream</button>' +
            '<button type="button" class="stream-seg-btn" data-mode="horizon">Horizon</button>' +
          "</div>" +
        "</div>" +
        '<div class="stream-body">' +
          '<div class="stream-scroll"><div class="stream-pane"></div></div>' +
          '<div class="stream-empty" hidden></div>' +
        "</div>" +
        '<div class="stream-legend-slot"></div>' +
      "</div>" +
      '<aside class="stream-side" aria-label="河流统计"></aside>' +
      '<div class="stream-tip" role="tooltip" hidden></div>';
    host.appendChild(root);
    st.root = root;
    st.scroll = root.querySelector(".stream-scroll");
    st.pane = root.querySelector(".stream-pane");
    st.cap = root.querySelector(".stream-cap");
    st.legend = root.querySelector(".stream-legend-slot");
    st.empty = root.querySelector(".stream-empty");
    st.side = root.querySelector(".stream-side");
    st.tip = root.querySelector(".stream-tip");
    st.segBtns = [].slice.call(root.querySelectorAll(".stream-seg-btn"));
    st.hotG = null;
    bind(root, st);
  }

  function paint(st, ctx, enter) {
    const m = st.model, d = st.dims;
    const root = st.root;
    root.dataset.motion = ctx.motion || "full";

    st.cap.innerHTML = m.empty
      ? "<b>等待第 2 个快照</b> · 缓冲 " + m.n + " / " + MAX_ROWS + " · 每次数据刷新累积一列"
      : "<b>" + m.n + "</b> / " + MAX_ROWS + " 个快照 · 每次数据刷新一列 · 带宽 = 该快照的 Δtoken" +
        (m.flat ? " · <b>本窗口 Δ 为 0</b>" : "");

    st.pane.style.width = d.svgW + "px";
    st.pane.innerHTML = '<svg class="stream-svg" width="' + d.svgW + '" height="' + d.svgH +
      '" viewBox="0 0 ' + d.svgW + " " + d.svgH + '" role="img" aria-label="provider streamgraph">' +
      (st.mode === "horizon" ? horizonPlot(m, d, st, ctx) : streamPlot(m, d, st, ctx)) +
      '<g class="stream-hover" hidden>' +
        '<rect class="stream-hot-col" x="0" y="0" width="1" height="1"/>' +
        '<line class="stream-hot-rule" x1="0" x2="0" y1="' + r2(d.top) + '" y2="' + r2(d.bottom) + '"/>' +
        '<circle class="stream-hot-dot" cx="0" cy="0" r="2.6"/>' +
      "</g></svg>";
    st.svg = st.pane.querySelector(".stream-svg");
    st.hotG = st.pane.querySelector(".stream-hover");

    st.legend.innerHTML = m.empty ? "" : legendHTML(m, ctx);
    st.side.innerHTML = sideHTML(m, st, ctx);
    st.empty.hidden = !m.empty;
    if (m.empty) st.empty.innerHTML = emptyHTML(m);
    for (let i = 0; i < st.segBtns.length; i++) {
      st.segBtns[i].classList.toggle("is-on", st.segBtns[i].dataset.mode === st.mode);
      st.segBtns[i].setAttribute("aria-pressed", st.segBtns[i].dataset.mode === st.mode ? "true" : "false");
    }

    if (st.hover != null && !m.rows[st.hover]) st.hover = null;
    placeHover(st);
    if (st.hover == null) hideTip(st);

    if (enter) {
      root.classList.add("stream-enter");
      clearTimeout(st.timer);
      st.timer = setTimeout(function () { root.classList.remove("stream-enter"); },
        700 + Math.min(m.n, MAX_ROWS) * 20);
    }
    st.entered = true;
  }

  /* ------------------------------------------------------------------ bind --- */
  function columnAt(st, clientX) {
    const d = st.dims, m = st.model;
    if (!d || !m || !st.svg) return null;
    const box = st.svg.getBoundingClientRect();
    if (!box.width) return null;
    const scale = d.svgW / box.width;
    const x = (clientX - box.left) * scale;
    if (x < d.PAD.l - d.step * 0.6 || x > d.PAD.l + d.plotW + d.step * 0.6) return null;
    const i = Math.floor((x - d.PAD.l) / d.step);
    return Math.max(0, Math.min(d.cols - 1, isFinite(i) ? i : 0));
  }

  function bind(root, st) {
    root.addEventListener("pointermove", function (e) {
      const target = e.target;
      if (target && target.closest && target.closest(".stream-side, .stream-seg, .stream-empty, .stream-legend-slot")) {
        return;
      }
      const i = columnAt(st, e.clientX);
      if (i == null) { st.hover = null; placeHover(st); hideTip(st); return; }
      st.hover = i;
      placeHover(st);
      showTip(st, i, e.clientX, e.clientY);
    });
    root.addEventListener("pointerleave", function () {
      st.hover = null;
      placeHover(st);
      hideTip(st);
    });
    root.addEventListener("click", function (e) {
      const btn = e.target && e.target.closest ? e.target.closest(".stream-seg-btn") : null;
      if (!btn) return;
      const next = btn.dataset.mode === "horizon" ? "horizon" : "stream";
      if (next === st.mode) return;
      st.mode = next;
      st.sig = null;
      st.hover = null;
      render(st.host, st.ctx);
    });
  }

  /* -------------------------------------------------------------------- api --- */
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
    }
    accumulate(st, ctx);
    st.model = buildModel(st, ctx);
    const d = layout(st, st.model);
    const m = st.model;
    const sig = [st.version, st.lastKey, st.mode, m.n, m.layers.length, m.keys,
      Math.round(m.bufTotal), Math.round(m.totalMax), Math.round(d.svgW), Math.round(d.svgH),
      st.src, m.empty ? "e" : "d", ctx.motion || "full"].join("~");
    if (sig === st.sig) return;
    st.sig = sig;
    const enter = !st.entered && (ctx.motion || "full") !== "off";
    paint(st, ctx, enter);

    // The hero stage can be display:none / zero-width on first paint; re-layout
    // once it gains a size instead of waiting for the next data tick.
    if (!st.ro && typeof ResizeObserver === "function") {
      st.ro = new ResizeObserver(function () {
        if (!st.ctx) return;
        st.sig = null;
        render(st.host, st.ctx);
      });
      st.ro.observe(st.scroll);
    }
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["stream"] = {
    title: "流量河流",
    eyebrow: "STREAMGRAPH",
    render: render
  };
})();
