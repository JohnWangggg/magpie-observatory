/* ----------------------------------------------------------------- lantern
 * Lantern view — sessions as sky lanterns released into the night:
 *   each lantern's size = tokens, colour = agent, tilt = failed.
 *   A dark sky and a rising glow fill the panel.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lantern";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 43;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 10);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const ground = H * 0.9;

    if (!sessions.length) { host.innerHTML = `<div class="lt-empty">暂无会话</div>`; return; }

    seed = 43;
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const n = sessions.length;
    let lamps = "", stars = "";

    for (let i = 0; i < 16; i++) {
      stars += `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H * 0.5).toFixed(0)}"
          r="${(0.5 + rnd()).toFixed(1)}" fill="rgba(255,255,255,.25)" opacity="${(0.3 + rnd() * 0.5).toFixed(2)}"/>`;
    }

    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#f0a868";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const x = W * 0.08 + (i / Math.max(1, n - 1)) * W * 0.84;
      const size = 14 + (tok / maxTok) * 26;
      const tilt = failed ? -14 + rnd() * 8 : (rnd() - 0.5) * 6;
      const y = ground - 10 - rnd() * 20;
      // lantern: rounded body + bottom glow + flame dot
      lamps += `<g transform="translate(${x.toFixed(0)},${y.toFixed(0)}) rotate(${tilt.toFixed(0)})">
        <g class="lt-lamp ${failed ? "fall" : ""}" style="animation-delay:${i * 180}ms">
          <ellipse class="lt-body" rx="${size.toFixed(0)}" ry="${(size * 1.25).toFixed(0)}"
              fill="${col}" opacity="${failed ? ".4" : ".75"}"/>
          <ellipse class="lt-glow" rx="${(size * 1.5).toFixed(0)}" ry="${(size * 1.9).toFixed(0)}"
              fill="${col}" opacity="${failed ? ".1" : ".2"}"/>
          <circle class="lt-flame" cy="${(size * 0.9).toFixed(0)}" r="${(size * 0.14).toFixed(1)}"
              fill="rgba(255,220,160,.9)"/>
          <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
        </g></g>`;
    });

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="ll-item ${failed ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="lt-wrap">
        <div class="lt-legend">${legend}<span class="ll-tip">灯=会话 · 大=Token · 歪=失败</span></div>
        <svg class="lt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${stars}${lamps}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "天灯",
    eyebrow: "LANTERN",
    render
  };
})();
