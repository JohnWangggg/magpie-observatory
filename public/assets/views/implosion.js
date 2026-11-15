/* --------------------------------------------------------------- implosion
 * Implosion view — a row of condemned towers, one per provider.
 * Charges drilled into the columns = tokens; the blaster's plunger
 * raised for live sessions; a misfired floor marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "implosion";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="im-empty">暂无废楼</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // exclusion-zone ground with rubble
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;
    for (let x = 5; x < W; x += 22) g += `<rect x="${x}" y="${groundY + 3}" width="5" height="3" fill="var(--line)" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tw = seg * .5;
      const towerH = 78;
      const towerY = groundY - towerH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c08858" : "#886850";
      // tower body — stripped facade
      g += `<rect x="${x - tw / 2}" y="${towerY}" width="${tw}" height="${towerH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // window grid — stripped, dark
      for (let wy = 0; wy < 4; wy++) for (let wx = 0; wx < 2; wx++) {
        g += `<rect x="${(x - tw * .28 + wx * tw * .34).toFixed(0)}" y="${(towerY + 10 + wy * 16).toFixed(0)}" width="${(tw * .22).toFixed(0)}" height="9" fill="var(--bg)" opacity=".6"/>`;
      }
      // charges on ground-floor columns — count by tokens
      const charges = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < charges; c++) {
        const cx = x - tw * .32 + c * (tw * .64 / (charges - 1 || 1));
        g += `<rect x="${cx.toFixed(0)}" y="${groundY - 10}" width="4" height="6" fill="${tint}" stroke="${r.col}" stroke-width=".8"/>`;
        g += `<path d="M ${(cx + 2).toFixed(0)} ${groundY - 10} q 2 -4 4 -6" stroke="${r.col}" stroke-width=".7" fill="none" opacity=".7"/>`;
      }
      // blaster with raised plunger for live sessions
      if (r.live) {
        g += `<g class="im-blaster" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + tw / 2 + 14} ${groundY - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="3" width="8" height="7" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="5" y="-2" width="5" height="9" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="7" y1="-2" x2="7" y2="-8" stroke="${r.col}" stroke-width="1.4"/>
        </g>`;
      }
      // misfired floor on errors — one floor half-fallen
      if (r.err) g += `<path d="M ${x - tw / 2} ${towerY + 30} l ${tw / 2} 6 l ${tw / 2} -6" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="im-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="im-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "定向爆破", eyebrow: "PROVIDER IMPLOSION", render };
})();
