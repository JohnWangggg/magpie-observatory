/* ------------------------------------------------------------------ inkworks
 * Inkworks view — a row of ink pots, one per provider.
 * Ink sticks drying on the rack = tokens; an inkmaker
 * grinding the paste for live sessions; a split stick marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "inkworks";
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
    if (!rows.length) { host.innerHTML = `<div class="ik-empty">暂无制墨坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ink-house floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const ink = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#303038" : "#585860";
      const potW = seg * .36;
      const potY = floorY - 26;
      const potH = 20;
      // the ink pot — a kettle over a small fire
      g += `<path d="M ${x - potW * .32} ${floorY - 8} L ${x - potW * .38} ${potY} L ${x + potW * .38} ${potY} L ${x + potW * .32} ${floorY - 8} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<ellipse cx="${x}" cy="${potY + 4}" rx="${potW * .32}" ry="3" fill="${ink}"/>`;
      // the fire — a small burner beneath
      g += `<rect x="${x - potW * .18}" y="${floorY - 6}" width="${potW * .36}" height="6" fill="var(--card-2)" stroke="${r.col}" stroke-width=".9"/>`;
      for (let f = 0; f < 2; f++) {
        g += `<path d="M ${x - 3 + f * 6} ${floorY - 6} q 2 -4 0 -7" fill="none" stroke="#e08030" stroke-width=".9"/>`;
      }
      // the muller — a grinding stone leaning in the pot
      g += `<line x1="${x + potW * .18}" y1="${potY - 6}" x2="${x + potW * .05}" y2="${potY + 4}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<circle cx="${x + potW * .19}" cy="${potY - 7}" r="2.5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // the soot funnel — a lamp-black collector over the pot
      g += `<path d="M ${x - potW * .15} ${potY - 8} L ${x} ${potY - 16} L ${x + potW * .15} ${potY - 8}" fill="none" stroke="${r.col}" stroke-width="1"/>`;
      // drying rack — a shelf with ink sticks, count by tokens
      const sticks = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let s = 0; s < sticks; s++) {
        g += `<rect x="${x + potW * .44 + s * 5}" y="${floorY - 6 - s * 4}" width="4" height="6" rx="1" fill="${s === 0 && r.err ? "var(--red)" : ink}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      g += `<line x1="${x + potW * .42}" y1="${floorY - 20}" x2="${x + potW * .7}" y2="${floorY - 20}" stroke="${r.col}" stroke-width="1"/>`;
      // inkmaker grinding for live sessions — figure with the muller
      if (r.live) {
        g += `<g class="ik-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - potW * .48} ${potY - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="7" x2="13" y2="10" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // split stick — a cracked ink stick on errors
      if (r.err) g += `<path d="M ${x + potW * .44} ${floorY - 10} l 4 -4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="ik-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ik-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "制墨坊", eyebrow: "PROVIDER INKWORKS", render };
})();
