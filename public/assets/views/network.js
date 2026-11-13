/* ==========================================================================
   Magpie Observatory — hero view module: relationship network
   Standalone classic script. Registers window.ObservatoryViews["network"].

   The newest ledger rows fold into two link families — agent → provider and
   provider → model — and lay out as a deterministic force-directed graph in
   three layers (agents left, providers centre, models right). The relaxation
   is a fixed number of synchronous steps: no animation loop, no timers, and
   positions are cached per node key, so a tick that does not change the node
   set reuses the previous relaxation. Hover a node (or a route, or a list row)
   to isolate its links; click to pin the focus.
   ========================================================================== */
(function () {
  "use strict";

  /* ------------------------------------------------------------- config --- */
  const OTHER = "__other__";
  const MAX_ROWS = 80;        // newest ledger rows considered
  const TOP_AGENTS = 5;       // kept per layer before folding into 其他
  const TOP_PROVIDERS = 6;
  const TOP_MODELS = 8;
  const MIN_SHARE = 0.005;    // links below 0.5% of the routed volume are dropped
  const MIN_LINKS = 3;        // 0–2 links is not a network yet
  const LIST_N = 8;           // node rows in the side panel
  const RING = 6;             // ticks remembered when marking new routes

  // Force model. Everything runs in "unit space": x ∈ [-1, 1] across the plot
  // ellipse and y scaled to its height, so the same constants settle the same
  // way at any box size; only radii are converted from pixels.
  const ITER = 250;           // relaxation steps per node-set change
  const DAMP = 0.82;
  const VMAX = 0.045;         // velocity clamp per step
  const REP = 0.006;          // inverse-square repulsion
  const SEP = 0.55;           // extra push while two nodes overlap
  const SPRING = 0.120;       // link spring
  const REST = 0.60;          // link rest length
  const LAYER = 0.66;         // ± x of the two outer layers on the unit ellipse
  const HOLD_X = 0.16;        // column stiffness
  const HOLD_Y = 0.055;       // gentle pull towards the centre line
  const SEED_SPREAD = 1.35;   // initial vertical spread inside a layer

  const MIN_W = 200;          // below this the plot is not laid out yet
  const MIN_H = 140;
  const FS_NAME = 9.5;
  const FS_VAL = 8;
  const VALUE_R = 12;         // node radius from which the value label is shown

  // Per-host UI state (hover / pin / position cache / ring buffer) lives in a
  // closure, never on the global scope.
  const states = new WeakMap();

  /* ------------------------------------------------------------- format --- */
  function num(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }

  function count(n) {
    return String(Math.round(num(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function pct(v) { return ((Number(v) || 0) * 100).toFixed(1) + "%"; }

  function r1(v) { return Math.round(Number(v) * 10) / 10; }
  function r2(v) { return Math.round(Number(v) * 100) / 100; }

  function esc(ctx, v) { return ctx && ctx.esc ? ctx.esc(v) : String(v == null ? "" : v); }

  function hash(str) {
    let h = 2166136261;
    const s = String(str == null ? "" : str);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // Deterministic 0..1 from a key — every seed below is stable across ticks.
  function fracOf(seed) { return (seed % 99991) / 99991; }

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

  function kindLabel(kind) { return kind === "agent" ? "AGENT" : kind === "provider" ? "PROVIDER" : "MODEL"; }

  /* --------------------------------------------------------------- model --- */
  function keepTop(base, field, n) {
    const agg = new Map();
    base.forEach(l => agg.set(l[field], (agg.get(l[field]) || 0) + l.value));
    return new Set(Array.from(agg.entries())
      .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
      .slice(0, n).map(e => e[0]));
  }

  function makeNode(m, kind, id, ctx) {
    const key = kind.charAt(0) + "|" + id;
    let n = m.byKey.get(key);
    if (n) return n;
    const other = id === OTHER;
    n = {
      key: key, kind: kind, id: id, other: other, value: 0, calls: 0, share: 0,
      links: [], layer: kind === "agent" ? 0 : kind === "provider" ? 1 : 2,
      r: 6, idx: 0, x: 0, y: 0
    };
    if (kind === "model") {
      n.name = other ? "其他" : String(id);
      n.color = "var(--accent)";
      n.icon = "";
    } else {
      const meta = other ? null : (kind === "agent" ? ctx.agentMeta(id) : ctx.providerMeta(id));
      n.name = other ? "其他" : String((meta && meta.name) || id);
      n.color = other ? "var(--faint)" : String((meta && meta.color) || "var(--accent)");
      n.icon = other ? "" : String((kind === "agent" ? ctx.agentIcon(id) : ctx.providerIcon(id)) || "");
    }
    m.byKey.set(key, n);
    m.nodes.push(n);
    return n;
  }

  function buildModel(ctx) {
    const logs = Array.isArray(ctx.logs) ? ctx.logs : [];
    const m = {
      empty: true, rows: 0, logCount: logs.length, nodes: [], links: [], byKey: new Map(),
      total: 0, tokenTotal: 0, zeroTokens: false, foldShare: 0, top: null, topNodes: [],
      kinds: { agent: 0, provider: 0, model: 0 }, calls: 0
    };

    const rows = [];
    logs.slice(0, MAX_ROWS).forEach(row => {
      if (!row) return;
      rows.push({
        agent: row.agent || "unknown",
        provider: ctx.providerOfModel(row.model, row.provider) || "unknown",
        model: row.model || "—",
        tokens: num(row.tokens)
      });
    });
    m.rows = rows.length;
    m.logCount = logs.length;
    if (!rows.length) return m;

    // Routed volume = tokens. A ledger that carries no tokens at all falls back
    // to the call count, so a health-traffic window still has a shape.
    let tokenTotal = 0;
    rows.forEach(row => { tokenTotal += row.tokens; });
    m.zeroTokens = tokenTotal <= 0;
    m.tokenTotal = tokenTotal;
    m.calls = rows.length;
    const total = m.zeroTokens ? rows.length : tokenTotal;
    m.total = total;

    // 1. raw (agent, provider, model) triples
    const raw = new Map();
    rows.forEach(row => {
      const key = row.agent + "\u0000" + row.provider + "\u0000" + row.model;
      let x = raw.get(key);
      if (!x) {
        x = { agent: row.agent, provider: row.provider, model: row.model, value: 0, calls: 0, folded: false };
        raw.set(key, x);
      }
      x.value += m.zeroTokens ? 1 : row.tokens;
      x.calls += 1;
    });
    const base = Array.from(raw.values());

    // 2. keep the top N of every layer, fold the rest into 其他
    const keepA = keepTop(base, "agent", TOP_AGENTS);
    const keepP = keepTop(base, "provider", TOP_PROVIDERS);
    const keepM = keepTop(base, "model", TOP_MODELS);
    let foldedValue = 0;
    const folded = new Map();
    function fold(kind, a, p, mo, src) {
      const id = kind + "|" + (kind === "ap" ? a + "\u0000" + p : p + "\u0000" + mo);
      let l = folded.get(id);
      if (!l) {
        l = { id: id, kind: kind, a: a, p: p, m: mo, value: 0, calls: 0 };
        folded.set(id, l);
      }
      l.value += src.value;
      l.calls += src.calls;
    }
    base.forEach(l => {
      const a = keepA.has(l.agent) ? l.agent : OTHER;
      const p = keepP.has(l.provider) ? l.provider : OTHER;
      const mo = keepM.has(l.model) ? l.model : OTHER;
      if (a === OTHER || p === OTHER || mo === OTHER) { l.folded = true; foldedValue += l.value; }
      fold("ap", a, p, mo, l);
      fold("pm", a, p, mo, l);
    });
    m.foldShare = total > 0 ? foldedValue / total : 0;

    // 3. drop the long, thin tail
    const floor = total * MIN_SHARE;
    const links = Array.from(folded.values()).filter(l => l.value >= floor && l.value > 0);
    if (!links.length) return m;

    // 4. nodes, totals taken from the surviving links so every radius adds up
    links.forEach(l => {
      const aN = l.kind === "ap" ? makeNode(m, "agent", l.a, ctx) : null;
      const pN = makeNode(m, "provider", l.p, ctx);
      const mN = l.kind === "pm" ? makeNode(m, "model", l.m, ctx) : null;
      l.na = aN ? aN.key : pN.key;
      l.nb = mN ? mN.key : pN.key;
      [aN, pN, mN].forEach(n => {
        if (!n) return;
        n.value += l.value;
        n.calls += l.calls;
        n.links.push(l);
      });
    });

    // a model node borrows the colour of the provider most of its volume uses
    const dom = new Map();
    links.forEach(l => {
      if (l.kind !== "pm") return;
      const cur = dom.get(l.m);
      if (!cur || l.value > cur.value) dom.set(l.m, { value: l.value, color: l.p === OTHER ? "var(--faint)" : ctx.providerMeta(l.p).color });
    });
    m.nodes.forEach(n => {
      if (n.kind !== "model") return;
      const d = dom.get(n.id);
      n.color = d && d.color ? String(d.color) : "var(--faint)";
    });

    // 5. deterministic ranks: layer, then volume desc, then key
    m.nodes.sort((a, b) => a.layer - b.layer || b.value - a.value || String(a.key).localeCompare(String(b.key)));
    const rank = new Map();
    m.nodes.forEach((n, i) => {
      n.idx = i;
      rank.set(n.key, i);
      n.share = total > 0 ? n.value / total : 0;
      n.vtext = m.zeroTokens ? count(n.calls) + " 次" : ctx.fmtTokens(n.value);
      m.kinds[n.kind] += 1;
    });

    const maxValue = m.nodes.reduce((a, n) => Math.max(a, n.value), 0) || 1;
    m.nodes.forEach(n => { n.r = 6 + Math.sqrt(n.value / maxValue) * 12; });

    links.forEach(l => {
      l.share = total > 0 ? l.value / total : 0;
      const pN = m.byKey.get("p|" + l.p);
      l.color = pN ? pN.color : "var(--faint)";
      l.text = l.kind === "ap"
        ? m.byKey.get("a|" + l.a).name + " → " + pN.name
        : pN.name + " → " + m.byKey.get("m|" + l.m).name;
      l.w = Math.min(5, 1 + Math.sqrt(l.share) * 8);
      l.o = Math.min(0.58, 0.13 + l.share * 1.5);
    });
    links.sort((x, y) =>
      (x.kind === y.kind ? 0 : x.kind === "ap" ? -1 : 1) ||
      rank.get(x.na) - rank.get(y.na) ||
      rank.get(x.nb) - rank.get(y.nb) ||
      String(x.id).localeCompare(String(y.id)));
    links.forEach((l, i) => { l.i = i; });
    m.links = links;
    m.top = links.reduce((a, l) => (!a || l.value > a.value ? l : a), null);
    m.topNodes = m.nodes.slice().sort((a, b) => b.value - a.value || String(a.key).localeCompare(String(b.key))).slice(0, LIST_N);
    m.empty = false;
    return m;
  }

  /* -------------------------------------------------------------- layout --- */
  // One relaxation for a fixed node set. Returns unit-space positions keyed by
  // node key; `cached` warms the start so a resize does not reshuffle the graph.
  function relax(m, rx, ry, cached) {
    const nodes = m.nodes;
    const n = nodes.length;
    const unit = Math.max(1, Math.min(rx, ry));
    const layerCount = [0, 0, 0], layerSeen = [0, 0, 0];
    nodes.forEach(nd => { layerCount[nd.layer] += 1; });
    nodes.forEach(nd => {
      const c = cached && cached.get(nd.key);
      // A very short plot would otherwise blow the radii up in unit space.
      nd.nr = Math.min(0.24, nd.r / unit);
      nd.hold = nd.layer === 0 ? -LAYER : nd.layer === 2 ? LAYER : 0;
      if (c) {
        nd.nx = c.x; nd.ny = c.y;
      } else {
        const slot = layerSeen[nd.layer]++;
        const t = layerCount[nd.layer] > 1 ? (slot + 0.5) / layerCount[nd.layer] : 0.5;
        nd.nx = nd.hold + (fracOf(hash(nd.key + "#x")) - 0.5) * 0.10;
        nd.ny = (t - 0.5) * SEED_SPREAD + (fracOf(hash(nd.key + "#y")) - 0.5) * 0.08;
      }
      nd.vx = 0; nd.vy = 0;
    });

    for (let it = 0; it < ITER; it++) {
      // repulsion between every pair, with a soft floor while they overlap
      for (let i = 0; i < n; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < n; j++) {
          const b = nodes[j];
          let dx = b.nx - a.nx, dy = b.ny - a.ny;
          let d2 = dx * dx + dy * dy;
          if (d2 < 1e-7) {
            const t = fracOf(hash(a.key + "/" + b.key));
            dx = (t - 0.5) * 0.02; dy = (1 - t - 0.5) * 0.02;
            d2 = dx * dx + dy * dy || 1e-7;
          }
          const d = Math.sqrt(d2);
          const min = a.nr + b.nr + 0.055 + (a.layer === b.layer ? 0.03 : 0);
          const f = REP / d2 + (d < min ? (min - d) * SEP : 0);
          const ux = dx / d * f, uy = dy / d * f;
          a.vx -= ux; a.vy -= uy;
          b.vx += ux; b.vy += uy;
        }
      }
      // springs along the links
      for (let i = 0; i < m.links.length; i++) {
        const l = m.links[i];
        const a = m.byKey.get(l.na), b = m.byKey.get(l.nb);
        let dx = b.nx - a.nx, dy = b.ny - a.ny;
        const d = Math.sqrt(dx * dx + dy * dy) || 1e-6;
        const f = (d - REST) * SPRING;
        const ux = dx / d * f, uy = dy / d * f;
        a.vx += ux; a.vy += uy;
        b.vx -= ux; b.vy -= uy;
      }
      // column hold + integrate + keep inside the ellipse
      for (let i = 0; i < n; i++) {
        const nd = nodes[i];
        nd.vx += (nd.hold - nd.nx) * HOLD_X;
        nd.vy += (0 - nd.ny) * HOLD_Y;
        nd.vx *= DAMP; nd.vy *= DAMP;
        if (nd.vx > VMAX) nd.vx = VMAX; else if (nd.vx < -VMAX) nd.vx = -VMAX;
        if (nd.vy > VMAX) nd.vy = VMAX; else if (nd.vy < -VMAX) nd.vy = -VMAX;
        nd.nx += nd.vx; nd.ny += nd.vy;
        const lim = Math.max(0.05, 1 - nd.nr - 0.012);
        const d = Math.sqrt(nd.nx * nd.nx + nd.ny * nd.ny);
        if (d > lim) { nd.nx = nd.nx / d * lim; nd.ny = nd.ny / d * lim; }
      }
    }

    const pos = new Map();
    nodes.forEach(nd => pos.set(nd.key, { x: nd.nx, y: nd.ny }));
    return pos;
  }

  function layout(st, m, ctx) {
    const plot = st.plot;
    if (!plot) return;
    const w = Math.round(plot.clientWidth || 0);
    const h = Math.round(plot.clientHeight || 0);
    if (w < MIN_W || h < MIN_H) {
      plot.innerHTML = '<div class="net-pending"></div>';
      st.nodeEls = []; st.linkEls = [];
      return;
    }

    // the ellipse covers the node field; the pads hold the outside labels
    let wl = 0, wr = 0;
    m.nodes.forEach(n => {
      const tw = Math.max(textW(n.name, FS_NAME), n.r >= VALUE_R ? textW(n.vtext, FS_VAL) : 0);
      if (n.kind === "agent") wl = Math.max(wl, tw);
      else if (n.kind === "model") wr = Math.max(wr, tw);
    });
    const padL = Math.min(Math.round(w * 0.26), Math.max(30, Math.round(wl) + 26));
    const padR = Math.min(Math.round(w * 0.30), Math.max(30, Math.round(wr) + 24));
    const padT = 28, padB = 18;
    const cx = padL + Math.max(20, w - padL - padR) / 2;
    const cy = padT + Math.max(20, h - padT - padB) / 2;
    const rx = Math.max(22, (w - padL - padR) / 2);
    const ry = Math.max(20, (h - padT - padB) / 2);

    const posSig = m.nodes.map(n => n.key + ":" + Math.round(n.r * 2)).join(",") +
      "|" + Math.round(rx) + "x" + Math.round(ry);
    if (st.posSig !== posSig) {
      st.pos = relax(m, rx, ry, st.pos);
      st.posSig = posSig;
    }
    const ring = st.ring;
    const fresh = ring.length ? new Set(m.links.map(l => l.id).filter(id => !ring[ring.length - 1].has(id))) : null;

    m.nodes.forEach(n => {
      const p = (st.pos && st.pos.get(n.key)) || { x: n.hold, y: 0 };
      n.nx = p.x; n.ny = p.y;
      n.x = cx + p.x * rx;
      n.y = cy + p.y * ry;
    });

    let out = '<svg class="net-svg" viewBox="0 0 ' + w + " " + h + '" width="100%" height="100%" ' +
      'preserveAspectRatio="xMidYMid meet" role="img" aria-label="关系网络：agent → provider → model">';
    out += '<g class="net-links">';
    m.links.forEach(l => {
      const a = m.byKey.get(l.na), b = m.byKey.get(l.nb);
      out += '<line class="net-link' + (fresh && fresh.has(l.id) ? " is-new" : "") + '" data-i="' + l.i +
        '" x1="' + r1(a.x) + '" y1="' + r1(a.y) + '" x2="' + r1(b.x) + '" y2="' + r1(b.y) +
        '" style="--c:' + l.color + ";--w:" + r2(l.w) + ";--o:" + r2(l.o) +
        ";--i:" + (l.i % 24) + '"/>';
    });
    out += '</g><g class="net-nodes">';
    m.nodes.forEach(n => {
      const side = n.kind === "agent" ? "left" : n.kind === "model" ? "right" : "above";
      // label offsets are relative to the node origin: the group is translated
      const lx = side === "left" ? -(n.r + 7) : side === "right" ? n.r + 7 : 0;
      const ly = side === "above" ? -(n.r + 5) : 3.2;
      const anchor = side === "left" ? "end" : side === "right" ? "start" : "middle";
      const showVal = n.r >= VALUE_R;
      const vy = side === "above" ? ly - 9.5 : ly + 9.5;
      out += '<g class="net-node" data-kind="' + n.kind + '" data-key="' + esc(ctx, n.key) + '"' +
        ' tabindex="0" role="button" aria-label="' + esc(ctx, kindLabel(n.kind) + " " + n.name + " · " + n.vtext) + '"' +
        ' style="transform:translate(' + r1(n.x) + 'px,' + r1(n.y) + 'px);--c:' + n.color + ';--i:' + n.idx + '">';
      out += '<circle class="net-halo" r="' + r1(n.r + 4) + '"/>';
      out += '<circle class="net-dot" r="' + r1(n.r) + '"/>';
      if (n.icon && n.r >= 9) {
        out += '<image class="net-icon" x="' + r1(-n.r * 0.62) + '" y="' + r1(-n.r * 0.62) + '" width="' +
          r1(n.r * 1.24) + '" height="' + r1(n.r * 1.24) + '" href="' + esc(ctx, n.icon) + '"/>';
      } else if (!n.icon && n.r >= 9) {
        out += '<text class="net-initial" y="0.5">' + esc(ctx, String(n.name).charAt(0).toUpperCase()) + "</text>";
      }
      out += '<text class="net-label" x="' + r1(lx) + '" y="' + r1(ly) + '" text-anchor="' + anchor + '">' +
        esc(ctx, n.name) + "</text>";
      if (showVal) {
        out += '<text class="net-val" x="' + r1(lx) + '" y="' + r1(vy) + '" text-anchor="' + anchor + '">' +
          esc(ctx, n.vtext) + "</text>";
      }
      out += "</g>";
    });
    out += "</g></svg>";

    plot.innerHTML = out;
    st.nodeEls = Array.from(plot.querySelectorAll(".net-node"));
    st.linkEls = Array.from(plot.querySelectorAll(".net-link"));
  }

  /* ------------------------------------------------------------- markup --- */
  function statsMarkup(m, ctx) {
    const zero = m.zeroTokens;
    return '<div class="net-stats">' +
      '<div class="net-stat"><span>节点</span><b>' + count(m.nodes.length) + "</b><small>" +
        m.kinds.agent + " agent · " + m.kinds.provider + " provider · " + m.kinds.model + " model</small></div>" +
      '<div class="net-stat"><span>链路</span><b>' + count(m.links.length) + "</b><small>占比 ≥ 0.5%</small></div>" +
      '<div class="net-stat"><span>TOKENS</span><b>' + esc(ctx, zero ? "—" : ctx.fmtTokens(m.tokenTotal)) + "</b><small>" +
        esc(ctx, zero ? count(m.calls) + " 次调用 · 账本为 0" : count(m.calls) + " 次调用") + "</small></div>" +
      '<div class="net-stat"><span>折叠</span><b>' + pct(m.foldShare) + "</b><small>未进 Top 的流量</small></div>" +
      "</div>";
  }

  function listMarkup(m, ctx) {
    const rows = m.topNodes.map(n =>
      '<button type="button" class="net-row" data-key="' + esc(ctx, n.key) + '" aria-pressed="false" title="' +
        esc(ctx, kindLabel(n.kind) + " " + n.name + " · " + n.vtext + " · " + pct(n.share)) + '">' +
        '<span class="net-dot-s" style="--c:' + n.color + '"></span>' +
        '<span class="net-kind">' + kindLabel(n.kind) + "</span>" +
        '<span class="net-name">' + esc(ctx, n.name) + "</span>" +
        '<span class="net-cell">' + esc(ctx, n.vtext) + "</span>" +
        '<span class="net-cell net-share">' + pct(n.share) + "</span>" +
        "</button>").join("");
    return '<div class="net-table">' +
      '<div class="net-row net-row-head"><span></span><span></span><span>节点</span><span>TOKENS</span><span>占比</span></div>' +
      (rows || '<div class="net-row net-row-empty">暂无节点</div>') +
      "</div>";
  }

  function boardMarkup(m, ctx, motion) {
    const anim = motion === "off" ? "" : motion === "soft" ? " net-anim net-soft" : " net-anim";
    return '<div class="net-board' + anim + '">' +
      '<div class="net-main">' +
        '<div class="net-head"><span><b>NETWORK</b> · 关系网络</span>' +
        '<span>' + count(m.nodes.length) + " 节点 · " + count(m.links.length) + " 链路 · 最新 " + count(m.rows) + " 条</span></div>" +
        '<div class="net-plot"></div>' +
      "</div>" +
      '<aside class="net-side">' +
        '<div class="net-side-head"><span><b>NETWORK</b></span><span>最新 ' + count(m.rows) + " 条</span></div>" +
        statsMarkup(m, ctx) +
        (m.top ? '<div class="net-toproute">' +
          '<span class="net-toproute-key">主干路由</span>' +
          '<span class="net-toproute-name" title="' + esc(ctx, m.top.text) + '">' + esc(ctx, m.top.text) + "</span>" +
          "<b>" + pct(m.top.share) + "</b></div>" : "") +
        listMarkup(m, ctx) +
        '<div class="net-legend">' +
          '<span class="net-legend-key"><i></i>节点配色 = agent / provider 品牌</span>' +
          '<span class="net-legend-key"><i class="net-key-line"></i>链路配色 = provider</span>' +
          '<span class="net-legend-note">悬停高亮 · 点击固定 · 点空白清除</span>' +
        "</div>" +
      "</aside>" +
      "</div>" +
      '<div class="net-tip" hidden></div>';
  }

  function emptyMarkup(m) {
    return '<div class="net-empty">' +
      "<b>关系网络还没有足够的链路</b>" +
      "<span>把账本里最新的请求拆成 <code>agent → provider</code> 与 <code>provider → model</code> 两族链路，占比 ≥ 0.5% 且链路数 ≥ 3 时才铺开力导向布局。</span>" +
      "<span>当前窗口聚合出 " + count(m.links.length) + " 条链路 · " + count(m.nodes.length) + " 个节点，出现更多不同路由就会自动展开。</span>" +
      '<span class="net-empty-note">需要 ≥ 3 条链路 · 当前 ' + count(m.links.length) + " 条</span>" +
      "</div>";
  }

  /* -------------------------------------------------------------- focus --- */
  function focusSet(m, focus) {
    const nodes = new Set(), links = new Set();
    if (!focus) return { nodes: nodes, links: links };
    if (focus.type === "link") {
      const l = m.links[focus.i];
      if (!l) return { nodes: nodes, links: links };
      links.add(l.i);
      nodes.add(l.na); nodes.add(l.nb);
      return { nodes: nodes, links: links };
    }
    const n = m.byKey.get(focus.key);
    if (!n) return { nodes: nodes, links: links };
    nodes.add(n.key);
    n.links.forEach(l => { links.add(l.i); nodes.add(l.na); nodes.add(l.nb); });
    return { nodes: nodes, links: links };
  }

  function sameFocus(a, b) {
    if (!a || !b) return a === b;
    return a.type === b.type && a.key === b.key && a.i === b.i;
  }

  function effectiveFocus(st) { return st.hover || st.pinned; }

  function applyFocus(host, st) {
    const m = st.model;
    if (!m) return;
    const f = effectiveFocus(st);
    const set = focusSet(m, f);
    st.nodeEls.forEach(el => {
      const on = set.nodes.has(el.dataset.key);
      el.classList.toggle("is-hot", !!f && on);
      el.classList.toggle("is-fade", !!f && !on);
      el.classList.toggle("is-pinned", !!st.pinned && st.pinned.type === "node" && st.pinned.key === el.dataset.key);
    });
    st.linkEls.forEach(el => {
      const i = Number(el.dataset.i);
      const on = set.links.has(i);
      el.classList.toggle("is-hot", !!f && on);
      el.classList.toggle("is-fade", !!f && !on);
      el.classList.toggle("is-pinned", !!st.pinned && st.pinned.type === "link" && st.pinned.i === i);
    });
    Array.from(host.querySelectorAll(".net-row")).forEach(el => {
      if (!el.dataset.key) return;
      const on = !!f && f.type === "node" && f.key === el.dataset.key;
      el.classList.toggle("is-on", on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  /* ------------------------------------------------------------ tooltip --- */
  function showTip(host, st, ctx, html, cx, cy) {
    const tip = host.querySelector(".net-tip");
    if (!tip) return;
    if (!html) { tip.hidden = true; return; }
    tip.innerHTML = html;
    tip.hidden = false;
    const box = host.getBoundingClientRect();
    tip.style.left = (ctx.clamp ? ctx.clamp(cx - box.left, 92, Math.max(92, box.width - 92)) : cx) + "px";
    tip.style.top = (ctx.clamp ? ctx.clamp(cy - box.top - 14, 62, Math.max(62, host.clientHeight - 8)) : cy) + "px";
  }

  function nodeTip(n, m, ctx) {
    const partners = m.links.filter(l => l.na === n.key || l.nb === n.key)
      .sort((a, b) => b.value - a.value).slice(0, 2)
      .map(l => (l.na === n.key ? m.byKey.get(l.nb) : m.byKey.get(l.na)).name);
    return "<b>" + esc(ctx, n.name) + "</b>" +
      "<span>" + kindLabel(n.kind) + " · " + n.links.length + " 条链路</span>" +
      "<span>" + esc(ctx, m.zeroTokens ? count(n.calls) + " 次调用" : ctx.fmtTokens(n.value) + " tokens") +
      " · 占比 " + pct(n.share) + "</span>" +
      (partners.length ? "<span>主要对手 " + esc(ctx, partners.join(" / ")) + "</span>" : "");
  }

  function linkTip(l, m, ctx) {
    return "<b>" + esc(ctx, l.text) + "</b>" +
      "<span>" + (l.kind === "ap" ? "AGENT → PROVIDER" : "PROVIDER → MODEL") + " · " + count(l.calls) + " 次请求</span>" +
      "<span>" + esc(ctx, m.zeroTokens ? count(l.calls) + " 次调用（账本 token 为 0）" : ctx.fmtTokens(l.value) + " tokens") +
      " · 占比 " + pct(l.share) + "</span>";
  }

  /* --------------------------------------------------------------- bind --- */
  function bind(host, st, m, ctx) {
    const board = host.firstElementChild;
    const svg = host.querySelector(".net-svg");
    if (!board) return;

    const clear = () => {
      if (!st.hover) return;
      st.hover = null;
      applyFocus(host, st);
      showTip(host, st, ctx, null);
    };
    const pin = focus => {
      st.pinned = sameFocus(st.pinned, focus) ? null : focus;
      applyFocus(host, st);
    };

    if (svg) {
      svg.addEventListener("pointermove", e => {
        const nodeEl = e.target.closest ? e.target.closest(".net-node") : null;
        const linkEl = nodeEl ? null : (e.target.closest ? e.target.closest(".net-link") : null);
        if (nodeEl) {
          const focus = { type: "node", key: nodeEl.dataset.key, i: -1 };
          st.hover = focus;
          applyFocus(host, st);
          showTip(host, st, ctx, nodeTip(m.byKey.get(focus.key), m, ctx), e.clientX, e.clientY);
        } else if (linkEl) {
          const focus = { type: "link", i: Number(linkEl.dataset.i), key: "" };
          st.hover = focus;
          applyFocus(host, st);
          showTip(host, st, ctx, linkTip(m.links[focus.i], m, ctx), e.clientX, e.clientY);
        } else {
          clear();
        }
      });
      svg.addEventListener("pointerleave", clear);
      svg.addEventListener("click", e => {
        const nodeEl = e.target.closest ? e.target.closest(".net-node") : null;
        const linkEl = nodeEl ? null : (e.target.closest ? e.target.closest(".net-link") : null);
        if (nodeEl) pin({ type: "node", key: nodeEl.dataset.key, i: -1 });
        else if (linkEl) pin({ type: "link", i: Number(linkEl.dataset.i), key: "" });
        else { st.pinned = null; applyFocus(host, st); showTip(host, st, ctx, null); }
      });
      svg.addEventListener("keydown", e => {
        if (e.key === "Escape") { st.pinned = null; applyFocus(host, st); return; }
        if (e.key !== "Enter" && e.key !== " ") return;
        const nodeEl = e.target.closest ? e.target.closest(".net-node") : null;
        if (!nodeEl) return;
        e.preventDefault();
        pin({ type: "node", key: nodeEl.dataset.key, i: -1 });
        st.hover = { type: "node", key: nodeEl.dataset.key, i: -1 };
        applyFocus(host, st);
      });
      svg.addEventListener("focusin", e => {
        const nodeEl = e.target.closest ? e.target.closest(".net-node") : null;
        if (!nodeEl) return;
        st.hover = { type: "node", key: nodeEl.dataset.key, i: -1 };
        applyFocus(host, st);
        const nodeBox = nodeEl.getBoundingClientRect();
        showTip(host, st, ctx, nodeTip(m.byKey.get(nodeEl.dataset.key), m, ctx),
          nodeBox.left + nodeBox.width / 2, nodeBox.top + 18);
      });
      svg.addEventListener("focusout", clear);
    }

    Array.from(board.querySelectorAll(".net-row")).forEach(el => {
      if (!el.dataset.key) return;
      const focus = { type: "node", key: el.dataset.key, i: -1 };
      el.addEventListener("pointerenter", () => { st.hover = focus; applyFocus(host, st); });
      el.addEventListener("pointerleave", () => { st.hover = null; applyFocus(host, st); });
      el.addEventListener("focus", () => { st.hover = focus; applyFocus(host, st); });
      el.addEventListener("blur", () => { st.hover = null; applyFocus(host, st); });
      el.addEventListener("click", () => { st.hover = null; pin(focus); });
    });
  }

  /* ------------------------------------------------------------- render --- */
  function ensureState(host) {
    let st = states.get(host);
    if (!st) {
      st = {
        sig: "", hover: null, pinned: null, model: null, ctx: null, ro: null, plot: null,
        pos: null, posSig: "", nodeEls: [], linkEls: [], ring: [], motion: "full"
      };
      states.set(host, st);
    }
    return st;
  }

  function obs(host, st) {
    if (st.ro || typeof ResizeObserver !== "function") return;
    st.ro = new ResizeObserver(() => { st.sig = ""; render(host, st.ctx); });
    st.ro.observe(host);
  }

  function render(host, ctx) {
    if (!host || !ctx) return;
    const st = ensureState(host);
    st.ctx = ctx;
    const motion = ctx.motion || "full";
    st.motion = motion;
    const m = buildModel(ctx);
    st.model = m;

    const digest = (ctx.logs || []).slice(0, MAX_ROWS)
      .map(row => (row && row.id) + ":" + num(row && row.tokens) + ":" + (row && row.status) + ":" +
        (row && row.agent) + ":" + (row && row.provider) + ":" + (row && row.model))
      .join("|");
    const w = Math.round(host.clientWidth || 0), h = Math.round(host.clientHeight || 0);
    const sig = [digest, w, h, motion, m.links.length].join("~");

    if (m.links.length < MIN_LINKS) {
      obs(host, st);
      if (st.sig === "empty~" + sig && host.firstChild) return;
      st.sig = "empty~" + sig;
      st.hover = null; st.pinned = null; st.pos = null; st.posSig = "";
      st.nodeEls = []; st.linkEls = []; st.plot = null;
      host.innerHTML = emptyMarkup(m);
      return;
    }

    if (st.sig === sig && host.firstChild) return;
    st.sig = sig;
    st.hover = null;
    if (st.pinned && st.pinned.type === "link" && !m.links[st.pinned.i]) st.pinned = null;
    if (st.pinned && st.pinned.type === "node" && !m.byKey.has(st.pinned.key)) st.pinned = null;

    host.innerHTML = boardMarkup(m, ctx, motion);
    st.plot = host.querySelector(".net-plot");
    layout(st, m, ctx);
    // Ring buffer of the recent link sets: a route that was not there last tick
    // is marked as new instead of quietly appearing.
    st.ring.push(new Set(m.links.map(l => l.id)));
    while (st.ring.length > RING) st.ring.shift();
    applyFocus(host, st);
    bind(host, st, m, ctx);
    obs(host, st);
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["network"] = {
    title: "关系网络",
    eyebrow: "RELATION GRAPH",
    render: render
  };
})();
