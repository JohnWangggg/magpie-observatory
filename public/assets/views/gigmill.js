/* ------------------------------------------------------------------- gigmill
 * Gigmill view — a row of gig frames, one per provider. Nap
 * raised on the cloth = tokens; a napper turning the teasel
 * drum for live sessions; a torn nap marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "gigmill";
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
    if (!rows.length) { host.innerHTML = `<div class="gm-empty">暂无起绒机</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // mill floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const nap = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8b8a0" : "#b09078";
      const drumR = seg * .16;
      const cy = floorY - 28;
      // gig frame — a stand with a teasel drum and a cloth run under
      g += `<line x1="${x - seg * .3}" y1="${floorY}" x2="${x - seg * .3}" y2="${cy + drumR}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + seg * .3}" y1="${floorY}" x2="${x + seg * .3}" y2="${cy + drumR}" stroke="${r.col}" stroke-width="1.6"/>`;
      // teasel drum — a cylinder with teasel points
      g += `<circle cx="${x}" cy="${cy}" r="${drumR}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      for (let t = 0; t < 6; t++) {
        const a = t * Math.PI / 3;
        g += `<line x1="${x + Math.cos(a) * drumR * .7}" y1="${cy + Math.sin(a) * drumR * .7}" x2="${x + Math.cos(a) * (drumR + 3)}" y2="${cy + Math.sin(a) * (drumR + 3)}" stroke="${r.col}" stroke-width=".9"/>`;
      }
      // cloth running under the drum — the web
      g += `<path d="M ${x - seg * .32} ${cy + drumR + 8} q ${seg * .32} ${3 + (r.tok / maxTok) * 4} ${seg * .64} 0" stroke="${nap}" stroke-width="2.4" fill="none"/>`;
      // raised nap — fuzz on the cloth, count by tokens
      const fuzz = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let f = 0; f < fuzz; f++) {
        const fx = x - seg * .2 + f * (seg * .18);
        g += `<path d="M ${fx} ${cy + drumR + 6} q 1 -3 2 0" stroke="${nap}" stroke-width="1" fill="none"/>`;
      }
      // napper turning the drum for live sessions
      if (r.live) {
        g += `<g class="gm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - seg * .3 - 8} ${floorY - 16})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="14" y2="-6" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // torn nap — a ragged edge on errors
      if (r.err) g += `<path d="M ${x + seg * .1} ${cy + drumR + 6} l 4 4 l -6 2" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="gm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="gm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "起绒机", eyebrow: "PROVIDER GIGMILL", render };
})();
