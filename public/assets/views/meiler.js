/* ------------------------------------------------------------------ meiler
 * Meiler view — a row of charcoal mounds (Kohlenmeiler), one per
 * provider. Smoke wisps off the vent holes = tokens; a collier
 * raking the foot for live sessions; a collapsed top marks
 * errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "meiler";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const clearingY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="ml-empty">暂无炭堆</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // forest clearing
    g += `<rect y="${clearingY}" width="${W}" height="${H - clearingY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const moundW = seg * .66;
      const moundH = 40;
      const moundTop = clearingY - moundH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#707070" : "#585048";
      // mound — domed turf-covered stack
      g += `<path d="M ${x - moundW / 2} ${clearingY} Q ${x - moundW * .3} ${moundTop - 4} ${x} ${moundTop - 4} Q ${x + moundW * .3} ${moundTop - 4} ${x + moundW / 2} ${clearingY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // turf skin hatching
      for (let c = 1; c <= 3; c++) {
        const cy = clearingY - moundH * c / 4;
        const half = (moundW / 2 - 6) * (1 - c * .2);
        g += `<line x1="${(x - half).toFixed(0)}" y1="${cy.toFixed(0)}" x2="${(x + half).toFixed(0)}" y2="${cy.toFixed(0)}" stroke="var(--line)" stroke-width=".8" opacity=".4"/>`;
      }
      // smoke wisps off the vent holes — count by tokens
      const wisps = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < wisps; s++) {
        const sx = x - moundW * .2 + s * moundW * .2;
        g += `<path class="ml-wisp" style="animation-delay: ${((i + s) * .25).toFixed(1)}s" d="M ${sx.toFixed(0)} ${moundTop - 4} q 3 -8 -2 -14 q -4 -6 2 -12" stroke="${tint}" stroke-width="1.6" fill="none" opacity=".7"/>`;
      }
      // vent holes
      for (let v = -1; v <= 1; v++) {
        g += `<circle cx="${x + v * moundW * .28}" cy="${moundTop + 6}" r="1.8" fill="${r.live ? tint : "var(--card-2)"}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // collier raking at the foot for live sessions
      if (r.live) {
        g += `<g class="ml-collier" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + moundW / 2 + 12} ${clearingY - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="4" x2="-14" y2="10" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // collapsed top — a sunken crown on errors
      if (r.err) g += `<path d="M ${x - 6} ${moundTop - 2} q 3 6 6 0 q 3 6 6 0" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${clearingY + 18}" text-anchor="middle" class="ml-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ml-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "炭堆", eyebrow: "PROVIDER MEILER", render };
})();
