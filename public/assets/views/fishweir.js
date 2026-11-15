/* ------------------------------------------------------------------ fishweir
 * Fishweir view — a row of wattle-stake V-weirs in a stream,
 * one per provider. Fish held in the pound = tokens; a weirman
 * lifting a basket for live sessions; a burst stake marks
 * errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fishweir";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const bedY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="fw-empty">暂无鱼梁</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // stream bed
    g += `<rect y="${bedY}" width="${W}" height="${H - bedY}" fill="#1e3348" opacity=".5"/>`;
    for (let x = 0; x < W; x += 26) g += `<path d="M ${x} ${bedY + 8} q 8 -4 16 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const weirW = seg * .6;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#70a0c8" : "#486888";
      const weirTop = bedY - 30;
      // two wattle fences meeting in a V downstream
      const apexY = bedY - 4;
      g += `<line x1="${x - weirW / 2}" y1="${weirTop}" x2="${x}" y2="${apexY}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="2" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      g += `<line x1="${x + weirW / 2}" y1="${weirTop}" x2="${x}" y2="${apexY}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="2" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // stakes along both arms
      for (let s = 1; s <= 3; s++) {
        const t = s / 4;
        const lx = (x - weirW / 2) + (x - (x - weirW / 2)) * t;
        const ly = weirTop + (apexY - weirTop) * t;
        g += `<line x1="${lx.toFixed(0)}" y1="${ly.toFixed(0)}" x2="${(lx - 2).toFixed(0)}" y2="${(ly + 5).toFixed(0)}" stroke="${r.col}" stroke-width="1"/>`;
        const rx = (x + weirW / 2) + (x - (x + weirW / 2)) * t;
        g += `<line x1="${rx.toFixed(0)}" y1="${ly.toFixed(0)}" x2="${(rx + 2).toFixed(0)}" y2="${(ly + 5).toFixed(0)}" stroke="${r.col}" stroke-width="1"/>`;
      }
      // fish trapped in the pound — count by tokens
      const fish = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let f = 0; f < fish; f++) {
        const fx = x - 8 + f * 7;
        const fy = apexY - 8 - f * 3;
        g += `<path d="M ${fx} ${fy} q 4 -2 8 0 q -4 2 -8 0 Z" fill="${tint}" opacity=".85"/><circle cx="${fx + 6}" cy="${fy - .5}" r=".8" fill="var(--bg)"/>`;
      }
      // basket at the V mouth
      g += `<path d="M ${x - 4} ${apexY} l 8 0 l -2 6 l -4 0 Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // weirman lifting a basket for live sessions
      if (r.live) {
        g += `<g class="fw-weirman" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + weirW / 2 + 10} ${weirTop + 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="4" x2="-10" y2="8" stroke="${r.col}" stroke-width="1.2"/>
          <rect x="-12" y="8" width="4" height="3" fill="${tint}" opacity=".9"/>
        </g>`;
      }
      // burst stake — a snapped arm on errors
      if (r.err) g += `<path d="M ${x - weirW * .3} ${weirTop + 8} l 6 4 l -6 4" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${bedY + 14}" text-anchor="middle" class="fw-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鱼梁", eyebrow: "PROVIDER FISHWEIR", render };
})();
