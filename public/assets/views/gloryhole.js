/* ----------------------------------------------------------------- gloryhole
 * Gloryhole view — a row of reheating furnaces, one per provider.
 * Glassware on the cooling rack = tokens; a gaffer working
 * the pipe for live sessions; a cracked crucible marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "gloryhole";
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
    if (!rows.length) { host.innerHTML = `<div class="gh-empty">暂无吹制坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // glasshouse floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const heat = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#f0a040" : "#c07828";
      const furnW = seg * .38;
      const furnY = floorY - 34;
      const furnH = 30;
      // the glory hole — a drum furnace with a round mouth
      g += `<rect x="${x - furnW / 2}" y="${furnY}" width="${furnW}" height="${furnH}" rx="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // the working mouth — a bright circular port
      g += `<circle cx="${x}" cy="${furnY + furnH * .45}" r="${furnW * .16}" fill="${heat}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<circle cx="${x}" cy="${furnY + furnH * .45}" r="${furnW * .09}" fill="#fff" opacity=".3"/>`;
      // the crucible inside — a pot visible through the mouth
      g += `<path d="M ${x - 4} ${furnY + furnH * .52} q 4 -5 8 0 l -1 5 h -6 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      // stack — a flue off the top
      g += `<rect x="${x + furnW * .26}" y="${furnY - 10}" width="6" height="12" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // the bench — a gaffer's bench with rails
      g += `<line x1="${x - furnW * .52}" y1="${floorY - 14}" x2="${x - furnW * .18}" y2="${floorY - 14}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x - furnW * .52}" y1="${floorY - 14}" x2="${x - furnW * .52}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - furnW * .18}" y1="${floorY - 14}" x2="${x - furnW * .18}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      // blowpipe — a pipe from the bench to the mouth with a gather
      g += `<line x1="${x - furnW * .45}" y1="${floorY - 16}" x2="${x - furnW * .05}" y2="${furnY + furnH * .5}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<circle cx="${x - furnW * .05}" cy="${furnY + furnH * .5}" r="3" fill="${heat}"/>`;
      // glassware on the cooling rack — finished pieces by tokens
      const ware = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let w = 0; w < ware; w++) {
        const wx = x + furnW * .4 + w * 9;
        g += `<path d="M ${wx} ${floorY - 14} q 3 0 3 4 q 0 5 -3 7 q -3 -2 -3 -7 q 0 -4 3 -4" fill="${w === 0 && r.err ? "var(--red)" : heat}" stroke="${r.col}" stroke-width=".6" opacity=".85"/>`;
      }
      // gaffer working the pipe for live sessions — seated figure blowing
      if (r.live) {
        g += `<g class="gh-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - furnW * .45} ${floorY - 28})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="8" x2="10" y2="12" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // cracked crucible — a split through the pot on errors
      if (r.err) g += `<path d="M ${x - 3} ${furnY + furnH * .48} l 6 8" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="gh-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="gh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "吹制坊", eyebrow: "PROVIDER GLORYHOLE", render };
})();
