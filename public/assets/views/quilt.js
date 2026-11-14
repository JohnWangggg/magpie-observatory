/* ------------------------------------------------------------------ quilt
 * Quilt view — every session is a fabric patch on a quilt:
 *   size = tokens, colour = agent, stitched = status (solid ✓, dashed ✗).
 *   Patches sit in a 6-wide grid with stitched borders and a quilt edge.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "quilt";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function patch(x, y, size, color, failed, label, delay) {
    const stitch = failed ? "4,4" : "0";
    const stitchCol = failed ? "rgba(0,0,0,.4)" : "rgba(255,255,255,.35)";
    return `<g class="q-patch ${failed ? "torn" : ""}" style="animation-delay:${delay}ms">
      <rect x="${x}" y="${y}" width="${size}" height="${size}" rx="2" fill="${color}" opacity="${failed ? ".35" : ".8"}"/>
      <rect x="${x + 2}" y="${y + 2}" width="${size - 4}" height="${size - 4}" rx="1" fill="none"
        stroke="${stitchCol}" stroke-width="1" stroke-dasharray="${stitch}"/>
      <circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size * 0.12}" fill="rgba(255,255,255,.15)"/>
      <title>${esc(label)}</title>
    </g>`;
  }

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 24);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const COLS = 6, GAP = 4, PAD = 18;
    const cell = Math.floor((W - PAD * 2 - (COLS - 1) * GAP) / COLS);
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);

    if (!sessions.length) { host.innerHTML = `<div class="q-empty">暂无会话</div>`; return; }

    let patches = "";
    let x = PAD, y = PAD;
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const size = Math.max(18, cell * (0.5 + (tok / maxTok) * 0.5));
      const px = x + (cell - size) / 2, py = y + (cell - size) / 2;
      patches += patch(px, py, size, col, failed,
        `${s.title} · ${s.agent} · ${s.status} · ${tok} tok`, i * 40);
      x += cell + GAP;
      if ((i + 1) % COLS === 0) { x = PAD; y += cell + GAP; }
    });
    const quiltH = y + cell + PAD;
    const quiltW = W;

    // stitched quilt border
    const border = `<rect class="q-border" x="4" y="4" width="${quiltW - 8}" height="${quiltH - 8}" rx="6" fill="none"
      stroke="rgba(255,255,255,.15)" stroke-width="2" stroke-dasharray="6,4"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="ql-item ${failed ? "bad" : ""}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="q-wrap">
        <div class="q-legend">${legend}<span class="ql-tip">大=Token · 色=Agent · 虚线=失败</span></div>
        <svg class="q-svg" viewBox="0 0 ${quiltW} ${quiltH}" preserveAspectRatio="xMidYMin meet">
          ${border}${patches}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "拼布",
    eyebrow: "QUILT",
    render
  };
})();
