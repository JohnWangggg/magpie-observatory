/* ------------------------------------------------------------------ orbit
 * Orbit view — sessions as comets on elliptical orbits around the hub:
 *   head = the request (size = tokens, colour = agent), tail = its
 *   session arc, dashed orbit = its lane. Failed comets break apart.
 *   Providers sit at the centre as a small sun cluster.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "orbit";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 10);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H / 2;
    const maxR = Math.min(W, H) * 0.42;

    if (!sessions.length) { host.innerHTML = `<div class="ob-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    let comets = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const tries = s.tries || 1;
      const failed = s.status === "error" || s.status === "failed";
      const frac = i / Math.max(1, sessions.length);
      // lane: alternate rx/ry so orbits don't all overlap
      const rx = maxR * (0.5 + (i % 3) * 0.22);
      const ry = maxR * (0.35 + (i % 2) * 0.3);
      const tilt = (i - sessions.length / 2) * 14;
      const a0 = frac * Math.PI * 2;
      const size = 4 + (tok / maxTok) * 7;
      // head position at t=0 of the CSS orbit
      const hx = cx + rx * Math.cos(a0), hy = cy + ry * Math.sin(a0);
      comets += `<g class="ob-comet ${failed ? "broken" : ""}" style="animation-delay:${i * 90}ms"
          transform="rotate(${tilt} ${cx} ${cy})">
        <ellipse class="ob-lane" cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"
          fill="none" stroke="rgba(255,255,255,.05)" stroke-width="1" stroke-dasharray="3,6"/>
        <g class="ob-head-g">
          <animateTransform attributeName="transform" type="rotate"
            from="${(a0 * 180 / Math.PI).toFixed(0)} ${cx} ${cy}"
            to="${(a0 * 180 / Math.PI + 360).toFixed(0)} ${cx} ${cy}"
            dur="${(9 + tries * 2.5).toFixed(1)}s" repeatCount="indefinite"/>
          <!-- tail: a fading arc behind the head -->
          <path class="ob-tail" d="M ${cx + rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx * Math.cos(-0.9)} ${cy + ry * Math.sin(-0.9)}"
            fill="none" stroke="${col}" stroke-width="${(size * 0.55).toFixed(1)}" stroke-linecap="round" opacity="${failed ? ".15" : ".4"}"/>
          <circle class="ob-head" cx="${cx + rx}" cy="${cy}" r="${size.toFixed(1)}" fill="${col}" opacity="${failed ? ".4" : ".95"}"/>
          ${failed ? `<circle class="ob-debris" cx="${cx + rx}" cy="${cy}" r="${(size * 0.5).toFixed(1)}" fill="${col}" opacity=".25" transform="translate(${(size * 1.5).toFixed(1)},${(size * 0.8).toFixed(1)})"/>` : ""}
          <title>${esc(s.title)} · ${s.agent} · ${s.tries} tries · ${tok} tok</title>
        </g>
      </g>`;
    });

    // sun cluster: provider dots at centre
    const provTok = {};
    sessions.forEach(s => { provTok[s.provider] = (provTok[s.provider] || 0) + 1; });
    const provs = Object.keys(provTok).slice(0, 4);
    let sun = "";
    provs.forEach((p, i) => {
      const col = ametaOf(p).color || "#fbbf24";
      const a = (i / provs.length) * Math.PI * 2;
      const r = 8;
      sun += `<circle cx="${cx + Math.cos(a) * r}" cy="${cy + Math.sin(a) * r}" r="3" fill="${col}" opacity=".8"/>`;
    });
    sun += `<circle class="ob-sun" cx="${cx}" cy="${cy}" r="${(12 + provs.length * 2)}" fill="rgba(255,220,120,.1)"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="ol-item ${failed ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 10))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="ob-wrap">
        <div class="ob-legend">${legend}<span class="ol-tip">头=会话 · 尾=弧 · 碎=失败</span></div>
        <svg class="ob-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${sun}${comets}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "彗星轨道",
    eyebrow: "ORBIT",
    render
  };
})();
