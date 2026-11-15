/* ------------------------------------------------------------------ hogshead
 * Hogshead view — a row of big casks, one per provider.
 * Hoops driven down the bilge = tokens; a cooper trussing
 * for live sessions; a sprung stave marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "hogshead";
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
    if (!rows.length) { host.innerHTML = `<div class="hh-empty">暂无大桶坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // cooperage floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const oak = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a88048" : "#806040";
      const caskW = seg * .34;
      const caskY = floorY - 34;
      const caskH = 32;
      // the hogshead — a bulged cask outline
      g += `<path d="M ${x - caskW * .38} ${caskY} q ${-caskW * .12} ${caskH * .5} 0 ${caskH} h ${caskW * .76} q ${caskW * .12} ${-caskH * .5} 0 ${-caskH} z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // stave lines — vertical joints in the belly
      for (let s = -1; s <= 1; s++) {
        g += `<line x1="${x + s * caskW * .18}" y1="${caskY + 2}" x2="${x + s * caskW * .18}" y2="${caskY + caskH - 2}" stroke="${r.col}" stroke-width=".6" opacity=".5"/>`;
      }
      // hoops — bands driven down the cask, count by tokens
      const hoops = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let h = 0; h < hoops; h++) {
        const hy = caskY + 3 + h * ((caskH - 6) / 4);
        const half = caskW * .38 + caskW * .12 * Math.sin(Math.PI * (hy - caskY) / caskH);
        g += `<line x1="${x - half}" y1="${hy}" x2="${x + half}" y2="${hy}" stroke="${h === 0 && r.err ? "var(--red)" : oak}" stroke-width="1.6"/>`;
      }
      // the croze — a chime groove near the head
      g += `<ellipse cx="${x}" cy="${caskY + 1}" rx="${caskW * .3}" ry="2" fill="none" stroke="${r.col}" stroke-width=".6"/>`;
      // heading — the top head with a bung
      g += `<ellipse cx="${x}" cy="${caskY}" rx="${caskW * .38}" ry="4" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<circle cx="${x + caskW * .14}" cy="${caskY}" r="1.6" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // truss — a hoop driver leaning at the bilge
      g += `<line x1="${x + caskW * .4}" y1="${caskY + caskH * .4}" x2="${x + caskW * .6}" y2="${caskY + caskH * .6}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x + caskW * .55}" y="${caskY + caskH * .55}" width="8" height="4" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // stave pile — loose staves leaning beside, count by tokens
      const staves = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < staves; s++) {
        g += `<rect x="${x - caskW * .62 - s * 3}" y="${floorY - 14 + s * 2}" width="3" height="12" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6" transform="rotate(-8 ${x - caskW * .62 - s * 3} ${floorY - 14})"/>`;
      }
      // cooper trussing for live sessions — figure driving a hoop
      if (r.live) {
        g += `<g class="hh-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - caskW * .4} ${caskY - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="7" x2="14" y2="12" stroke="${r.col}" stroke-width="1.1"/>
          <circle cx="15" cy="13" r="1.8" fill="none" stroke="${r.col}" stroke-width=".9"/>
        </g>`;
      }
      // sprung stave — a popped joint on errors
      if (r.err) g += `<path d="M ${x - caskW * .1} ${caskY + 4} q 4 ${caskH * .4} 0 ${caskH * .8}" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="hh-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="hh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "大桶坊", eyebrow: "PROVIDER HOGSHEAD", render };
})();
