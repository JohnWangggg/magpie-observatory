/* -------------------------------------------------------------- pulleysmith
 * Pulleysmith view — a row of sheave benches, one per provider.
 * Pulley wheels on the rack = tokens; a smith truing
 * a sheave for live sessions; a cracked sheave marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pulleysmith";
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
    if (!rows.length) { host.innerHTML = `<div class="pls-empty">暂无滑轮</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the bench — a plank table
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${benchY}" x2="${W}" y2="${benchY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const rackY = benchY - 18;
      const sheave = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#8a7a5a" : "#4a4438";
      // the rack — a stand with pulley wheels
      g += `<rect x="${x - bW * .38}" y="${benchY - 4}" width="6" height="14" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<rect x="${x + bW * .32}" y="${benchY - 4}" width="6" height="14" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      g += `<line x1="${x - bW * .38}" y1="${rackY}" x2="${x + bW * .32}" y2="${rackY}" stroke="${r.col}" stroke-width="1"/>`;
      // pulley wheels — discs on the rail, count by tokens
      const pulleys = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let p = 0; p < pulleys; p++) {
        const px = x - bW * .3 + p * bW * .16;
        g += `<circle cx="${px}" cy="${rackY - 10}" r="4.5" fill="var(--card-3)" stroke="${p === 0 && r.err ? "var(--red)" : sheave}" stroke-width=".9"/>`;
        g += `<circle cx="${px}" cy="${rackY - 10}" r="1.6" fill="${p === 0 && r.err ? "var(--red)" : sheave}" stroke="${r.col}" stroke-width=".5"/>`;
        // a rope groove
        g += `<path d="M ${px - 4} ${rackY - 10} a 4.5 4.5 0 0 1 8 0" fill="none" stroke="${r.col}" stroke-width=".5" opacity=".6"/>`;
      }
      // a block — a shell with two sheaves on the bench
      g += `<rect x="${x - bW * .2}" y="${benchY - 10}" width="${bW * .4}" height="8" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<circle cx="${x - bW * .08}" cy="${benchY - 6}" r="2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      g += `<circle cx="${x + bW * .08}" cy="${benchY - 6}" r="2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".5"/>`;
      // a hook below the block
      g += `<line x1="${x}" y1="${benchY - 10}" x2="${x}" y2="${benchY - 14}" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<path d="M ${x} ${benchY - 14} q -4 -3 -4 -6" fill="none" stroke="${r.col}" stroke-width=".9"/>`;
      // a sheave on a lathe — a wheel being trued
      g += `<circle cx="${x + bW * .28}" cy="${benchY - 14}" r="5" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : sheave}" stroke-width=".9"/>`;
      g += `<circle cx="${x + bW * .28}" cy="${benchY - 14}" r="1.8" fill="${r.err ? "var(--red)" : sheave}" stroke="${r.col}" stroke-width=".5"/>`;
      // a turning tool
      g += `<line x1="${x + bW * .32}" y1="${benchY - 4}" x2="${x + bW * .34}" y2="${benchY - 12}" stroke="${r.col}" stroke-width=".9"/>`;
      // a rope coiled below
      g += `<ellipse cx="${x - bW * .28}" cy="${benchY - 4}" rx="8" ry="3" fill="none" stroke="${sheave}" stroke-width=".7"/>`;
      // smith truing for live sessions — figure at the lathe
      if (r.live) {
        g += `<g class="pls-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .22} ${benchY - 30})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="6" x2="10" y2="10" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // cracked sheave — a split wheel on errors
      if (r.err) g += `<path d="M ${x + bW * .24} ${benchY - 18} l -3 4 3 4" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="pls-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pls-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "滑轮坊", eyebrow: "PROVIDER PULLEYSMITH", render };
})();
