/* -------------------------------------------------------------- metronome
 * Metronome view — the pendulum's beat period scales inversely with the
 * recent request rate. Faster traffic = faster swing.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "metronome";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H - 30, arm = Math.min(H * .78, W * .4);

    // requests/min from the last 60s of logs
    const now = Date.now();
    const recent = logs.filter(l => now - (l.t || l.ts || now) < 60000);
    const rpm = recent.length; // per-minute rate
    // beat period: 60rpm→1s per swing; scale 30–600rpm → 2.0–0.1s period
    const period = Math.max(0.1, Math.min(2.0, 60 / Math.max(1, rpm)));

    // per-provider arms (up to 4 stacked miniature metronomes)
    const provRates = new Map();
    recent.forEach(l => { const p = l.provider || "?"; provRates.set(p, (provRates.get(p) || 0) + 1); });
    const provs = [...provRates.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

    let g = `<g class="mt-scale">`;
    for (let i = -3; i <= 3; i++) {
      const a = i * 10 * Math.PI / 180;
      const x1 = cx + Math.sin(a) * (arm * 0.85), y1 = cy - Math.cos(a) * (arm * 0.85);
      const x2 = cx + Math.sin(a) * arm, y2 = cy - Math.cos(a) * arm;
      g += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--faint)" stroke-width="${i === 0 ? 1.4 : .6}"/>`;
    }
    g += `</g>`;

    const box = 56, bh = 28;
    provs.forEach(([p, n], i) => {
      const px = 40 + i * ((W - 80) / Math.max(1, provs.length - 1 || 1));
      const py = 16;
      const col = metaOf(p).color || "#8b7cf6";
      const per = Math.max(0.1, Math.min(2.0, 60 / Math.max(1, n)));
      g += `<g class="mt-mini" data-prov="${esc(p)}" data-rpm="${n}">
        <rect x="${(px - box / 2).toFixed(0)}" y="${py}" width="${box}" height="${bh}" rx="4" fill="var(--card-2)" stroke="${col}" stroke-width="1.2"/>
        <line x1="${px}" y1="${py + bh}" x2="${px}" y2="${py + 8}" stroke="${col}" stroke-width="1.6" class="mt-arm" style="animation-duration: ${per.toFixed(2)}s; transform-origin: ${px}px ${py + bh}px;"/>
        <text x="${px}" y="${py + bh + 14}" text-anchor="middle" class="mt-lab">${esc(p.split("/").pop().slice(0, 8))} ${n}/min</text>
      </g>`;
    });

    // main pendulum
    g += `<g class="mt-pend" style="animation-duration: ${period.toFixed(2)}s; transform-origin: ${cx}px ${cy}px;">
      <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - arm}" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy - arm}" r="7" fill="var(--accent)"/>
    </g>`;
    g += `<circle cx="${cx}" cy="${cy}" r="5" fill="var(--fg-2)"/>`;
    g += `<text x="${cx}" y="${cy + 22}" text-anchor="middle" class="mt-cap">${rpm} req/min · ${(60 / period).toFixed(0)} bpm</text>`;

    host.innerHTML = `<svg class="mt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "节拍器", eyebrow: "REQUEST METRONOME", render };
})();
