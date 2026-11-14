/* ----------------------------------------------------------------- aurora2
 * Aurora2 view — sessions as aurora curtains:
 *   each session is a flowing curtain (height = tokens, colour = agent,
 *   gap = failed); curtains sway and shimmer under stars.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "aurora2";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 71;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 8);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const horizon = H * 0.72;

    if (!sessions.length) { host.innerHTML = `<div class="a2-empty">暂无会话</div>`; return; }

    seed = 71;
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const n = sessions.length;
    let curtains = "", stars = "";

    for (let i = 0; i < 24; i++) {
      stars += `<circle cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H * 0.45).toFixed(0)}"
          r="${(0.5 + rnd()).toFixed(1)}" fill="rgba(255,255,255,.3)" opacity="${(0.2 + rnd() * 0.5).toFixed(2)}"/>`;
    }

    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const x = W * 0.1 + (i / Math.max(1, n - 1)) * W * 0.8;
      const h = 30 + (tok / maxTok) * H * 0.4;
      const w = 14 + (tok / maxTok) * 20;
      // curtain: wavy band from horizon up
      const x0 = x - w / 2, x1 = x + w / 2;
      const top0 = horizon - h - rnd() * 8, top1 = horizon - h * 0.9 - rnd() * 8;
      curtains += `<path class="a2-curtain ${failed ? "gap" : ""}" d="
          M${x0.toFixed(0)},${horizon}
          C${x0.toFixed(0)},${(horizon - h * 0.4).toFixed(0)} ${(x0 + w * 0.2).toFixed(0)},${(horizon - h * 0.7).toFixed(0)} ${(x0 + w * 0.4).toFixed(0)},${top0.toFixed(0)}
          C${(x0 + w * 0.6).toFixed(0)},${(top0 - 6).toFixed(0)} ${(x1 - w * 0.3).toFixed(0)},${top1.toFixed(0)} ${x1.toFixed(0)},${top1.toFixed(0)}
          C${x1.toFixed(0)},${(horizon - h * 0.5).toFixed(0)} ${x1.toFixed(0)},${(horizon - h * 0.2).toFixed(0)} ${x1.toFixed(0)},${horizon}
          Z"
          fill="${col}" opacity="${failed ? ".3" : ".5"}" style="animation-delay:${i * 200}ms">
          <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
        </path>`;
    });

    // ground line
    const ground = `<line x1="0" y1="${horizon}" x2="${W}" y2="${horizon}" stroke="rgba(255,255,255,.08)" stroke-dasharray="2,8"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="al-item ${failed ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="a2-wrap">
        <div class="a2-legend">${legend}<span class="al-tip">幕=会话 · 高=Token · 断=失败</span></div>
        <svg class="a2-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="a2-soft"><feGaussianBlur stdDeviation="5"/></filter>
          </defs>
          ${stars}${ground}
          <g filter="url(#a2-soft)">${curtains}</g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "极光幕",
    eyebrow: "AURORA2",
    render
  };
})();
