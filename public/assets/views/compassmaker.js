/* ------------------------------------------------------------- compassmaker
 * Compassmaker view — a row of instrument benches, one per provider.
 * Compass cards on the rack = tokens; a maker pointing
 * a needle for live sessions; a cracked card marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "compassmaker";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const benchY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="cpm-empty">暂无罗盘</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the bench — a plank table
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${benchY}" x2="${W}" y2="${benchY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const cardY = benchY - 22;
      const brass = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a08048" : "#605038";
      // the rack — a stand with compass cards
      g += `<rect x="${x - bW * .38}" y="${benchY - 4}" width="6" height="18" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${x + bW * .32}" y="${benchY - 4}" width="6" height="18" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x - bW * .38}" y1="${cardY}" x2="${x + bW * .32}" y2="${cardY}" stroke="${r.col}" stroke-width="1"/>`;
      // compass cards — circular dials on the rack, count by tokens
      const cards = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < cards; c++) {
        const cx = x - bW * .3 + c * bW * .16;
        g += `<circle cx="${cx}" cy="${cardY - 8}" r="5" fill="${c === 0 && r.err ? "var(--red)" : "var(--card-3)"}" stroke="${r.col}" stroke-width=".8"/>`;
        // cardinal marks
        g += `<line x1="${cx}" y1="${cardY - 13}" x2="${cx}" y2="${cardY - 11}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<line x1="${cx}" y1="${cardY - 5}" x2="${cx}" y2="${cardY - 3}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<line x1="${cx - 5}" y1="${cardY - 8}" x2="${cx - 3}" y2="${cardY - 8}" stroke="${r.col}" stroke-width=".5"/>`;
        g += `<line x1="${cx + 3}" y1="${cardY - 8}" x2="${cx + 5}" y2="${cardY - 8}" stroke="${r.col}" stroke-width=".5"/>`;
        // a needle
        g += `<line x1="${cx}" y1="${cardY - 8}" x2="${cx + 3}" y2="${cardY - 11}" stroke="${c === 0 && r.err ? "var(--red)" : brass}" stroke-width=".9"/>`;
      }
      // a bench compass — a bowl with a glass and a needle
      g += `<ellipse cx="${x}" cy="${benchY - 6}" rx="10" ry="4" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x}" cy="${benchY - 8}" r="6" fill="var(--card-2)" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<line x1="${x}" y1="${benchY - 8}" x2="${x + 4}" y2="${benchY - 11}" stroke="${r.err ? "var(--red)" : brass}" stroke-width="1.1"/>`;
      g += `<circle cx="${x}" cy="${benchY - 8}" r="1" fill="${r.col}"/>`;
      // a loupe and tweezers beside
      g += `<circle cx="${x + bW * .3}" cy="${benchY - 10}" r="3" fill="none" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<line x1="${x + bW * .3}" y1="${benchY - 10}" x2="${x + bW * .34}" y2="${benchY - 4}" stroke="${r.col}" stroke-width=".7"/>`;
      // a magnifier stand
      g += `<line x1="${x - bW * .28}" y1="${benchY - 4}" x2="${x - bW * .28}" y2="${benchY - 14}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x - bW * .28}" cy="${benchY - 16}" r="2.6" fill="none" stroke="${r.col}" stroke-width=".7"/>`;
      // maker pointing for live sessions — figure at the bench
      if (r.live) {
        g += `<g class="cpm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - bW * .16} ${benchY - 32})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="12" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // cracked card — a split dial on errors
      if (r.err) g += `<path d="M ${x - bW * .3} ${cardY - 13} l -3 4 3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="cpm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cpm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "罗盘坊", eyebrow: "PROVIDER COMPASSMAKER", render };
})();
