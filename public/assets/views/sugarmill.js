/* --------------------------------------------------------------- sugarmill
 * Sugarmill view — a row of three-roller cane mills, one per
 * provider. Juice dripping into the pan = tokens; a cane feed
 * shoves in for live sessions; a cracked roller marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sugarmill";
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
    if (!rows.length) { host.innerHTML = `<div class="sm-empty">暂无糖坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // bench
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const millW = seg * .6;
      const rollerR = 10;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a848" : "#a08858";
      // frame posts
      g += `<line x1="${x - millW * .35}" y1="${benchY}" x2="${x - millW * .35}" y2="${benchY - 44}" stroke="${r.col}" stroke-width="2.4"/>`;
      g += `<line x1="${x + millW * .35}" y1="${benchY}" x2="${x + millW * .35}" y2="${benchY - 44}" stroke="${r.col}" stroke-width="2.4"/>`;
      // three rollers — two bottom, one top
      g += `<circle cx="${x - rollerR * 1.2}" cy="${benchY - 20}" r="${rollerR}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<circle cx="${x + rollerR * 1.2}" cy="${benchY - 20}" r="${rollerR}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<circle cx="${x}" cy="${benchY - 38}" r="${rollerR}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      // cane feed for live sessions — shoves in from left
      if (r.live) {
        g += `<g class="sm-cane" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <rect x="${x - millW * .35 - 14}" y="${benchY - 26}" width="16" height="4" rx="2" fill="#c8a838" opacity=".8"/>
          <line x1="${x - millW * .35 - 14}" y1="${benchY - 24}" x2="${x - millW * .35 - 18}" y2="${benchY - 22}" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // juice drips into pan — count by tokens
      const drips = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let d = 0; d < drips; d++) {
        const dx = x - rollerR + (d / (drips - 1 || 1)) * rollerR * 2;
        g += `<line x1="${dx.toFixed(0)}" y1="${benchY - 10}" x2="${dx.toFixed(0)}" y2="${benchY - 2}" stroke="${tint}" stroke-width="1.2" opacity=".7"/>`;
        g += `<circle cx="${dx.toFixed(0)}" cy="${benchY}" r="1.5" fill="${tint}"/>`;
      }
      // pan below
      g += `<rect x="${x - millW * .3}" y="${benchY}" width="${millW * .6}" height="8" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // cracked roller on errors
      if (r.err) g += `<path d="M ${x - 4} ${benchY - 42} L ${x + 3} ${benchY - 34} L ${x - 2} ${benchY - 28}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${benchY + 18}" text-anchor="middle" class="sm-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "糖坊", eyebrow: "PROVIDER SUGARMILL", render };
})();
