/* ----------------------------------------------------------------- dairyman
 * Dairyman view — a row of milking sheds, one per provider.
 * Milk pails filled at the stall = tokens; a dairyman milking
 * for live sessions; a kicked pail marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "dairyman";
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
    if (!rows.length) { host.innerHTML = `<div class="dry-empty">暂无奶棚</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const milk = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8e8f0" : "#b0b0c0";

      // the cow — in a milking stall
      const cowY = floorY - 16;
      g += `<ellipse cx="${x - bW * .16}" cy="${cowY}" rx="12" ry="7" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x - bW * .28}" cy="${cowY - 4}" r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x - bW * .3} ${cowY - 8} l -2 -3 M ${x - bW * .26} ${cowY - 8} l 2 -3" stroke="${r.col}" stroke-width=".6" fill="none"/>`;
      g += `<line x1="${x - bW * .2}" y1="${cowY + 6}" x2="${x - bW * .2}" y2="${floorY - 6}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x - bW * .1}" y1="${cowY + 6}" x2="${x - bW * .1}" y2="${floorY - 6}" stroke="${r.col}" stroke-width="1"/>`;
      // an udder
      g += `<ellipse cx="${x - bW * .14}" cy="${cowY + 7}" rx="3" ry="2.5" fill="${r.err ? "var(--red)" : "#d8a8b8"}" stroke="${r.col}" stroke-width=".5"/>`;
      // a stall rail
      g += `<line x1="${x - bW * .34}" y1="${cowY - 12}" x2="${x - bW * .34}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - bW * .34}" y1="${cowY - 12}" x2="${x - bW * .04}" y2="${cowY - 12}" stroke="${r.col}" stroke-width=".8"/>`;
      // a milk pail — under the udder
      g += `<path d="M ${x - bW * .16} ${floorY - 4} l -2 -8 h 6 l -2 8 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<ellipse cx="${x - bW * .15}" cy="${floorY - 12}" rx="3" ry="1.2" fill="${milk}" stroke="${r.col}" stroke-width=".4"/>`;
      // a milking stool — a three-leg
      g += `<ellipse cx="${x - bW * .02}" cy="${floorY - 8}" rx="4" ry="1.5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<line x1="${x - bW * .04}" y1="${floorY - 7}" x2="${x - bW * .06}" y2="${floorY}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x}" y1="${floorY - 7}" x2="${x + 2}" y2="${floorY}" stroke="${r.col}" stroke-width=".7"/>`;

      // pails in a row — filled pails, count by tokens
      const pails = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let p = 0; p < pails; p++) {
        const px = x + bW * .08 + p * bW * .11;
        const full = p < pails - (r.err ? 1 : 0);
        g += `<path d="M ${px} ${floorY} l -2 -9 h 8 l -2 9 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<ellipse cx="${px + 2}" cy="${floorY - 9}" rx="4" ry="1.5" fill="${p === pails - 1 && r.err ? "var(--red)" : (full ? milk : "var(--card-2)")}" stroke="${r.col}" stroke-width=".4"/>`;
        g += `<path d="M ${px - 1} ${floorY - 9} q 3 -3 6 0" fill="none" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // a churn — a tall can
      g += `<rect x="${x + bW * .42}" y="${floorY - 14}" width="8" height="14" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<ellipse cx="${x + bW * .46}" cy="${floorY - 14}" rx="4" ry="1.5" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<rect x="${x + bW * .44}" y="${floorY - 18}" width="4" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;

      // dairyman milking for live sessions — figure on the stool
      if (r.live) {
        g += `<g class="dry-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .01} ${cowY - 12})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="7" x2="-11" y2="12" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="-7" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // kicked pail — spilled milk on errors
      if (r.err) {
        g += `<path d="M ${x - bW * .16} ${floorY - 2} q 6 2 10 0" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
        g += `<circle cx="${x - bW * .06}" cy="${floorY - 1}" r=".9" fill="var(--red)"/>`;
      }

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="dry-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="dry-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "奶棚", eyebrow: "PROVIDER DAIRYMAN", render };
})();
