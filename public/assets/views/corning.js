/* ------------------------------------------------------------------ corning
 * Corning view — a row of brine tubs, one per provider. Joints
 * sunk in the pickle = tokens; a salter pressing a joint down
 * for live sessions; a sprung stave marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "corning";
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
    if (!rows.length) { host.innerHTML = `<div class="cn-empty">暂无腌肉坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // salting-house floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tubW = seg * .58;
      const tubH = 34;
      const tubTop = floorY - tubH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c07858" : "#985838";
      // brine tub — staved and hooped
      g += `<path d="M ${x - tubW / 2} ${tubTop} q -3 ${tubH * .5} 0 ${tubH} L ${x + tubW / 2} ${tubTop + tubH} q 3 ${-tubH * .5} 0 ${-tubH} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      for (const hy of [tubTop + tubH * .3, tubTop + tubH * .65]) {
        g += `<line x1="${x - tubW / 2 - 2}" y1="${hy.toFixed(0)}" x2="${x + tubW / 2 + 2}" y2="${hy.toFixed(0)}" stroke="${r.col}" stroke-width="1" opacity=".5"/>`;
      }
      // pickle inside — depth by tokens
      const pickleH = 5 + (r.tok / maxTok) * (tubH - 14);
      g += `<rect x="${x - tubW / 2 + 3}" y="${(tubTop + tubH - 4 - pickleH).toFixed(0)}" width="${tubW - 6}" height="${pickleH.toFixed(0)}" fill="#7a4838" opacity=".55"/>`;
      // joints floating in the pickle — count by tokens
      const joints = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let j = 0; j < joints; j++) {
        const jx = x - tubW * .3 + j * tubW * .3;
        g += `<ellipse cx="${jx.toFixed(0)}" cy="${(tubTop + tubH - 4 - pickleH).toFixed(0)}" rx="4" ry="2.5" fill="${tint}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // salt box beside the tub
      g += `<rect x="${x + tubW / 2 + 4}" y="${tubTop + 14}" width="10" height="12" fill="var(--card-3)" stroke="var(--line)" stroke-width=".8"/>`;
      g += `<rect x="${x + tubW / 2 + 6}" y="${tubTop + 16}" width="6" height="4" fill="#f0f0f0" opacity=".7"/>`;
      // salter pressing a joint down for live sessions
      if (r.live) {
        g += `<g class="cn-salter" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - 4} ${tubTop - 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="4" x2="8" y2="10" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // sprung stave — brine leaking on errors
      if (r.err) g += `<path d="M ${x + tubW / 2 - 4} ${tubTop + 14} q 4 4 2 10" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="cn-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "腌肉坊", eyebrow: "PROVIDER CORNING", render };
})();
