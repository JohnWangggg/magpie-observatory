/* ------------------------------------------------------------------ spinner
 * Spinner view — a row of spinning wheels, one per provider.
 * Spindles wound on the frame = tokens; a spinner treadling
 * for live sessions; a snapped yarn marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "spinner";
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
    if (!rows.length) { host.innerHTML = `<div class="spn-empty">暂无纺纱</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the floor — a plank surface
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const wheelY = floorY - 28;
      const yarn = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a7a5a" : "#4a4438";
      // the spinning wheel — a great wheel on a post
      g += `<circle cx="${x - bW * .24}" cy="${wheelY}" r="14" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<circle cx="${x - bW * .24}" cy="${wheelY}" r="10" fill="none" stroke="${r.col}" stroke-width=".8"/>`;
      // spokes
      for (let s = 0; s < 4; s++) {
        const a = s * Math.PI / 2 + Math.PI / 4;
        g += `<line x1="${x - bW * .24}" y1="${wheelY}" x2="${x - bW * .24 + Math.cos(a) * 10}" y2="${wheelY + Math.sin(a) * 10}" stroke="${r.col}" stroke-width=".5"/>`;
      }
      // the post
      g += `<line x1="${x - bW * .24}" y1="${wheelY + 14}" x2="${x - bW * .24}" y2="${floorY - 4}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<rect x="${x - bW * .28}" y="${floorY - 4}" width="8" height="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // a drive band — a loop around wheel and spindle
      g += `<path d="M ${x - bW * .24 + 14} ${wheelY} Q ${x} ${wheelY - 4} ${x + bW * .24} ${wheelY - 6}" fill="none" stroke="${r.col}" stroke-width=".7" opacity=".6"/>`;
      // the spindle — a bobbin at the end of the band
      g += `<circle cx="${x + bW * .24}" cy="${wheelY - 6}" r="4" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x + bW * .24}" cy="${wheelY - 6}" r="1.6" fill="${r.err ? "var(--red)" : yarn}" stroke="${r.col}" stroke-width=".4"/>`;
      // spindles — wound cops on the frame, count by tokens
      const cops = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < cops; c++) {
        const cx = x - bW * .08 + c * bW * .12;
        g += `<ellipse cx="${cx}" cy="${floorY - 6}" rx="4" ry="6" fill="${c === 0 && r.err ? "var(--red)" : yarn}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<ellipse cx="${cx}" cy="${floorY - 6}" rx="1.5" ry="2.5" fill="var(--card-2)" stroke="${r.col}" stroke-width=".4"/>`;
      }
      // a distaff — a forked stick holding fibre
      g += `<line x1="${x + bW * .38}" y1="${floorY - 4}" x2="${x + bW * .38}" y2="${wheelY - 20}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x + bW * .38} ${wheelY - 20} q -4 -6 -4 -10 q 4 -4 4 10" fill="${yarn}" stroke="${r.col}" stroke-width=".6"/>`;
      // a treadle — a foot pedal
      g += `<rect x="${x - bW * .1}" y="${floorY - 4}" width="${bW * .2}" height="4" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // spinner treadling for live sessions — figure at the wheel
      if (r.live) {
        g += `<g class="spn-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .08} ${wheelY - 24})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="8" x2="10" y2="14" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // snapped yarn — a broken thread on errors
      if (r.err) g += `<path d="M ${x + bW * .2} ${wheelY - 6} q 4 6 8 2" fill="none" stroke="var(--red)" stroke-width="1.4" stroke-dasharray="2 1"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="spn-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="spn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "纺纱", eyebrow: "PROVIDER SPINNER", render };
})();
