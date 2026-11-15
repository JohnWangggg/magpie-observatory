/* -------------------------------------------------------------- slittingmill
 * Slittingmill view — a row of slitting stands, one per
 * provider. Nail-iron strips off the rolls = tokens; a guider
 * feeding the stand for live sessions; a cobbled strip marks
 * errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "slittingmill";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="sl-empty">暂无纵剪机</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // mill floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const strip = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8b8a0" : "#a08868";
      const rollY = floorY - 28;
      const rollR = seg * .13;
      // the stand — a housing carrying two rolls
      g += `<rect x="${x - rollR - 8}" y="${rollY - rollR}" width="${(rollR + 8) * 2}" height="${rollR * 2 + 6}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.1"/>`;
      // paired slitting rolls — fluted
      g += `<circle cx="${x}" cy="${rollY - rollR * .55}" r="${rollR}" fill="var(--card-2)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<circle cx="${x}" cy="${rollY + rollR * .55}" r="${rollR}" fill="var(--card-2)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      for (let f = 0; f < 4; f++) {
        g += `<line x1="${x - rollR * .6 + f * (rollR * .4)}" y1="${rollY - rollR * .55 - rollR * .3}" x2="${x - rollR * .6 + f * (rollR * .4)}" y2="${rollY - rollR * .55 + rollR * .3}" stroke="var(--line)" stroke-width=".7"/>`;
      }
      // nail-iron strips off the rolls — fanned strips, count by tokens
      const strips = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < strips; s++) {
        const sy = floorY - 8 + s * 4;
        const sx2 = x + rollR + 14 + s * 3;
        g += `<line x1="${x + rollR + 8}" y1="${rollY + 6}" x2="${sx2}" y2="${sy}" stroke="${s === 0 && r.err ? "var(--red)" : strip}" stroke-width="1.4"/>`;
      }
      // guider feeding the stand for live sessions — a bar in hand
      if (r.live) {
        g += `<g class="sl-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - rollR - 16} ${floorY - 20})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="16" y2="-4" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // cobbled strip — a folded jam on errors
      if (r.err) g += `<path d="M ${x + rollR + 10} ${rollY + 4} l 5 6 l -5 4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="sl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "纵剪机", eyebrow: "PROVIDER SLITTINGMILL", render };
})();
