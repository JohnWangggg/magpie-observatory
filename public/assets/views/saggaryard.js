/* --------------------------------------------------------------- saggaryard
 * Saggar yard view — a row of saggar stacks, one per provider.
 * Greenware carried in the bung = tokens; a saggarmaker
 * stamping a fresh saggar for live sessions; a cracked side
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "saggaryard";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const yardY = H * .84;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="sy-empty">暂无匣钵堆场</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // yard floor
    g += `<rect y="${yardY}" width="${W}" height="${H - yardY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8b898" : "#a89070";
      // a bung of saggars — squat fireclay pots stacked
      const saggars = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < saggars; s++) {
        const sy = yardY - 4 - s * 14;
        g += `<ellipse cx="${x}" cy="${sy}" rx="14" ry="4" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.1" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
        g += `<path d="M ${x - 14} ${sy} v -8 a 14 4 0 0 1 28 0 v 8" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // greenware beside — ware waiting for the kiln
      const ware = Math.min(2, Math.ceil(r.tok / maxTok * 2));
      for (let w = 0; w < ware; w++) {
        g += `<path d="M ${x + seg * .28 + w * 10} ${yardY - 4} v -9 a 3 2 0 0 1 6 0 v 9 Z" fill="${tint}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // saggarmaker stamping a fresh saggar for live sessions
      if (r.live) {
        g += `<g class="sy-maker" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - seg * .3} ${yardY - 22})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="13" width="9" height="4" rx="1" fill="${tint}" stroke="${r.col}" stroke-width=".8"/>
        </g>`;
      }
      // cracked side — a fissure on the top saggar on errors
      if (r.err) g += `<path d="M ${x - 4} ${yardY - 4 - (saggars - 1) * 14} l 3 -5 l -2 4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${yardY + 18}" text-anchor="middle" class="sy-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sy-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "匣钵堆场", eyebrow: "PROVIDER SAGGARYARD", render };
})();
