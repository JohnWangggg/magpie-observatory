/* ---------------------------------------------------------------- bubbles
 * Bubbles view — sessions as air bubbles rising through water:
 *   size = tokens, colour = agent, wobble = its own phase; failed
 *   bubbles are translucent and sink. A surface line + caustic light
 *   rays top the tank.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bubbles";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 41;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 16);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const surface = 26;

    if (!sessions.length) { host.innerHTML = `<div class="bb-empty">暂无会话</div>`; return; }

    seed = 41;
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    let bubbles = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#56d4dd";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const size = 10 + (tok / maxTok) * 32;
      const x = 30 + rnd() * (W - 60);
      const dur = 3.5 + rnd() * 3, delay = i * 140;
      const wob = (rnd() - 0.5) * 30;
      const by = H + size + 10;
      bubbles += `<g class="bb-bubble ${failed ? "sink" : ""}"
          style="--wob:${wob.toFixed(0)}px;animation-duration:${dur.toFixed(1)}s;animation-delay:${delay}ms">
        <circle class="bb-outer" cx="${x.toFixed(0)}" cy="${by.toFixed(1)}" r="${size.toFixed(1)}" fill="${col}" opacity="${failed ? ".25" : ".55"}"/>
        <circle class="bb-shine" cx="${(x - size * 0.3).toFixed(0)}" cy="${(by - size * 0.3).toFixed(1)}" r="${(size * 0.32).toFixed(1)}" fill="rgba(255,255,255,.6)"/>
        <circle class="bb-inner" cx="${x.toFixed(0)}" cy="${by.toFixed(1)}" r="${(size * 0.55).toFixed(1)}" fill="none" stroke="rgba(255,255,255,.3)" stroke-width=".8" stroke-dasharray="2,3"/>
        <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
      </g>`;
    });

    // caustic rays from surface
    let rays = "";
    for (let i = 0; i < 5; i++) {
      const rx = W * (0.12 + i * 0.2), rw = 20 + rnd() * 30;
      rays += `<path class="bb-ray" d="M${rx.toFixed(0)},${surface} L${(rx + rw).toFixed(0)},${surface} L${(rx + rw * 0.4).toFixed(0)},${H} L${(rx - rw * 0.3).toFixed(0)},${H} Z"
        fill="rgba(255,255,255,.03)" style="animation-delay:${i * 300}ms"/>`;
    }
    // surface line + foam
    const surf = `<line class="bb-surface" x1="0" y1="${surface}" x2="${W}" y2="${surface}"
      stroke="rgba(120,200,255,.3)" stroke-width="1.5" stroke-dasharray="2,4"/>
      <path d="M0,${surface} Q${W / 4},${surface - 4} ${W / 2},${surface} T${W},${surface}" fill="rgba(120,200,255,.06)"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#56d4dd";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="bl-item ${failed ? "bad" : ""}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="bb-wrap">
        <div class="bb-legend">${legend}<span class="bl-tip">泡=会话 · 大=Token · 沉=失败</span></div>
        <svg class="bb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet">
          ${rays}${surf}${bubbles}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "气泡",
    eyebrow: "BUBBLES",
    render
  };
})();
