/* ------------------------------------------------------------------ quartz
 * Quartz view — the session set as a crystal cluster:
 *   each session is a pointed prism (height = tokens, colour = agent,
 *   cracked = failed); facets catch a side light and the cluster
 *   sits on a dark base.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "quartz";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 61;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 10);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const base = H * 0.8;

    if (!sessions.length) { host.innerHTML = `<div class="qz-empty">暂无会话</div>`; return; }

    seed = 61;
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const n = sessions.length;
    let prisms = "", cracks = "";

    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const x = W * 0.12 + (i / Math.max(1, n - 1)) * W * 0.76;
      const h = 20 + (tok / maxTok) * H * 0.5;
      const w = 10 + (tok / maxTok) * 14;
      const tip = h * 0.24;
      // prism: pointed top, faceted sides
      prisms += `<g class="qz-prism ${failed ? "cracked" : ""}" style="animation-delay:${i * 90}ms">
          <polygon points="${x - w},${base} ${x - w * 0.7},${base - h + tip} ${x},${base - h} ${x + w * 0.7},${base - h + tip} ${x + w},${base}"
            fill="${col}" opacity="${failed ? ".35" : ".6"}">
            <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
          </polygon>
          <line x1="${x}" y1="${base - h}" x2="${x}" y2="${base}" stroke="rgba(255,255,255,.35)" stroke-width="0.8"/>
          <line x1="${x - w * 0.7}" y1="${base - h + tip}" x2="${x - w * 0.5}" y2="${base}" stroke="rgba(255,255,255,.18)" stroke-width="0.6"/>
          <line x1="${x + w * 0.7}" y1="${base - h + tip}" x2="${x + w * 0.5}" y2="${base}" stroke="rgba(255,255,255,.18)" stroke-width="0.6"/>
        </g>`;
      if (failed) {
        cracks += `<path class="qz-crack" d="M${x - 4},${base - h * 0.6} l${4},${-8} l${-2},${-6} l${4},${-8}"
            stroke="#f26d7f" stroke-width="1.4" fill="none"/>`;
      }
    });

    // base + sparkles
    const baseEl = `<rect class="qz-base" x="${W * 0.08}" y="${base}" width="${W * 0.84}" height="${H - base}" rx="4" fill="rgba(25,30,45,.7)"/>`;
    let spark = "";
    for (let i = 0; i < 8; i++) {
      spark += `<circle class="qz-spark" cx="${(W * 0.15 + rnd() * W * 0.7).toFixed(0)}" cy="${(base - 10 - rnd() * 60).toFixed(0)}"
          r="${(0.8 + rnd()).toFixed(1)}" fill="rgba(255,255,255,.6)" style="animation-delay:${(rnd() * 3).toFixed(1)}s"/>`;
    }

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="ql-item ${failed ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="qz-wrap">
        <div class="qz-legend">${legend}<span class="ql-tip">晶=会话 · 高=Token · 裂=失败</span></div>
        <svg class="qz-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${baseEl}${prisms}${cracks}${spark}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "晶簇",
    eyebrow: "QUARTZ",
    render
  };
})();
