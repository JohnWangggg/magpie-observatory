/* --------------------------------------------------------------- smokejack
 * Smokejack view — a row of chimney shafts with draught fans,
 * one per provider. Fan speed disc = tokens; a spit turning
 * below for live sessions; a sooted flue marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "smokejack";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const hearthY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="sj-empty">暂无烟轮</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // hearth floor
    g += `<rect y="${hearthY}" width="${W}" height="${H - hearthY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const shaftW = seg * .4;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a858" : "#987838";
      const shaftTop = H * .14;
      const shaftBot = hearthY - 24;
      // chimney shaft — tapered
      g += `<path d="M ${x - shaftW * .3} ${shaftTop} L ${x - shaftW * .45} ${shaftBot} L ${x + shaftW * .45} ${shaftBot} L ${x + shaftW * .3} ${shaftTop} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // fan wheel inside the shaft — blade count/disc by tokens
      const fanY = shaftTop + (shaftBot - shaftTop) * .3;
      const fanR = shaftW * .22;
      g += `<g class="sj-fan" style="animation-duration: ${(3 - r.tok / maxTok * 2).toFixed(1)}s" transform="translate(${x} ${fanY})">
        <circle r="${fanR.toFixed(0)}" fill="none" stroke="${tint}" stroke-width="1.2" opacity=".8"/>
        <line x1="${-fanR}" y1="0" x2="${fanR}" y2="0" stroke="${tint}" stroke-width="1"/>
        <line x1="0" y1="${-fanR}" x2="0" y2="${fanR}" stroke="${tint}" stroke-width="1"/>
        <line x1="${(-fanR * .7).toFixed(0)}" y1="${(-fanR * .7).toFixed(0)}" x2="${(fanR * .7).toFixed(0)}" y2="${(fanR * .7).toFixed(0)}" stroke="${tint}" stroke-width="1"/>
        <line x1="${(fanR * .7).toFixed(0)}" y1="${(-fanR * .7).toFixed(0)}" x2="${(-fanR * .7).toFixed(0)}" y2="${(fanR * .7).toFixed(0)}" stroke="${tint}" stroke-width="1"/>
      </g>`;
      // drive shaft down to the spit
      g += `<line x1="${x}" y1="${fanY + fanR}" x2="${x}" y2="${shaftBot}" stroke="${r.col}" stroke-width="1" opacity=".6"/>`;
      // hearth opening at the shaft foot
      g += `<rect x="${x - shaftW * .5}" y="${shaftBot}" width="${shaftW}" height="18" rx="2" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.2"/>`;
      // spit turning inside the hearth for live sessions
      if (r.live) {
        g += `<g class="sj-spit" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x} ${shaftBot + 9})">
          <line x1="${-shaftW * .4}" y1="0" x2="${shaftW * .4}" y2="0" stroke="${r.col}" stroke-width="1.4"/>
          <circle cx="${-shaftW * .15}" cy="0" r="3" fill="${tint}" opacity=".9"/>
          <circle cx="${shaftW * .15}" cy="0" r="3" fill="${tint}" opacity=".9"/>
        </g>`;
      }
      // sooted flue — black streak on errors
      if (r.err) g += `<path d="M ${x + shaftW * .2} ${shaftTop + 4} q 6 10 2 20" stroke="var(--red)" stroke-width="2" fill="none" opacity=".7"/>`;
      g += `<text x="${x}" y="${hearthY + 18}" text-anchor="middle" class="sj-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sj-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "烟轮", eyebrow: "PROVIDER SMOKEJACK", render };
})();
