/* ----------------------------------------------------------------- muleteer
 * Muleteer view — a row of pack trails, one per provider.
 * Pack mules on the path = tokens; a muleteer leading
 * for live sessions; a slipped pack marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "muleteer";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .88;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="mul-empty">暂无骡队</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const hide = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#9a8068" : "#685040";

      // the trail — a switchback path
      g += `<path d="M ${x - bW * .44} ${floorY} q ${bW * .1} -8 ${bW * .22} -4 q ${bW * .12} 4 ${bW * .22} -2" fill="none" stroke="${r.col}" stroke-width="1.4" stroke-dasharray="4 2" opacity=".5"/>`;
      // a cairn — a trail marker
      g += `<path d="M ${x - bW * .44} ${floorY} l 3 -8 h 4 l 3 8 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<path d="M ${x - bW * .42} ${floorY - 8} l 2 -3 h 2 l 2 3 z" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;

      // pack mules — a string on the trail, count by tokens
      const mules = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let m = 0; m < mules; m++) {
        const mx = x - bW * .3 + m * bW * .16;
        const my = floorY - 10 - (m % 2) * 3;
        // body
        g += `<ellipse cx="${mx}" cy="${my}" rx="8" ry="5" fill="${m === mules - 1 && r.err ? "var(--red)" : hide}" stroke="${r.col}" stroke-width=".7"/>`;
        // head with long ears
        g += `<circle cx="${mx - 8}" cy="${my - 3}" r="2.8" fill="${hide}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<line x1="${mx - 9}" y1="${my - 5}" x2="${mx - 10}" y2="${my - 10}" stroke="${r.col}" stroke-width=".8"/>`;
        g += `<line x1="${mx - 7}" y1="${my - 5}" x2="${mx - 7}" y2="${my - 10}" stroke="${r.col}" stroke-width=".8"/>`;
        // packsaddle — boxes on the back
        g += `<rect x="${mx - 5}" y="${my - 7}" width="4" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<rect x="${mx + 1}" y="${my - 7}" width="4" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<line x1="${mx - 5}" y1="${my - 3}" x2="${mx + 5}" y2="${my - 3}" stroke="${r.col}" stroke-width=".7"/>`;
        // legs
        g += `<line x1="${mx - 4}" y1="${my + 5}" x2="${mx - 4}" y2="${floorY - 5}" stroke="${r.col}" stroke-width=".9"/>`;
        g += `<line x1="${mx + 4}" y1="${my + 5}" x2="${mx + 4}" y2="${floorY - 5}" stroke="${r.col}" stroke-width=".9"/>`;
        // tail
        g += `<line x1="${mx + 8}" y1="${my}" x2="${mx + 10}" y2="${my + 4}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // lead rope — stringing the mules
      g += `<path d="M ${x - bW * .38} ${floorY - 12} q ${bW * .08} 3 ${bW * .16} -1 q ${bW * .08} -4 ${bW * .16} -3" fill="none" stroke="${r.col}" stroke-width=".6"/>`;

      // a pack frame — a spare saddle on the ground
      g += `<path d="M ${x + bW * .4} ${floorY} l -2 -8 h 6 l -2 8 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${x + bW * .39}" y="${floorY - 10}" width="4" height="3" fill="var(--card-2)" stroke="${r.col}" stroke-width=".4"/>`;
      // a goad — a pointed stick
      g += `<line x1="${x + bW * .24}" y1="${floorY}" x2="${x + bW * .27}" y2="${floorY - 16}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<circle cx="${x + bW * .27}" cy="${floorY - 17}" r="1" fill="${r.col}"/>`;
      // a water skin — hanging on a post
      g += `<line x1="${x + bW * .44}" y1="${floorY - 18}" x2="${x + bW * .44}" y2="${floorY}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<path d="M ${x + bW * .43} ${floorY - 18} q -3 4 0 8 q 3 -4 0 -8" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;

      // muleteer leading for live sessions — figure at the head
      if (r.live) {
        g += `<g class="mul-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .44} ${floorY - 26})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="5" x2="10" y2="8" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // slipped pack — a tilted load on errors
      if (r.err) {
        const mx = x - bW * .3 + (mules - 1) * bW * .16;
        g += `<rect x="${mx - 5}" y="${floorY - 18}" width="4" height="4" fill="var(--red)" stroke="${r.col}" stroke-width=".5" transform="rotate(30 ${mx - 3} ${floorY - 16})"/>`;
      }

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="mul-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="mul-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "骡队", eyebrow: "PROVIDER MULETEER", render };
})();
