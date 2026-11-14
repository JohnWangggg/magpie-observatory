/* --------------------------------------------------------------- pinwheel
 * Pinwheel view — sessions as paper pinwheels on sticks:
 *   blade span = tokens, colour = agent, spinning backwards = failed.
 *   Sticks rise from a garden edge.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pinwheel";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 8);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const ground = H * 0.86;

    if (!sessions.length) { host.innerHTML = `<div class="pw-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const n = sessions.length;
    let wheels = "", sticks = "";

    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const x = W * 0.1 + (i / Math.max(1, n - 1)) * W * 0.8;
      const r = 16 + (tok / maxTok) * 34;
      const y = ground - 14 - r;
      // stick
      sticks += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${ground}"
          stroke="rgba(200,180,140,.5)" stroke-width="1.6"/>`;
      // pinwheel: 6 blades as triangles
      let blades = "";
      for (let b = 0; b < 6; b++) {
        const a = b * 60;
        blades += `<path d="M0,0 L${(r * 0.9).toFixed(1)},${(-r * 0.35).toFixed(1)} L${(r * 1.05).toFixed(1)},0 Z"
            fill="${col}" opacity="${0.55 + b * 0.06}" transform="rotate(${a})"/>`;
      }
      wheels += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">
          <g class="pw-wheel ${failed ? "rev" : ""}" style="animation-duration:${(6 - (tok / maxTok) * 4).toFixed(1)}s">
            ${blades}
            <circle class="pw-hub" r="4" fill="rgba(255,255,255,.8)"/>
            <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
          </g>
        </g>`;
    });

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="pl-item ${failed ? "bad" : ""}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="pw-wrap">
        <div class="pw-legend">${legend}<span class="pl-tip">轮=会话 · 大=Token · 反转=失败</span></div>
        <svg class="pw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${sticks}${wheels}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "风车",
    eyebrow: "PINWHEEL",
    render
  };
})();
