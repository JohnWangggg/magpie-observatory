/* --------------------------------------------------------------- typecase
 * Typecase view — a row of printer's type cases, one per provider.
 * Sorts picked from each compartment = tokens; a composing stick
 * rests beside for live sessions; a cracked case marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "typecase";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const benchY = H * .8;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="tc-empty">暂无字盘</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // work bench
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 24) g += `<line x1="${x}" y1="${benchY}" x2="${x}" y2="${H}" stroke="var(--line)" stroke-width=".7" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const caseW = seg * .78;
      const caseH = 52;
      const caseY = benchY - caseH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#68c078";
      // case frame
      g += `<rect x="${x - caseW / 2}" y="${caseY}" width="${caseW}" height="${caseH}" rx="2" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6"/>`;
      // compartments — 3 rows x 4 cols
      const cols = 4, rowsC = 3;
      for (let c = 0; c < cols; c++) for (let rr = 0; rr < rowsC; rr++) {
        const cw = (caseW - 16) / cols, ch = (caseH - 12) / rowsC;
        const cx = x - caseW / 2 + 8 + c * cw, cy = caseY + 6 + rr * ch;
        g += `<rect x="${cx}" y="${cy}" width="${cw - 2}" height="${ch - 2}" fill="var(--card-2)" stroke="var(--line)" stroke-width=".6" opacity=".7"/>`;
        // sorts picked — filled by token density
        const fill = (r.tok / maxTok) * (1 - (c + rr) / (cols + rowsC));
        if (fill > .2) g += `<rect x="${cx + 2}" y="${cy + 2}" width="${(cw - 6) * Math.min(1, fill).toFixed(2)}" height="${ch - 6}" fill="${tint}" opacity=".7"/>`;
      }
      // composing stick for live sessions
      if (r.live) {
        g += `<g class="tc-stick" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <rect x="${x + caseW / 2 + 4}" y="${caseY + 10}" width="14" height="30" rx="1.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>
          <line x1="${x + caseW / 2 + 6}" y1="${caseY + 18}" x2="${x + caseW / 2 + 16}" y2="${caseY + 18}" stroke="${tint}" stroke-width="1.4"/>
          <line x1="${x + caseW / 2 + 6}" y1="${caseY + 24}" x2="${x + caseW / 2 + 16}" y2="${caseY + 24}" stroke="${tint}" stroke-width="1.4"/>
        </g>`;
      }
      // cracked case on errors
      if (r.err) g += `<path d="M ${x - caseW * .2} ${caseY} L ${x + caseW * .1} ${caseY + caseH * .4} L ${x - caseW * .05} ${caseY + caseH * .7}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${benchY + 18}" text-anchor="middle" class="tc-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "字盘", eyebrow: "PROVIDER TYPECASE", render };
})();
