/* ----------------------------------------------------------------- tanpit
 * Tanpit view — a row of bark-lined pits, one per provider.
 * Hides hanging in the liquor = tokens; a tanner hauling a hide
 * for live sessions; a spoiled hide marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tanpit";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const yardY = H * .80;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="tp-empty">暂无鞣皮坑</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // yard
    g += `<rect y="${yardY}" width="${W}" height="${H - yardY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const pitW = seg * .66;
      const pitH = 30;
      const pitY = yardY - pitH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a07040" : "#785030";
      // pit — sunken rectangle below yard level, drawn as open pit
      g += `<rect x="${x - pitW / 2}" y="${pitY}" width="${pitW}" height="${pitH}" fill="var(--bg)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // tan liquor
      g += `<rect x="${x - pitW / 2 + 2}" y="${pitY + 6}" width="${pitW - 4}" height="${pitH - 8}" fill="#4a3218" opacity=".7"/>`;
      g += `<path d="M ${x - pitW / 2 + 2} ${pitY + 6} q ${pitW / 4} -3 ${pitW / 2} 0 t ${pitW / 2} 0" stroke="${tint}" stroke-width="1" fill="none" opacity=".5"/>`;
      // hides hanging in liquor — count by tokens
      const hides = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let h = 0; h < hides; h++) {
        const hx = x - pitW * .3 + h * (pitW * .6 / (hides - 1 || 1));
        g += `<path d="M ${hx.toFixed(0)} ${pitY + 8} l -4 12 l 8 0 Z" fill="${tint}" stroke="${r.col}" stroke-width=".8" opacity=".9" ${r.err && h === 0 ? 'stroke-dasharray="2 2"' : ""}/>`;
      }
      // rim — bark chips edging
      for (let c = 0; c < 5; c++) g += `<rect x="${(x - pitW / 2 - 2 + c * (pitW + 4) / 5).toFixed(0)}" y="${pitY - 3}" width="4" height="3" fill="${tint}" opacity=".5"/>`;
      // tanner hauling a hide for live sessions
      if (r.live) {
        g += `<g class="tp-tanner" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + pitW / 2 + 12} ${yardY - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="3" width="8" height="7" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <path d="M -6 6 l -6 -6 l 4 -4 l 4 6 Z" fill="${tint}" stroke="${r.col}" stroke-width=".8"/>
        </g>`;
      }
      // spoiled hide on errors — dark slick
      if (r.err) g += `<ellipse cx="${x - pitW * .2}" cy="${pitY + 10}" rx="8" ry="2.5" fill="var(--red)" opacity=".4"/>`;
      g += `<text x="${x}" y="${yardY + 18}" text-anchor="middle" class="tp-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鞣皮坑", eyebrow: "PROVIDER TANPIT", render };
})();
