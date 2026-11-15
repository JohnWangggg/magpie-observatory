/* --------------------------------------------------------------- ropemaker
 * Ropemaker view — a row of ropewalks, one per provider.
 * Strands twisted on the walk = tokens; a ropemaker
 * turning the wheel for live sessions; a kinked
 * strand marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "ropemaker";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="rpm-empty">暂无索匠</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the walk — a long floor with posts
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const wheelY = floorY - 24;
      const strand = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a08048" : "#605038";
      // the ropewalk — two posts with a wheel at one end
      g += `<rect x="${x - bW * .42}" y="${floorY - 4}" width="6" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${x + bW * .36}" y="${floorY - 4}" width="6" height="8" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // the wheel — a disc with spokes
      g += `<circle cx="${x - bW * .38}" cy="${wheelY}" r="8" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      for (let sp = 0; sp < 4; sp++) {
        const a = sp * Math.PI / 2;
        g += `<line x1="${x - bW * .38 + Math.cos(a) * 3}" y1="${wheelY + Math.sin(a) * 3}" x2="${x - bW * .38 + Math.cos(a) * 8}" y2="${wheelY + Math.sin(a) * 8}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      g += `<circle cx="${x - bW * .38}" cy="${wheelY}" r="2" fill="${r.err ? "var(--red)" : r.col}"/>`;
      // strands — twisted lines running the walk, count by tokens
      const strands = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let s = 0; s < strands; s++) {
        const sy = wheelY - 4 + s * 3;
        g += `<path d="M ${x - bW * .38 + 8} ${sy} Q ${x} ${sy + (s % 2 ? -2 : 2)} ${x + bW * .38 - 4} ${sy}" fill="none" stroke="${s === 0 && r.err ? "var(--red)" : strand}" stroke-width=".9"/>`;
        // a second twist line
        g += `<path d="M ${x - bW * .38 + 8} ${sy} Q ${x} ${sy + (s % 2 ? 2 : -2)} ${x + bW * .38 - 4} ${sy}" fill="none" stroke="${s === 0 && r.err ? "var(--red)" : strand}" stroke-width=".5" opacity=".5"/>`;
      }
      // the traveller — a sledge on the walk carrying the far end
      g += `<rect x="${x + bW * .28}" y="${floorY - 8}" width="${bW * .14}" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x + bW * .3}" y1="${floorY - 8}" x2="${x + bW * .3}" y2="${wheelY - 6}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x + bW * .36}" y1="${floorY - 8}" x2="${x + bW * .36}" y2="${wheelY - 6}" stroke="${r.col}" stroke-width=".8"/>`;
      // a top — the conical guide
      g += `<path d="M ${x} ${wheelY - 10} L ${x - 5} ${wheelY + 4} L ${x + 5} ${wheelY + 4} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".7"/>`;
      // coiled rope on the floor
      g += `<ellipse cx="${x + bW * .2}" cy="${floorY - 4}" rx="10" ry="4" fill="none" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<ellipse cx="${x + bW * .2}" cy="${floorY - 4}" rx="6" ry="2.4" fill="none" stroke="${r.col}" stroke-width=".5"/>`;
      // ropemaker turning the wheel for live sessions
      if (r.live) {
        g += `<g class="rpm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .5} ${wheelY - 20})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="11" y2="14" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // kinked strand — a loop in the run on errors
      if (r.err) g += `<path d="M ${x - bW * .1} ${wheelY - 2} q 4 6 8 0 q -4 -6 -8 0" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="rpm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="rpm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "索匠", eyebrow: "PROVIDER ROPEMAKER", render };
})();
