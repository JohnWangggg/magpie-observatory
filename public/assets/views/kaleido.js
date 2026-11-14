/* ----------------------------------------------------------------- kaleido
 * Kaleido view — a 12-fold kaleidoscope of the day's sessions:
 *   each session is one coloured wedge, mirrored 12× around the centre;
 *   wedge length = tokens, colour = agent, opacity = recency.
 *   A hexagonal frame holds the glass.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "kaleido";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 12);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.42;

    if (!sessions.length) { host.innerHTML = `<div class="kd-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const FOLDS = 12;
    let wedges = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const frac = i / Math.max(1, sessions.length - 1);
      const wedgeL = 15 + (tok / maxTok) * (R - 25);
      const baseAng = frac * Math.PI * 2 - Math.PI / 2;
      for (let f = 0; f < FOLDS; f++) {
        const a = baseAng + (f / FOLDS) * Math.PI * 2;
        const deg = (a * 180 / Math.PI).toFixed(1);
        const tipX = cx + Math.cos(a) * (wedgeL + 12), tipY = cy + Math.sin(a) * (wedgeL + 12);
        const side = 4 + (tok / maxTok) * 6;
        const p1x = cx + Math.cos(a) * 12 - Math.sin(a) * side;
        const p1y = cy + Math.sin(a) * 12 + Math.cos(a) * side;
        const p2x = cx + Math.cos(a) * 12 + Math.sin(a) * side;
        const p2y = cy + Math.sin(a) * 12 - Math.cos(a) * side;
        wedges += `<polygon class="kd-wedge ${failed ? "fade" : ""}" style="animation-delay:${(i * 40 + f * 12)}ms"
          points="${p1x.toFixed(1)},${p1y.toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)} ${p2x.toFixed(1)},${p2y.toFixed(1)}"
          fill="${col}" opacity="${failed ? ".2" : ".6"}">
          <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
        </polygon>`;
      }
    });

    // hexagonal frame + inner rings
    const hex = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
      return `${(cx + Math.cos(a) * R).toFixed(1)},${(cy + Math.sin(a) * R).toFixed(1)}`;
    }).join(" ");
    const frame = `<polygon class="kd-frame" points="${hex}" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1.5"/>
      <circle class="kd-ring" cx="${cx}" cy="${cy}" r="${R * 0.4}" fill="none" stroke="rgba(255,255,255,.06)" stroke-dasharray="2,4"/>
      <circle class="kd-ring" cx="${cx}" cy="${cy}" r="${R * 0.7}" fill="none" stroke="rgba(255,255,255,.05)" stroke-dasharray="2,4"/>
      <circle class="kd-core" cx="${cx}" cy="${cy}" r="4" fill="rgba(255,255,255,.7)"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="kl-item ${failed ? "bad" : ""}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 10))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="kd-wrap">
        <div class="kd-legend">${legend}<span class="kl-tip">楔=会话 · 长=Token · 12 折镜</span></div>
        <svg class="kd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${frame}${wedges}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "万花筒",
    eyebrow: "KALEIDO",
    render
  };
})();
