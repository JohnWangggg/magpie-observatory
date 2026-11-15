/* -------------------------------------------------------------------- ripsaw
 * Ripsaw view — a row of two-man frame saws, one per provider.
 * Boards ripped off the cant = tokens; top and pit sawyers
 * working for live sessions; a bound cut marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "ripsaw";
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
    if (!rows.length) { host.innerHTML = `<div class="rs-empty">暂无拉锯坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // saw-deck floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wood = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a060" : "#a07840";
      const sawH = H * .4;
      const sawW = seg * .5;
      // the frame saw — two posts, a blade and a tension rod on top
      g += `<line x1="${x - sawW * .28}" y1="${floorY}" x2="${x - sawW * .28}" y2="${floorY - sawH}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + sawW * .28}" y1="${floorY}" x2="${x + sawW * .28}" y2="${floorY - sawH}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - sawW * .28}" y1="${floorY - sawH}" x2="${x + sawW * .28}" y2="${floorY - sawH}" stroke="${r.col}" stroke-width="1.8"/>`;
      // blade inside the frame with teeth
      g += `<line x1="${x}" y1="${floorY - sawH * .8}" x2="${x}" y2="${floorY - 4}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="2" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // tension cord above
      g += `<line x1="${x - sawW * .28}" y1="${floorY - sawH - 4}" x2="${x + sawW * .28}" y2="${floorY - sawH - 4}" stroke="${r.col}" stroke-width="1.2" stroke-dasharray="4 3"/>`;
      // the cant — a log resting on trestles under the saw
      g += `<ellipse cx="${x}" cy="${floorY - 8}" rx="${sawW * .26}" ry="5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x - sawW * .2}" y1="${floorY - 4}" x2="${x - sawW * .2}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + sawW * .2}" y1="${floorY - 4}" x2="${x + sawW * .2}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      // ripped boards beside the cant — count by tokens
      const boards = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < boards; b++) {
        g += `<line x1="${x + sawW * .32}" y1="${floorY - 4 - b * 4}" x2="${x + sawW * .44}" y2="${floorY - 4 - b * 4}" stroke="${wood}" stroke-width="1.6" stroke-linecap="round"/>`;
      }
      // kerf — a saw line on the cant
      g += `<line x1="${x}" y1="${floorY - 12}" x2="${x}" y2="${floorY - 6}" stroke="${r.err ? "var(--red)" : "var(--fg-2)"}" stroke-width="1.4"/>`;
      // top and pit sawyers for live sessions — one above the frame, one in the pit
      if (r.live) {
        g += `<g class="rs-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - sawW * .44} ${floorY - sawH * .7})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="14" y2="10" stroke="${r.col}" stroke-width="1.2"/>
        </g>
        <g class="rs-man" style="animation-delay: ${(i * .3 + .5).toFixed(1)}s" transform="translate(${x - sawW * .44} ${floorY - 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="5" x2="14" y2="2" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // bound cut — a jammed kerf line on errors
      if (r.err) g += `<path d="M ${x - 3} ${floorY - 12} l 6 6" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="rs-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="rs-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "拉锯坊", eyebrow: "PROVIDER RIPSAW", render };
})();
