/* ==========================================================================
   Magpie Observatory — hero view module: routing flow (alluvial / sankey)
   Standalone classic script. Registers window.ObservatoryViews["sankey"].

   Three columns — agent → provider → model — joined by cubic Bézier ribbons.
   Ribbon width is the routed token volume (calls when the ledger carries no
   tokens), ribbon colour is the provider brand. Hover a route row, a ribbon or
   a node to isolate it; everything else fades.
   ========================================================================== */
(function () {
  "use strict";

  const OTHER = "__other__";
  const TOP_N = 5;          // agents / providers / models kept before folding
  const MAX_ROWS = 80;      // newest ledger rows considered
  const MIN_SHARE = 0.005;  // links below 0.5% of the routed volume are dropped
  const MIN_LINKS = 2;      // 0–1 links has nothing to lay out; 2 is already a flow
  const NODE_W = 11;
  const PAD_T = 26;
  const PAD_B = 16;
  const FS_NAME = 9.5;
  const FIELDS = ["agent", "provider", "model"];

  // Per-host UI state (hover / pin / signature) lives in closures, never global.
  const states = new WeakMap();

  /* ------------------------------------------------------------- format --- */
  function num(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }

  function count(n) {
    return String(Math.round(num(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function pct(v) { return ((Number(v) || 0) * 100).toFixed(1) + "%"; }

  function r(v) { return (Math.round(v * 10) / 10).toString(); }

  // Rough glyph width: CJK/full-width glyphs are square, latin ~0.56em. Enough
  // to reserve column padding without a DOM measuring pass.
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

  function ribbon(x1, y1, x2, y2) {
    const mx = (x1 + x2) / 2;
    return "M" + r(x1) + " " + r(y1) + "C" + r(mx) + " " + r(y1) + " " + r(mx) + " " + r(y2) + " " + r(x2) + " " + r(y2);
  }

  /* --------------------------------------------------------------- model --- */
  function buildNodes(links, field, nameOf, colorOf, iconOf) {
    const map = new Map();
    links.forEach(l => {
      const k = l[field];
      let n = map.get(k);
      if (!n) { n = { key: k, value: 0, calls: 0, color: "", icon: "" }; map.set(k, n); }
      n.value += l.value;
      n.calls += l.calls;
    });
    const arr = Array.from(map.values());
    arr.forEach(n => {
      n.other = n.key === OTHER;
      n.name = n.other ? "其他" : String(nameOf(n.key) || n.key);
      n.color = n.other ? "" : String(colorOf(n.key) || "");
      n.icon = n.other ? "" : String(iconOf(n.key) || "");
    });
    // Deterministic: volume desc, ties by key. 其他 always last.
    arr.sort((a, b) => {
      if (a.other !== b.other) return a.other ? 1 : -1;
      return b.value - a.value || String(a.key).localeCompare(String(b.key));
    });
    arr.forEach((n, i) => { n.idx = i; });
    return arr;
  }

  function buildModel(ctx) {
    const logs = Array.isArray(ctx.logs) ? ctx.logs : [];
    const rows = [];
    logs.slice(0, MAX_ROWS).forEach(row => {
      if (!row) return;
      rows.push({
        agent: row.agent || "unknown",
        provider: ctx.providerOfModel(row.model, row.provider) || "unknown",
        model: row.model || "—",
        status: row.status || "ok",
        tokens: num(row.tokens)
      });
    });

    const m = {
      rows: rows.length, logCount: logs.length, links: [], routes: [], top: null,
      cols: { a: [], p: [], m: [] }, total: 0, tokenTotal: 0, zeroTokens: false,
      retryCount: 0, errCount: 0, rerouteShare: 0
    };
    if (!rows.length) return m;

    // Routed volume = tokens. A row with no token usage (auxiliary or health
    // traffic) still counts as one typical call so it stays in the flow, and a
    // ledger with no tokens at all falls back to request counts.
    let real = 0, withTokens = 0;
    rows.forEach(row => {
      real += row.tokens;
      if (row.tokens > 0) withTokens += 1;
    });
    m.zeroTokens = real <= 0;
    const perCall = withTokens ? real / withTokens : 1;
    let volume = 0;
    rows.forEach(row => {
      row.value = m.zeroTokens ? 1 : (row.tokens > 0 ? row.tokens : perCall);
      volume += row.value;
    });
    m.total = volume;
    m.tokenTotal = m.zeroTokens ? rows.length : real;

    // 1. aggregate the raw (agent, provider, model) triples
    const raw = new Map();
    rows.forEach(row => {
      const k = row.agent + "\u0000" + row.provider + "\u0000" + row.model;
      let l = raw.get(k);
      if (!l) {
        l = { agent: row.agent, provider: row.provider, model: row.model, value: 0, calls: 0 };
        raw.set(k, l);
      }
      l.value += row.value;
      l.calls += 1;
    });
    const base = Array.from(raw.values());

    // 2. keep the top 5 of every column, fold the rest into 其他, re-aggregate
    const keep = FIELDS.map(field => {
      const agg = new Map();
      base.forEach(l => agg.set(l[field], (agg.get(l[field]) || 0) + l.value));
      return new Set(Array.from(agg.entries())
        .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
        .slice(0, TOP_N).map(e => e[0]));
    });
    const folded = new Map();
    base.forEach(l => {
      const vals = FIELDS.map((field, i) => keep[i].has(l[field]) ? l[field] : OTHER);
      const k = vals.join("\u0000");
      let x = folded.get(k);
      if (!x) {
        x = { agent: vals[0], provider: vals[1], model: vals[2], value: 0, calls: 0 };
        folded.set(k, x);
      }
      x.value += l.value;
      x.calls += l.calls;
    });

    // 3. drop the long, thin tail
    const floor = m.total * MIN_SHARE;
    const links = Array.from(folded.values()).filter(l => l.value >= floor);
    links.forEach(l => { l.share = l.value / m.total; });

    // 4. nodes (totals come from the surviving links so heights always add up)
    const aCol = buildNodes(links, "agent",
      k => ctx.agentMeta(k).name, k => ctx.agentMeta(k).color, k => ctx.agentMeta(k).icon);
    const pCol = buildNodes(links, "provider",
      k => ctx.providerMeta(k).name, k => ctx.providerMeta(k).color, k => ctx.providerMeta(k).icon);
    const mCol = buildNodes(links, "model", k => k, () => "", () => "");

    // a model node borrows the colour of the provider most of its volume uses
    const dom = new Map();
    links.forEach(l => {
      const cur = dom.get(l.model);
      if (!cur || l.value > cur.value) dom.set(l.model, { value: l.value, color: l.provider === OTHER ? "" : ctx.providerMeta(l.provider).color });
    });
    mCol.forEach(n => {
      const d = dom.get(n.key);
      n.color = d && d.color ? d.color : (n.other ? "" : "var(--accent)");
    });

    [aCol, pCol, mCol].forEach(col => col.forEach(n => {
      n.vtext = m.zeroTokens ? count(n.calls) + " 次" : ctx.fmtTokens(n.value);
    }));
    m.cols.a = aCol; m.cols.p = pCol; m.cols.m = mCol;

    // 5. deterministic link order (each node column is already deterministic)
    const pos = {
      agent: new Map(aCol.map((n, i) => [n.key, i])),
      provider: new Map(pCol.map((n, i) => [n.key, i])),
      model: new Map(mCol.map((n, i) => [n.key, i]))
    };
    links.sort((x, y) =>
      pos.agent.get(x.agent) - pos.agent.get(y.agent) ||
      pos.provider.get(x.provider) - pos.provider.get(y.provider) ||
      pos.model.get(x.model) - pos.model.get(y.model));
    links.forEach((l, i) => { l.i = i; });
    m.links = links;

    // 6. top routes + headline numbers
    m.routes = links.slice().sort((a, b) => b.value - a.value || a.i - b.i).slice(0, 5);
    m.top = m.routes[0] || null;
    rows.forEach(row => {
      if (row.status === "retry") m.retryCount += 1;
      else if (row.status === "err") m.errCount += 1;
    });
    m.rerouteShare = (m.retryCount + m.errCount) / rows.length;
    return m;
  }

  /* ------------------------------------------------------------ geometry --- */
  // Height ∝ value with a floor; the slack is spread as gaps between nodes.
  function stackColumn(nodes, top, avail, minH) {
    const n = nodes.length;
    if (!n) return;
    const sum = nodes.reduce((a, x) => a + x.value, 0) || 1;
    const flex = Math.max(0, avail - minH * n);
    nodes.forEach(x => { x.h = Math.max(2, minH + (x.value / sum) * flex); });
    const used = nodes.reduce((a, x) => a + x.h, 0);
    const gap = n > 1 ? Math.max(0, (avail - used) / (n - 1)) : 0;
    let y = top + (n > 1 ? 0 : Math.max(0, (avail - used) / 2));
    nodes.forEach(x => {
      x.top = y;
      x.cy = y + x.h / 2;
      x.bottom = y + x.h;
      y += x.h + gap;
    });
    // Vertical room around a node: used to decide whether the count line fits.
    nodes.forEach((x, i) => {
      const nextD = i < n - 1 ? nodes[i + 1].top - x.top : Infinity;
      const prevD = i > 0 ? x.top - nodes[i - 1].top : Infinity;
      x.pitch = Math.min(nextD, prevD);
    });
  }

  // Distribute a node's own links into stacked bands filling its height.
  function ports(node, list, yField, hField) {
    const sum = list.reduce((a, l) => a + l.value, 0) || 1;
    let run = node.top;
    list.forEach(l => {
      const h = Math.max(0.7, (l.value / sum) * node.h);
      l[yField] = run + h / 2;
      l[hField] = h;
      run += h;
    });
  }

  function stackPorts(m) {
    const posA = new Map(m.cols.a.map((n, i) => [n.key, i]));
    const posP = new Map(m.cols.p.map((n, i) => [n.key, i]));
    const posM = new Map(m.cols.m.map((n, i) => [n.key, i]));
    const byAgent = new Map(), byProvider = new Map(), byModel = new Map();
    m.links.forEach(l => {
      if (!byAgent.has(l.agent)) byAgent.set(l.agent, []);
      byAgent.get(l.agent).push(l);
      if (!byProvider.has(l.provider)) byProvider.set(l.provider, []);
      byProvider.get(l.provider).push(l);
      if (!byModel.has(l.model)) byModel.set(l.model, []);
      byModel.get(l.model).push(l);
    });
    byAgent.forEach((list, key) => {
      list.sort((a, b) => posP.get(a.provider) - posP.get(b.provider) || posM.get(a.model) - posM.get(b.model));
      ports(m.cols.a[posA.get(key)], list, "aY", "aH");
    });
    byProvider.forEach((list, key) => {
      const node = m.cols.p[posP.get(key)];
      list.sort((a, b) => posA.get(a.agent) - posA.get(b.agent) || posM.get(a.model) - posM.get(b.model));
      ports(node, list, "piY", "piH");
      list.sort((a, b) => posM.get(a.model) - posM.get(b.model) || posA.get(a.agent) - posA.get(b.agent));
      ports(node, list, "poY", "poH");
    });
    byModel.forEach((list, key) => {
      list.sort((a, b) => posP.get(a.provider) - posP.get(b.provider) || posA.get(a.agent) - posA.get(b.agent));
      ports(m.cols.m[posM.get(key)], list, "mY", "mH");
    });
  }

  /* -------------------------------------------------------------- markup --- */
  function colorOf(l, ctx) {
    return l.provider === OTHER ? "var(--muted)" : ctx.providerMeta(l.provider).color;
  }

  function nameOf(l, ctx) {
    return [
      l.agent === OTHER ? "其他" : ctx.agentMeta(l.agent).name,
      l.provider === OTHER ? "其他" : ctx.providerMeta(l.provider).name,
      l.model === OTHER ? "其他" : l.model
    ];
  }

  function routeText(l, ctx) { return nameOf(l, ctx).join(" → "); }

  function linkMarkup(l, xs, ctx) {
    const color = colorOf(l, ctx);
    const d1 = ribbon(xs.aRight, l.aY, xs.p, l.piY);
    const d2 = ribbon(xs.pRight, l.poY, xs.m, l.mY);
    const w1 = Math.max(0.9, l.aH), w2 = Math.max(0.9, l.poH);
    const i = l.i;
    return '<g class="sankey-link-g" data-link="' + i + '" style="--i:' + i + '">' +
      '<path class="sankey-hit" data-link="' + i + '" d="' + d1 + '" style="stroke-width:' + r(Math.max(8, w1 + 6)) + '"/>' +
      '<path class="sankey-hit" data-link="' + i + '" d="' + d2 + '" style="stroke-width:' + r(Math.max(8, w2 + 6)) + '"/>' +
      '<path class="sankey-link" data-link="' + i + '" d="' + d1 + '" style="stroke:' + color + ';stroke-width:' + r(w1) + '"/>' +
      '<path class="sankey-link" data-link="' + i + '" d="' + d2 + '" style="stroke:' + color + ';stroke-width:' + r(w2) + '"/>' +
      '</g>';
  }

  function nodeMarkup(node, col, xs, ctx) {
    const x = col === "a" ? xs.a : col === "p" ? xs.p : xs.m;
    const top = node.top, h = Math.max(2, node.h), cy = top + h / 2;
    const color = node.color || "var(--muted)";
    const left = col !== "m";                        // models read to the right
    const anchor = left ? "end" : "start";
    const lx = left ? x - 9 : x + NODE_W + 9;
    const room = left ? x - 18 : xs.w - (x + NODE_W) - 18;
    const name = clip(node.name, Math.max(36, room), FS_NAME);
    // Two line labels (name + count) only where the neighbouring nodes leave
    // enough vertical room; otherwise the count line would collide.
    const two = h >= 16 && (node.pitch == null ? true : node.pitch >= 26);
    const nameY = two ? cy - 0.5 : cy + 3;
    const url = node.icon ? (col === "a" ? ctx.agentIcon(node.key) : ctx.providerIcon(node.key)) : "";
    const nameW = textW(name, FS_NAME);
    let out = '<g class="sankey-node-g" data-col="' + col + '" data-key="' + ctx.esc(node.key) + '" style="--i:' + node.idx + '">';
    out += '<rect class="sankey-node" x="' + r(x) + '" y="' + r(top) + '" width="' + NODE_W + '" height="' + r(h) +
      '" rx="2.5" style="fill:' + color + '"/>';
    out += '<rect class="sankey-node-hit" x="' + r(x - 5) + '" y="' + r(top) + '" width="' + (NODE_W + 10) + '" height="' + r(h) + '"/>';
    if (url) {
      const ix = left ? lx - nameW - 14 : lx + nameW + 5;
      out += '<image class="sankey-icon" x="' + r(ix) + '" y="' + r(nameY - 8.5) + '" width="10" height="10" href="' + ctx.esc(url) + '"/>';
    }
    out += '<text class="sankey-label" x="' + r(lx) + '" y="' + r(nameY) + '" text-anchor="' + anchor + '">' + ctx.esc(name) + '</text>';
    if (two) {
      out += '<text class="sankey-value" x="' + r(lx) + '" y="' + r(nameY + 11) + '" text-anchor="' + anchor + '">' + ctx.esc(node.vtext) + '</text>';
    }
    out += '</g>';
    return out;
  }

  function svgMarkup(m, xs, ctx) {
    let out = '<svg class="sankey-svg" viewBox="0 0 ' + r(xs.w) + ' ' + r(xs.h) + '" width="100%" height="100%" ' +
      'preserveAspectRatio="xMidYMid meet" aria-label="路由流向：agent → provider → model">';
    out += '<text class="sankey-col-title" x="' + r(xs.a) + '" y="12">AGENT</text>';
    out += '<text class="sankey-col-title" x="' + r(xs.p) + '" y="12">PROVIDER</text>';
    out += '<text class="sankey-col-title" x="' + r(xs.m + NODE_W) + '" y="12" text-anchor="end">MODEL</text>';
    out += '<g class="sankey-links">';
    m.links.forEach(l => { out += linkMarkup(l, xs, ctx); });
    out += '</g><g class="sankey-nodes">';
    m.cols.a.forEach(n => { out += nodeMarkup(n, "a", xs, ctx); });
    m.cols.p.forEach(n => { out += nodeMarkup(n, "p", xs, ctx); });
    m.cols.m.forEach(n => { out += nodeMarkup(n, "m", xs, ctx); });
    out += '</g></svg>';
    return out;
  }

  function rowsMarkup(m, ctx) {
    if (!m.routes.length) return '<div class="sankey-row sankey-row-empty">暂无路由</div>';
    return m.routes.map(l => {
      const text = routeText(l, ctx);
      return '<button type="button" class="sankey-row" data-link="' + l.i + '" aria-pressed="false" title="' + ctx.esc(text) + '">' +
        '<span class="sankey-dot" style="--c:' + colorOf(l, ctx) + '"></span>' +
        '<span class="sankey-route">' + ctx.esc(text) + '</span>' +
        '<span class="sankey-cell">' + ctx.esc(m.zeroTokens ? count(l.calls) + " 次" : ctx.fmtTokens(l.value)) + '</span>' +
        '<span class="sankey-cell sankey-share">' + pct(l.share) + '</span>' +
        '</button>';
    }).join("");
  }

  function boardMarkup(m, ctx, still) {
    const top = m.top;
    return '<div class="sankey-board' + (still ? "" : " sankey-anim") + '">' +
      '<div class="sankey-main">' +
        '<div class="sankey-head"><span><b>ROUTING FLOW</b> · 路由流向</span>' +
        '<span>' + count(m.links.length) + ' 条链路 · ' + m.cols.a.length + ' agent · ' + m.cols.p.length +
        ' provider · ' + m.cols.m.length + ' model</span></div>' +
        '<div class="sankey-plot"></div>' +
      '</div>' +
      '<aside class="sankey-side">' +
        '<div class="sankey-side-head"><span><b>ROUTING FLOW</b></span><span>最新 ' + count(m.rows) + ' 条</span></div>' +
        '<div class="sankey-stats">' +
          '<div class="sankey-stat"><span>请求</span><b>' + count(m.rows) + '</b><small>账本窗口内</small></div>' +
          '<div class="sankey-stat"><span>TOKENS</span><b>' + ctx.esc(m.zeroTokens ? "—" : ctx.fmtTokens(m.tokenTotal)) + '</b><small>' +
            (m.zeroTokens ? "账本为 0 · 按调用数布局" : "路由总量") + '</small></div>' +
          '<div class="sankey-stat"><span>链路</span><b>' + count(m.links.length) + '</b><small>占比 ≥ 0.5%</small></div>' +
          '<div class="sankey-stat"><span>改道 / 失败</span><b>' + pct(m.rerouteShare) + '</b><small>' +
            count(m.retryCount) + ' 重试 · ' + count(m.errCount) + ' 失败</small></div>' +
        '</div>' +
        (top ? '<div class="sankey-toproute">' +
          '<span class="sankey-toproute-key">主干路由</span>' +
          '<span class="sankey-toproute-name" title="' + ctx.esc(routeText(top, ctx)) + '">' + ctx.esc(routeText(top, ctx)) + '</span>' +
          '<b>' + pct(top.share) + '</b>' +
        '</div>' : "") +
        '<div class="sankey-table">' +
          '<div class="sankey-row sankey-row-head"><span></span><span>路由</span><span>TOKENS</span><span>占比</span></div>' +
          rowsMarkup(m, ctx) +
        '</div>' +
        '<div class="sankey-legend">' +
          '<span><i class="sankey-key"></i>ribbon 颜色 = 提供商</span>' +
          '<span class="sankey-legend-note">悬停行 / 链路 / 节点可高亮</span>' +
        '</div>' +
      '</aside>' +
    '</div>' +
    '<div class="sankey-tip" hidden></div>';
  }

  function emptyHtml(m) {
    return '<div class="sankey-empty">' +
      '<b>路由流向还没有足够的链路</b>' +
      '<span>把账本里最新的请求按 <code>agent → provider → model</code> 聚合，占比 ≥ 0.5% 且链路数 ≥ 2 时才铺开三列 alluvial。</span>' +
      '<span>当前窗口 ' + count(m.rows) + ' 条日志聚合出 ' + count(m.links.length) + ' 条链路，等出现更多不同路由就会自动展开。</span>' +
      '<span class="sankey-empty-note">需要 ≥ 2 条链路 · 当前 ' + count(m.links.length) + ' 条</span>' +
      '</div>';
  }

  /* -------------------------------------------------------------- render --- */
  function ensureState(host) {
    let st = states.get(host);
    if (!st) {
      st = { sig: "", hover: null, pinned: null, model: null, ctx: null, ro: null, links: [], nodes: [] };
      states.set(host, st);
    }
    return st;
  }

  function effective(st) {
    if (st.hover) return st.hover;
    if (st.pinned != null) return { type: "link", i: st.pinned };
    return null;
  }

  function touches(l, col, key) {
    if (!l) return false;
    if (col === "a") return l.agent === key;
    if (col === "p") return l.provider === key;
    return l.model === key;
  }

  function applyFocus(host, st) {
    const board = host.firstElementChild;
    if (!board) return;
    const f = effective(st);
    const m = st.model;
    const hot = f && f.type === "link" ? m.links[f.i] : null;
    st.links.forEach(el => {
      const i = Number(el.dataset.link);
      const on = f && (f.type === "link" ? i === f.i : touches(m.links[i], f.col, f.key));
      el.classList.toggle("is-hot", !!on);
      el.classList.toggle("is-fade", !!(f && !on));
    });
    st.nodes.forEach(el => {
      const col = el.dataset.col, key = el.dataset.key;
      const on = f && (f.type === "node" ? (f.col === col && f.key === key) : touches(hot, col, key));
      el.classList.toggle("is-hot", !!on);
      el.classList.toggle("is-fade", !!(f && !on));
    });
    Array.from(board.querySelectorAll(".sankey-row")).forEach(el => {
      if (el.dataset.link == null) return;
      const on = !!(f && f.type === "link" && Number(el.dataset.link) === f.i);
      el.classList.toggle("is-on", on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function setFocus(host, st, focus) {
    st.hover = focus;
    applyFocus(host, st);
  }

  function layout(host, st, m, ctx) {
    const plot = host.querySelector(".sankey-plot");
    if (!plot) return;
    const w = Math.round(plot.clientWidth || host.clientWidth || 0);
    const h = Math.round(plot.clientHeight || host.clientHeight || 0);
    if (w < 140 || h < 110) {
      plot.innerHTML = '<div class="sankey-pending"></div>';
      st.links = []; st.nodes = [];
      return;
    }

    const maxAgent = m.cols.a.reduce((a, n) => Math.max(a, textW(n.name, FS_NAME)), 0);
    const maxModel = m.cols.m.reduce((a, n) => Math.max(a, textW(n.name, FS_NAME)), 0);
    const padL = Math.min(Math.round(w * 0.24), Math.max(46, Math.round(maxAgent) + 30));
    const padR = Math.min(Math.round(w * 0.34), Math.max(52, Math.round(maxModel) + 24));
    const innerL = padL + NODE_W;
    const innerR = w - padR - NODE_W;
    const px = Math.max(innerL + 24, (innerL + innerR) / 2 - NODE_W / 2);
    const mx = Math.max(innerL + 80, innerR);
    const xs = { w: w, h: h, a: padL, p: px, m: mx, aRight: padL + NODE_W, pRight: px + NODE_W };

    const avail = Math.max(40, h - PAD_T - PAD_B);
    const rowsMax = Math.max(1, Math.max(m.cols.a.length, m.cols.p.length, m.cols.m.length));
    const minH = Math.max(7, Math.min(20, avail / (rowsMax * 3)));
    stackColumn(m.cols.a, PAD_T, avail, minH);
    stackColumn(m.cols.p, PAD_T, avail, minH);
    stackColumn(m.cols.m, PAD_T, avail, minH);
    stackPorts(m);

    plot.innerHTML = svgMarkup(m, xs, ctx);
    st.links = Array.from(plot.querySelectorAll(".sankey-link"));
    st.nodes = Array.from(plot.querySelectorAll(".sankey-node-g"));
    applyFocus(host, st);
  }

  function showTip(host, st, ctx, html, cx, cy) {
    const tip = host.querySelector(".sankey-tip");
    if (!tip) return;
    if (!html) { tip.hidden = true; return; }
    tip.innerHTML = html;
    tip.hidden = false;
    const box = host.getBoundingClientRect();
    tip.style.left = ctx.clamp(cx - box.left, 84, Math.max(84, box.width - 84)) + "px";
    tip.style.top = ctx.clamp(cy - box.top - 14, 60, Math.max(60, host.clientHeight - 8)) + "px";
  }

  function linkTip(l, m, ctx) {
    return '<b>' + ctx.esc(routeText(l, ctx)) + '</b>' +
      '<span>' + count(l.calls) + ' 次请求</span>' +
      '<span>' + ctx.esc(m.zeroTokens ? count(l.calls) + ' 次调用（账本 token 为 0）' : ctx.fmtTokens(l.value) + ' tokens') + '</span>' +
      '<span>占比 ' + pct(l.share) + '</span>';
  }

  function nodeTip(col, key, m, ctx) {
    const list = col === "a" ? m.cols.a : col === "p" ? m.cols.p : m.cols.m;
    const n = list.find(x => x.key === key);
    if (!n) return "";
    const kind = col === "a" ? "AGENT" : col === "p" ? "PROVIDER" : "MODEL";
    return '<b>' + ctx.esc(n.name) + '</b>' +
      '<span>' + kind + ' · ' + count(n.calls) + ' 次请求</span>' +
      '<span>' + ctx.esc(m.zeroTokens ? count(n.calls) + ' 次调用' : ctx.fmtTokens(n.value) + ' tokens') +
      ' · 占比 ' + pct(n.value / m.total) + '</span>';
  }

  function bind(host, st, m, ctx) {
    const board = host.firstElementChild;
    const svg = host.querySelector(".sankey-svg");
    if (!board) return;

    if (svg) {
      svg.addEventListener("pointermove", e => {
        const linkEl = e.target.closest ? e.target.closest(".sankey-link-g") : null;
        const nodeEl = linkEl ? null : (e.target.closest ? e.target.closest(".sankey-node-g") : null);
        if (linkEl) {
          const l = m.links[Number(linkEl.dataset.link)];
          st.hover = { type: "link", i: l.i };
          applyFocus(host, st);
          showTip(host, st, ctx, linkTip(l, m, ctx), e.clientX, e.clientY);
        } else if (nodeEl) {
          st.hover = { type: "node", col: nodeEl.dataset.col, key: nodeEl.dataset.key };
          applyFocus(host, st);
          showTip(host, st, ctx, nodeTip(nodeEl.dataset.col, nodeEl.dataset.key, m, ctx), e.clientX, e.clientY);
        } else {
          if (st.hover) { st.hover = null; applyFocus(host, st); }
          showTip(host, st, ctx, null);
        }
      });
      svg.addEventListener("pointerleave", () => {
        st.hover = null;
        applyFocus(host, st);
        showTip(host, st, ctx, null);
      });
    }

    Array.from(board.querySelectorAll(".sankey-row")).forEach(el => {
      if (el.dataset.link == null) return;
      const i = Number(el.dataset.link);
      el.addEventListener("pointerenter", () => setFocus(host, st, { type: "link", i: i }));
      el.addEventListener("pointerleave", () => setFocus(host, st, null));
      el.addEventListener("focus", () => setFocus(host, st, { type: "link", i: i }));
      el.addEventListener("blur", () => setFocus(host, st, null));
      el.addEventListener("click", () => {
        st.pinned = st.pinned === i ? null : i;
        applyFocus(host, st);
      });
    });
  }

  function render(host, ctx) {
    if (!host || !ctx) return;
    const st = ensureState(host);
    st.ctx = ctx;
    const m = buildModel(ctx);
    st.model = m;
    const still = ctx.motion === "off";
    const digest = (ctx.logs || []).slice(0, MAX_ROWS)
      .map(row => (row && row.id) + ":" + num(row && row.tokens) + ":" + (row && row.status) + ":" +
        (row && row.agent) + ":" + (row && row.provider) + ":" + (row && row.model))
      .join("|");
    const w = Math.round(host.clientWidth || 0), h = Math.round(host.clientHeight || 0);
    const sig = [digest, w, h, still ? "s" : "m", m.links.length].join("~");

    if (m.links.length < MIN_LINKS || m.total <= 0) {
      if (st.sig === "empty~" + sig && host.firstChild) return;
      st.sig = "empty~" + sig;
      st.hover = null; st.pinned = null;
      st.links = []; st.nodes = [];
      host.innerHTML = emptyHtml(m);
      return;
    }

    if (st.sig === sig && host.firstChild) return;
    st.sig = sig;
    if (st.pinned != null && !m.links[st.pinned]) st.pinned = null;

    host.innerHTML = boardMarkup(m, ctx, still);
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
  window.ObservatoryViews["sankey"] = {
    title: "路由流向",
    eyebrow: "ROUTING FLOW",
    render: render
  };
})();
