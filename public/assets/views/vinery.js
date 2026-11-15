/* ------------------------------------------------------------------ vinery
 * Vinery view — a row of cordon-trained vines, one per provider.
 * Bunch weight on the cane = tokens; a pruner with secateurs for
 * live sessions; a split berry marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "vinery";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const soilY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="vy-empty">暂无葡萄房</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // soil
    g += `<rect y="${soilY}" width="${W}" height="${H - soilY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const vineW = seg * .6;
      const vineH = 48;
      const vineY = soilY - vineH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b878c8" : "#8858a0";
      // post + cordon wire
      g += `<rect x="${x - 3}" y="${vineY}" width="6" height="${vineH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x - vineW / 2}" y1="${vineY + 8}" x2="${x + vineW / 2}" y2="${vineY + 8}" stroke="${r.col}" stroke-width="1.2"/>`;
      // canes along wire — count by tokens
      const canes = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let c = 0; c < canes; c++) {
        const cx = x - vineW * .35 + c * (vineW * .7 / (canes - 1 || 1));
        const cy = vineY + 8;
        g += `<path d="M ${cx.toFixed(0)} ${cy} q 4 -6 8 -4" stroke="${r.col}" stroke-width="1" fill="none" opacity=".7"/>`;
        // bunch — size by tokens
        const bunchR = 3 + (r.tok / maxTok) * 4;
        const by = cy + 12;
        g += `<ellipse cx="${(cx + 4).toFixed(0)}" cy="${by.toFixed(0)}" rx="${bunchR.toFixed(1)}" ry="${(bunchR * 1.3).toFixed(1)}" fill="${tint}" opacity=".7" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1" ${r.err ? 'stroke-dasharray="2 2"' : ""}/>`;
      }
      // pruner for live sessions
      if (r.live) {
        g += `<g class="vy-pruner" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + vineW / 2 + 12} ${soilY - 10})">
          <circle r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="4" width="8" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="0" x2="9" y2="-6" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // split berry on errors
      if (r.err) g += `<path d="M ${x - vineW * .2} ${vineY + 20} l 4 4 l -4 4" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${soilY + 18}" text-anchor="middle" class="vy-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="vy-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "葡萄房", eyebrow: "PROVIDER VINERY", render };
})();
