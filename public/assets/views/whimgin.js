/* ------------------------------------------------------------------ whimgin
 * Whim gin view — a row of horse-drawn winding drums over mine
 * shafts, one per provider. Rope wrapped on the drum = tokens; a
 * horse circling the gin ring for live sessions; a snapped rope
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "whimgin";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="wg-empty">暂无绞盘</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // moorland ground
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const ringR = seg * .3;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a858" : "#987838";
      const drumY = groundY - 26;
      // gin ring — the circular track the horse walks
      g += `<ellipse cx="${x}" cy="${groundY}" rx="${ringR.toFixed(0)}" ry="8" fill="none" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 2" opacity=".6"/>`;
      // drum on a frame at the ring centre
      g += `<line x1="${x - 8}" y1="${groundY}" x2="${x - 8}" y2="${drumY - 8}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + 8}" y1="${groundY}" x2="${x + 8}" y2="${drumY - 8}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<rect x="${x - 10}" y="${drumY - 10}" width="20" height="10" rx="2" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // rope coils on the drum — count by tokens
      const coils = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < coils; c++) {
        g += `<line x1="${x - 8 + c * 5}" y1="${drumY - 9}" x2="${x - 8 + c * 5}" y2="${drumY - 1}" stroke="${tint}" stroke-width="1.2" opacity=".85"/>`;
      }
      // shaft mouth beside the drum, rope descending
      g += `<rect x="${x + 14}" y="${groundY - 4}" width="12" height="6" rx="1" fill="var(--card-2)" stroke="var(--line)" stroke-width="1"/>`;
      g += `<line x1="${x + 8}" y1="${drumY - 4}" x2="${x + 20}" y2="${groundY - 2}" stroke="${r.err ? "var(--red)" : tint}" stroke-width="1.2" ${r.err ? 'stroke-dasharray="2 3"' : ""}/>`;
      // horse circling the ring for live sessions
      if (r.live) {
        const hx = x + ringR * Math.cos(i * 1.3);
        g += `<g class="wg-horse" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${hx.toFixed(0)} ${groundY - 8})">
          <ellipse rx="6" ry="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <circle cx="7" cy="-2" r="2.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="4" x2="-4" y2="9" stroke="${r.col}" stroke-width="1.2"/>
          <line x1="4" y1="4" x2="4" y2="9" stroke="${r.col}" stroke-width="1.2"/>
          <line x1="-8" y1="0" x2="-14" y2="4" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // snapped rope on errors
      if (r.err) g += `<path d="M ${x + 12} ${(drumY + groundY) / 2 - 4} l 4 6 l -4 4" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="wg-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="wg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "马力绞盘", eyebrow: "PROVIDER WHIM GIN", render };
})();
