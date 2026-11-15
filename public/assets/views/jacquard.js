/* ------------------------------------------------------------------ jacquard
 * Jacquard view — a row of jacquard looms, one per provider.
 * Patterned cloth on the cloth beam = tokens; a weaver at the
 * treadles for live sessions; a torn warp marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "jacquard";
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
    if (!rows.length) { host.innerHTML = `<div class="jq-empty">暂无提花织坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const thread = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8b048" : "#988050";
      const lW = seg * .42;
      const top = floorY - 48;
      // the loom frame — two uprights, warp beam and cloth beam
      g += `<line x1="${x - lW / 2}" y1="${floorY}" x2="${x - lW / 2}" y2="${top + 18}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + lW / 2}" y1="${floorY}" x2="${x + lW / 2}" y2="${top + 18}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x - lW * .52}" y1="${top + 18}" x2="${x + lW * .52}" y2="${top + 18}" stroke="${r.col}" stroke-width="1.4"/>`;
      // warp beam
      g += `<rect x="${x - lW * .48}" y="${top + 12}" width="${lW * .96}" height="4" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      // warp threads — vertical lines
      for (let w = 0; w < 7; w++) {
        const wx = x - lW * .4 + w * lW * .13;
        g += `<line x1="${wx}" y1="${top + 16}" x2="${wx}" y2="${floorY - 14}" stroke="${w === 0 && r.err ? "var(--red)" : thread}" stroke-width=".6" opacity="${w === 0 && r.err ? 1 : .55}"/>`;
      }
      // the jacquard head — punch-card mechanism above
      g += `<rect x="${x - lW * .2}" y="${top}" width="${lW * .4}" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.1"/>`;
      // a chain of punched cards
      for (let c = 0; c < 4; c++) {
        g += `<rect x="${x + lW * .24 + c * 4}" y="${top + 1 + (c % 2) * 2}" width="3.4" height="4.6" rx=".5" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<circle cx="${x + lW * .24 + c * 4 + 1.7}" cy="${top + 3 + (c % 2) * 2}" r=".7" fill="${r.col}"/>`;
      }
      // heddle harness — a row of eyes
      g += `<rect x="${x - lW * .36}" y="${floorY - 22}" width="${lW * .72}" height="3" fill="var(--card-2)" stroke="${r.col}" stroke-width=".6"/>`;
      // cloth beam — the woven roll, patterned section sized by tokens
      g += `<rect x="${x - lW * .48}" y="${floorY - 14}" width="${lW * .96}" height="5" rx="2.5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      const pat = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let p = 0; p < pat; p++) {
        g += `<path d="M ${x - lW * .4 + p * lW * .2} ${floorY - 13} l 3 -3 l 3 3" fill="none" stroke="${p === 0 && r.err ? "var(--red)" : thread}" stroke-width=".8"/>`;
      }
      // treadles — foot pedals
      g += `<line x1="${x - lW * .3}" y1="${floorY - 6}" x2="${x + lW * .3}" y2="${floorY - 6}" stroke="${r.col}" stroke-width="1" opacity=".6"/>`;
      // shuttle resting
      g += `<path d="M ${x - lW * .6} ${floorY - 4} l 8 -2 l -1 3 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // weaver treadling for live sessions
      if (r.live) {
        g += `<g class="jq-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - lW * .58} ${floorY - 20})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="1" y1="12" x2="9" y2="15" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="13" y2="9" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // torn warp — a snapped thread on errors
      if (r.err) g += `<path d="M ${x - lW * .4} ${top + 22} q 2 6 -2 10" stroke="var(--red)" stroke-width="1.2" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="jq-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="jq-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "提花织坊", eyebrow: "PROVIDER JACQUARD", render };
})();
