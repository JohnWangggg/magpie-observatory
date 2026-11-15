/* ------------------------------------------------------------------ oilpress
 * Oilpress view — a row of beam presses, one per provider.
 * Oil run off the mat stack = tokens; a pressman hanging on the
 * beam for live sessions; a split mat marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "oilpress";
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
    if (!rows.length) { host.innerHTML = `<div class="op-empty">暂无油榨坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // presshouse floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const pressW = seg * .6;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a848" : "#987828";
      const beamY = floorY - 40;
      // press frame — two posts + a great beam pivoted left
      g += `<line x1="${x - pressW * .42}" y1="${floorY}" x2="${x - pressW * .42}" y2="${beamY}" stroke="${r.col}" stroke-width="2.5"/>`;
      g += `<line x1="${x + pressW * .3}" y1="${floorY}" x2="${x + pressW * .3}" y2="${beamY - 8}" stroke="${r.col}" stroke-width="1.6"/>`;
      // the beam — angled down toward the mat stack
      const beamDrop = 4 + (r.tok / maxTok) * 10;
      g += `<line x1="${x - pressW * .45}" y1="${beamY}" x2="${x + pressW * .35}" y2="${(beamY + beamDrop).toFixed(0)}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="3.5" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // weight hanging off the beam's far end
      g += `<line x1="${x - pressW * .45}" y1="${beamY}" x2="${x - pressW * .45}" y2="${beamY + 12}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - pressW * .45 - 4}" y="${beamY + 12}" width="8" height="8" fill="${tint}" stroke="${r.col}" stroke-width=".8"/>`;
      // mat stack under the beam — cake layers by tokens
      const mats = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let m = 0; m < mats; m++) {
        g += `<rect x="${x + pressW * .05}" y="${floorY - 12 - m * 5}" width="${pressW * .3}" height="4" rx="1" fill="${tint}" stroke="${r.col}" stroke-width=".7" opacity=".9"/>`;
      }
      // oil run off the mat — trickle count by tokens
      const drips = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let d = 0; d < drips; d++) {
        g += `<circle cx="${x + pressW * .2 + d * 4}" cy="${floorY - 6 + d * 2}" r="1.3" fill="${tint}" opacity=".85"/>`;
      }
      // catch basin under the stack
      g += `<ellipse cx="${x + pressW * .2}" cy="${floorY - 2}" rx="8" ry="3" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // pressman hanging on the beam for live sessions
      if (r.live) {
        g += `<g class="op-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + pressW * .35} ${beamY + beamDrop + 4})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="0" x2="-8" y2="-8" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // split mat — torn edge on errors
      if (r.err) g += `<path d="M ${x + pressW * .15} ${floorY - 14} l 4 6 l -4 4" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="op-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="op-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "油榨坊", eyebrow: "PROVIDER OILPRESS", render };
})();
