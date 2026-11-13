/* ==========================================================================
   Magpie Observatory — hero view module: orrery / constellation
   Standalone classic script. Registers window.ObservatoryViews["orrery"].

   The provider seats read as one small solar system: a magpie hub at the
   centre, one elliptical orbit per ranked provider, planet size = sessions
   that seat is serving right now, a quota arc on the planet rim, active
   sessions as moons, finished ones as faint static dots.
   Hover a planet (or a list row) to isolate its orbit; click to pin it.
   ========================================================================== */
(function () {
  "use strict";

  const TOP_N = 6;          // providers kept before folding (design cap)
  const MAX_MOONS = 3;      // moons per planet
  const MAX_RECENT = 4;     // recent-session dots per planet
  const HUB_R = 25;
  const PLANET_MIN = 8;
  const PLANET_MAX = 24;
  const MIN_W = 240;        // below this the plot is not laid out yet
  const MIN_H = 150;
  const START_DEG = -64;    // where the innermost orbit parks
  const CAPTION_DY = HUB_R + 21;

  const MOON_COLOR = {
    streaming: "var(--green)", run: "var(--green)", running: "var(--green)",
    queued: "var(--amber)", pending: "var(--amber)", retry: "var(--amber)",
    error: "var(--red)", err: "var(--red)",
    done: "var(--muted)", ok: "var(--muted)"
  };

  // Per-host UI state (hover / pin / signature / element refs) lives in closures.
  const states = new WeakMap();

  /* ------------------------------------------------------------- format --- */
  function num(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }
  function q1(v) { return Math.round(Number(v) * 10) / 10; }
  function count(n) { return String(Math.round(num(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function esc(ctx, v) { return ctx && ctx.esc ? ctx.esc(v) : String(v == null ? "" : v); }

  function hash(str) {
    let h = 2166136261;
    const s = String(str == null ? "" : str);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // Deterministic 0..1 from a hash — every phase below is stable across ticks.
  function fracOf(seed) { return (seed % 9973) / 9973; }

  // CJK/full-width glyphs are square, latin ~0.56em: enough to clip labels
  // without a DOM measuring pass.
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

  function resetsText(min) {
    const n = Number(min);
    if (!isFinite(n) || n <= 0) return "";
    if (n < 60) return Math.round(n) + " 分钟后重置";
    if (n < 1440) return (n / 60).toFixed(n < 600 ? 1 : 0) + " 小时后重置";
    return (n / 1440).toFixed(1) + " 天后重置";
  }

  function quotaColor(used) {
    if (used == null) return "var(--faint)";
    if (used >= 88) return "var(--red)";
    if (used >= 70) return "var(--amber)";
    return "var(--cyan)";
  }

  function moonColor(status) {
    return MOON_COLOR[String(status == null ? "" : status).toLowerCase()] || "var(--cyan)";
  }

  // Arc from 12 o'clock, clockwise, `pct` of the circle, radius `r` around (x,y).
  function arcPath(x, y, r, pct) {
    const p = Math.max(0, Math.min(1, Number(pct) || 0));
    const rx = q1(r), top = "M" + q1(x) + " " + q1(y - r);
    if (p <= 0.002) return "";
    if (p >= 0.998) {
      return top + "A" + rx + " " + rx + " 0 1 1 " + q1(x) + " " + q1(y + r) +
             "A" + rx + " " + rx + " 0 1 1 " + q1(x) + " " + q1(y - r);
    }
    const a = p * Math.PI * 2 - Math.PI / 2;
    return top + "A" + rx + " " + rx + " 0 " + (p > 0.5 ? 1 : 0) + " 1 " +
      q1(x + Math.cos(a) * r) + " " + q1(y + Math.sin(a) * r);
  }

  /* -------------------------------------------------------------- model --- */
  // One entry per provider key, merged from quotas + sessions + the request
  // ledger. `tokens` is the sum of both feeds (session list and ledger), which
  // is what the side panel labels: 会话 + 账本.
  function buildModel(ctx) {
    const data = ctx.data || {};
    const quotas = Array.isArray(ctx.quotas) ? ctx.quotas : [];
    const logs = Array.isArray(ctx.logs) ? ctx.logs : [];
    const activeSessions = Array.isArray(data.sessions) ? data.sessions : [];
    const recentSessions = Array.isArray(data.recent) ? data.recent : [];
    const slots = new Map();
    const clamp = ctx.clamp || ((n, a, b) => Math.max(a, Math.min(b, n)));

    function provOf(provider, model) {
      const k = ctx.providerOfModel ? ctx.providerOfModel(model, provider) : provider;
      return String(k || "unknown").toLowerCase();
    }
    function slot(key) {
      let e = slots.get(key);
      if (e) return e;
      const meta = ctx.providerMeta(key);
      e = {
        key: key, name: meta.name, color: meta.color,
        icon: ctx.providerIcon ? ctx.providerIcon(key) : "",
        rank: 0, plan: "", balance: "", used: null, windowName: "",
        resetsIn: null, windows: 0, hasQuota: false,
        active: [], recent: [], moons: [], dots: [],
        sessionTokens: 0, logTokens: 0, logCalls: 0, tokens: 0,
        models: new Map(), modelName: "—", x: 0, y: 0, r: PLANET_MIN,
        orbit: { rx: 0, ry: 0 }, label: null
      };
      slots.set(key, e);
      return e;
    }
    function tally(e, model, tokens) {
      e.sessionTokens += num(tokens);
      const m = String(model || "").trim() || "—";
      e.models.set(m, (e.models.get(m) || 0) + num(tokens));
    }

    quotas.forEach(q => {
      if (!q || !q.provider) return;
      const e = slot(provOf(q.provider, ""));
      e.hasQuota = true;
      if (q.plan) e.plan = String(q.plan);
      if (q.balance) e.balance = String(q.balance);
      const wins = Array.isArray(q.windows) ? q.windows : [];
      e.windows = wins.length;
      const w = wins[0];
      if (w) {
        const used = Number(w.used);
        e.used = isFinite(used) ? clamp(used, 0, 100) : null;
        e.windowName = w.name || "额度";
        e.resetsIn = w.resetsIn == null ? null : Number(w.resetsIn);
      }
    });
    activeSessions.forEach(s => {
      if (!s) return;
      const e = slot(provOf(s.provider, s.model));
      e.active.push(s);
      tally(e, s.served || s.model, s.tokens);
    });
    recentSessions.forEach(s => {
      if (!s) return;
      const e = slot(provOf(s.provider, s.model));
      e.recent.push(s);
      tally(e, s.served || s.model, s.tokens);
    });
    logs.forEach(l => {
      if (!l) return;
      const e = slot(provOf(l.provider, l.model));
      e.logTokens += num(l.tokens);
      e.logCalls += 1;
      const m = String(l.model || "").trim() || "—";
      e.models.set(m, (e.models.get(m) || 0) + num(l.tokens));
    });

    const all = Array.from(slots.values());
    all.forEach(e => {
      e.activeCount = e.active.length;
      e.recentCount = e.recent.length;
      e.tokens = e.sessionTokens + e.logTokens;
      let top = "", topTok = -1;
      e.models.forEach((tok, name) => {
        if (tok > topTok || (tok === topTok && name < top)) { topTok = tok; top = name; }
      });
      e.modelName = top || "—";
      e.r = Math.min(PLANET_MAX, PLANET_MIN + e.activeCount * 4);
      e.moons = e.active.slice(0, MAX_MOONS).map((s, i) => ({
        session: s,
        phase: fracOf(hash(String(s.id || s.title || i) + "@" + e.key)) * 360 + i * 47,
        radius: e.r + 11 + i * 7.5,
        duration: 21 + i * 8 + fracOf(hash(e.key)) * 9,
        reverse: i % 2 === 1
      }));
      e.dots = e.recent.slice(0, MAX_RECENT).map((s, i) => ({
        session: s,
        phase: fracOf(hash(String(s.id || s.title || i) + "~dot")) * 360 + i * 71,
        radius: e.r + 6 + i * 5.5
      }));
    });

    // Rank: busiest seats first, then token volume, then name for a stable order.
    all.sort((a, b) => b.activeCount - a.activeCount || b.tokens - a.tokens ||
      String(a.name).localeCompare(String(b.name)));
    const providers = all.slice(0, TOP_N);
    providers.forEach((e, i) => { e.rank = i; });

    let activeTotal = 0, tokensTotal = 0, recentTotal = 0, logCalls = 0, maxUsed = null, quotaCount = 0;
    providers.forEach(e => {
      activeTotal += e.activeCount;
      recentTotal += e.recentCount;
      logCalls += e.logCalls;
      tokensTotal += e.tokens;
      if (e.used != null) {
        quotaCount++;
        maxUsed = maxUsed == null ? e.used : Math.max(maxUsed, e.used);
      }
    });

    return {
      mode: "orrery", frame: { cx: 0, cy: 0, w: 0, h: 0 },
      providers: providers, all: all.length, hidden: all.length - providers.length,
      activeTotal: activeTotal, recentTotal: recentTotal, logCalls: logCalls,
      tokensTotal: tokensTotal, maxUsed: maxUsed, quotaCount: quotaCount
    };
  }

  /* ------------------------------------------------------------- layout --- */
  // Elliptical orbits: one radius per rank, and each provider picks the angle
  // the earlier planets leave most room at, so labels never collide.
  function layoutOrbits(m, w, h) {
    const cx = w / 2, cy = h / 2;
    const n = m.providers.length;
    const maxRx = Math.max(78, Math.min(w / 2 - 46, 430));
    const maxRy = Math.max(32, Math.min(h / 2 - 44, maxRx * 0.46));
    const innerRx = n > 1 ? maxRx * 0.34 : maxRx * 0.58;
    const placed = [
      { x: cx, y: cy, r: HUB_R + 6, near: 14 },                 // the hub itself
      { x: cx, y: cy + CAPTION_DY, r: 24, near: 18 }            // hub caption
    ];

    m.providers.forEach((e, i) => {
      const t = n > 1 ? i / (n - 1) : 0.5;
      const rx = innerRx + (maxRx - innerRx) * t;
      const ry = Math.max(30, Math.min(rx * 0.45, maxRy));
      const jitter = (fracOf(hash(e.key + "/" + i)) - 0.5) * 7;
      let bestDeg = START_DEG, bestScore = -Infinity;
      for (let deg = -180; deg < 180; deg += 3) {
        const a = (deg + jitter) * Math.PI / 180;
        const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
        let score;
        if (i === 0) score = -Math.abs(deg - START_DEG);
        else {
          score = Infinity;
          for (let j = 0; j < placed.length; j++) {
            const p = placed[j];
            const need = p.r + e.r + (p.near || 30);
            score = Math.min(score, Math.hypot(x - p.x, y - p.y) - need);
          }
        }
        if (score > bestScore) { bestScore = score; bestDeg = deg; }
      }
      const a = (bestDeg + jitter) * Math.PI / 180;
      e.x = cx + Math.cos(a) * rx;
      e.y = cy + Math.sin(a) * ry;
      e.orbit = { rx: rx, ry: ry };
      placed.push({ x: e.x, y: e.y, r: e.r });
    });

    // Keep planets (and therefore their labels) inside the frame.
    m.providers.forEach(e => {
      const pad = e.r + 10;
      e.x = Math.max(pad, Math.min(w - pad, e.x));
      e.y = Math.max(e.r + 8, Math.min(h - e.r - 8, e.y));
      placeLabel(e, w, h);
    });

    m.frame = { cx: cx, cy: cy, w: w, h: h };
    return m;
  }

  function placeLabel(e, w, h) {
    const ringR = e.r + 5.5;
    const right = e.x >= w / 2;
    const x = right ? e.x + ringR + 6 : e.x - ringR - 6;
    const room = right ? (w - 8 - x) : (x - 8);
    const maxW = Math.max(46, Math.min(134, room));
    let nameY, metaY;
    if (e.y + ringR + 28 <= h - 5) { nameY = e.y + ringR + 15; metaY = nameY + 11; }
    else { metaY = e.y - ringR - 7; nameY = metaY - 11; }
    e.label = { x: x, anchor: right ? "start" : "end", nameY: nameY, metaY: metaY, maxW: maxW };
  }

  function metaLine(e) {
    return e.activeCount + " 活跃 · " + (e.used == null ? "无额度" : Math.round(e.used) + "%");
  }

  /* ------------------------------------------------------------- markup --- */
  function hasBird() {
    return !!(typeof document !== "undefined" && document.getElementById && document.getElementById("bird-logo"));
  }

  function hubMarkup(m, cx, cy, ctx) {
    let out = '<g class="orr-hub">';
    // Paint-server references stay an attribute: a `url(#id)` in CSS breaks
    // whenever the page carries a <base> (harness / embedded use).
    out += '<circle class="orr-hub-glow" cx="' + q1(cx) + '" cy="' + q1(cy) + '" r="' + (HUB_R + 30) +
      '" fill="url(#orr-hub-glow)"/>';
    out += '<circle class="orr-hub-ring" cx="' + q1(cx) + '" cy="' + q1(cy) + '" r="' + (HUB_R + 6) + '"/>';
    out += '<circle class="orr-hub-body" cx="' + q1(cx) + '" cy="' + q1(cy) + '" r="' + HUB_R + '"/>';
    if (hasBird()) {
      out += '<use class="orr-hub-bird" href="#bird-logo" x="' + q1(cx - 16) + '" y="' + q1(cy - 16) +
        '" width="32" height="32"/>';
    } else {
      // No symbol in the document (harness / embed): a plain bird mark instead.
      out += '<g class="orr-hub-mark">' +
        '<path d="M' + q1(cx - 11) + ' ' + q1(cy - 1) + 'q5.5 -6.5 11 0"/>' +
        '<path d="M' + q1(cx) + ' ' + q1(cy - 1) + 'q5.5 -6.5 11 0"/>' +
        '<circle cx="' + q1(cx) + '" cy="' + q1(cy + 7.5) + '" r="3.1"/></g>';
    }
    out += '<text class="orr-hub-name" x="' + q1(cx) + '" y="' + q1(cy + HUB_R + 13) + '" text-anchor="middle">MAGPIE</text>';
    out += '<text class="orr-hub-sub" data-p="stat" data-s="hub" x="' + q1(cx) + '" y="' + q1(cy + CAPTION_DY + 3) +
      '" text-anchor="middle">' + esc(ctx, count(m.activeTotal) + " 活跃 · " + ctx.fmtTokens(m.tokensTotal)) + '</text>';
    out += '</g>';
    return out;
  }

  function moonsMarkup(e, ctx) {
    let out = "";
    e.moons.forEach(mo => {
      const a = mo.phase * Math.PI / 180;
      out += '<g class="orr-spin' + (mo.reverse ? " orr-rev" : "") + '" data-k="' + esc(ctx, e.key) + '" style="--orr-x:' +
        q1(e.x) + 'px;--orr-y:' + q1(e.y) + 'px;--orr-dur:' + q1(mo.duration) + 's">' +
        '<circle class="orr-moon" cx="' + q1(e.x + Math.cos(a) * mo.radius) + '" cy="' +
        q1(e.y + Math.sin(a) * mo.radius) + '" r="2.7" style="fill:' + moonColor(mo.session && mo.session.status) + '"/>' +
      '</g>';
    });
    return out;
  }

  function planetMarkup(e, ctx) {
    const x = e.x, y = e.y, r = e.r, ringR = r + 5.5, lb = e.label;
    const key = esc(ctx, e.key);
    let out = '<g class="orr-planet" data-k="' + key + '" data-p="planet" tabindex="0" role="button" aria-label="' +
      esc(ctx, e.name + " · " + e.activeCount + " 活跃 · " + (e.used == null ? "无额度信息" : Math.round(e.used) + "% 额度占用")) + '">';
    out += '<circle class="orr-ring" cx="' + q1(x) + '" cy="' + q1(y) + '" r="' + q1(ringR) + '"/>';
    const arc = e.used == null ? "" : arcPath(x, y, ringR, e.used / 100);
    if (arc) {
      out += '<path class="orr-arc" data-p="arc" data-k="' + key + '" d="' + arc + '" style="stroke:' + quotaColor(e.used) + '"/>';
    }
    out += '<circle class="orr-planet-body" cx="' + q1(x) + '" cy="' + q1(y) + '" r="' + q1(r) + '" style="fill:' + e.color + '"/>';
    if (r >= 11) {
      out += '<circle class="orr-planet-core" cx="' + q1(x) + '" cy="' + q1(y) + '" r="' + q1(r * 0.7) + '"/>';
      if (e.icon) {
        const s = r * 1.15;
        out += '<image class="orr-planet-icon" x="' + q1(x - s / 2) + '" y="' + q1(y - s / 2) +
          '" width="' + q1(s) + '" height="' + q1(s) + '" href="' + esc(ctx, e.icon) + '"/>';
      }
    } else {
      out += '<circle class="orr-planet-core" cx="' + q1(x - r * 0.3) + '" cy="' + q1(y - r * 0.3) + '" r="' + q1(r * 0.26) + '"/>';
    }
    if (lb) {
      out += '<text class="orr-label-name" data-p="name" data-k="' + key + '" x="' + q1(lb.x) + '" y="' + q1(lb.nameY) +
        '" text-anchor="' + lb.anchor + '">' + esc(ctx, clip(e.name, lb.maxW, 10)) + '</text>';
      out += '<text class="orr-label-meta" data-p="meta" data-k="' + key + '" x="' + q1(lb.x) + '" y="' + q1(lb.metaY) +
        '" text-anchor="' + lb.anchor + '">' + esc(ctx, clip(metaLine(e), lb.maxW, 9)) + '</text>';
    }
    // The hit target is painted last so the whole planet (and its label) is
    // hoverable/clickable, however small the planet body is.
    out += '<circle class="orr-planet-hit" cx="' + q1(x) + '" cy="' + q1(y) + '" r="' + q1(ringR + 8) + '"/>';
    out += '</g>';
    return out;
  }

  function svgMarkup(m, ctx) {
    const cx = m.frame.cx, cy = m.frame.cy, w = m.frame.w, h = m.frame.h;
    let out = '<svg class="orr-svg" viewBox="0 0 ' + q1(w) + ' ' + q1(h) + '" preserveAspectRatio="xMidYMid meet" ' +
      'role="img" aria-label="轨道星图：' + m.providers.length + ' 个提供商轨道 · ' + count(m.activeTotal) + ' 个活跃会话">';
    out += '<defs><radialGradient id="orr-hub-glow">' +
      '<stop offset="0%" stop-color="var(--accent)" stop-opacity=".40"/>' +
      '<stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></radialGradient></defs>';

    out += '<g class="orr-orbits">';
    m.providers.forEach(e => {
      out += '<ellipse class="orr-orbit" data-k="' + esc(ctx, e.key) + '" cx="' + q1(cx) + '" cy="' + q1(cy) +
        '" rx="' + q1(e.orbit.rx) + '" ry="' + q1(e.orbit.ry) + '" style="--i:' + e.rank + ';--orr-dur:' +
        (34 + e.rank * 5) + 's"/>';
    });
    out += '</g>';

    out += '<g class="orr-spins">';
    m.providers.forEach(e => { out += moonsMarkup(e, ctx); });
    out += '</g>';

    out += '<g class="orr-recents">';
    m.providers.forEach(e => {
      e.dots.forEach(d => {
        const a = d.phase * Math.PI / 180;
        out += '<circle class="orr-dot" data-k="' + esc(ctx, e.key) + '" cx="' +
          q1(e.x + Math.cos(a) * d.radius) + '" cy="' + q1(e.y + Math.sin(a) * d.radius) + '" r="1.9"/>';
      });
    });
    out += '</g>';

    out += hubMarkup(m, cx, cy, ctx);

    out += '<g class="orr-planets">';
    m.providers.forEach(e => { out += planetMarkup(e, ctx); });
    out += '</g>';
    out += '</svg>';
    return out;
  }

  function stat(id, label, value, hint) {
    return '<div class="orr-stat"><span>' + label + '</span><b data-p="stat" data-s="' + id + '">' +
      value + '</b><small>' + hint + '</small></div>';
  }

  function rowTitle(e, ctx) {
    return e.name + " · " + (e.plan || "无订阅信息") +
      " · 活跃 " + e.activeCount + " · " + (e.used == null ? "无额度" : Math.round(e.used) + "% 额度") +
      " · " + ctx.fmtTokens(e.tokens) + " tokens · " + e.modelName;
  }

  function sideInnerMarkup(m, ctx) {
    let out = '<div class="orr-side-head"><span><b>ORRERY</b> · 轨道星图</span><span>' +
      count(m.providers.length) + ' / ' + count(m.all) + ' 提供商</span></div>';
    out += '<div class="orr-stats">' +
      stat("providers", "PROVIDERS", count(m.providers.length), "在轨") +
      stat("active", "ACTIVE", count(m.activeTotal), "活跃会话") +
      stat("tokens", "TOKENS", esc(ctx, ctx.fmtTokens(m.tokensTotal)), "会话 + 账本") +
      stat("quota", "QUOTA", m.maxUsed == null ? "—" : Math.round(m.maxUsed) + "%", "最高占用") +
      '</div>';
    out += '<div class="orr-list">' +
      '<div class="orr-row orr-row-head"><span></span><span>提供商</span><span>活跃</span><span>额度</span><span>TOKENS</span></div>';
    m.providers.forEach(e => {
      const key = esc(ctx, e.key);
      out += '<button type="button" class="orr-row" data-k="' + key + '" aria-pressed="false" title="' +
        esc(ctx, rowTitle(e, ctx)) + '">' +
        '<span class="orr-ic"><img src="' + esc(ctx, e.icon) + '" alt="" loading="lazy"></span>' +
        '<span class="orr-name"><b>' + esc(ctx, e.name) + '</b><small>' +
          esc(ctx, e.plan || (e.hasQuota ? "无订阅名" : "无配额信息")) + '</small></span>' +
        '<span class="orr-cell" data-p="cnt" data-k="' + key + '">' + e.activeCount + '</span>' +
        '<span class="orr-cell orr-q" data-p="quota" data-k="' + key + '">' +
          (e.used == null ? "—" : Math.round(e.used) + "%") + '</span>' +
        '<span class="orr-cell orr-tok" data-p="tok" data-k="' + key + '">' + esc(ctx, ctx.fmtTokens(e.tokens)) + '</span>' +
        '</button>';
    });
    out += '</div>';
    out += '<div class="orr-legend">' +
      '<span><i class="orr-key"></i>轨道 = 排名 · 星球 = 活跃 · 弧 = 额度 · 月亮 = 会话</span>' +
      '<span class="orr-legend-note">悬停 / 点击星球、列表行可聚焦</span></div>';
    return out;
  }

  function boardMarkup(m, ctx, anim) {
    return '<div class="orr-board' + (anim ? " orr-anim" : "") +
      (ctx.motion === "soft" ? " orr-soft" : "") + '">' +
      '<div class="orr-main">' +
        '<div class="orr-head"><span><b>ORRERY</b> · 轨道星图</span>' +
        '<span data-p="stat" data-s="head">' + esc(ctx, count(m.providers.length) + " 提供商 · " +
          count(m.activeTotal) + " 活跃 · " + ctx.fmtTokens(m.tokensTotal) + " tokens") + '</span></div>' +
        '<div class="orr-plot"></div>' +
      '</div>' +
      '<aside class="orr-side"><div class="orr-side-inner"></div></aside>' +
      '</div>' +
      '<div class="orr-tip" hidden></div>';
  }

  function emptyHtml() {
    return '<div class="orr-empty">' +
      '<b>轨道星图还没有可编排的提供商</b>' +
      '<span>把 <code>quotas</code>、<code>sessions</code> 与请求账本合并成席位，排名前六的提供商各占一条椭圆轨道，' +
      '活跃会话绕着各自的星球转。</span>' +
      '<span>当前快照里没有配额、活跃会话或日志，等第一条请求进来轨道就会亮起。</span>' +
      '<span class="orr-empty-note">需要 ≥ 1 个提供商 · 当前 0</span>' +
      '</div>';
  }

  /* ------------------------------------------------------------ focus/tip --- */
  function applyFocus(host, st) {
    const key = st.hover || st.focus;
    const svg = host.querySelector(".orr-svg");
    if (svg) {
      Array.from(svg.querySelectorAll("[data-k]")).forEach(el => {
        const on = !!key && el.dataset.k === key;
        el.classList.toggle("orr-hot", on);
        el.classList.toggle("orr-fade", !!key && !on);
      });
    }
    Array.from(host.querySelectorAll(".orr-row[data-k]")).forEach(el => {
      const on = !!key && el.dataset.k === key;
      el.classList.toggle("orr-on", on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function toggleFocus(host, st, key) {
    st.focus = key && st.focus !== key ? key : null;
    applyFocus(host, st);
  }

  function showTip(host, st, ctx, html, cx, cy) {
    const tip = host.querySelector(".orr-tip");
    if (!tip) return;
    if (!html) { tip.hidden = true; st.tipKey = null; return; }
    tip.innerHTML = html;
    tip.hidden = false;
    const box = host.getBoundingClientRect();
    tip.style.left = ctx.clamp(cx - box.left, 96, Math.max(96, box.width - 96)) + "px";
    tip.style.top = ctx.clamp(cy - box.top - 16, 76, Math.max(76, box.height - 8)) + "px";
  }

  function tipHtml(e, ctx) {
    const rows = [];
    rows.push('<b>' + esc(ctx, e.name) + '</b>');
    rows.push('<span>' + esc(ctx, e.plan || "无订阅信息") + (e.balance ? ' · 余额 ' + esc(ctx, e.balance) : "") + '</span>');
    rows.push('<span>额度 ' + (e.used == null ? "—" : Math.round(e.used) + "%") +
      (e.windowName ? ' · ' + esc(ctx, e.windowName) + (e.windows > 1 ? " 窗口 " + e.windows + " 个" : " 窗口") : "") +
      (e.resetsIn ? ' · ' + esc(ctx, resetsText(e.resetsIn)) : "") + '</span>');
    rows.push('<span>活跃 ' + count(e.activeCount) + ' · 近期 ' + count(e.recentCount) +
      ' · 账本 ' + count(e.logCalls) + ' 次</span>');
    rows.push('<span>TOKENS ' + esc(ctx, ctx.fmtTokens(e.tokens)) + '</span>');
    rows.push('<span>模型 ' + esc(ctx, e.modelName) + '</span>');
    return rows.join("");
  }

  /* -------------------------------------------------------------- render --- */
  function ensureState(host) {
    let st = states.get(host);
    if (!st) {
      st = {
        sig: "", mode: "", hover: null, focus: null, tipKey: null, ctx: null, model: null,
        ro: null, refs: null
      };
      states.set(host, st);
    }
    return st;
  }

  // Element refs for the in-place patch below; the SVG keeps its animation
  // while the numbers on the labels and the side panel stay live.
  function collectRefs(host, st) {
    const refs = { stat: {}, name: {}, meta: {}, cnt: {}, quota: {}, tok: {}, row: {}, arc: {}, planet: {} };
    Array.from(host.querySelectorAll("[data-p]")).forEach(el => {
      const kind = el.dataset.p, k = el.dataset.k;
      if (kind === "stat") { if (el.dataset.s) refs.stat[el.dataset.s] = el; return; }
      if (k && refs[kind]) refs[kind][k] = el;
    });
    Array.from(host.querySelectorAll(".orr-row[data-k]")).forEach(el => { refs.row[el.dataset.k] = el; });
    st.refs = refs;
  }

  function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  function patch(host, st, m, ctx) {
    const f = st.refs;
    if (!f) return;
    setText(f.stat.providers, String(m.providers.length));
    setText(f.stat.active, count(m.activeTotal));
    setText(f.stat.tokens, ctx.fmtTokens(m.tokensTotal));
    setText(f.stat.quota, m.maxUsed == null ? "—" : Math.round(m.maxUsed) + "%");
    setText(f.stat.head, count(m.providers.length) + " 提供商 · " + count(m.activeTotal) + " 活跃 · " +
      ctx.fmtTokens(m.tokensTotal) + " tokens");
    setText(f.stat.hub, count(m.activeTotal) + " 活跃 · " + ctx.fmtTokens(m.tokensTotal));
    m.providers.forEach(e => {
      const lb = e.label;
      if (lb) {
        setText(f.name[e.key], clip(e.name, lb.maxW, 10));
        setText(f.meta[e.key], clip(metaLine(e), lb.maxW, 9));
      }
      setText(f.cnt[e.key], String(e.activeCount));
      setText(f.quota[e.key], e.used == null ? "—" : Math.round(e.used) + "%");
      setText(f.tok[e.key], ctx.fmtTokens(e.tokens));
      const row = f.row[e.key];
      if (row) row.setAttribute("title", rowTitle(e, ctx));
      // The quota arc and the planet's aria label follow the live numbers.
      const arc = f.arc[e.key];
      if (arc) {
        const d = arcPath(e.x, e.y, e.r + 5.5, e.used / 100);
        if (arc.getAttribute("d") !== d) arc.setAttribute("d", d);
        const col = quotaColor(e.used);
        if (arc.style.stroke !== col) arc.style.stroke = col;
      }
      const pg = f.planet[e.key];
      if (pg) {
        pg.setAttribute("aria-label", e.name + " · " + e.activeCount + " 活跃 · " +
          (e.used == null ? "无额度信息" : Math.round(e.used) + "% 额度占用"));
      }
    });
  }

  function ensureObserver(host, st) {
    if (st.ro || typeof ResizeObserver !== "function") return;
    st.ro = new ResizeObserver(() => {
      st.sig = "";
      if (st.ctx) render(host, st.ctx);
    });
    st.ro.observe(host);
  }

  function bind(host, st, m, ctx) {
    const board = host.querySelector(".orr-board");
    const svg = host.querySelector(".orr-svg");
    if (!board) return;

    if (svg) {
      svg.addEventListener("pointermove", ev => {
        const el = ev.target.closest ? ev.target.closest(".orr-planet") : null;
        const key = el ? el.dataset.k : null;
        if (key !== st.hover) { st.hover = key; applyFocus(host, st); }
        if (key) {
          st.tipKey = key;
          const p = m.providers.filter(x => x.key === key)[0];
          st.tipAt = { x: ev.clientX, y: ev.clientY };
          showTip(host, st, ctx, p ? tipHtml(p, ctx) : "", ev.clientX, ev.clientY);
        } else if (st.tipKey) {
          showTip(host, st, ctx, "", 0, 0);
        }
      });
      svg.addEventListener("pointerleave", () => {
        st.hover = null;
        applyFocus(host, st);
        showTip(host, st, ctx, "", 0, 0);
      });
      // Clicking a planet pins it; clicking the starfield clears the pin.
      svg.addEventListener("click", ev => {
        const el = ev.target.closest ? ev.target.closest(".orr-planet") : null;
        toggleFocus(host, st, el ? el.dataset.k : null);
      });
      svg.addEventListener("keydown", ev => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        const el = ev.target.closest ? ev.target.closest(".orr-planet") : null;
        if (!el) return;
        ev.preventDefault();
        toggleFocus(host, st, el.dataset.k);
      });
    }

    Array.from(board.querySelectorAll(".orr-row[data-k]")).forEach(row => {
      const key = row.dataset.k;
      row.addEventListener("pointerenter", () => { st.hover = key; applyFocus(host, st); });
      row.addEventListener("pointerleave", () => { st.hover = null; applyFocus(host, st); });
      row.addEventListener("focus", () => { st.hover = key; applyFocus(host, st); });
      row.addEventListener("blur", () => { st.hover = null; applyFocus(host, st); });
      row.addEventListener("click", () => toggleFocus(host, st, key));
    });
  }

  function render(host, ctx) {
    if (!host || !ctx) return;
    const st = ensureState(host);
    st.ctx = ctx;
    const m = buildModel(ctx);
    st.model = m;
    ensureObserver(host, st);

    if (!m.providers.length) {
      if (st.sig !== "empty") {
        st.sig = "empty";
        st.mode = "";
        st.hover = null;
        st.focus = null;
        st.refs = null;
        host.innerHTML = emptyHtml();
      }
      return;
    }

    const anim = ctx.motion !== "off";
    const mode = (anim ? "a" : "s") + (ctx.motion === "soft" ? "f" : "");
    if (!host.querySelector(".orr-board") || st.mode !== mode) {
      host.innerHTML = boardMarkup(m, ctx, anim);
      st.mode = mode;
      st.sig = "";
    }
    if (st.focus && !m.providers.some(e => e.key === st.focus)) st.focus = null;

    const plot = host.querySelector(".orr-plot");
    const w = Math.round(plot.clientWidth || 0), h = Math.round(plot.clientHeight || 0);
    if (w < MIN_W || h < MIN_H) {
      if (plot.innerHTML.indexOf("orr-pending") < 0) {
        plot.innerHTML = '<div class="orr-pending"></div>';
        st.sig = "";
      }
      return;
    }

    layoutOrbits(m, w, h);
    // The signature covers everything that changes the SVG *structure*; live
    // numbers (used %, tokens, counts) are patched in place so a data tick
    // never restarts a moon's revolution.
    const sig = [w, h, mode, hasBird() ? "b" : "-",
      m.providers.map(e => [e.key, e.rank, q1(e.x), q1(e.y), e.r, e.moons.length, e.dots.length,
        e.used == null ? "-" : "q"].join(":")).join("|"),
      m.providers.map(e => e.moons.map(mo => q1(mo.phase) + "@" + q1(mo.radius) + "@" + q1(mo.duration) +
        (mo.reverse ? "r" : "f")).join("+")).join("|"),
      m.providers.map(e => e.dots.map(d => q1(d.phase) + "@" + q1(d.radius)).join("+")).join("|")
    ].join("~");

    if (sig !== st.sig) {
      st.sig = sig;
      plot.innerHTML = svgMarkup(m, ctx);
      host.querySelector(".orr-side-inner").innerHTML = sideInnerMarkup(m, ctx);
      collectRefs(host, st);
      bind(host, st, m, ctx);
    } else {
      patch(host, st, m, ctx);
      // Keep an open tooltip honest while its planet is still hovered.
      if (st.tipKey && st.tipAt) {
        const p = m.providers.filter(x => x.key === st.tipKey)[0];
        if (p) showTip(host, st, ctx, tipHtml(p, ctx), st.tipAt.x, st.tipAt.y);
      }
    }
    applyFocus(host, st);
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["orrery"] = {
    title: "轨道星图",
    eyebrow: "ORRERY",
    render: render
  };
})();
