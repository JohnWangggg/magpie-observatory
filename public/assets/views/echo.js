/* ------------------------------------------------------------------ echo
 * Echo view — sessions drop into a still pond:
 *   each session is a concentric ripple expanding from a point on the
 *   waterline; rings = its token size, colour = agent, fade = age.
 *   A faint crosshair marks the pond's centre; a legend lists ripples.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "echo";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 10);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H * 0.55;
    const maxR = Math.min(W, H) * 0.38;

    if (!sessions.length) { host.innerHTML = `<div class="echo-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    let ripples = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#56d4dd";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const n = Math.max(4, Math.round(4 + (tok / maxTok) * 6));
      // offset each ripple around the centre
      const ox = Math.cos(i * 2.4) * maxR * 0.5;
      const oy = Math.sin(i * 2.4) * maxR * 0.4;
      for (let k = 0; k < n; k++) {
        const r = 8 + (k / (n - 1)) * maxR * (0.5 + tok / maxTok * 0.5);
        const op = (1 - k / n) * (failed ? 0.25 : 0.55);
        ripples += `<circle class="echo-ring" cx="${cx + ox}" cy="${cy + oy}" r="${r.toFixed(0)}"
          fill="none" stroke="${col}" stroke-width="${(1.2 + tok / maxTok * 1.6).toFixed(1)}"
          opacity="${op.toFixed(2)}" stroke-dasharray="${failed ? "3,5" : "none"}"
          style="animation-delay:${(i * 100 + k * 60)}ms">
          <title>${esc(s.title)} · ${s.agent} · ${s.tokens} tok</title>
        </circle>`;
      }
      ripples += `<circle class="echo-core" cx="${cx + ox}" cy="${cy + oy}" r="${(3 + tok / maxTok * 4).toFixed(1)}"
        fill="${col}" opacity="${failed ? ".4" : ".9"}" style="animation-delay:${i * 100}ms"/>`;
    });

    // crosshair at the pond centre
    const ch = `<g class="echo-ch" opacity=".3">
        <line x1="${cx - 8}" y1="${cy}" x2="${cx + 8}" y2="${cy}" stroke="rgba(255,255,255,.5)"/>
        <line x1="${cx}" y1="${cy - 8}" x2="${cx}" y2="${cy + 8}" stroke="rgba(255,255,255,.5)"/>
      </g>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#56d4dd";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="el-item ${failed ? "bad" : ""}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 14))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="echo-wrap">
        <div class="echo-legend">${legend}<span class="el-tip">环=Token · 色=Agent · 虚线=失败</span></div>
        <svg class="echo-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${ch}${ripples}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "回声",
    eyebrow: "ECHO",
    render
  };
})();
