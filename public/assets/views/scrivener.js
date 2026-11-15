/* --------------------------------------------------------------- scrivener
 * Scrivener view — a row of writing desks, one per provider.
 * Fair copies stacked on the desk = tokens; a scrivener writing
 * for live sessions; a blotted leaf marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "scrivener";
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
    if (!rows.length) { host.innerHTML = `<div class="scr-empty">暂无书案</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const deskY = floorY - 18;
      const paper = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e0d4b8" : "#b0a488";

      // the desk — a sloped writing slope on legs
      g += `<line x1="${x - bW * .34}" y1="${floorY}" x2="${x - bW * .3}" y2="${deskY + 4}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x + bW * .02}" y1="${floorY}" x2="${x + bW * .02}" y2="${deskY + 4}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<path d="M ${x - bW * .36} ${deskY} l ${bW * .4} -6 l 0 6 l -${bW * .4} 6 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // a leaf on the slope — the current copy
      g += `<rect x="${x - bW * .3}" y="${deskY - 4}" width="${bW * .24}" height="7" fill="${r.err ? "var(--red)" : paper}" stroke="${r.col}" stroke-width=".5" transform="rotate(-8 ${x - bW * .18} ${deskY})"/>`;
      for (let l = 0; l < 3; l++) {
        g += `<line x1="${x - bW * .28 + l}" y1="${deskY - 2 + l * 1.8}" x2="${x - bW * .12 + l}" y2="${deskY - 3.4 + l * 1.8}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // a blot — ink spot on errors
      if (r.err) g += `<circle cx="${x - bW * .2}" cy="${deskY - 1}" r="1.4" fill="var(--red)"/>`;

      // an inkwell — on the desk edge
      g += `<rect x="${x - bW * .02}" y="${deskY - 8}" width="6" height="5" rx="1" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<ellipse cx="${x + bW * .01}" cy="${deskY - 7}" rx="2" ry=".9" fill="#20304a"/>`;
      // a quill — in the inkwell
      g += `<path d="M ${x + bW * .01} ${deskY - 8} q 3 -10 8 -12 q -2 6 -4 10 z" fill="${paper}" stroke="${r.col}" stroke-width=".5"/>`;
      // a sand shaker — for drying ink
      g += `<rect x="${x - bW * .4}" y="${deskY - 2}" width="5" height="7" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      for (let s = 0; s < 3; s++) {
        g += `<circle cx="${x - bW * .39 + s * 1.5}" cy="${deskY - 1}" r=".5" fill="${r.col}"/>`;
      }

      // a pile of fair copies — stacked leaves, count by tokens
      const copies = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < copies; c++) {
        const cx = x + bW * .1;
        const cy = floorY - 4 - c * 3;
        g += `<rect x="${cx}" y="${cy - 4}" width="${bW * .16}" height="4" fill="${c === copies - 1 && r.err ? "var(--red)" : paper}" stroke="${r.col}" stroke-width=".4"/>`;
        g += `<line x1="${cx + 2}" y1="${cy - 2}" x2="${cx + bW * .16 - 2}" y2="${cy - 2}" stroke="${r.col}" stroke-width=".25"/>`;
      }
      // a tied bundle — wrapped copies
      g += `<rect x="${x + bW * .3}" y="${floorY - 8}" width="${bW * .1}" height="8" fill="${paper}" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x + bW * .3}" y1="${floorY - 4}" x2="${x + bW * .4}" y2="${floorY - 4}" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x + bW * .35}" y1="${floorY - 8}" x2="${x + bW * .35}" y2="${floorY}" stroke="${r.col}" stroke-width=".6"/>`;
      // a seal — wax on the bundle
      g += `<circle cx="${x + bW * .35}" cy="${floorY - 4}" r="1.6" fill="${r.err ? "var(--red)" : "#a03030"}" stroke="${r.col}" stroke-width=".4"/>`;

      // a candle — on a spike by the desk
      g += `<line x1="${x + bW * .44}" y1="${floorY}" x2="${x + bW * .44}" y2="${floorY - 20}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x + bW * .43}" y="${floorY - 24}" width="2.5" height="5" fill="${paper}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<path d="M ${x + bW * .442} ${floorY - 26} q -1 -2 0 -3 q 1 1 0 3" fill="#ffd23a"/>`;

      // scrivener writing for live sessions — figure at the slope
      if (r.live) {
        g += `<g class="scr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .04} ${deskY - 18})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="6" x2="-12" y2="10" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="scr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="scr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "书案", eyebrow: "PROVIDER SCRIVENER", render };
})();
