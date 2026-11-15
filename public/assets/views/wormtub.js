/* ------------------------------------------------------------------- wormtub
 * Wormtub view — a row of condensing tubs, one per provider.
 * Spirits dripped into the receiver = tokens; a stillman
 * tending the coil for live sessions; a sprung worm marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "wormtub";
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
    if (!rows.length) { host.innerHTML = `<div class="wt-empty">暂无冷凝坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // stillhouse floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const copper = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c08040" : "#986028";
      const tubW = seg * .4;
      const tubY = floorY - 30;
      const tubH = 26;
      // the tub — a wooden vat of cold water
      g += `<rect x="${x - tubW / 2}" y="${tubY}" width="${tubW}" height="${tubH}" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<ellipse cx="${x}" cy="${tubY + 3}" rx="${tubW * .46}" ry="3" fill="#7898a8" opacity=".5"/>`;
      // the worm — a copper coil submerged, count by tokens
      const coils = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < coils; c++) {
        const cy = tubY + 7 + c * ((tubH - 10) / 4);
        g += `<path d="M ${x - tubW * .36} ${cy} q ${tubW * .18} -4 ${tubW * .36} 0 q ${-tubW * .18} 4 ${-tubW * .36} 0" fill="none" stroke="${c === 0 && r.err ? "var(--red)" : copper}" stroke-width="1.3"/>`;
      }
      // the lyne arm — the pipe feeding the worm from the still
      g += `<line x1="${x - tubW * .6}" y1="${tubY - 8}" x2="${x - tubW * .36}" y2="${tubY + 5}" stroke="${copper}" stroke-width="1.4"/>`;
      g += `<line x1="${x - tubW * .6}" y1="${tubY - 8}" x2="${x - tubW * .6}" y2="${floorY}" stroke="${r.col}" stroke-width="1.2"/>`;
      // the receiver — a jar catching drips below the worm tail
      g += `<line x1="${x + tubW * .36}" y1="${tubY + 5}" x2="${x + tubW * .46}" y2="${floorY - 12}" stroke="${copper}" stroke-width="1.4"/>`;
      g += `<path d="M ${x + tubW * .42} ${floorY - 12} q 4 0 4 5 q 0 6 -4 8 q -4 -2 -4 -8 q 0 -5 4 -5" fill="${r.err ? "var(--red)" : "#c8b870"}" stroke="${r.col}" stroke-width=".8"/>`;
      // drips — droplets into the receiver
      for (let d = 0; d < 2; d++) {
        g += `<circle cx="${x + tubW * .44 + d}" cy="${floorY - 16 - d * 2}" r=".9" fill="${copper}"/>`;
      }
      // stillman tending for live sessions — figure watching the coil
      if (r.live) {
        g += `<g class="wt-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - tubW * .42} ${tubY - 12})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="7" x2="13" y2="9" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // sprung worm — a leak in the coil on errors
      if (r.err) g += `<path d="M ${x - tubW * .1} ${tubY + 10} q 5 -3 0 -7" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="wt-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="wt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "冷凝坊", eyebrow: "PROVIDER WORMTUB", render };
})();
