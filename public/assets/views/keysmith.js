/* ------------------------------------------------------------------ keysmith
 * Keysmith view — a row of key-cutting benches, one per provider.
 * Bright keys hung on the ward board = tokens; a smith filing
 * the bit for live sessions; a paracentric miss marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "keysmith";
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
    if (!rows.length) { host.innerHTML = `<div class="ky-empty">暂无锁匙坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // locksmith floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const brass = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8b050" : "#b08840";
      const benchY = floorY - 24;
      const benchW = seg * .5;
      // the bench — a plank with a vise at the end
      g += `<line x1="${x - benchW / 2}" y1="${benchY}" x2="${x + benchW / 2}" y2="${benchY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - benchW * .32}" y1="${benchY}" x2="${x - benchW * .32}" y2="${floorY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + benchW * .32}" y1="${benchY}" x2="${x + benchW * .32}" y2="${floorY}" stroke="${r.col}" stroke-width="1.8"/>`;
      // key-cutting vise — a small jaw on the bench end
      g += `<rect x="${x + benchW * .28}" y="${benchY - 5}" width="6" height="10" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // a blank clamped in the vise — a key-bit on the jaw
      g += `<path d="M ${x + benchW * .24} ${benchY - 2} l 10 -3 l 0 3 l -10 3 z" fill="${brass}" stroke="${r.col}" stroke-width=".7"/>`;
      // ward board — keys hung on the back rail, count by tokens
      const keys = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let k = 0; k < keys; k++) {
        const kx = x - benchW * .3 + k * 10;
        g += `<path d="M ${kx} ${floorY - 8} a 3 3 0 0 1 6 0 a 3 3 0 0 1 -6 0 m 3 -3 l 0 10 m -4 0 l 8 0" fill="none" stroke="${k === 0 && r.err ? "var(--red)" : brass}" stroke-width="1" stroke-linecap="round"/>`;
      }
      // smith filing the bit for live sessions — figure with a file
      if (r.live) {
        g += `<g class="ky-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - benchW * .4} ${benchY - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="15" y2="4" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // paracentric miss — a mismilled bit on errors
      if (r.err) g += `<line x1="${x + benchW * .2}" y1="${benchY - 1}" x2="${x + benchW * .26}" y2="${benchY - 1}" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="ky-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ky-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "锁匙坊", eyebrow: "PROVIDER KEYSMITH", render };
})();
