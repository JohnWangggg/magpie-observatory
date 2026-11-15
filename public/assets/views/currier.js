/* ------------------------------------------------------------------ currier
 * Currier view — a row of dressing boards, one per provider.
 * Hides worked on the beam = tokens; a currier slicking
 * a hide for live sessions; a scored hide marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "currier";
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
    if (!rows.length) { host.innerHTML = `<div class="cur-empty">暂无革匠</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a plank surface
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const beamY = floorY - 10;
      const hide = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a5a3a" : "#4a3a30";
      // the beam — a padded board on legs
      g += `<rect x="${x - bW * .34}" y="${beamY - 8}" width="${bW * .44}" height="10" rx="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x - bW * .3}" y1="${beamY + 2}" x2="${x - bW * .3}" y2="${floorY}" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x + bW * .06}" y1="${beamY + 2}" x2="${x + bW * .06}" y2="${floorY}" stroke="${r.col}" stroke-width=".9"/>`;
      // a hide draped over the beam — worked by the currier
      g += `<path d="M ${x - bW * .3} ${beamY - 8} q 6 -4 12 0 q 6 4 12 0 l 0 8 q -6 4 -12 0 q -6 -4 -12 0 z" fill="${r.err ? "var(--red)" : hide}" stroke="${r.col}" stroke-width=".7"/>`;
      // lacing marks on the hide
      g += `<line x1="${x - bW * .24}" y1="${beamY - 6}" x2="${x - bW * .24}" y2="${beamY - 2}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<line x1="${x - bW * .16}" y1="${beamY - 6}" x2="${x - bW * .16}" y2="${beamY - 2}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<line x1="${x - bW * .08}" y1="${beamY - 6}" x2="${x - bW * .08}" y2="${beamY - 2}" stroke="${r.col}" stroke-width=".4"/>`;
      // rolled hides — stacked on the floor, count by tokens
      const rolls = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let ro = 0; ro < rolls; ro++) {
        const rx = x + bW * .14 + ro * bW * .08;
        g += `<ellipse cx="${rx}" cy="${floorY - 4}" rx="5" ry="3" fill="${ro === 0 && r.err ? "var(--red)" : hide}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<ellipse cx="${rx}" cy="${floorY - 4}" rx="2" ry="1.2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a slicker — a two-handled blade on the beam
      g += `<path d="M ${x + bW * .16} ${beamY - 4} q 6 -4 10 0 q -2 4 -10 0 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .16}" y1="${beamY - 4}" x2="${x + bW * .16}" y2="${beamY - 8}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .26}" y1="${beamY - 4}" x2="${x + bW * .26}" y2="${beamY - 8}" stroke="${r.col}" stroke-width=".7"/>`;
      // a tub of dubbin — a grease pot
      g += `<rect x="${x - bW * .42}" y="${floorY - 6}" width="8" height="6" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x - bW * .38}" cy="${floorY - 3}" rx="3" ry="1.5" fill="#5a4a2a" stroke="${r.col}" stroke-width=".4"/>`;
      // currier slicking for live sessions — figure at the beam
      if (r.live) {
        g += `<g class="cur-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .18} ${beamY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // scored hide — a cut on the leather on errors
      if (r.err) g += `<path d="M ${x - bW * .24} ${beamY - 6} l -3 4 3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="cur-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cur-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "革匠", eyebrow: "PROVIDER CURRIER", render };
})();
