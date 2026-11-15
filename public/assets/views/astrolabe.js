/* -------------------------------------------------------------- astrolabe
 * Astrolabe view — a medieval instrument drawn in the same idiom:
 * rete (star wheel) of provider pointers over a plate of altitude
 * circles = per-model average latency.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "astrolabe";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const logs = ctx.data.logs || [];
    const sessions = ctx.data.sessions || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 26;

    // altitude circles per model's average latency (log-scale)
    const stats = new Map();
    logs.forEach(l => {
      const ms = l.ttft || l.ms || 0;
      if (!ms) return;
      const m = (l.model || "?").split("/").pop();
      if (!stats.has(m)) stats.set(m, { n: 0, ms: 0, prov: l.provider, model: m });
      const s = stats.get(m); s.n++; s.ms += ms;
    });
    const models = [...stats.values()].map(s => ({ ...s, avg: s.ms / s.n }))
      .sort((a, b) => a.avg - b.avg).slice(0, 7);

    // tympanum (the plate) — altitude circles at 15° intervals + horizon
    let g = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="var(--card-2)" stroke="var(--line)" stroke-width="2"/>`;
    g += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--faint)" stroke-width="1"/>`;
    [30, 60, 90].forEach(a => {
      const rr = R * a / 90;
      g += `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="none" stroke="var(--faint)" stroke-width=".6" stroke-dasharray="2 3"/>`;
    });
    // cardinal arcs
    g += `<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="var(--faint)" stroke-width=".5"/>`;
    g += `<line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="var(--faint)" stroke-width=".5"/>`;

    // altitude text
    [30, 60, 90].forEach(a => {
      const rr = R * a / 90;
      g += `<text x="${cx + rr + 4}" y="${cy - 4}" class="al-alt">${a}°</text>`;
    });

    // rete — the star wheel, provider pointers as rays from centre
    const provs = [...new Set([...sessions.map(s => s.provider), ...logs.slice(-60).map(l => l.provider)])].filter(Boolean).slice(0, 8);
    provs.forEach((p, i) => {
      const ang = (i / provs.length) * Math.PI * 2 - Math.PI / 2;
      const r = R * 0.78;
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      const live = sessions.filter(s => s.provider === p).length;
      const col = live ? (metaOf(p).color || "#8b7cf6") : "var(--faint)";
      g += `<g class="al-ray" data-prov="${esc(p)}">
        <line x1="${cx}" y1="${cy}" x2="${x.toFixed(0)}" y2="${y.toFixed(0)}" stroke="${col}" stroke-width="${live ? 1.4 : .5}" opacity="${live ? .9 : .4}"/>
        <circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${2 + Math.min(6, live * 1.8)}" fill="${col}"/>
        <text x="${x.toFixed(0)}" y="${(y - 8).toFixed(0)}" text-anchor="middle" class="al-lab">${esc(p.split("/").pop().slice(0, 7))}${live ? "·" + live : ""}</text>
      </g>`;
    });

    // rule (the pointer arm) — points at the model's altitude
    if (models.length) {
      const m = models[models.length - 1]; // slowest model
      const frac = Math.min(1, (Math.log(m.avg) - Math.log(50)) / (Math.log(4000) - Math.log(50)));
      const ar = R * (0.25 + frac * 0.6);
      const ax = cx + ar * 0.7, ay = cy - ar * 0.7;
      g += `<g class="al-rule">
        <line x1="${cx}" y1="${cy}" x2="${ax.toFixed(0)}" y2="${ay.toFixed(0)}" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/>
        <circle cx="${cx}" cy="${cy}" r="5" fill="var(--accent)"/>
        <text x="${ax.toFixed(0)}" y="${(ay - 12).toFixed(0)}" text-anchor="middle" class="al-lab al-slow">${esc(m.model.slice(0, 12))} ${Math.round(m.avg)}ms</text>
      </g>`;
    }

    host.innerHTML = `<svg class="al-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "星盘", eyebrow: "ASTROLABE", render };
})();
