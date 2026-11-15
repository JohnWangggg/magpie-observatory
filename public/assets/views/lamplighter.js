/* ------------------------------------------------------------- lamplighter
 * Lamplighter view — a dusk street of gas lamps, one per provider.
 * Lamp glow = tokens; a lamplighter raising his pole
 * for live sessions; a dark/broken lamp marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lamplighter";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .88;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="lmp-empty">暂无街灯</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // dusk sky — a dim gradient band
    g += `<rect y="${floorY - 40}" width="${W}" height="40" fill="var(--card-2)" opacity=".4"/>`;
    // cobbled street
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    for (let c = 0; c < 14; c++) {
      g += `<ellipse cx="${c * W / 13 + (c % 2) * 6}" cy="${floorY + 6}" rx="10" ry="3" fill="none" stroke="var(--line)" stroke-width=".4"/>`;
    }
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const lampY = floorY - 44;
      const lit = !r.err && r.tok > 0;
      const glow = Math.min(14, 4 + (r.tok / maxTok) * 10);

      // the lamp — post, crossbar, lantern head
      g += `<line x1="${x}" y1="${floorY}" x2="${x}" y2="${lampY}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<ellipse cx="${x}" cy="${floorY}" rx="6" ry="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x - 7}" y1="${lampY + 4}" x2="${x + 7}" y2="${lampY + 4}" stroke="${r.col}" stroke-width="1"/>`;
      // the lantern — a tapered head
      g += `<path d="M ${x - 6} ${lampY + 4} l 1 -10 h 10 l 1 10 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x - 4}" y="${lampY - 4}" width="8" height="7" fill="${lit ? "#ffd23a" : "var(--card-2)"}" stroke="${r.col}" stroke-width=".5" opacity="${lit ? .9 : .4}"/>`;
      g += `<line x1="${x}" y1="${lampY - 4}" x2="${x}" y2="${lampY + 3}" stroke="${r.col}" stroke-width=".3"/>`;
      g += `<path d="M ${x - 5} ${lampY - 6} q 5 -4 10 0" fill="none" stroke="${r.col}" stroke-width=".7"/>`;
      // glow — a halo scaled by tokens
      if (lit) {
        g += `<circle cx="${x}" cy="${lampY}" r="${glow}" fill="#ffd23a" opacity=".08"/>`;
        g += `<circle cx="${x}" cy="${lampY}" r="${glow * .6}" fill="#ffd23a" opacity=".1"/>`;
      }
      // ladder rungs on the post — the lamplighter's climb
      for (let l = 0; l < 3; l++) {
        g += `<line x1="${x - 3}" y1="${floorY - 8 - l * 10}" x2="${x + 3}" y2="${floorY - 8 - l * 10}" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a bucket — hanging on the crossbar
      g += `<line x1="${x + 6}" y1="${lampY + 4}" x2="${x + 6}" y2="${lampY + 8}" stroke="${r.col}" stroke-width=".4"/>`;
      g += `<path d="M ${x + 4} ${lampY + 8} l 1 5 h 3 l 1 -5 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;

      // lamplighter with pole for live sessions — figure at the post
      if (r.live) {
        g += `<g class="lmp-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + 12} ${floorY - 24})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-4" y1="4" x2="-14" y2="-18" stroke="${r.col}" stroke-width="1"/>
          <circle cx="-15" cy="-20" r="1.4" fill="#ffd23a"/>
        </g>`;
      }
      // broken lamp — a cracked pane on errors
      if (r.err) g += `<path d="M ${x - 3} ${lampY - 3} l 3 3 -2 3" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="lmp-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="lmp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "街灯", eyebrow: "PROVIDER LAMPLIGHTER", render };
})();
