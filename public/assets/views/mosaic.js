/* ---------------------------------------------------------------- mosaic
 * Mosaic view — every request is a tile in a wall mosaic:
 *   tile size = tokens, colour = agent, cracked = failed.
 *   Tiles flow left→right, grout lines between rows; a grout gap
 *   makes the mosaic look hand-laid.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "mosaic";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 40);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const GAP = 3, PAD = 14, COLS = 12;
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);

    if (!sessions.length) { host.innerHTML = `<div class="mos-empty">暂无会话</div>`; return; }

    // flow tiles left→right, wrap at COLS
    let tiles = "", y = PAD, x = PAD, rowH = 0;
    const cellW = Math.floor((W - PAD * 2 - (COLS - 1) * GAP) / COLS);
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const size = cellW;
      const inner = 6 + (tok / maxTok) * (size - 14);
      const cx = x + size / 2, cy = y + size / 2;
      tiles += `<g class="mos-tile ${failed ? "cracked" : ""}" style="animation-delay:${i * 25}ms">
          <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="2" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.06)"/>
          <rect x="${cx - inner / 2}" y="${cy - inner / 2}" width="${inner}" height="${inner}" rx="1.5"
            fill="${col}" opacity="${failed ? ".3" : ".8"}"/>
          ${failed ? `<path d="M${x + 4},${y + 4} L${x + size - 4},${y + size - 4}" stroke="rgba(0,0,0,.5)" stroke-width="1.5"/>` : ""}
          <title>${esc(s.title)} · ${s.agent} · ${s.status} · ${tok} tok</title>
        </g>`;
      x += size + GAP;
      rowH = Math.max(rowH, size);
      if ((i + 1) % COLS === 0) { x = PAD; y += rowH + GAP; rowH = 0; }
    });
    const gridH = y + rowH + PAD;

    // grout lines between rows
    let grout = "";
    for (let r = 1; r <= Math.ceil(sessions.length / COLS); r++) {
      const gy = PAD + r * (cellW + GAP) - GAP / 2;
      if (gy < gridH - PAD) grout += `<line x1="${PAD - 4}" y1="${gy}" x2="${W - PAD + 4}" y2="${gy}" stroke="rgba(255,255,255,.04)" stroke-width="1.5"/>`;
    }

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="ml-item ${failed ? "bad" : ""}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 10))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="mos-wrap">
        <div class="mos-legend">${legend}<span class="ml-tip">格=Token · 色=Agent · 裂纹=失败</span></div>
        <svg class="mos-svg" viewBox="0 0 ${W} ${Math.max(H, gridH)}" preserveAspectRatio="xMidYMin meet">
          ${grout}${tiles}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "马赛克",
    eyebrow: "MOSAIC",
    render
  };
})();
