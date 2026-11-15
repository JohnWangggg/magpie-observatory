/* ------------------------------------------------------------------ mashtun
 * Mash tun view — a row of staved mashing vessels, one per
 * provider. Wort depth inside = tokens; a brewer working the
 * rakes for live sessions; a scorched false bottom marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "mashtun";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="mt-empty">暂无糖化槽</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // brewhouse floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tunW = seg * .58;
      const tunH = 38;
      const tunTop = floorY - tunH - 6;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c89838" : "#a87828";
      // staved tun — bulged sides
      g += `<path d="M ${x - tunW / 2} ${tunTop} q -4 ${tunH * .5} 0 ${tunH} L ${x + tunW / 2} ${tunTop + tunH} q 4 ${-tunH * .5} 0 ${-tunH} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // hoops
      for (const hy of [tunTop + tunH * .3, tunTop + tunH * .65]) {
        g += `<path d="M ${x - tunW / 2 - 2} ${hy.toFixed(0)} h ${tunW + 4}" stroke="${r.col}" stroke-width="1" opacity=".5"/>`;
      }
      // wort inside — depth by tokens
      const wortH = 5 + (r.tok / maxTok) * (tunH - 14);
      g += `<rect x="${x - tunW / 2 + 3}" y="${(tunTop + tunH - 4 - wortH).toFixed(0)}" width="${tunW - 6}" height="${wortH.toFixed(0)}" fill="${tint}" opacity=".55"/>`;
      // grain cap floating on the wort
      g += `<ellipse cx="${x}" cy="${(tunTop + tunH - 4 - wortH).toFixed(0)}" rx="${(tunW / 2 - 4).toFixed(0)}" ry="3" fill="${r.col}" opacity=".5"/>`;
      // false bottom line
      g += `<line x1="${x - tunW / 2 + 4}" y1="${tunTop + tunH - 8}" x2="${x + tunW / 2 - 4}" y2="${tunTop + tunH - 8}" stroke="${r.col}" stroke-width=".9" stroke-dasharray="3 2" opacity=".6"/>`;
      // rake shaft + arms above the tun
      g += `<line x1="${x}" y1="${tunTop - 8}" x2="${x}" y2="${tunTop + tunH * .4}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x - tunW * .3}" y1="${tunTop + tunH * .35}" x2="${x + tunW * .3}" y2="${tunTop + tunH * .35}" stroke="${r.col}" stroke-width="1.4"/>`;
      // brewer working the rakes for live sessions
      if (r.live) {
        g += `<g class="mt-brewer" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + tunW / 2 + 10} ${tunTop + 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="0" x2="-12" y2="-4" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // scorched false bottom — scorch marks on errors
      if (r.err) g += `<path d="M ${x - 6} ${tunTop + tunH - 6} q 3 -4 6 0 q -3 4 -6 0" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="mt-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="mt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "糖化槽", eyebrow: "PROVIDER MASH TUN", render };
})();
