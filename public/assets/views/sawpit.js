/* ------------------------------------------------------------------ sawpit
 * Sawpit view — a row of log-on-trestle pits, one per provider.
 * Planks sawn off the log = tokens; a top-sawyer and pitman
 * working the frame for live sessions; a pinched blade marks
 * errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sawpit";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const pitY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="sp-empty">暂无坑锯</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ground
    g += `<rect y="${pitY}" width="${W}" height="${H - pitY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const logW = seg * .6;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a858" : "#987838";
      const logY = pitY - 26;
      // the pit under the log
      g += `<rect x="${x - logW * .4}" y="${logY + 10}" width="${logW * .8}" height="18" fill="var(--card-2)" stroke="var(--line)" stroke-width="1"/>`;
      // the log on trestles
      g += `<line x1="${x - logW * .35}" y1="${logY + 10}" x2="${x - logW * .3}" y2="${logY}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x + logW * .35}" y1="${logY + 10}" x2="${x + logW * .3}" y2="${logY}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<ellipse cx="${x}" cy="${logY}" rx="${(logW / 2).toFixed(0)}" ry="9" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // sawn face rings
      g += `<ellipse cx="${x}" cy="${logY}" rx="${(logW / 2 - 4).toFixed(0)}" ry="6" fill="none" stroke="var(--line)" stroke-width=".8" opacity=".6"/>`;
      // planks cut off the far end — count by tokens
      const planks = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let p = 0; p < planks; p++) {
        g += `<rect x="${x + logW / 2 + 4}" y="${logY - 8 + p * 6}" width="12" height="4" fill="${tint}" stroke="${r.col}" stroke-width=".7" rx="1" opacity=".9"/>`;
      }
      // frame saw riding the log — blade line + teeth
      g += `<line x1="${x}" y1="${logY - 14}" x2="${x}" y2="${logY + 14}" stroke="${r.err ? "var(--red)" : tint}" stroke-width="1.8" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      for (let t = -4; t <= 4; t += 2) g += `<path d="M ${x} ${logY + t * 3} l 3 -1" stroke="${r.col}" stroke-width=".8"/>`;
      // top-sawyer on the log for live sessions
      if (r.live) {
        g += `<g class="sp-sawyer" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - 4} ${logY - 18})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="8" y2="10" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
        // pitman below
        g += `<g class="sp-pitman" style="animation-delay: ${(i * .3 + .15).toFixed(1)}s" transform="translate(${x - 4} ${logY + 12})">
          <circle r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="6" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="2" x2="8" y2="-4" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // pinched blade — a kink in the kerf on errors
      if (r.err) g += `<path d="M ${x + 6} ${logY - 6} l 4 4 l -4 4" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${pitY + 18}" text-anchor="middle" class="sp-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "坑锯", eyebrow: "PROVIDER SAWPIT", render };
})();
