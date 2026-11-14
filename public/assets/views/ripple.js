/* ------------------------------------------------------------------ ripple
 * Ripple view — requests as raindrops on still water:
 *   each session drops at its time position and sheds expanding rings
 *   (radius = tokens, colour = agent, broken ring = failed); rings
 *   fade outward like real ripples.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "ripple";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 10);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cy = H / 2;

    if (!sessions.length) { host.innerHTML = `<div class="rp-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const n = sessions.length;
    let rings = "", drops = "";

    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const x = W * 0.1 + (i / Math.max(1, n - 1)) * W * 0.8;
      const r = 12 + (tok / maxTok) * 42;
      // three concentric rings expanding with staggered delays
      for (let k = 0; k < 3; k++) {
        rings += `<circle class="rp-ring ${failed ? "bad" : ""}" cx="${x.toFixed(1)}" cy="${cy}"
            r="${(r * (0.5 + k * 0.5)).toFixed(1)}" fill="none" stroke="${col}"
            stroke-width="${(1.6 - k * 0.4).toFixed(1)}" opacity="${(0.55 - k * 0.15).toFixed(2)}"
            stroke-dasharray="${failed ? "6,6" : "none"}"
            style="animation-delay:${i * 140 + k * 260}ms">
            <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
          </circle>`;
      }
      drops += `<circle class="rp-drop" cx="${x.toFixed(1)}" cy="${cy}" r="${(2.4 + (tok / maxTok) * 3).toFixed(1)}"
          fill="${col}" opacity="${failed ? ".5" : ".9"}" style="animation-delay:${i * 140}ms"/>`;
    });

    // water line + reflection hint
    const line = `<line x1="${W * 0.05}" y1="${cy}" x2="${W * 0.95}" y2="${cy}"
        stroke="rgba(255,255,255,.06)" stroke-dasharray="2,8"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="rl-item ${failed ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="rp-wrap">
        <div class="rp-legend">${legend}<span class="rl-tip">滴=会话 · 大=Token · 断=失败</span></div>
        <svg class="rp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${line}${rings}${drops}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "涟漪",
    eyebrow: "RIPPLE",
    render
  };
})();
