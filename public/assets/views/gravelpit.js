/* ----------------------------------------------------------------- gravelpit
 * Gravelpit view — a row of digging pits, one per provider.
 * Gravel heaps raised = tokens; a digger working the face
 * for live sessions; a collapsed face marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "gravelpit";
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
    if (!rows.length) { host.innerHTML = `<div class="gp-empty">暂无采砾坑</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ground
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const sand = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8b078" : "#988050";
      const pitW = seg * .44;
      const pitD = 18;
      // the pit — a stepped excavation below ground
      g += `<path d="M ${x - pitW / 2} ${floorY} L ${x - pitW * .3} ${floorY + pitD} L ${x + pitW * .3} ${floorY + pitD} L ${x + pitW / 2} ${floorY} Z" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.2"/>`;
      // the face — strata lines in the pit wall
      for (let s = 0; s < 2; s++) {
        g += `<line x1="${x - pitW * .4}" y1="${floorY + 5 + s * 6}" x2="${x + pitW * .4}" y2="${floorY + 5 + s * 6}" stroke="${r.col}" stroke-width=".5" opacity=".4"/>`;
      }
      // gravel heaps — piles beside the pit, count by tokens
      const heaps = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let h = 0; h < heaps; h++) {
        const hx = x + pitW * .4 + h * 9;
        const hh = 6 + h * 3;
        g += `<path d="M ${hx - hh * .7} ${floorY} L ${hx} ${floorY - hh} L ${hx + hh * .7} ${floorY} Z" fill="${h === 0 && r.err ? "var(--red)" : sand}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // the derrick — an A-frame hoist over the pit
      g += `<line x1="${x - pitW * .4}" y1="${floorY}" x2="${x}" y2="${floorY - 34}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x + pitW * .4}" y1="${floorY}" x2="${x}" y2="${floorY - 34}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<circle cx="${x}" cy="${floorY - 34}" r="3" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // the cable and bucket into the pit
      g += `<line x1="${x}" y1="${floorY - 34}" x2="${x}" y2="${floorY - 4}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x - 3}" y="${floorY - 4}" width="6" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // digger working the face for live sessions — figure with a shovel
      if (r.live) {
        g += `<g class="gp-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - pitW * .42} ${floorY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="8" x2="12" y2="13" stroke="${r.col}" stroke-width="1.1"/>
          <path d="M 12 13 l 3 3" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // collapsed face — a slump in the wall on errors
      if (r.err) g += `<path d="M ${x - pitW * .3} ${floorY} q ${pitW * .3} 6 ${pitW * .6} 0" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="gp-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="gp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "采砾坑", eyebrow: "PROVIDER GRAVELPIT", render };
})();
