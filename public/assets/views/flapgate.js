/* --------------------------------------------------------------- flapgate
 * Flapgate view — a row of tide-gate culverts, one per provider.
 * Flap openness (how far the board lifts) = tokens; a warden at
 * the frame for live sessions; a jammed hinge marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "flapgate";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const bankY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="fg-empty">暂无潮闸</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // seaward water
    g += `<rect y="${bankY}" width="${W}" height="${H - bankY}" fill="#1e3348" opacity=".5"/>`;
    for (let x = 0; x < W; x += 30) g += `<path d="M ${x} ${bankY + 8} q 8 -4 16 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const culvertW = seg * .55;
      const culvertH = 30;
      const culvertTop = bankY - culvertH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#5a88b8" : "#3a6088";
      // culvert frame — rectangular opening in the bank
      g += `<rect x="${x - culvertW / 2}" y="${culvertTop}" width="${culvertW}" height="${culvertH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // the flap — a board hinged at the top, lifted by token flow
      const hingeX = x - culvertW / 2 + 4;
      const flapLen = culvertH - 8;
      const lift = (r.tok / maxTok) * 48; // degrees
      const rad = -lift * Math.PI / 180;
      const flapTipX = hingeX + flapLen * Math.cos(rad + Math.PI / 2);
      const flapTipY = culvertTop + 4 + flapLen * Math.sin(rad + Math.PI / 2);
      g += `<line x1="${hingeX}" y1="${culvertTop + 4}" x2="${flapTipX.toFixed(0)}" y2="${flapTipY.toFixed(0)}" stroke="${r.err ? "var(--red)" : tint}" stroke-width="3" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // hinge pin
      g += `<circle cx="${hingeX}" cy="${culvertTop + 4}" r="2.5" fill="${r.col}"/>`;
      // outflow stream past the lifted flap
      g += `<path d="M ${hingeX + 4} ${(culvertTop + culvertH - 6).toFixed(0)} q ${culvertW * .4} -4 ${culvertW * .6} 4" stroke="${tint}" stroke-width="1.4" fill="none" opacity=".7"/>`;
      // warden at the frame for live sessions
      if (r.live) {
        g += `<g class="fg-warden" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + culvertW / 2 + 10} ${culvertTop + 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // jammed hinge — debris caught under the flap on errors
      if (r.err) g += `<path d="M ${flapTipX - 4} ${flapTipY + 2} l 8 -4 M ${flapTipX - 2} ${flapTipY - 2} l 6 4" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${bankY + 18}" text-anchor="middle" class="fg-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "潮闸", eyebrow: "PROVIDER FLAPGATE", render };
})();
