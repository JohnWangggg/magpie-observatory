/* ==========================================================================
   Magpie Observatory — hero view module: 夜航 (STELLAR DRIFT).
   Standalone classic script. Registers window.ObservatoryViews["stellar"].

   The most "ambient" view in the catalog, built for cinema / glance mode:
   providers become a quiet field of stars. Each star's size follows the
   sessions it is serving; its rim ring is the shortest quota window. A live
   request is a magpie meteor that streaks from the left edge toward its
   provider star and leaves a fading ember. Done sessions cool into grey
   dust. Idle gateways still show the star field breathing — the view never
   looks dead.
   ========================================================================== */
(function () {
  "use strict";

  const TAU = Math.PI * 2;
  const states = new WeakMap();

  function num(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }
  function hash(str) {
    let h = 2166136261;
    const s = String(str == null ? "" : str);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function frac(seed) { return (seed % 9973) / 9973; }

  function stateFor(host) {
    let st = states.get(host);
    if (!st) {
      st = {
        canvas: null, g: null, stars: [], meteors: [], dust: [],
        raf: 0, lastT: 0, sig: "", seen: new Set(), ctx: null, host
      };
      states.set(host, st);
    }
    return st;
  }

  function mount(host, st) {
    host.innerHTML = "";
    host.classList.add("stellar-host");
    const c = document.createElement("canvas");
    c.className = "stellar-canvas";
    host.appendChild(c);
    st.canvas = c;
    st.g = c.getContext("2d");
    st.dust = [];
    st.meteors = [];
  }

  /* ---------------------------------------------------------------- model --- */
  function buildModel(ctx, w, h) {
    const data = ctx.data || {};
    const quotas = Array.isArray(ctx.quotas) ? ctx.quotas : [];
    const sessions = Array.isArray(data.sessions) ? data.sessions : [];
    const recent = Array.isArray(data.recent) ? data.recent : [];

    const map = new Map();
    function seat(key) {
      key = String(key || "unknown").toLowerCase();
      if (!map.has(key)) map.set(key, { key, active: 0, tokens: 0, quota: null });
      return map.get(key);
    }
    quotas.forEach(q => {
      const s = seat(q.provider);
      const win = (q.windows || [])[0];
      s.quota = win ? { used: num(win.used), resetsIn: win.resetsIn, name: win.name || "" } : null;
    });
    sessions.concat(recent).forEach(s => {
      const key = ctx.providerOfModel ? ctx.providerOfModel(s.model, s.provider) : s.provider;
      const st = seat(key);
      if (s.status === "streaming" || s.status === "queued") st.active++;
      st.tokens += num(s.tokens);
    });
    const seats = Array.from(map.values())
      .sort((a, b) => b.active - a.active || b.tokens - a.tokens)
      .slice(0, 8);

    // Deterministic sky positions per provider key; larger providers pull
    // toward the horizontal band where meteors cross.
    const cx = w * 0.5, cy = h * 0.52;
    seats.forEach((s, i) => {
      const sd = hash(s.key);
      const t = i / Math.max(1, seats.length - 1);
      const spread = 0.30 + 0.28 * frac(sd);
      s.x = cx + Math.cos(t * TAU * 0.85 + frac(sd + 7) * 0.8) * w * spread;
      s.y = cy + (frac(sd + 13) - 0.5) * h * 0.62;
      s.x = Math.max(48, Math.min(w - 48, s.x));
      s.y = Math.max(36, Math.min(h - 40, s.y));
      s.r = Math.max(9, 5 + Math.min(20, Math.sqrt(s.tokens) / 90) + s.active * 2.5);
      s.tw = 0.6 + frac(sd + 31) * 2.6;      // twinkle speed
      s.ph = frac(sd + 57) * TAU;            // twinkle phase
      s.meta = ctx.providerMeta ? ctx.providerMeta(s.key) : { name: s.key, color: "#8b7cf6" };
    });
    const maxTok = Math.max(1, ...seats.map(s => s.tokens));
    seats.forEach(s => { s.w = Math.sqrt(s.tokens / maxTok); s.r += s.active * 2; });
    return seats;
  }

  /* ---------------------------------------------------------------- anim --- */
  function tick(st, now) {
    const ctx = st.ctx;
    const c = st.canvas, g = st.g;
    if (!g || !ctx) { st.raf = requestAnimationFrame(t => tick(st, t)); return; }
    const rect = c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, rect.width), h = Math.max(1, rect.height);
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dt = Math.min(0.05, (now - (st.lastT || now)) / 1000);
    st.lastT = now;
    const t = now / 1000;

    const seats = buildModel(ctx, w, h);

    /* spawn meteors for sessions we have not seen yet */
    const data = ctx.data || {};
    const sessions = (data.sessions || []).concat(data.recent || []);
    sessions.forEach(s => {
      if (st.seen.has(s.id)) return;
      st.seen.add(s.id);
      if (st.seen.size > 400) st.seen = new Set(Array.from(st.seen).slice(-200));
      const key = ctx.providerOfModel ? ctx.providerOfModel(s.model, s.provider) : s.provider;
      const star = seats.find(x => x.key === String(key || "").toLowerCase());
      if (!star) return;
      if (s.status === "done" || s.status === "error") {
        st.dust.push({ x: star.x, y: star.y, a: s.status === "error" ? 0.5 : 0.34, red: s.status === "error", born: t });
        return;
      }
      const a = Math.atan2(star.y - h * 0.5, star.x);
      const sx = star.x - Math.cos(a) * (w * 0.62);
      const sy = star.y - Math.sin(a) * (w * 0.62) - h * 0.12;
      const agent = ctx.agentMeta ? ctx.agentMeta(s.agent) : { color: "#56d4dd" };
      st.meteors.push({
        id: s.id, x0: sx, y0: sy, x1: star.x, y1: star.y,
        p: 0, speed: 0.55 + Math.random() * 0.5,
        color: agent.color || "#56d4dd",
        status: s.status, dead: false, trail: []
      });
      if (st.meteors.length > 40) st.meteors.shift();
    });
    /* retire meteors whose session ended */
    st.meteors.forEach(m => {
      const s = sessions.find(x => x.id === m.id);
      if (s && (s.status === "done" || s.status === "error")) m.status = "landing";
    });

    /* -------------------------------------------------------------- paint --- */
    const dark = !document.documentElement.dataset.theme || document.documentElement.dataset.theme === "dark";
    g.clearRect(0, 0, w, h);

    // background sky — a deep radial wash plus two slow aurora bands
    const bg = g.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
    if (dark) {
      bg.addColorStop(0, "rgba(24,22,48,0.55)");
      bg.addColorStop(0.55, "rgba(10,11,22,0.35)");
      bg.addColorStop(1, "rgba(7,8,12,0)");
    } else {
      bg.addColorStop(0, "rgba(120,110,220,0.10)");
      bg.addColorStop(1, "rgba(240,240,248,0)");
    }
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);

    // star dust field (static, hash-spread)
    for (let i = 0; i < 90; i++) {
      const sx = frac(i * 977 + 3) * w;
      const sy = frac(i * 761 + 11) * h;
      const tw = 0.25 + 0.5 * Math.abs(Math.sin(t * 0.5 + i));
      g.globalAlpha = (dark ? 0.5 : 0.4) * tw * (0.3 + frac(i * 131) * 0.7);
      g.fillStyle = dark ? "#cdd6ff" : "#8b7cf6";
      const r = 0.4 + frac(i * 53) * 1.1;
      g.beginPath(); g.arc(sx, sy, r, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;

    // Streaming sessions keep relaunching meteors: a session with no live
    // meteor gets a fresh one every few seconds, so the sky never sits still.
    st.meteorClock = st.meteorClock || {};
    sessions.forEach(s => {
      if (s.status !== "streaming" && s.status !== "queued") return;
      if (st.meteors.some(m => m.id === s.id && !m.dead)) return;
      const key = ctx.providerOfModel ? ctx.providerOfModel(s.model, s.provider) : s.provider;
      const star = seats.find(x => x.key === String(key || "").toLowerCase());
      if (!star) return;
      const last = st.meteorClock[s.id] || 0;
      if (t - last < 1.8 + frac(hash(s.id)) * 3.2) return;
      st.meteorClock[s.id] = t;
      const a = Math.atan2(star.y - h * 0.5, star.x);
      const sx = star.x - Math.cos(a) * (w * 0.62);
      const sy = star.y - Math.sin(a) * (w * 0.62) - h * 0.12;
      const agent = ctx.agentMeta ? ctx.agentMeta(s.agent) : { color: "#56d4dd" };
      st.meteors.push({
        id: s.id, x0: sx, y0: sy, x1: star.x, y1: star.y,
        p: 0, speed: 0.5 + Math.random() * 0.45,
        color: agent.color || "#56d4dd",
        status: s.status, dead: false, trail: []
      });
      if (st.meteors.length > 40) st.meteors.shift();
    });
    // provider stars: glow + core + quota rim + label
    seats.forEach(s => {
      const twinkle = 0.75 + 0.25 * Math.sin(t * s.tw + s.ph);
      const R = s.r * twinkle;
      const glowR = R * (s.active ? 4.2 : 2.6);
      const col = s.meta.color || "#8b7cf6";
      const glow = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
      glow.addColorStop(0, hexA(col, s.active ? 0.45 : 0.22));
      glow.addColorStop(1, hexA(col, 0));
      g.fillStyle = glow;
      g.beginPath(); g.arc(s.x, s.y, glowR, 0, TAU); g.fill();

      g.fillStyle = dark ? "#f4f6ff" : "#23263a";
      g.globalAlpha = s.active ? 0.95 : 0.62;
      g.beginPath(); g.arc(s.x, s.y, Math.max(2.2, R * 0.42), 0, TAU); g.fill();
      g.globalAlpha = 1;

      // quota ring
      if (s.quota && s.quota.used != null) {
        const used = Math.min(1, num(s.quota.used) / 100);
        const ringR = R * 0.95;
        g.strokeStyle = hexA("#ffffff", dark ? 0.13 : 0.3);
        g.lineWidth = 1.4;
        g.beginPath(); g.arc(s.x, s.y, ringR, 0, TAU); g.stroke();
        g.strokeStyle = used >= 0.88 ? "#fb7185" : used >= 0.7 ? "#fbbf24" : "#56d4dd";
        g.lineWidth = 2;
        g.beginPath();
        g.arc(s.x, s.y, ringR, -Math.PI / 2, -Math.PI / 2 + used * TAU);
        g.stroke();
      }

      // label — only the four biggest stay labelled; cinema needs air
      if (s.w > 0.28 || s.active > 0) {
        g.font = "600 10px Inter, system-ui, sans-serif";
        g.textAlign = "center";
        g.fillStyle = hexA(dark ? "#aab4d0" : "#4b5363", 0.9);
        g.fillText(s.meta.name || s.key, s.x, s.y + s.r + 13);
        if (s.active) {
          g.fillStyle = hexA(col, 0.95);
          g.font = "700 9px ui-monospace, monospace";
          g.fillText(s.active + " 活跃", s.x, s.y + s.r + 24);
        }
      }
    });

    // cooled dust
    st.dust = st.dust.filter(d => t - d.born < 8);
    st.dust.forEach(d => {
      const age = (t - d.born) / 8;
      g.globalAlpha = d.a * (1 - age);
      g.fillStyle = d.red ? "#fb7185" : dark ? "#8a93ad" : "#9aa3b8";
      g.beginPath(); g.arc(d.x, d.y + age * 6, 1.6, 0, TAU); g.fill();
    });
    g.globalAlpha = 1;

    // meteors — a bright head + tapered trail toward the star
    st.meteors = st.meteors.filter(m => !m.dead);
    st.meteors.forEach(m => {
      if (m.status === "landing") { m.p += dt * 2.2; } else { m.p += dt * m.speed; }
      const p = Math.min(1, m.p);
      const ease = 1 - Math.pow(1 - p, 2.2);
      const x = m.x0 + (m.x1 - m.x0) * ease;
      const y = m.y0 + (m.y1 - m.y0) * ease - Math.sin(ease * Math.PI) * 14;
      m.trail.push({ x, y });
      if (m.trail.length > 18) m.trail.shift();

      for (let i = 1; i < m.trail.length; i++) {
        const a0 = m.trail[i - 1], a1 = m.trail[i];
        g.strokeStyle = hexA(m.color, (i / m.trail.length) * 0.5);
        g.lineWidth = 1.6 * (i / m.trail.length) + 0.3;
        g.beginPath(); g.moveTo(a0.x, a0.y); g.lineTo(a1.x, a1.y); g.stroke();
      }
      g.fillStyle = "#ffffff";
      g.shadowColor = m.color; g.shadowBlur = 9;
      g.beginPath(); g.arc(x, y, 2.3, 0, TAU); g.fill();
      g.shadowBlur = 0;

      if (p >= 1) {
        st.dust.push({ x: m.x1, y: m.y1, a: 0.4, red: m.status === "landing", born: t });
        m.dead = true;
      }
    });

    if ((ctx.motion || "full") !== "off") st.raf = requestAnimationFrame(tt => tick(st, tt));
    else st.raf = 0;
  }

  function hexA(hex, a) {
    hex = String(hex || "#8b7cf6").trim();
    if (hex[0] !== "#") return hex;
    const n = parseInt(hex.slice(1), 16);
    const r = hex.length >= 7 ? (n >> 16) & 255 : ((n >> 8) & 15) * 17;
    const g = hex.length >= 7 ? (n >> 8) & 255 : ((n >> 4) & 15) * 17;
    const b = hex.length >= 7 ? n & 255 : (n & 15) * 17;
    return `rgba(${r},${g},${b},${a})`;
  }

  /* --------------------------------------------------------------------- api */
  function render(host, ctx) {
    if (!host) return;
    const st = stateFor(host);
    st.ctx = ctx || {};
    st.host = host;
    if (!st.canvas || !host.contains(st.canvas)) mount(host, st);
    if (!st.raf && !host.hidden) {
      st.lastT = 0;
      st.raf = requestAnimationFrame(t => tick(st, t));
    }
    // Pause the loop while the view is hidden behind another hero mode.
    if (host.hidden && st.raf) { cancelAnimationFrame(st.raf); st.raf = 0; }
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["stellar"] = {
    title: "夜航",
    eyebrow: "STELLAR DRIFT",
    render
  };
})();
