/* ------------------------------------------------------------------- whipcord
 * Whipcord view — a row of twisting frames, one per provider.
 * Laid cord coiled on the ground = tokens; a twister walking
 * the strands for live sessions; a kinked lay marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "whipcord";
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
    if (!rows.length) { host.innerHTML = `<div class="wc-empty">暂无绞绳坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ropewalk floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const hemp = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d0b078" : "#a08050";
      const frameW = seg * .45;
      const frameY = floorY - 30;
      // the twisting frame — a post with a crank wheel
      g += `<line x1="${x - frameW * .28}" y1="${floorY}" x2="${x - frameW * .28}" y2="${frameY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + frameW * .28}" y1="${floorY}" x2="${x + frameW * .28}" y2="${frameY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - frameW * .28}" y1="${frameY}" x2="${x + frameW * .28}" y2="${frameY}" stroke="${r.col}" stroke-width="1.8"/>`;
      // the crank wheel at the head
      g += `<circle cx="${x - frameW * .18}" cy="${frameY - 6}" r="5" fill="none" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<circle cx="${x - frameW * .18}" cy="${frameY - 6}" r="1.2" fill="${r.col}"/>`;
      // strands running the frame — lines fanning to the layer, count by tokens
      const strands = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < strands; s++) {
        g += `<line x1="${x - frameW * .18}" y1="${frameY - 6}" x2="${x + frameW * .2}" y2="${frameY - 2 + s * 2}" stroke="${s === 0 && r.err ? "var(--red)" : hemp}" stroke-width="1" opacity=".9"/>`;
      }
      // the layer — a top that closes the strands into one
      g += `<path d="M ${x + frameW * .2} ${frameY - 6} l 6 3 l -6 3 z" fill="${hemp}" stroke="${r.col}" stroke-width=".8"/>`;
      // laid cord coiled on the ground — a spiral stack
      const coils = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < coils; c++) {
        g += `<ellipse cx="${x + frameW * .32}" cy="${floorY - 5 - c * 3}" rx="${5 + c}" ry="${2 + c * .5}" fill="none" stroke="${hemp}" stroke-width="1" opacity="${.9 - c * .1}"/>`;
      }
      // twister walking the strands for live sessions — figure mid-walk
      if (r.live) {
        g += `<g class="wc-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - frameW * .05} ${frameY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="14" y2="4" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // kinked lay — a loop doubled back on errors
      if (r.err) g += `<path d="M ${x + frameW * .1} ${frameY - 2} q 5 -6 10 0 q -5 4 -10 0" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="wc-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="wc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "绞绳坊", eyebrow: "PROVIDER WHIPCORD", render };
})();
