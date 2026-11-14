/* ---------------------------------------------------------------- firefly
 * Firefly view — a night field of glowing fireflies:
 *   each session is a firefly (glow = tokens, colour = agent);
 *   they drift on Lissajous paths and blink. A faint moon hangs
 *   in the corner.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "firefly";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 16);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;

    if (!sessions.length) { host.innerHTML = `<div class="ff-empty">暂无会话</div>`; return; }

    seed = 7;
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    let flies = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#fbbf24";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const glow = 3 + (tok / maxTok) * 8;
      const x = 30 + rnd() * (W - 60);
      const y = 30 + rnd() * (H - 60);
      const dx = (rnd() - 0.5) * 40, dy = (rnd() - 0.5) * 30;
      const dur = 5 + rnd() * 4, blink = 1.2 + rnd() * 2;
      const delay = i * 120;
      flies += `<g class="ff-fly" style="--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px;--dur:${dur.toFixed(1)}s;animation-delay:${delay}ms"
        transform="translate(${x.toFixed(0)},${y.toFixed(0)})">
        <circle class="ff-glow" r="${glow.toFixed(1)}" fill="${col}" opacity="${failed ? ".2" : ".55"}" style="animation-duration:${blink.toFixed(1)}s"/>
        <circle class="ff-dot" r="${(glow * 0.35).toFixed(1)}" fill="${col}" opacity="${failed ? ".35" : ".95"}"/>
        <title>${esc(s.title)} · ${s.agent} · ${s.status} · ${tok} tok</title>
      </g>`;
    });

    // moon + faint stars
    let sky = `<circle class="ff-moon" cx="${W - 60}" cy="45" r="16" fill="rgba(255,255,255,.08)"/>
      <circle class="ff-moon-glow" cx="${W - 60}" cy="45" r="30" fill="rgba(255,255,255,.03)"/>`;
    for (let i = 0; i < 12; i++) {
      const sx = rnd() * W, sy = rnd() * H * 0.7;
      sky += `<circle class="ff-star" cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="${(0.6 + rnd()).toFixed(1)}" fill="rgba(255,255,255,.3)"/>`;
    }

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#fbbf24";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="fl-item ${failed ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 10))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="ff-wrap">
        <div class="ff-legend">${legend}<span class="fl-tip">亮=Token · 色=Agent · 闪=呼吸</span></div>
        <svg class="ff-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${sky}${flies}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "萤火虫",
    eyebrow: "FIREFLY",
    render
  };
})();
