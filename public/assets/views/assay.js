/* -------------------------------------------------------------------- assay
 * Assay view — a row of beam balances, one per provider.
 * Weights stacked on the pan = tokens; an assayer reading
 * the pointer for live sessions; a drifted beam marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "assay";
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
    if (!rows.length) { host.innerHTML = `<div class="as-empty">暂无化验坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // assay-office floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const brass = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8b050" : "#b08840";
      const beamW = seg * .5;
      const beamY = floorY - 34;
      const tilt = r.err ? 4 : 0; /* drifted beam */
      // the pillar and beam
      g += `<line x1="${x}" y1="${floorY}" x2="${x}" y2="${beamY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - beamW / 2}" y1="${beamY + tilt}" x2="${x + beamW / 2}" y2="${beamY - tilt}" stroke="${r.col}" stroke-width="1.8"/>`;
      // pointer and scale arc
      g += `<line x1="${x}" y1="${beamY}" x2="${x}" y2="${beamY + 10}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2"/>`;
      g += `<path d="M ${x - 6} ${beamY + 10} a 6 6 0 0 0 12 0" fill="none" stroke="${r.col}" stroke-width=".8"/>`;
      // the pans — hanging dishes off each end
      g += `<line x1="${x - beamW / 2}" y1="${beamY + tilt}" x2="${x - beamW / 2}" y2="${beamY + tilt + 8}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + beamW / 2}" y1="${beamY - tilt}" x2="${x + beamW / 2}" y2="${beamY - tilt + 8}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x - beamW / 2 - 7} ${beamY + tilt + 8} q 7 6 14 0" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x + beamW / 2 - 7} ${beamY - tilt + 8} q 7 6 14 0" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // weights on the right pan — stacked discs by tokens
      const wts = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let w = 0; w < wts; w++) {
        g += `<ellipse cx="${x + beamW / 2}" cy="${beamY - tilt + 7 - w * 3}" rx="${5 - w}" ry="2" fill="${w === 0 && r.err ? "var(--red)" : brass}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // the cupel — a bone-ash cup on the left pan
      g += `<path d="M ${x - beamW / 2 - 4} ${beamY + tilt + 6} l 2 -5 l 5 0 l 2 5 z" fill="#e0dcd0" stroke="${r.col}" stroke-width=".7"/>`;
      // bead — the bright prill in the cupel
      g += `<circle cx="${x - beamW / 2}" cy="${beamY + tilt + 4}" r="1.4" fill="${brass}"/>`;
      // assayer reading for live sessions — figure with a lens at the pointer
      if (r.live) {
        g += `<g class="as-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - beamW * .42} ${beamY - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <circle cx="6" cy="-2" r="2" fill="none" stroke="${r.col}" stroke-width=".9"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="7" x2="13" y2="9" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // drifted beam — a dashed zero mark on errors
      if (r.err) g += `<line x1="${x - 4}" y1="${beamY + 10}" x2="${x + 4}" y2="${beamY + 10}" stroke="var(--red)" stroke-width="1.2" stroke-dasharray="3 2"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="as-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="as-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "化验坊", eyebrow: "PROVIDER ASSAY", render };
})();
