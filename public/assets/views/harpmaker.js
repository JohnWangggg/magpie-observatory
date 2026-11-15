/* ----------------------------------------------------------------- harpmaker
 * Harpmaker view — a row of harp frames, one per provider.
 * Strings gutted on the soundboard = tokens; a harpmaker
 * carving the neck for live sessions; a sprung soundboard marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "harpmaker";
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
    if (!rows.length) { host.innerHTML = `<div class="hrp-empty">暂无竖琴坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const gut = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8c8a0" : "#887860";
      const hW = seg * .36;
      const hTop = floorY - 52;
      // the harp frame — pillar, neck and soundboard triangle
      // pillar: vertical at left
      g += `<line x1="${x - hW * .3}" y1="${floorY - 4}" x2="${x - hW * .3}" y2="${hTop + 8}" stroke="${r.col}" stroke-width="1.8"/>`;
      // neck: curved top
      g += `<path d="M ${x - hW * .3} ${hTop + 8} Q ${x + hW * .2} ${hTop - 4} ${x + hW * .34} ${hTop + 14}" fill="none" stroke="${r.col}" stroke-width="1.8"/>`;
      // soundboard: the long diagonal
      g += `<line x1="${x + hW * .34}" y1="${hTop + 14}" x2="${x - hW * .3}" y2="${floorY - 4}" stroke="${r.col}" stroke-width="2.2"/>`;
      // strings — verticals between neck and soundboard, count by tokens
      const strs = Math.min(6, Math.ceil(r.tok / maxTok * 6));
      for (let s = 0; s < strs; s++) {
        const t = (s + 1) / (strs + 1);
        const nx = x - hW * .3 + (hW * .64) * t * (t < .5 ? t * 1.4 : 1 - (1 - t) * .3);
        const ny = hTop + 8 + Math.sin(t * Math.PI * .5) * 6;
        const by = floorY - 4 - (hW * .64) * t * 1.9;
        g += `<line x1="${nx}" y1="${ny}" x2="${x - hW * .3 + hW * .64 * t}" y2="${floorY - 4 - hW * .5 * t}" stroke="${s === 0 && r.err ? "var(--red)" : gut}" stroke-width=".6" opacity=".8"/>`;
      }
      // tuning pins along the neck
      for (let p = 0; p < 4; p++) {
        g += `<circle cx="${x - hW * .24 + p * hW * .13}" cy="${hTop + 7 + p}" r="1.2" fill="${r.col}"/>`;
      }
      // a carving scroll on the pillar top
      g += `<circle cx="${x - hW * .3}" cy="${hTop + 6}" r="3" fill="none" stroke="${r.col}" stroke-width=".9"/>`;
      // the workbench below — a plank with wood shavings
      g += `<rect x="${x - hW * .44}" y="${floorY - 8}" width="${hW * .8}" height="4" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      for (let sh = 0; sh < 3; sh++) {
        g += `<path d="M ${x - hW * .3 + sh * 6} ${floorY - 2} q 2 -3 4 0" fill="none" stroke="${gut}" stroke-width=".7" opacity=".6"/>`;
      }
      // a soundbox shell leaning — the hollow resonance box
      g += `<path d="M ${x + hW * .55} ${floorY - 2} q -4 -20 2 -26 q 6 6 2 26 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<ellipse cx="${x + hW * .57}" cy="${floorY - 18}" rx="2" ry="4" fill="var(--card-2)"/>`;
      // harpmaker carving for live sessions
      if (r.live) {
        g += `<g class="hrp-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - hW * .56} ${hTop - 2})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="12" y2="9" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // sprung soundboard — a split along the board on errors
      if (r.err) g += `<path d="M ${x + hW * .2} ${hTop + 22} l -6 12 l 5 4" stroke="var(--red)" stroke-width="1.3" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="hrp-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="hrp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "竖琴坊", eyebrow: "PROVIDER HARPMAKER", render };
})();
