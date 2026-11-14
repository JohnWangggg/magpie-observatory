/* ----------------------------------------------------------------- beehive
 * Beehive view — sessions as a honeycomb:
 *   each cell is a session (fill level = tokens, colour = agent,
 *   cracked cell = failed); small bees orbit the comb.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "beehive";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function hexPath(cx, cy, r) {
    let d = "";
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i - Math.PI / 6;
      d += (i ? "L" : "M") + (cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1) + " ";
    }
    return d + "Z";
  }

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 14);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx0 = W / 2, cy0 = H / 2;
    const R = 34;

    if (!sessions.length) { host.innerHTML = `<div class="bh-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    // honeycomb grid: staggered rows centred on the panel
    const n = sessions.length;
    const cols = Math.min(5, n);
    const rows = Math.ceil(n / cols);
    const dx = R * 1.85, dy = R * 1.6;
    const gridW = cols * dx, gridH = rows * dy;
    const ox = cx0 - gridW / 2 + dx / 2, oy = cy0 - gridH / 2 + dy / 2;
    let cells = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#f0a868";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const r = Math.floor(i / cols), c = i % cols;
      const x = ox + c * dx + (r % 2 ? dx / 2 : 0);
      const y = oy + r * dy;
      const fill = 0.3 + (tok / maxTok) * 0.6;
      const rr = R * (0.55 + (tok / maxTok) * 0.4);
      cells += `<g class="bh-cell ${failed ? "cracked" : ""}" style="animation-delay:${i * 120}ms">
          <path class="bh-hex" d="${hexPath(x, y, R)}" fill="none" stroke="${col}" stroke-width="1.4" opacity=".5"/>
          <path class="bh-fill" d="${hexPath(x, y, rr)}" fill="${col}" opacity="${failed ? ".25" : (fill * 0.6).toFixed(2)}">
            <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
          </path>
          ${failed ? `<path class="bh-crack" d="M${x - 6},${y - 4} l${5},${-6} l${-2},${-4} l${4},${-5}" stroke="#f26d7f" stroke-width="1.2" fill="none"/>` : ""}
        </g>`;
    });

    // bees orbiting
    let bees = "";
    const beeCol = "#f0c868";
    for (let b = 0; b < 4; b++) {
      const orbR = R * (2.4 + b * 0.9);
      bees += `<g transform="translate(${cx0},${cy0}) scale(1,${(0.55 + b * 0.08).toFixed(2)})">
          <g class="bh-bee" style="animation-duration:${(5 + b * 1.6).toFixed(1)}s; animation-delay:${b * 700}ms">
            <g transform="translate(${orbR.toFixed(0)},0)">
              <ellipse rx="3.2" ry="2.2" fill="${beeCol}"/>
              <circle cx="2.6" cy="-0.4" r="1" fill="rgba(40,30,10,.8)"/>
              <ellipse cx="-0.6" cy="-2" rx="1.6" ry="1" fill="rgba(255,255,255,.5)"/>
            </g>
          </g>
        </g>`;
    }
    const orbits = "";

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="bl-item ${failed ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="bh-wrap">
        <div class="bh-legend">${legend}<span class="bl-tip">格=会话 · 满=Token · 裂=失败</span></div>
        <svg class="bh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${cells}${orbits}${bees}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "蜂房",
    eyebrow: "BEEHIVE",
    render
  };
})();
