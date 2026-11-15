/* --------------------------------------------------------------- sugarloaf
 * Sugarloaf view — a row of loaf moulds draining on pots, one
 * per provider. Syrup weeping from the cone's tip = tokens; a
 * clayman packing the head for live sessions; a cracked cone
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sugarloaf";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="sl-empty">暂无糖锥</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // curing house floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const coneW = seg * .4;
      const coneH = 34;
      const coneTop = floorY - coneH - 22;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8d8b0" : "#c8b080";
      // loaf mould — a cone point-down in a pot
      g += `<path d="M ${x - coneW / 2} ${coneTop} L ${x + coneW / 2} ${coneTop} L ${x} ${coneTop + coneH} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // fill of crystallised sugar — shaded band by tokens
      const fillH = (r.tok / maxTok) * coneH * .7;
      g += `<path d="M ${x - coneW / 2 + 3} ${coneTop + 4} L ${x + coneW / 2 - 3} ${coneTop + 4} L ${x} ${coneTop + 4 + fillH * .7} Z" fill="${tint}" opacity=".5"/>`;
      // drip pot under the cone
      g += `<rect x="${x - 8}" y="${coneTop + coneH + 4}" width="16" height="10" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // syrup drip — count by tokens
      const drops = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let d = 0; d < drops; d++) {
        g += `<circle cx="${x}" cy="${coneTop + coneH - 2 + d * 4}" r="1.4" fill="${tint}" opacity=".85"/>`;
      }
      // mould rim lip
      g += `<rect x="${x - coneW / 2 - 2}" y="${coneTop - 3}" width="${coneW + 4}" height="4" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      // clayman packing the head for live sessions
      if (r.live) {
        g += `<g class="sl-clayman" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + coneW / 2 + 12} ${coneTop - 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="2" x2="-12" y2="6" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // cracked cone — a split running down the side on errors
      if (r.err) g += `<path d="M ${x - coneW * .2} ${coneTop + 8} l 4 10 l -4 10" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="sl-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "糖锥", eyebrow: "PROVIDER SUGARLOAF", render };
})();
