/* ----------------------------------------------------------------- prism
 * Prism view — the request stream enters as one white beam, the prism
 * splits it into each provider's share as colored rays:
 *   ray width = tokens, color = provider, angle = its order.
 *   A faint glass triangle in the middle carries the split.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "prism";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const meta = ctx.providerMeta || {};
    const metaOf = k => (typeof meta === "function" ? meta(k) : (meta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W * 0.42, cy = H * 0.5;

    // provider → token share
    const provTok = {};
    sessions.forEach(s => { provTok[s.provider] = (provTok[s.provider] || 0) + (s.tokens || 0); });
    const total = Object.values(provTok).reduce((a, b) => a + b, 0) || 1;
    const provs = Object.entries(provTok).sort((a, b) => b[1] - a[1]).slice(0, 7);

    if (!provs.length) { host.innerHTML = `<div class="prism-empty">暂无会话</div>`; return; }

    // prism triangle
    const tri = `
      <path class="prism-tri" d="M${cx - 60},${cy + 70} L${cx},${cy - 80} L${cx + 60},${cy + 70} Z"
        fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.25)" stroke-width="1.2"/>
      <path class="prism-tri-in" d="M${cx - 40},${cy + 50} L${cx},${cy - 55} L${cx + 40},${cy + 50} Z"
        fill="none" stroke="rgba(255,255,255,.1)" stroke-width="1" stroke-dasharray="3,4"/>`;

    // white beam in from left
    const beam = `
      <defs>
        <linearGradient id="prism-beam" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="rgba(255,255,255,.9)"/>
          <stop offset="1" stop-color="rgba(255,255,255,.25)"/>
        </linearGradient>
      </defs>
      <line class="prism-beam" x1="0" y1="${cy}" x2="${cx - 60}" y2="${cy}"
        stroke="url(#prism-beam)" stroke-width="3" stroke-linecap="round"/>
      <text x="${cx - 60 - 10}" y="${cy - 12}" text-anchor="end" font-size="10" fill="rgba(255,255,255,.5)">请求流</text>`;

    // rays out to the right — spread by share order
    let rays = "";
    provs.forEach(([prov, tok], i) => {
      const share = tok / total;
      const col = metaOf(prov).color || "#8b7cf6";
      const n = provs.length;
      // fan angle: -30° to +30°, largest share near center
      const t = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
      const ang = t * Math.PI / 6;
      const rayW = 2 + share * 22;
      const x1 = cx + 60 * Math.cos(ang), y1 = cy + 60 * Math.sin(ang) + 70 * (1 - Math.cos(ang)) * 0;
      const x2 = W - 40, y2 = cy + Math.sin(ang) * (W - cx - 60);
      const grad = `prism-ray-${i}`;
      rays += `<defs>
          <linearGradient id="${grad}" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="${col}" stop-opacity=".85"/>
            <stop offset="1" stop-color="${col}" stop-opacity=".15"/>
          </linearGradient>
        </defs>
        <line class="prism-ray" x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2}" y2="${y2.toFixed(0)}"
          stroke="url(#${grad})" stroke-width="${rayW.toFixed(1)}" stroke-linecap="round" style="animation-delay:${i * 70}ms">
          <title>${esc(metaOf(prov).name || prov)} · ${Math.round(share * 100)}% · ${tok} tok</title>
        </line>
        <circle class="prism-dot" cx="${x2}" cy="${y2.toFixed(0)}" r="${(rayW / 2 + 2).toFixed(1)}" fill="${col}" opacity=".9" style="animation-delay:${i * 70}ms"/>`;
    });

    // legend
    const legend = provs.map(([prov, tok], i) => {
      const col = metaOf(prov).color || "#8b7cf6";
      const pct = Math.round((tok / total) * 100);
      return `<span class="pl-item" data-provider="${esc(prov)}"><i style="background:${col}"></i>${esc(metaOf(prov).name || prov)} ${pct}%</span>`;
    }).join("");

    host.innerHTML = `
      <div class="prism-wrap">
        <div class="prism-legend">${legend}<span class="pl-tip">宽=Token份额 · 色=Provider · 角=次序</span></div>
        <svg class="prism-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${beam}${tri}${rays}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "棱镜",
    eyebrow: "PRISM",
    render
  };
})();
