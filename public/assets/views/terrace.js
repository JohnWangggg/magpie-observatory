/* ------------------------------------------------------------------- terrace
 * Terrace — stacked rice paddies on a hillside: every quota window
 * is a terrace whose water level = used % (≥85% the water laps over
 * the bund red); sessions are farmers planting along the ridges.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "terrace";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300;
    const n = Math.max(1, quotas.length);
    const top = 62, stepH = 32;

    // terraces — water level = used %
    const tiers = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#5aa87a";
      const ty = top + i * stepH;
      const inset = 14 + i * 10;                 // each lower terrace is wider
      const x = inset, tw = W - inset * 2;
      const waterH = 6 + f * (stepH - 14);
      // bund (raised edge)
      const bund = `<path d="M ${x} ${ty} L ${x + tw} ${ty} L ${x + tw - 6} ${ty + stepH} L ${x + 6} ${ty + stepH} Z"
        fill="color-mix(in srgb, ${col} ${22 + f * 22}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1"/>`;
      // water surface inside
      const water = `<path d="M ${x + 7} ${ty + stepH - waterH} L ${x + tw - 7} ${ty + stepH - waterH} L ${x + tw - 7} ${ty + stepH - 4} L ${x + 7} ${ty + stepH - 4} Z"
        fill="color-mix(in srgb, ${hot ? "var(--red)" : "#5ab0c8"} ${38 + f * 30}%, transparent)"/>`;
      // water shimmer
      const shim = `<path d="M ${x + 12} ${ty + stepH - waterH + 2} q ${tw * .15} -2 ${tw * .3} 0 t ${tw * .3} 0 t ${tw * .3} 0"
        fill="none" stroke="${hot ? "var(--red)" : "#9adfe8"}" stroke-width=".8" opacity=".5">
        <animateTransform attributeName="transform" type="translate" values="0 0;${i % 2 ? 4 : -4} 0;0 0" dur="${(2.4 + i * .4).toFixed(1)}s" repeatCount="indefinite"/></path>`;
      // overflow trickle on hot
      const trickle = hot ? `<line x1="${x + tw - 10}" y1="${ty + stepH - waterH}" x2="${x + tw - 10}" y2="${ty + stepH + 6}" stroke="var(--red)" stroke-width="1.6">
        <animate attributeName="opacity" values=".9;.3;.9" dur="1s" repeatCount="indefinite"/></line>` : "";
      return `<g class="tc-tier${hot ? " hot" : ""}">
        ${bund}${water}${shim}${trickle}
        <text x="${(x + 4).toFixed(1)}" y="${ty + stepH - 4}" class="tc-pct">${Math.round(w.used)}%</text>
        <text x="${(x + tw - 4).toFixed(1)}" y="${ty + stepH - 4}" class="tc-name" text-anchor="end">${esc((m.name || w.prov).slice(0, 8))}</text>
      </g>`;
    }).join("");

    // farmers — sessions planting along the ridge tops
    const farmers = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(9, 20 - (s.tps || 0) / 10);
      const y = top - 6 - (i % 2) * 8;
      const size = 3.5 + Math.min(3.5, (s.tokens || 0) / 60000);
      return `<g class="tc-farmer${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y.toFixed(1)};${W + 20} ${(y + 4).toFixed(1)}" dur="${dur}s" begin="${(-i * 2.8).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="${-size * 1.9}" r="${size * .55}" fill="${dead ? "var(--red)" : m.color || "#d9b98a"}"/>
        <ellipse cx="0" cy="${-size * 2.2}" rx="${size * .85}" ry="${size * .3}" fill="#e8d9a8"/>
        <path d="M ${-size * .7} ${-size * 1.3} L ${size * .7} ${-size * 1.3} L ${size * .9} 0 L ${-size * .9} 0 Z" fill="${dead ? "var(--red)" : m.color || "#7a8a5a"}"/>
        <line x1="${-size * .5}" y1="0" x2="${-size * .5}" y2="${size * 1.2}" stroke="#5a4632" stroke-width="1.2"/>
        <line x1="${size * .5}" y1="0" x2="${size * .5}" y2="${size * 1.2}" stroke="#5a4632" stroke-width="1.2"/>
        <line x1="${size * .7}" y1="${-size * 1.1}" x2="${size * 1.4}" y2="${-size * .2}" stroke="#8a6a3a" stroke-width="1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="tc-wrap">
        <div class="tc-head"><b>TERRACE</b><span>田=配额窗 水=用量 农=会话${hotN ? " · " + hotN + " 田漫" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1a2218 46%, transparent)" rx="10"/>
          ${tiers}${farmers}
          <g class="tc-card">
            <rect x="14" y="252" width="140" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)" opacity=".92"/>
            <text x="22" y="270" class="tc-k">${fmt(k.tokens)} · ${sessions.length} 农</text>
            <text x="22" y="283" class="tc-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "梯田", eyebrow: "TERRACE", render };
})();
