/* ----------------------------------------------------------------- galaxy
 * Galaxy view — a two-arm spiral galaxy of the day's requests:
 *   each session is a star on an arm (size = tokens, colour = agent),
 *   arms wind from the hub; failed stars drift off-arm. A bright core
 *   and starfield fill the dark.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "galaxy";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 53;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 24);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H / 2;
    const maxR = Math.min(W, H) * 0.46;

    if (!sessions.length) { host.innerHTML = `<div class="gx-empty">暂无会话</div>`; return; }

    seed = 53;
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const n = sessions.length;
    let stars = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      // two arms: arm 0 = even, arm 1 = odd; angle winds out
      const arm = i % 2;
      const t = i / Math.max(1, n - 1);
      const a = (t * Math.PI * 2.6 + arm * Math.PI) + rnd() * 0.4;
      const r = 14 + Math.pow(t, 0.7) * (maxR - 18) + rnd() * 8;
      const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a) * 0.7;
      const size = 1.5 + (tok / maxTok) * 5;
      const off = failed ? (rnd() - 0.5) * 24 : 0;
      stars += `<g class="gx-star ${failed ? "drift" : ""}" style="animation-delay:${i * 50}ms">
        <circle class="gx-core" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${size.toFixed(1)}" fill="${col}" opacity="${failed ? ".4" : ".85"}"/>
        <circle class="gx-halo" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(size * 2.2).toFixed(1)}" fill="${col}" opacity="${failed ? ".1" : ".25"}"/>
        <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
      </g>`;
      if (failed) stars += `<circle class="gx-far" cx="${(x + off).toFixed(1)}" cy="${(y + off * 0.4).toFixed(1)}" r="${(size * 0.5).toFixed(1)}" fill="${col}" opacity=".2"/>`;
    });

    // starfield background
    let bg = "";
    for (let i = 0; i < 30; i++) {
      const x = rnd() * W, y = rnd() * H;
      bg += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${(0.5 + rnd()).toFixed(1)}" fill="rgba(255,255,255,.2)" opacity="${(0.2 + rnd() * 0.5).toFixed(2)}"/>`;
    }
    // central core + glow
    const core = `<circle class="gx-center" cx="${cx}" cy="${cy}" r="10" fill="rgba(255,255,255,.9)"/>
      <circle class="gx-glow" cx="${cx}" cy="${cy}" r="26" fill="rgba(255,255,255,.08)"/>
      <circle class="gx-glow2" cx="${cx}" cy="${cy}" r="44" fill="rgba(255,255,255,.04)"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="gl-item ${failed ? "bad" : ""}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="gx-wrap">
        <div class="gx-legend">${legend}<span class="gl-tip">星=会话 · 臂=交替 · 飘=失败</span></div>
        <svg class="gx-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${bg}${core}${stars}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "星系",
    eyebrow: "GALAXY",
    render
  };
})();
