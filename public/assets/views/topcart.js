/* ------------------------------------------------------------------- topcart
 * Topcart view — a row of ropewalk tops, one per provider.
 * Strands drawn along the walk = tokens; a top-cart running
 * for live sessions; a sprung strand marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "topcart";
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
    if (!rows.length) { host.innerHTML = `<div class="tc-empty">暂无绳廊顶车</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ropewalk floor — a long boarded alley
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="${'var(--line)'}" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const hemp = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a868" : "#987848";
      const walkW = seg * .5;
      const wheelX = x - walkW * .34;
      const cartX = x + walkW * .34;
      const lineY = floorY - 24;
      // the wheel-end — a spinning wheel on a post
      g += `<circle cx="${wheelX}" cy="${lineY}" r="7" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      for (let s = 0; s < 3; s++) {
        const a = s * Math.PI * 2 / 3;
        g += `<line x1="${wheelX}" y1="${lineY}" x2="${wheelX + Math.cos(a) * 7}" y2="${lineY + Math.sin(a) * 7}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      g += `<line x1="${wheelX}" y1="${lineY + 7}" x2="${wheelX}" y2="${floorY}" stroke="${r.col}" stroke-width="1.4"/>`;
      // the top-cart — a grooved board on wheels at the far end
      g += `<rect x="${cartX - 8}" y="${lineY - 4}" width="16" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<circle cx="${cartX - 4}" cy="${lineY + 6}" r="2" fill="none" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<circle cx="${cartX + 4}" cy="${lineY + 6}" r="2" fill="none" stroke="${r.col}" stroke-width=".9"/>`;
      // the top — a notched divider keeping strands apart
      for (let t = 0; t < 3; t++) {
        g += `<line x1="${cartX - 4 + t * 4}" y1="${lineY - 4}" x2="${cartX - 4 + t * 4}" y2="${lineY + 4}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // strands — lines drawn from the wheel toward the cart, count by tokens
      const strands = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < strands; s++) {
        const sy = lineY - 3 + s * 3;
        g += `<line x1="${wheelX + 7}" y1="${sy}" x2="${cartX - 8}" y2="${sy}" stroke="${s === 0 && r.err ? "var(--red)" : hemp}" stroke-width="1.1"/>`;
      }
      // the ground line — a sag beneath the strands
      g += `<path d="M ${wheelX + 7} ${lineY + 6} q ${walkW * .34} 8 ${walkW * .68} 0" fill="none" stroke="${hemp}" stroke-width=".7" opacity=".5"/>`;
      // top-cart running for live sessions — a figure pushing the cart
      if (r.live) {
        g += `<g class="tc-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${cartX + 14} ${lineY - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="7" x2="-12" y2="9" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // sprung strand — a kink in the line on errors
      if (r.err) g += `<path d="M ${x - 6} ${lineY - 6} q 3 -4 6 0 q -3 3 -6 0" stroke="var(--red)" stroke-width="1.3" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="tc-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "顶车坊", eyebrow: "PROVIDER TOPCART", render };
})();
