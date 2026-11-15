/* -------------------------------------------------------------------- bodger
 * Bodger view — a row of shaving horses, one per provider.
 * Turned legs off the dumbhead = tokens; a bodger drawing the
 * knife for live sessions; a split leg marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bodger";
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
    if (!rows.length) { host.innerHTML = `<div class="bg-empty">暂无绿木工</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // bodging-yard floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wood = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a060" : "#a07840";
      const benchY = floorY - 20;
      const benchW = seg * .5;
      // shaving horse — a sloped bench with a dumbhead clamp
      g += `<path d="M ${x - benchW / 2} ${floorY} L ${x - benchW * .2} ${benchY} L ${x + benchW / 2} ${benchY} L ${x + benchW * .4} ${floorY} Z"
            fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // dumbhead — the clamp jaw over the bench end
      g += `<path d="M ${x + benchW * .3} ${benchY} l 4 -10 l 6 4 l -4 6" fill="var(--card-2)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // a leg blank clamped under the dumbhead
      g += `<line x1="${x + benchW * .2}" y1="${benchY + 2}" x2="${x + benchW * .38}" y2="${benchY - 4}" stroke="${wood}" stroke-width="3" stroke-linecap="round"/>`;
      // shavings — curls on the floor, count by tokens
      const shav = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < shav; s++) {
        g += `<path d="M ${x - benchW * .3 + s * 8} ${floorY - 4} q 3 -4 6 0" stroke="${wood}" stroke-width="1" fill="none" opacity=".8"/>`;
      }
      // turned legs stacked beside — rungs by tokens
      const legs = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let l = 0; l < legs; l++) {
        g += `<line x1="${x + benchW / 2 + 4}" y1="${floorY - 4 - l * 4}" x2="${x + benchW / 2 + 14}" y2="${floorY - 4 - l * 4}" stroke="${wood}" stroke-width="1.6" stroke-linecap="round"/>`;
      }
      // bodger drawing the knife for live sessions — seated on the bench
      if (r.live) {
        g += `<g class="bg-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - benchW * .3} ${benchY - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="5" x2="16" y2="8" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // split leg — a cracked blank on errors
      if (r.err) g += `<line x1="${x + benchW * .3}" y1="${benchY - 2}" x2="${x + benchW * .34}" y2="${benchY + 4}" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="bg-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "绿木工", eyebrow: "PROVIDER BODGER", render };
})();
