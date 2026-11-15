/* ------------------------------------------------------------------- weaver
 * Weaver view — a row of handlooms, one per provider.
 * Cloth woven on the beam = tokens; a weaver throwing
 * the shuttle for live sessions; a broken warp marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "weaver";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="wvr-empty">暂无织坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a plank surface
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const beamY = floorY - 30;
      const yarn = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#7a8a5a" : "#4a5030";
      // the loom — two posts, a breast beam and a back beam
      g += `<rect x="${x - bW * .38}" y="${floorY - 4}" width="6" height="34" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<rect x="${x + bW * .32}" y="${floorY - 4}" width="6" height="34" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .38}" y1="${beamY}" x2="${x + bW * .32}" y2="${beamY}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x - bW * .38}" y1="${beamY - 10}" x2="${x + bW * .32}" y2="${beamY - 10}" stroke="${r.col}" stroke-width=".9"/>`;
      // warp threads — vertical lines from back beam to breast beam, count by tokens
      const warps = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let w = 0; w < warps; w++) {
        const wx = x - bW * .28 + w * bW * .14;
        g += `<line x1="${wx}" y1="${beamY - 10}" x2="${wx}" y2="${floorY - 6}" stroke="${w === 0 && r.err ? "var(--red)" : yarn}" stroke-width=".7"/>`;
      }
      // the woven cloth — a band on the front beam
      const clothW = bW * .56 * (r.tok / maxTok);
      g += `<rect x="${x - bW * .28}" y="${floorY - 6}" width="${clothW}" height="4" fill="${r.err ? "var(--red)" : yarn}" opacity=".6"/>`;
      // the shuttle — a small boat on the weft
      g += `<rect x="${x - bW * .1}" y="${beamY - 4}" width="12" height="4" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x - bW * .1}" y1="${beamY - 2}" x2="${x + bW * .02}" y2="${beamY - 2}" stroke="${r.col}" stroke-width=".5"/>`;
      // the reed/beater — a comb hung above
      g += `<line x1="${x + bW * .2}" y1="${beamY - 10}" x2="${x + bW * .2}" y2="${beamY - 16}" stroke="${r.col}" stroke-width=".8"/>`;
      for (let t = 0; t < 4; t++) {
        g += `<line x1="${x + bW * .2 - 3 + t * 2}" y1="${beamY - 16}" x2="${x + bW * .2 - 3 + t * 2}" y2="${beamY - 12}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a bobbin basket — a container with yarn
      g += `<path d="M ${x - bW * .44} ${floorY - 4} l 4 -10 4 10 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<circle cx="${x - bW * .4}" cy="${floorY - 8}" r="2" fill="${yarn}" stroke="${r.col}" stroke-width=".4"/>`;
      // a treadle — a foot pedal
      g += `<rect x="${x + bW * .24}" y="${floorY - 4}" width="${bW * .2}" height="4" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // weaver throwing for live sessions — figure at the loom
      if (r.live) {
        g += `<g class="wvr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .2} ${beamY - 24})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="10" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // broken warp — a snapped thread on errors
      if (r.err) g += `<path d="M ${x + bW * .1} ${beamY - 6} q 2 8 4 12" fill="none" stroke="var(--red)" stroke-width="1.4" stroke-dasharray="2 1"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="wvr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="wvr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "织坊", eyebrow: "PROVIDER WEAVER", render };
})();
