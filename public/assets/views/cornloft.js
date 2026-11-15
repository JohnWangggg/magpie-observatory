/* ------------------------------------------------------------------ cornloft
 * Cornloft view — a row of staddle granaries, one per
 * provider. Grain sacked down the loft ladder = tokens; a
 * grainman shovelling for live sessions; a weeviled sack
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cornloft";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * .84;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="cl-empty">暂无高架谷仓</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // yard ground
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d0a858" : "#a88040";
      const loftW = seg * .55;
      const loftH = 26 + (r.tok / maxTok) * 8;
      const loftY = groundY - 26;
      // staddle stones — mushroom pillars under the loft
      g += `<line x1="${x - loftW * .3}" y1="${groundY}" x2="${x - loftW * .3}" y2="${loftY}" stroke="${r.col}" stroke-width="3"/>`;
      g += `<ellipse cx="${x - loftW * .3}" cy="${loftY}" rx="5" ry="2.5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x + loftW * .3}" y1="${groundY}" x2="${x + loftW * .3}" y2="${loftY}" stroke="${r.col}" stroke-width="3"/>`;
      g += `<ellipse cx="${x + loftW * .3}" cy="${loftY}" rx="5" ry="2.5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // the loft — a weatherboarded bin, fill depth by tokens
      g += `<rect x="${x - loftW / 2}" y="${loftY - loftH}" width="${loftW}" height="${loftH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      const grainH = loftH * .4 + (r.tok / maxTok) * loftH * .4;
      g += `<path d="M ${x - loftW / 2 + 2} ${loftY - 4} l ${(loftW - 4) / 2} -${grainH * .5} l ${(loftW - 4) / 2} ${grainH * .5} Z" fill="${r.err ? "var(--red)" : tint}" opacity=".85"/>`;
      // roof
      g += `<path d="M ${x - loftW * .55} ${loftY - loftH} L ${x} ${loftY - loftH - 10} L ${x + loftW * .55} ${loftY - loftH}" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.2"/>`;
      // ladder + sacked grain beside — sacks by tokens
      const sacks = Math.min(2, Math.ceil(r.tok / maxTok * 2));
      for (let s = 0; s < sacks; s++) {
        g += `<ellipse cx="${x + loftW / 2 + 6 + s * 8}" cy="${groundY - 3}" rx="4" ry="3" fill="${tint}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // grainman shovelling for live sessions
      if (r.live) {
        g += `<g class="cl-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - loftW / 2 - 8} ${groundY - 16})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="5" x2="14" y2="0" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // weeviled sack — a spoiled heap on errors
      if (r.err) g += `<circle cx="${x + loftW / 2 + 6}" cy="${groundY - 5}" r="2.4" fill="var(--red)" opacity=".8"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="cl-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "高架谷仓", eyebrow: "PROVIDER CORNLOFT", render };
})();
