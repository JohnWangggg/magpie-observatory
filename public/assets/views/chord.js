/* ==========================================================================
   Magpie Observatory — hero view module: flow chord (agent ⇄ provider)
   Standalone classic script. Registers window.ObservatoryViews["chord"].

   The newest ledger rows are folded into (agent, provider) flows. Agents take
   the left half of the ring, providers the right half, every side split in
   proportion to its members' volume; a ribbon joins each pair, its area being
   the routed tokens (calls when the ledger carries no tokens) and its colour
   the provider brand. Hover isolates a ribbon or an arc, click pins it.
   ========================================================================== */
(function () {
  "use strict";

  const OTHER = "__other__";
  const MAX_ROWS = 80;       // newest ledger rows considered
  const TOP_AGENTS = 5;      // agents kept before folding into 其他
  const TOP_PROVIDERS = 6;   // providers kept before folding into 其他
  const MIN_SHARE = 0.005;   // flows below 0.5% of the routed volume are dropped
  const MIN_FLOWS = 2;       // 0–1 flows has nothing to arrange
  const GAP = 0.18;          // radians of breathing room at the two seams
  const PI = Math.PI;
  const TAU = PI * 2;
  const FS_NAME = 9.5;
  const FS_VAL = 8.5;
  const LABEL_GAP = 22;      // minimum vertical room between two labels

  // Per-host UI state (hover / pin / signature) lives in closures, never global.
  const states = new WeakMap();

  /* ------------------------------------------------------------- format --- */
  function num(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }

  function count(n) {
    return String(Math.round(num(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function pct(v) { return ((Number(v) || 0) * 100).toFixed(1) + "%"; }

  function r(v) { return (Math.round(v * 100) / 100).toString(); }

  // Rough glyph width: CJK/full-width glyphs are square, latin ~0.56em. Enough
  // to reserve label padding without a DOM measuring pass.
  function textW(str, size) {
    const s = String(str == null ? "" : str);
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
    const s = String(str == null ? "" : str);
    if (textW(s, size) <= maxW) return s;
    let out = "";
    for (let i = 0; i < s.length; i++) {
      if (textW(out + s[i] + "…", size) > maxW) break;
      out += s[i];
    }
    return (out || s.charAt(0) || "") + "…";
  }

  /* ----------------------------------------------------------- geometry --- */
  // Angle 0 is straight up, growing clockwise; radius R is the outside of the
  // arc band, RI the inside (where the ribbons attach).
  function polar(cx, cy, rad, a) {
    return [cx + rad * Math.sin(a), cy - rad * Math.cos(a)];
  }

  function ringArc(cx, cy, rad, a0, a1, sweep) {
    const p = polar(cx, cy, rad, a1);
    return "A" + r(rad) + " " + r(rad) + " 0 " + (a1 - a0 > PI ? 1 : 0) + " " + sweep +
      " " + r(p[0]) + " " + r(p[1]);
  }

  // The arc band between two angles: outside edge one way, inside edge back.
  function sector(cx, cy, R, RI, a0, a1) {
    const p0 = polar(cx, cy, R, a0), p1 = polar(cx, cy, R, a1);
    const p2 = polar(cx, cy, RI, a1), p3 = polar(cx, cy, RI, a0);
    const wide = a1 - a0 > 1e-4;
    let d = "M" + r(p0[0]) + " " + r(p0[1]);
    d += wide ? ringArc(cx, cy, R, a0, a1, 1) : "L" + r(p1[0]) + " " + r(p1[1]);
    d += "L" + r(p2[0]) + " " + r(p2[1]);
    if (wide) d += ringArc(cx, cy, RI, a1, a0, 0);
    d += "Z";
    return d;
  }

  // A ribbon: both ports swept in the same rotational sense, the two free ends
  // pulled toward the centre so the band pinches — the classic chord shape.
  function ribbon(cx, cy, RI, aa0, aa1, pa0, pa1) {
    const s0 = polar(cx, cy, RI, aa0), s1 = polar(cx, cy, RI, aa1);
    const t0 = polar(cx, cy, RI, pa0), t1 = polar(cx, cy, RI, pa1);
    let d = "M" + r(s0[0]) + " " + r(s0[1]);
    d += aa1 - aa0 > 1e-4 ? ringArc(cx, cy, RI, aa0, aa1, 1) : "L" + r(s1[0]) + " " + r(s1[1]);
    d += "Q" + r(cx) + " " + r(cy) + " " + r(t0[0]) + " " + r(t0[1]);
    d += pa1 - pa0 > 1e-4 ? ringArc(cx, cy, RI, pa0, pa1, 1) : "L" + r(t1[0]) + " " + r(t1[1]);
    d += "Q" + r(cx) + " " + r(cy) + " " + r(s0[0]) + " " + r(s0[1]);
    return d + "Z";
  }

  /* --------------------------------------------------------------- model --- */
  function buildModel(ctx) {
    const logs = Array.isArray(ctx.logs) ? ctx.logs : [];
    const rows = [];
    logs.slice(0, MAX_ROWS).forEach(row => {
      if (!row) return;
      rows.push({
        agent: row.agent || "unknown",
        // providerOfModel is idempotent: the ledger already carries the seat.
        provider: ctx.providerOfModel(row.model, row.provider) || "unknown",
        tokens: num(row.tokens)
      });
    });

    const m = {
      rows: rows.length, logCount: logs.length, agents: [], providers: [], flows: [],
      total: 0, tokenTotal: 0, zeroTokens: false, top: null, topFlows: [], topFlowCount: 0
    };
    if (!rows.length) return m;

    let real = 0;
    rows.forEach(row => { real += row.tokens; });
    m.zeroTokens = real <= 0;
    m.tokenTotal = real;
    // Volume is tokens; a ledger with no tokens at all falls back to calls.
    rows.forEach(row => { row.value = m.zeroTokens ? 1 : row.tokens; });

    const raw = new Map();
    rows.forEach(row => {
      if (row.value <= 0) return;
      const k = row.agent + "\u0000" + row.provider;
      let f = raw.get(k);
      if (!f) { f = { agent: row.agent, provider: row.provider, value: 0, calls: 0 }; raw.set(k, f); }
      f.value += row.value;
      f.calls += 1;
    });
    const base = Array.from(raw.values());
    if (!base.length) return m;

    // Keep the busiest agents / providers, fold the tail into 其他.
    const keep = ["agent", "provider"].map((field, i) => {
      const agg = new Map();
      base.forEach(f => agg.set(f[field], (agg.get(f[field]) || 0) + f.value));
      return new Set(Array.from(agg.entries())
        .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
        .slice(0, i === 0 ? TOP_AGENTS : TOP_PROVIDERS).map(e => e[0]));
    });
    const folded = new Map();
    base.forEach(f => {
      const k = (keep[0].has(f.agent) ? f.agent : OTHER) + "\u0000" +
                (keep[1].has(f.provider) ? f.provider : OTHER);
      let x = folded.get(k);
      if (!x) {
        x = { agent: keep[0].has(f.agent) ? f.agent : OTHER, provider: keep[1].has(f.provider) ? f.provider : OTHER, value: 0, calls: 0 };
        folded.set(k, x);
      }
      x.value += f.value;
      x.calls += f.calls;
    });

    // Drop the long thin tail, then describe every survivor as a share of the
    // whole routed volume (the arcs are sized from the survivors, so the ring
    // always closes).
    let total = 0;
    folded.forEach(f => { total += f.value; });
    if (total <= 0) return m;
    m.total = total;
    const flows = Array.from(folded.values()).filter(f => f.value >= total * MIN_SHARE);
    if (!flows.length) return m;
    flows.forEach(f => { f.share = f.value / total; });

    function nodes(field, nameOf, colorOf, iconOf) {
      const map = new Map();
      flows.forEach(f => {
        const k = f[field];
        let n = map.get(k);
        if (!n) { n = { key: k, value: 0, calls: 0 }; map.set(k, n); }
        n.value += f.value;
        n.calls += f.calls;
      });
      const arr = Array.from(map.values());
      arr.forEach(n => {
        n.other = n.key === OTHER;
        n.name = n.other ? "其他" : String(nameOf(n.key) || n.key);
        n.color = n.other ? "var(--muted)" : String(colorOf(n.key) || "var(--muted)");
        n.icon = n.other ? "" : String(iconOf(n.key) || "");
      });
      arr.sort((a, b) => {
        if (a.other !== b.other) return a.other ? 1 : -1;
        return b.value - a.value || String(a.key).localeCompare(String(b.key));
      });
      arr.forEach((n, i) => { n.i = i; });
      return arr;
    }

    m.agents = nodes("agent", k => ctx.agentMeta(k).name, k => ctx.agentMeta(k).color, k => ctx.agentIcon(k));
    m.providers = nodes("provider", k => ctx.providerMeta(k).name, k => ctx.providerMeta(k).color, k => ctx.providerIcon(k));

    const pColor = new Map(m.providers.map(n => [n.key, n.color]));
    const posA = new Map(m.agents.map(n => [n.key, n.i]));
    const posP = new Map(m.providers.map(n => [n.key, n.i]));
    flows.sort((x, y) => posA.get(x.agent) - posA.get(y.agent) || posP.get(x.provider) - posP.get(y.provider));
    flows.forEach((f, i) => {
      f.i = i;
      f.color = pColor.get(f.provider) || "var(--accent)";
    });
    m.flows = flows;
    m.topFlows = flows.slice().sort((a, b) => b.value - a.value || a.i - b.i).slice(0, 5);
    m.top = m.topFlows[0] || null;
    return m;
  }

  /* ------------------------------------------------------------- layout --- */
  // Angles: agents fill the left half from the bottom seam upwards, providers
  // the right half from the bottom seam upwards too, so the heavy low-index
  // flows hug the bottom instead of crossing the ring.
  function angles(nodes, from, to, dir) {
    const sum = nodes.reduce((a, n) => a + n.value, 0) || 1;
    let cur = from;
    nodes.forEach(n => {
      const span = (to - from) * (n.value / sum) * dir;
      n.a0 = Math.min(cur, cur + span);
      n.a1 = Math.max(cur, cur + span);
      cur += span;
    });
  }

  function stackPorts(nodes, byKey, field, startFrom, dir) {
    nodes.forEach(n => {
      const list = byKey.get(n.key) || [];
      const span = n.a1 - n.a0;
      const sum = list.reduce((a, f) => a + f.value, 0) || 1;
      // Anchored at the seam end of the node so partner order stays monotone.
      let cur = startFrom === "a1" ? n.a1 : n.a0;
      list.forEach(f => {
        const w = span * (f.value / sum) * dir;
        const lo = Math.min(cur, cur + w), hi = Math.max(cur, cur + w);
        if (field === "a") { f.aa0 = lo; f.aa1 = hi; } else { f.pa0 = lo; f.pa1 = hi; }
        cur += w;
      });
    });
  }

  function measure(m, w, h, ctx) {
    let nameW = 0, valW = 0;
    m.agents.concat(m.providers).forEach(n => {
      n.vtext = m.zeroTokens ? count(n.calls) + " 次" : ctx.fmtTokens(n.value);
      nameW = Math.max(nameW, textW(n.name, FS_NAME));
      valW = Math.max(valW, textW(n.vtext, FS_VAL));
    });
    // The ring scales to the shorter side, keeping room for the outside labels.
    const labelMax = Math.max(48, Math.min(Math.max(nameW, valW), w * 0.26));
    const padX = ctx.clamp(labelMax + 30, 46, Math.max(46, w * 0.32));
    const padY = 34;
    const R = Math.max(30, Math.min(w / 2 - padX, h / 2 - padY));
    const g = { w: w, h: h, cx: w / 2, cy: h / 2, R: R, RI: R - ctx.clamp(R * 0.075, 7, 15), labelMax: labelMax };

    angles(m.agents, PI + GAP, TAU - GAP, 1);
    angles(m.providers, PI - GAP, GAP, 1);

    const byA = new Map(), byP = new Map();
    m.flows.forEach(f => {
      if (!byA.has(f.agent)) byA.set(f.agent, []);
      byA.get(f.agent).push(f);
      if (!byP.has(f.provider)) byP.set(f.provider, []);
      byP.get(f.provider).push(f);
    });
    // Ports keep partner order: agents from their bottom (a0) end up, providers
    // from their bottom (a1) end down — that is what keeps ribbons untangled.
    stackPorts(m.agents, byA, "a", "a0", 1);
    stackPorts(m.providers, byP, "p", "a1", -1);

    const rad = R + 11;
    const avail = 2 * rad;
    const labels = [];
    [["a", m.agents], ["p", m.providers]].forEach(pair => {
      const keys = pair[1];
      const n = Math.max(1, keys.length);
      // Two lines (name + total) want ~22px each. On a short, wide stage the
      // ring is small and a single name line is what keeps every label inside
      // the room it leaves; the total travels in the tooltip instead.
      const two = avail >= n * LABEL_GAP;
      const pitch = two ? LABEL_GAP : Math.max(12, avail / n);
      const list = keys.map(node => {
        const mid = (node.a0 + node.a1) / 2;
        return { n: node, side: pair[0], two: two, x: g.cx + rad * Math.sin(mid), y: g.cy - rad * Math.cos(mid) };
      });
      // Neighbouring labels crowd near a seam; push them apart vertically.
      list.sort((a, b) => a.y - b.y);
      for (let i = 1; i < list.length; i++) {
        if (list[i].y - list[i - 1].y < pitch) list[i].y = list[i - 1].y + pitch;
      }
      if (list.length) {
        const ascend = 9, descend = two ? 12 : 3;
        const over = list[list.length - 1].y + descend - (g.h - 2);
        const under = 2 - (list[0].y - ascend);
        const shift = over > 0 ? -over : (under > 0 ? under : 0);
        if (shift) for (let i = 0; i < list.length; i++) list[i].y += shift;
      }
      labels.push.apply(labels, list);
    });
    g.labels = labels;
    return g;
  }

  /* -------------------------------------------------------------- markup --- */
  function flowText(f, m, ctx) {
    const a = m.agents.find(n => n.key === f.agent);
    const p = m.providers.find(n => n.key === f.provider);
    return (a ? a.name : f.agent) + " → " + (p ? p.name : f.provider);
  }

  function flowValue(f, m, ctx) {
    return m.zeroTokens ? count(f.calls) + " 次" : ctx.fmtTokens(f.value);
  }

  function svgMarkup(m, g, ctx) {
    let out = '<svg class="chord-svg" viewBox="0 0 ' + r(g.w) + ' ' + r(g.h) + '" width="100%" height="100%" ' +
      'preserveAspectRatio="xMidYMid meet" role="img" aria-label="流向和弦：agent → provider">';
    out += '<circle class="chord-halo" cx="' + r(g.cx) + '" cy="' + r(g.cy) + '" r="' + r(g.R + 5) + '"/>';
    out += '<g class="chord-ribbons">';
    m.flows.forEach(f => {
      const d = ribbon(g.cx, g.cy, g.RI, f.aa0, f.aa1, f.pa0, f.pa1);
      out += '<g class="chord-rib-g" data-flow="' + f.i + '" style="--i:' + f.i + '">' +
        '<path class="chord-hit" data-flow="' + f.i + '" d="' + d + '"/>' +
        '<path class="chord-rib" data-flow="' + f.i + '" d="' + d + '" style="--c:' + f.color + '"/>' +
        "</g>";
    });
    out += '</g><g class="chord-arcs">';
    [["a", m.agents], ["p", m.providers]].forEach(pair => {
      pair[1].forEach(n => {
        out += '<g class="chord-arc-g" data-side="' + pair[0] + '" data-key="' + ctx.esc(n.key) + '" style="--i:' + n.i + '">' +
          '<path class="chord-hit" d="' + sector(g.cx, g.cy, g.R + 7, Math.max(4, g.RI - 7), n.a0, n.a1) + '"/>' +
          '<path class="chord-arc" d="' + sector(g.cx, g.cy, g.R, g.RI, n.a0, n.a1) + '" style="--c:' + n.color + '"/>' +
          "</g>";
      });
    });
    out += '</g><g class="chord-labels">';
    g.labels.forEach(L => {
      const n = L.n, left = L.side === "a", two = L.two;
      const name = clip(n.name, g.labelMax, FS_NAME);
      const nameY = two ? L.y - 1 : L.y + 3;
      const iconX = left ? L.x - textW(name, FS_NAME) - 14 : L.x + textW(name, FS_NAME) + 5;
      out += '<g class="chord-label-g" data-side="' + L.side + '" data-key="' + ctx.esc(n.key) + '">';
      if (n.icon) {
        out += '<image class="chord-icon" x="' + r(iconX) + '" y="' + r(two ? L.y - 9.5 : L.y - 5) +
          '" width="10" height="10" href="' + ctx.esc(n.icon) + '"/>';
      }
      out += '<text class="chord-label" x="' + r(L.x) + '" y="' + r(nameY) + '" text-anchor="' + (left ? "end" : "start") + '">' + ctx.esc(name) + "</text>";
      if (two) {
        out += '<text class="chord-value" x="' + r(L.x) + '" y="' + r(L.y + 10) + '" text-anchor="' + (left ? "end" : "start") + '">' + ctx.esc(n.vtext) + "</text>";
      }
      out += "</g>";
    });
    return out + "</g></svg>";
  }

  function rowsMarkup(m, ctx) {
    if (!m.topFlows.length) return '<div class="chord-row chord-row-empty">暂无流向</div>';
    return m.topFlows.map(f => {
      const text = flowText(f, m, ctx);
      return '<button type="button" class="chord-row" data-flow="' + f.i + '" aria-pressed="false" style="--c:' + f.color + '" title="' +
        ctx.esc(text + " · " + flowValue(f, m, ctx) + " · " + pct(f.share)) + '">' +
        '<span class="chord-dot"></span>' +
        '<span class="chord-route">' + ctx.esc(text) + "</span>" +
        '<span class="chord-cell">' + ctx.esc(flowValue(f, m, ctx)) + "</span>" +
        '<span class="chord-bar"><i style="width:' + r(ctx.clamp(f.share * 100, 1, 100)) + '%"></i></span>' +
        '<span class="chord-cell chord-share">' + pct(f.share) + "</span>" +
        "</button>";
    }).join("");
  }

  function boardMarkup(m, ctx, still) {
    const top = m.top;
    return '<div class="chord-board' + (still ? "" : " chord-anim") + '">' +
      '<div class="chord-main">' +
        '<div class="chord-head"><span><b>CHORD</b> · 流向和弦</span>' +
        '<span>' + count(m.flows.length) + " 条流向 · " + count(m.rows) + " 条日志</span></div>" +
        '<div class="chord-plot"></div>' +
      "</div>" +
      '<aside class="chord-side">' +
        '<div class="chord-side-head"><span><b>CHORD</b></span><span>最新 ' + count(m.rows) + " 条</span></div>" +
        '<div class="chord-stats">' +
          '<div class="chord-stat"><span>流向</span><b>' + count(m.flows.length) + "</b><small>占比 ≥ 0.5%</small></div>" +
          '<div class="chord-stat"><span>TOKENS</span><b>' + ctx.esc(m.zeroTokens ? "—" : ctx.fmtTokens(m.tokenTotal)) + "</b><small>" +
            (m.zeroTokens ? "账本为 0 · 按调用数布局" : "路由总量") + "</small></div>" +
          '<div class="chord-stat"><span>AGENT</span><b>' + count(m.agents.length) + "</b><small>" +
            (m.agents.some(n => n.other) ? "含其他" : "全部保留") + "</small></div>" +
          '<div class="chord-stat"><span>PROVIDER</span><b>' + count(m.providers.length) + "</b><small>" +
            (m.providers.some(n => n.other) ? "含其他" : "全部保留") + "</small></div>" +
        "</div>" +
        (top ? '<div class="chord-toproute">' +
          '<span class="chord-toproute-key">主干流向</span>' +
          '<span class="chord-toproute-name" title="' + ctx.esc(flowText(top, m, ctx)) + '">' + ctx.esc(flowText(top, m, ctx)) + "</span>" +
          "<b>" + pct(top.share) + "</b>" +
        "</div>" : "") +
        '<div class="chord-table">' +
          '<div class="chord-row chord-row-head"><span></span><span>流向</span><span>TOKENS</span><span>占比</span><span></span></div>' +
          rowsMarkup(m, ctx) +
        "</div>" +
        '<div class="chord-legend">' +
          '<span><i class="chord-key"></i>ribbon 颜色 = provider</span>' +
          '<span class="chord-legend-note">悬停 ribbon / 弧段高亮 · 点击钉住</span>' +
        "</div>" +
      "</aside>" +
    "</div>" +
    '<div class="chord-tip" hidden></div>';
  }

  function emptyHtml(m) {
    return '<div class="chord-empty">' +
      "<b>流向和弦还没有足够的流向</b>" +
      "<span>把账本里最新的请求按 <code>agent → provider</code> 聚合，占比 ≥ 0.5% 且流向数 ≥ 2 时才铺开环形和弦。</span>" +
      "<span>当前窗口 " + count(m.rows) + " 条日志聚合出 " + count(m.flows.length) + " 条流向，等出现更多路由组合就会自动展开。</span>" +
      '<span class="chord-empty-note">需要 ≥ 2 条流向 · 当前 ' + count(m.flows.length) + " 条</span>" +
      "</div>";
  }

  /* -------------------------------------------------------------- render --- */
  function ensureState(host) {
    let st = states.get(host);
    if (!st) {
      st = { sig: "", hover: null, pinned: null, model: null, ctx: null, ro: null, ribs: [], arcs: [] };
      states.set(host, st);
    }
    return st;
  }

  function effective(st) {
    if (st.hover) return st.hover;
    if (st.pinned) return st.pinned;
    return null;
  }

  function applyFocus(host, st) {
    const board = host.firstElementChild;
    if (!board) return;
    const m = st.model;
    const f = effective(st);
    let hotA = null, hotP = null;
    if (f && f.type === "flow") {
      const fl = m.flows[f.i];
      if (fl) { hotA = fl.agent; hotP = fl.provider; }
    }
    st.ribs.forEach(el => {
      const fl = m.flows[Number(el.dataset.flow)];
      let on = false;
      if (f && fl) {
        if (f.type === "flow") on = fl.i === f.i;
        else if (f.side === "a") on = fl.agent === f.key;
        else on = fl.provider === f.key;
      }
      el.classList.toggle("is-hot", !!on);
      el.classList.toggle("is-fade", !!(f && !on));
    });
    st.arcs.forEach(el => {
      const side = el.dataset.side, key = el.dataset.key;
      let on = false;
      if (f) {
        if (f.type === "arc") on = side === f.side && key === f.key;
        else on = (side === "a" && key === hotA) || (side === "p" && key === hotP);
      }
      el.classList.toggle("is-hot", !!on);
      el.classList.toggle("is-fade", !!(f && !on));
    });
    Array.from(board.querySelectorAll(".chord-row")).forEach(el => {
      if (el.dataset.flow == null) return;
      const i = Number(el.dataset.flow);
      const on = !!(f && f.type === "flow" && f.i === i);
      el.classList.toggle("is-on", on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function paint(host, st, m, ctx) {
    const plot = host.querySelector(".chord-plot");
    if (!plot) return;
    const w = Math.round(plot.clientWidth || host.clientWidth || 0);
    const h = Math.round(plot.clientHeight || host.clientHeight || 0);
    if (w < 150 || h < 120) {
      plot.innerHTML = '<div class="chord-pending"></div>';
      st.ribs = []; st.arcs = [];
      return;
    }
    const g = measure(m, w, h, ctx);
    plot.innerHTML = svgMarkup(m, g, ctx);
    st.ribs = Array.from(plot.querySelectorAll(".chord-rib-g"));
    st.arcs = Array.from(plot.querySelectorAll(".chord-arc-g"));
    applyFocus(host, st);
  }

  function showTip(host, st, ctx, html, cx, cy) {
    const tip = host.querySelector(".chord-tip");
    if (!tip) return;
    if (!html) { tip.hidden = true; return; }
    tip.innerHTML = html;
    tip.hidden = false;
    const box = host.getBoundingClientRect();
    tip.style.left = ctx.clamp(cx - box.left, 84, Math.max(84, box.width - 84)) + "px";
    tip.style.top = ctx.clamp(cy - box.top - 14, 60, Math.max(60, host.clientHeight - 8)) + "px";
  }

  function flowTip(f, m, ctx) {
    return "<b>" + ctx.esc(flowText(f, m, ctx)) + "</b>" +
      "<span>" + count(f.calls) + " 次请求</span>" +
      "<span>" + ctx.esc(m.zeroTokens ? count(f.calls) + " 次调用（账本 token 为 0）" : ctx.fmtTokens(f.value) + " tokens") + "</span>" +
      "<span>占总量 " + pct(f.share) + "</span>";
  }

  function arcTip(side, key, m, ctx) {
    const n = (side === "a" ? m.agents : m.providers).find(x => x.key === key);
    if (!n) return "";
    const ribs = m.flows.filter(f => (side === "a" ? f.agent : f.provider) === key).length;
    return "<b>" + ctx.esc(n.name) + "</b>" +
      "<span>" + (side === "a" ? "AGENT" : "PROVIDER") + " · " + ribs + " 条流向 · " + count(n.calls) + " 次请求</span>" +
      "<span>" + ctx.esc(m.zeroTokens ? count(n.calls) + " 次调用" : ctx.fmtTokens(n.value) + " tokens") +
      " · 占总量 " + pct(n.value / m.total) + "</span>";
  }

  function pick(e) {
    const t = e.target;
    if (!t || !t.closest) return null;
    const rib = t.closest(".chord-rib-g");
    if (rib) return { type: "flow", i: Number(rib.dataset.flow) };
    const arc = t.closest(".chord-arc-g");
    if (arc) return { type: "arc", side: arc.dataset.side, key: arc.dataset.key };
    return null;
  }

  function follow(host, st, m, ctx, focus, x, y) {
    st.hover = focus;
    applyFocus(host, st);
    if (!focus) { showTip(host, st, ctx, null); return; }
    const html = focus.type === "flow" ? flowTip(m.flows[focus.i], m, ctx) : arcTip(focus.side, focus.key, m, ctx);
    showTip(host, st, ctx, html, x, y);
  }

  function bind(host, st, m, ctx) {
    const board = host.firstElementChild;
    const svg = host.querySelector(".chord-svg");
    if (!board) return;

    if (svg) {
      svg.addEventListener("pointermove", e => {
        follow(host, st, m, ctx, pick(e), e.clientX, e.clientY);
      });
      svg.addEventListener("pointerleave", () => {
        st.hover = null;
        applyFocus(host, st);
        showTip(host, st, ctx, null);
      });
      svg.addEventListener("click", e => {
        const focus = pick(e);
        st.pinned = focus && same(st.pinned, focus) ? null : focus;
        st.hover = focus;
        applyFocus(host, st);
      });
    }

    // Clicking anywhere that is not a ribbon, an arc or a flow row clears the pin.
    board.addEventListener("click", e => {
      const t = e.target;
      if (t && t.closest && (t.closest(".chord-rib-g") || t.closest(".chord-arc-g") || t.closest(".chord-row"))) return;
      st.pinned = null;
      st.hover = null;
      applyFocus(host, st);
    });

    Array.from(board.querySelectorAll(".chord-row")).forEach(el => {
      if (el.dataset.flow == null) return;
      const i = Number(el.dataset.flow);
      const to = () => {
        const box = el.getBoundingClientRect();
        follow(host, st, m, ctx, { type: "flow", i: i }, box.right - 8, box.top + box.height / 2);
      };
      const off = () => { st.hover = null; applyFocus(host, st); };
      el.addEventListener("pointerenter", to);
      el.addEventListener("focus", to);
      el.addEventListener("pointerleave", off);
      el.addEventListener("blur", off);
      el.addEventListener("click", () => {
        st.pinned = st.pinned && st.pinned.type === "flow" && st.pinned.i === i ? null : { type: "flow", i: i };
        applyFocus(host, st);
      });
    });
  }

  function same(a, b) {
    if (!a || !b) return false;
    return a.type === b.type && a.i === b.i && a.side === b.side && a.key === b.key;
  }

  function render(host, ctx) {
    if (!host || !ctx) return;
    const st = ensureState(host);
    st.ctx = ctx;
    const m = buildModel(ctx);
    st.model = m;
    const still = ctx.motion === "off";

    const digest = (ctx.logs || []).slice(0, MAX_ROWS).map(row =>
      (row && row.id) + ":" + num(row && row.tokens) + ":" + (row && row.agent) + ":" +
      (row && row.provider) + ":" + (row && row.model)).join("|");
    const w = Math.round(host.clientWidth || 0), h = Math.round(host.clientHeight || 0);
    const sig = [digest, m.flows.length, w, h, still ? "s" : "m"].join("~");

    if (m.flows.length < MIN_FLOWS || m.total <= 0) {
      if (st.sig === "empty~" + sig && host.firstChild) return;
      st.sig = "empty~" + sig;
      st.hover = null; st.pinned = null;
      st.ribs = []; st.arcs = [];
      host.innerHTML = emptyHtml(m);
      return;
    }

    if (st.sig === sig && host.firstChild) return;
    st.sig = sig;
    if (st.pinned && st.pinned.type === "flow" && !m.flows[st.pinned.i]) st.pinned = null;
    if (st.pinned && st.pinned.type === "arc" &&
        !(st.pinned.side === "a" ? m.agents : m.providers).some(n => n.key === st.pinned.key)) st.pinned = null;

    host.innerHTML = boardMarkup(m, ctx, still);
    paint(host, st, m, ctx);
    bind(host, st, m, ctx);

    // The hero stage can be display:none / zero-width on first paint; re-layout
    // when it becomes visible instead of waiting for the next data tick.
    if (!st.ro && typeof ResizeObserver === "function") {
      st.ro = new ResizeObserver(() => { st.sig = ""; render(host, st.ctx); });
      st.ro.observe(host);
    }
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["chord"] = {
    title: "流向和弦",
    eyebrow: "CHORD",
    render: render
  };
})();
