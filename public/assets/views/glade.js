/* -------------------------------------------------------------------- glade
 * Glade — fern fronds in a sunlit clearing: every quota window is
 * a fern whose frond height = used % (≥85% the tip curls golden);
 * sessions are deer stepping through the clearing.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "glade";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(22334455);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 240;

    // sun shaft
    const shaft = `<path d="M 140 20 L 260 20 L 300 ${GY} L 100 ${GY} Z" fill="#f0e8c0" opacity=".06">
      <animate attributeName="opacity" values=".04;.09;.04" dur="5s" repeatCount="indefinite"/></path>`;
    // forest floor
    const floor = `<path d="M 0 ${GY} Q 100 ${GY - 8} 200 ${GY - 4} T 400 ${GY - 6} L 400 300 L 0 300 Z" fill="color-mix(in srgb, #142014 72%, var(--card-2))"/>`;
    // moss dots
    let moss = "";
    for (let i = 0; i < 12; i++) {
      moss += `<circle cx="${(20 + rnd() * (W - 40)).toFixed(1)}" cy="${(GY + 6 + rnd() * 40).toFixed(1)}" r="${(1.5 + rnd() * 2).toFixed(1)}" fill="#3a6a3a" opacity="${(.3 + rnd() * .3).toFixed(2)}"/>`;
    }

    // ferns — frond height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const ferns = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#4a8a4a";
      const fh = 30 + f * 90;
      const tipY = GY - fh;
      const fronds = Math.round(3 + f * 5);
      let leaves = "";
      for (let b = 0; b < fronds; b++) {
        const ang = -60 + (b / Math.max(1, fronds - 1)) * 120 + (rnd() - .5) * 16;
        const rad = ang * Math.PI / 180;
        const len = fh * (.4 + rnd() * .6);
        const ex = cx + Math.cos(rad) * len;
        const ey = tipY + Math.abs(Math.sin(rad)) * len * .3;
        // frond blade — curved
        const ctrl = (rnd() - .5) * 20;
        leaves += `<path d="M ${cx} ${GY} Q ${(cx + ctrl).toFixed(1)} ${(GY - len * .5).toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" stroke="${hot ? "color-mix(in srgb, var(--amber) 50%, " + col + ")" : col}" stroke-width="${(1.2 + f).toFixed(1)}" fill="none" opacity="${(.6 + f * .3).toFixed(2)}" stroke-linecap="round"/>`;
        // leaflets on the blade
        const leaflets = Math.round(3 + f * 4);
        for (let l = 0; l < leaflets; l++) {
          const t = (l + 1) / (leaflets + 1);
          const lx = cx + (ex - cx) * t + ctrl * t * (1 - t) * 4;
          const ly = GY + (ey - GY) * t;
          const ls = 2 + f * 2;
          leaves += `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${ls.toFixed(1)}" ry="${(ls * .5).toFixed(1)}" fill="${hot ? "var(--amber)" : col}" opacity="${(.4 + f * .3).toFixed(2)}" transform="rotate(${ang * .3} ${lx.toFixed(1)} ${ly.toFixed(1)})"/>`;
        }
      }
      // golden tip curl when hot
      const tip = hot ? `<path d="M ${cx} ${tipY} Q ${cx + 8} ${tipY - 10} ${cx + 14} ${tipY - 4}" stroke="var(--amber)" stroke-width="1.5" fill="none" stroke-linecap="round">
        <animate attributeName="d" values="M ${cx} ${tipY} Q ${cx + 8} ${tipY - 10} ${cx + 14} ${tipY - 4};M ${cx} ${tipY} Q ${cx + 6} ${tipY - 14} ${cx + 12} ${tipY - 6};M ${cx} ${tipY} Q ${cx + 8} ${tipY - 10} ${cx + 14} ${tipY - 4}" dur="1.6s" repeatCount="indefinite"/></path>` : "";
      return `<g class="gl-fern${hot ? " hot" : ""}">
        ${leaves}${tip}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="gl-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="gl-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // deer — sessions stepping through
    const deer = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(8, 18 - (s.tps || 0) / 10);
      const y = GY - 12 - (i % 2) * 10;
      const size = 4.5 + Math.min(3, (s.tokens || 0) / 70000);
      const col = dead ? "var(--red)" : (m.color || "#a87848");
      return `<g class="gl-deer${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-28} ${y};${W + 28} ${(y + 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.6}" ry="${size * .85}" fill="${col}"/>
        <path d="M ${size * 1.3} ${-size * .3} L ${size * 2} ${-size * 1.4} L ${size * 2.4} ${-size * 1.1} L ${size * 1.8} 0 Z" fill="${col}"/>
        <circle cx="${size * 2.2}" cy="${-size * 1.3}" r="${size * .45}" fill="${col}"/>
        <path d="M ${size * 2.2} ${-size * 1.6} L ${size * 2.4} ${-size * 2.4} M ${size * 2.2} ${-size * 1.6} L ${size * 2.6} ${-size * 2.2} M ${size * 2.2} ${-size * 1.7} L ${size * 2} ${-size * 2.3}" stroke="${col}" stroke-width="1"/>
        <ellipse cx="${-size * .7}" cy="0" rx="${size * .35}" ry="${size * .5}" fill="#f0e8d8" opacity=".85"/>
        <line x1="${-size * .8}" y1="${size * .7}" x2="${-size * .8}" y2="${size * 1.9}" stroke="#7a5a3a" stroke-width="1.1"/>
        <line x1="${size * .8}" y1="${size * .7}" x2="${size * .8}" y2="${size * 1.9}" stroke="#7a5a3a" stroke-width="1.1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gl-wrap">
        <div class="gl-head"><b>GLADE</b><span>蕨=配额窗 高=用量 鹿=会话${hotN ? " · " + hotN + " 金尖" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #0f180f 58%, transparent)" rx="10"/>
          ${shaft}${floor}${moss}${ferns}${deer}
          <g class="gl-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="gl-k">${fmt(k.tokens)} · ${sessions.length} 鹿</text>
            <text x="22" y="45" class="gl-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "林间空地", eyebrow: "GLADE", render };
})();
