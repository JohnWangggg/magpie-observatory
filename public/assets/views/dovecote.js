/* --------------------------------------------------------------- dovecote
 * Dovecote view — a row of circular cotes, one per provider.
 * Doves at the holes = tokens; a potence ladder turning for live
 * sessions; a rat course breach marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "dovecote";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="dv-empty">暂无鸽楼</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ground
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const coteR = seg * .3;
      const coteY = groundY - coteR;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b0b8c8" : "#8890a0";
      // circular cote — wall with corbelled eaves
      g += `<circle cx="${x}" cy="${coteY}" r="${coteR}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // rat course — projecting string course
      g += `<path d="M ${x - coteR - 4} ${coteY + 4} a ${coteR + 4} ${coteR + 4} 0 0 0 ${coteR * 2 + 8} 0" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" fill="none" ${r.err ? 'stroke-dasharray="4 2"' : ""}/>`;
      // nest holes — ring inside, count by tokens
      const holes = Math.min(8, Math.ceil(r.tok / maxTok * 8));
      for (let h = 0; h < holes; h++) {
        const a = (h / holes) * Math.PI * 2;
        const hx = x + Math.cos(a) * coteR * .55;
        const hy = coteY + Math.sin(a) * coteR * .55;
        g += `<circle cx="${hx.toFixed(0)}" cy="${hy.toFixed(0)}" r="2" fill="var(--bg)" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // dove at entrance for live
      if (r.live) g += `<circle class="dv-dove" cx="${x}" cy="${coteY - coteR - 4}" r="3" fill="${r.col}" style="animation-delay: ${(i * .3).toFixed(1)}s"/>`;
      // potence ladder — rotating arm for live sessions
      if (r.live) {
        g += `<g class="dv-potence" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x} ${coteY})">
          <line x1="0" y1="0" x2="${coteR * .4}" y2="0" stroke="${r.col}" stroke-width="1.4"/>
          <line x1="${coteR * .4}" y1="-4" x2="${coteR * .4}" y2="4" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // lantern on top
      g += `<rect x="${x - 6}" y="${coteY - coteR - 8}" width="12" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="dv-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="dv-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鸽楼", eyebrow: "PROVIDER DOVECOTE", render };
})();
