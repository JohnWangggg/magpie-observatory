/* -------------------------------------------------------------- narrowboat
 * Narrowboat view — a row of canal narrowboats, one per provider.
 * Crates stacked on the cabin = tokens; the tiller manned
 * for live sessions; a listing hold marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "narrowboat";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const waterY = H * .8;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="nw-empty">暂无窄船</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the canal — water band with ripples
    g += `<rect y="${waterY}" width="${W}" height="${H - waterY}" fill="var(--card-2)"/>`;
    for (let w = 0; w < 8; w++) {
      g += `<path d="M ${w * W / 8 + 12} ${waterY + 6 + (w % 2) * 5} q 10 -3 20 0" fill="none" stroke="#587888" stroke-width=".8" opacity=".55"/>`;
    }

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .5;
      const hullY = waterY + 2;
      const hull = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a4a3a" : "#4a3a30";
      // the narrowboat — a long thin hull, upswept at both ends
      g += `<path d="M ${x - bW * .46} ${hullY - 8} Q ${x - bW * .5} ${hullY - 12} ${x - bW * .44} ${hullY - 14}
               L ${x - bW * .42} ${hullY - 6} L ${x + bW * .42} ${hullY - 6}
               Q ${x + bW * .5} ${hullY - 10} ${x + bW * .46} ${hullY - 8} Z"
               fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2"/>`;
      // waterline
      g += `<line x1="${x - bW * .5}" y1="${hullY - 3}" x2="${x + bW * .5}" y2="${hullY - 3}" stroke="#587888" stroke-width=".8" opacity=".6"/>`;
      // cabin — a long low box midship
      g += `<rect x="${x - bW * .18}" y="${hullY - 16}" width="${bW * .36}" height="10" rx="1" fill="${r.err ? "var(--red)" : hull}" stroke="${r.col}" stroke-width=".8"/>`;
      // cabin windows — three
      for (let wnd = 0; wnd < 3; wnd++) {
        g += `<rect x="${x - bW * .14 + wnd * bW * .12}" y="${hullY - 14}" width="${bW * .07}" height="5" fill="var(--card-2)" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // cargo crates on the foredeck — scale by tokens
      const crates = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < crates; c++) {
        g += `<rect x="${x - bW * .42 + c * 7}" y="${hullY - 12 - (c % 2) * 3}" width="6" height="5" rx=".8" fill="${c === 0 && r.err ? "var(--red)" : "#a08048"}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // tiller at the stern
      g += `<line x1="${x + bW * .44}" y1="${hullY - 14}" x2="${x + bW * .5}" y2="${hullY - 18}" stroke="${r.col}" stroke-width="1.2"/>`;
      // a chimney at the bow with smoke if live
      g += `<rect x="${x - bW * .38}" y="${hullY - 18}" width="3" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;
      if (r.live) {
        g += `<path d="M ${x - bW * .365} ${hullY - 18} q -2 -4 -1 -8" fill="none" stroke="${r.col}" stroke-width=".8" opacity=".6"/>`;
        g += `<path d="M ${x - bW * .365} ${hullY - 20} q 2 -4 1 -8" fill="none" stroke="${r.col}" stroke-width=".6" opacity=".4"/>`;
      }
      // crew standing at the tiller for live sessions
      if (r.live) {
        g += `<g class="nw-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .4} ${hullY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="8" x2="9" y2="13" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // listing hold — hull tilted on errors
      if (r.err) g += `<path d="M ${x - bW * .4} ${hullY - 4} q 8 4 14 0" fill="var(--red)" opacity=".3"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="nw-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="nw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "窄船", eyebrow: "PROVIDER NARROWBOAT", render };
})();
