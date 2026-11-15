/* ------------------------------------------------------------------ netloft
 * Netloft view — a row of net panels hung from cork-lines, one
 * per provider. Meshes filled in the panel = tokens; a netter
 * working a needle for live sessions; a torn panel marks
 * errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "netloft";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const sillY = H * .84;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="nl-empty">暂无织网楼</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // loft floor
    g += `<rect y="${sillY}" width="${W}" height="${H - sillY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const panelW = seg * .62;
      const panelH = 34;
      const panelY = sillY - panelH - 18;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#70a0c8" : "#486888";
      // cork-line + floats
      g += `<line x1="${x - panelW / 2}" y1="${panelY - 4}" x2="${x + panelW / 2}" y2="${panelY - 4}" stroke="${r.col}" stroke-width="1.4"/>`;
      for (let f = 0; f < 4; f++) {
        g += `<circle cx="${x - panelW / 2 + 6 + f * (panelW - 12) / 3}" cy="${panelY - 4}" r="1.8" fill="${tint}" opacity=".9"/>`;
      }
      // panel — a mesh lattice
      g += `<rect x="${x - panelW / 2}" y="${panelY}" width="${panelW}" height="${panelH}" fill="none" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // mesh cells — filled rows by tokens
      const rows = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      const cellH = panelH / 4;
      for (let m = 0; m < rows; m++) {
        for (let c = 0; c < 5; c++) {
          const cx = x - panelW / 2 + 4 + c * (panelW - 8) / 5;
          const cy = panelY + 2 + m * cellH;
          g += `<path d="M ${cx.toFixed(0)} ${cy.toFixed(0)} l 4 3 l -4 3 l -4 -3 Z" fill="${tint}" opacity=".7"/>`;
        }
      }
      // foot-rope with lead weights
      g += `<line x1="${x - panelW / 2}" y1="${panelY + panelH + 4}" x2="${x + panelW / 2}" y2="${panelY + panelH + 4}" stroke="var(--line)" stroke-width="1" opacity=".6"/>`;
      for (let f = 0; f < 3; f++) {
        g += `<rect x="${x - panelW / 2 + 6 + f * (panelW - 12) / 2}" y="${panelY + panelH + 5}" width="3" height="3" fill="var(--muted)" opacity=".8"/>`;
      }
      // netter working a needle for live sessions
      if (r.live) {
        g += `<g class="nl-netter" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + panelW / 2 + 10} ${panelY + 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="2" x2="-12" y2="6" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // torn panel — a gap in the mesh on errors
      if (r.err) g += `<path d="M ${x - 6} ${panelY + 10} l 6 6 l -6 4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${sillY + 18}" text-anchor="middle" class="nl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="nl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "织网楼", eyebrow: "PROVIDER NETLOFT", render };
})();
