/* ------------------------------------------------------------------- drawkiln
 * Drawkiln view — a row of perpetual kilns, one per provider.
 * Quicklime drawn at the eye = tokens; a drawer raking the
 * grate for live sessions; a crusted draw marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "drawkiln";
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
    if (!rows.length) { host.innerHTML = `<div class="dl-empty">暂无抽料窑</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // kiln-yard floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const fire = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e89840" : "#b06028";
      const kilnW = seg * .36;
      const kilnY = floorY - 40;
      const kilnH = 36;
      // the shaft — a bottle-shaped stack
      g += `<path d="M ${x - kilnW * .3} ${floorY} L ${x - kilnW * .24} ${kilnY + kilnH * .4} L ${x - kilnW * .16} ${kilnY} L ${x + kilnW * .16} ${kilnY} L ${x + kilnW * .24} ${kilnY + kilnH * .4} L ${x + kilnW * .3} ${floorY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // the throat — a charging opening at the top
      g += `<ellipse cx="${x}" cy="${kilnY}" rx="${kilnW * .16}" ry="3" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      // the fire — a glow in the belly
      g += `<ellipse cx="${x}" cy="${floorY - 14}" rx="${kilnW * .16}" ry="4" fill="${fire}" opacity=".7"/>`;
      // the draw — an arched eye at the base
      g += `<path d="M ${x - 5} ${floorY} v -8 a 5 5 0 0 1 10 0 v 8" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x - 3} ${floorY - 2} h 6" stroke="${fire}" stroke-width="1.4"/>`;
      // the grate — bars inside the draw
      for (let b = 0; b < 3; b++) {
        g += `<line x1="${x - 4 + b * 4}" y1="${floorY - 8}" x2="${x - 4 + b * 4}" y2="${floorY - 2}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // the raking bar — a poker angled into the eye
      g += `<line x1="${x + kilnW * .32}" y1="${floorY - 14}" x2="${x + 4}" y2="${floorY - 4}" stroke="${r.col}" stroke-width="1.3"/>`;
      // drawn lime — quicklime lumps beside the eye, count by tokens
      const lumps = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let l = 0; l < lumps; l++) {
        const lx = x - kilnW * .44 + l * 7;
        g += `<path d="M ${lx} ${floorY - 6 - l} q 3 -3 6 0 l -1 4 h -4 z" fill="${l === 0 && r.err ? "var(--red)" : "#e8e4d8"}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // smoke off the throat
      g += `<path d="M ${x - 3} ${kilnY - 4} q 3 -6 -1 -10" fill="none" stroke="${r.col}" stroke-width=".8" opacity=".4"/>`;
      // drawer raking for live sessions — figure with a bar
      if (r.live) {
        g += `<g class="dl-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + kilnW * .36} ${floorY - 22})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="8" x2="-14" y2="11" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // crusted draw — a plugged eye on errors
      if (r.err) g += `<ellipse cx="${x}" cy="${floorY - 5}" rx="4" ry="3" fill="none" stroke="var(--red)" stroke-width="1.4" stroke-dasharray="3 2"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="dl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="dl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "抽料窑", eyebrow: "PROVIDER DRAWKILN", render };
})();
