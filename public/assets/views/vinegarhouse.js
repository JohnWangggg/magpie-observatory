/* -------------------------------------------------------------- vinegarhouse
 * Vinegarhouse view — a row of acetifier casks, one per
 * provider. Vinegar drawn at the cock = tokens; a vinegar man
 * topping the cask for live sessions; a slimed mother marks
 * errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "vinegarhouse";
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
    if (!rows.length) { host.innerHTML = `<div class="vh-empty">暂无醋坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // vinegar-house floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const acid = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a040" : "#987828";
      const caskW = seg * .44;
      const caskH = 40;
      const caskY = floorY - 4;
      // the acetifier cask — hooped barrel on cradles
      g += `<ellipse cx="${x}" cy="${caskY - caskH}" rx="${caskW * .42}" ry="5" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      g += `<path d="M ${x - caskW * .42} ${caskY - caskH} q -5 ${caskH * .5} 0 ${caskH}
             M ${x + caskW * .42} ${caskY - caskH} q 5 ${caskH * .5} 0 ${caskH}"
            fill="none" stroke="${r.col}" stroke-width="1.2"/>`;
      // mother film on top — a skin of mycoderma
      g += `<ellipse cx="${x}" cy="${caskY - caskH}" rx="${caskW * .34}" ry="3" fill="${r.err ? "var(--red)" : "#d8c8a0"}" opacity=".8"/>`;
      // hoops
      g += `<line x1="${x - caskW * .44}" y1="${caskY - caskH * .55}" x2="${x + caskW * .44}" y2="${caskY - caskH * .55}" stroke="var(--line)" stroke-width="1.4"/>`;
      g += `<line x1="${x - caskW * .4}" y1="${caskY - caskH * .15}" x2="${x + caskW * .4}" y2="${caskY - caskH * .15}" stroke="var(--line)" stroke-width="1.4"/>`;
      // the cock with drawn vinegar — a drip into a jug, count by tokens
      g += `<line x1="${x}" y1="${caskY - 6}" x2="${x}" y2="${caskY - 1}" stroke="${r.col}" stroke-width="1.6"/>`;
      const jugs = Math.min(2, Math.ceil(r.tok / maxTok * 2));
      for (let j = 0; j < jugs; j++) {
        g += `<path d="M ${x + caskW / 2 + 4 + j * 8} ${floorY} v -7 a 2.5 2.5 0 0 1 5 0 v 7 Z" fill="${acid}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // vinegar man topping for live sessions
      if (r.live) {
        g += `<g class="vh-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - caskW * .45 - 8} ${caskY - caskH - 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="3" x2="14" y2="8" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // slimed mother — a heavy film on errors
      if (r.err) g += `<ellipse cx="${x - caskW * .1}" cy="${caskY - caskH - 2}" rx="${caskW * .2}" ry="2" fill="var(--red)" opacity=".7"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="vh-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="vh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "醋坊", eyebrow: "PROVIDER VINEGARHOUSE", render };
})();
