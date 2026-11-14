/* -------------------------------------------------------------------- vine
 * Vine view — the request stream as a climbing vine:
 *   a curling stem grows across the panel; each session is a leaf
 *   (size = tokens, colour = agent, wilted = failed); tendrils
 *   curl at the tip.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "vine";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 9);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const n = sessions.length;

    if (!n) { host.innerHTML = `<div class="vn-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    // stem: gentle S-curve left → right
    const pts = sessions.map((s, i) => {
      const t = i / Math.max(1, n - 1);
      const x = W * 0.08 + t * W * 0.84;
      const y = H * 0.62 + Math.sin(t * Math.PI * 1.6) * H * 0.16;
      return { x, y };
    });
    let stem = `M${pts[0].x.toFixed(0)},${pts[0].y.toFixed(0)} `;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1], q = pts[i];
      const mx = (p.x + q.x) / 2;
      stem += `Q${mx.toFixed(0)},${(p.y - 14).toFixed(0)} ${q.x.toFixed(0)},${q.y.toFixed(0)} `;
    }

    let leaves = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#4ade80";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const { x, y } = pts[i];
      const size = 8 + (tok / maxTok) * 16;
      const side = i % 2 ? 1 : -1;
      const ang = side * (30 + (tok / maxTok) * 25);
      // leaf: two arcs forming an almond
      const lx = x + side * 6;
      const ly = y - size * 0.4;
      leaves += `<g transform="translate(${lx.toFixed(1)},${ly.toFixed(1)}) rotate(${ang.toFixed(0)})">
          <path class="vn-leaf ${failed ? "wilt" : ""}" d="M0,0 Q${(size * 0.5).toFixed(0)},${(-size * 0.5).toFixed(0)} ${size.toFixed(0)},0 Q${(size * 0.5).toFixed(0)},${(size * 0.5).toFixed(0)} 0,0 Z"
            fill="${col}" opacity="${failed ? ".35" : ".7"}" style="animation-delay:${i * 140}ms">
            <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
          </path>
          <line x1="0" y1="0" x2="${size.toFixed(0)}" y2="0" stroke="rgba(255,255,255,.25)" stroke-width="0.6"/>
        </g>`;
    });

    // tendril curl at the tip
    const tip = pts[pts.length - 1];
    const tendril = `<path class="vn-tendril" d="M${tip.x.toFixed(0)},${tip.y.toFixed(0)} q${12},${-10} ${18},${-18} q${-8},${-6} ${-12},${2}"
        fill="none" stroke="#4ade80" stroke-width="1.6" opacity=".6"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="vl-item ${failed ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="vn-wrap">
        <div class="vn-legend">${legend}<span class="vl-tip">叶=会话 · 大=Token · 枯=失败</span></div>
        <svg class="vn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          <path class="vn-stem" d="${stem}" fill="none" stroke="#3aa668" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
          ${leaves}${tendril}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "藤蔓",
    eyebrow: "VINE",
    render
  };
})();
