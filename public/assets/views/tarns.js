/* ------------------------------------------------------------------ tarns
 * Tarns — glacial cirque pools high in the mountains: every
 * quota window is a tarn whose depth = used % (≥85% the ice
 * rim glows amber); sessions are pikas darting on the scree.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tarns";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(77559911);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 240;

    // alpine sky
    const sky = `<defs><linearGradient id="tn-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8898b0"/><stop offset="100%" stop-color="#b0c0d0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#tn-s)" rx="10"/>`;
    // cirque headwall
    const wall = `<path d="M 0 ${GY} L 0 ${GY - 80} L 40 ${GY - 110} L 100 ${GY - 95} L 160 ${GY - 125} L 230 ${GY - 100} L 300 ${GY - 120} L 360 ${GY - 95} L 400 ${GY - 105} L 400 ${GY} Z" fill="#687888" opacity=".4"/>`;
    // snow fields on the wall
    const snow = `<path d="M 100 ${GY - 95} L 115 ${GY - 102} L 130 ${GY - 96} L 118 ${GY - 90} Z" fill="#e8f0f8" opacity=".5"/>
      <path d="M 280 ${GY - 110} L 295 ${GY - 118} L 310 ${GY - 108} L 296 ${GY - 102} Z" fill="#e8f0f8" opacity=".45"/>`;
    // ground — scree
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #787888 60%, var(--card-2))"/>`;
    let scree = "";
    for (let i = 0; i < 14; i++) {
      scree += `<polygon points="${(rnd() * W).toFixed(1)},${(GY + 4 + rnd() * 30).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 10 + rnd() * 30).toFixed(1)} ${(rnd() * W).toFixed(1)},${(GY + 14 + rnd() * 30).toFixed(1)}" fill="#888898" opacity="${(.25 + rnd() * .2).toFixed(2)}"/>`;
    }

    // tarns — depth = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const tarns = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#5898b8";
      const td = 8 + f * 35;
      const tw = 16 + f * 26;
      const topY = GY + 8;
      // tarn bowl
      const bowl = `<ellipse cx="${cx}" cy="${topY}" rx="${tw / 2}" ry="${td}" fill="color-mix(in srgb, ${col} 70%, #385868)"/>`;
      // inner depth shading
      const deep = `<ellipse cx="${cx}" cy="${topY + td * .2}" rx="${tw * .35}" ry="${td * .6}" fill="color-mix(in srgb, ${col} 50%, #284050)" opacity=".7"/>`;
      // surface glint
      const glint = `<ellipse cx="${cx - tw * .15}" cy="${topY - td * .35}" rx="${tw * .2}" ry="${td * .25}" fill="#c8e0f0" opacity="${(.3 + f * .3).toFixed(2)}"/>`;
      // ice rim
      const rim = `<ellipse cx="${cx}" cy="${topY}" rx="${tw / 2}" ry="${td}" fill="none" stroke="${hot ? "var(--amber)" : "#d0e0e8"}" stroke-width="${hot ? 2 : 1.2}" opacity="${hot ? ".7" : ".5"}"/>`;
      // hot pulse
      const pulse = hot ? `<ellipse cx="${cx}" cy="${topY}" rx="${tw / 2 + 4}" ry="${td + 3}" fill="none" stroke="var(--amber)" stroke-width="1" opacity=".4">
        <animate attributeName="rx" values="${tw / 2 + 4};${tw / 2 + 10}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".4;.05" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="tn-tarn${hot ? " hot" : ""}">
        ${bowl}${deep}${glint}${rim}${pulse}
        <text x="${cx.toFixed(1)}" y="${topY + td + 16}" class="tn-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${topY + td + 27}" class="tn-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // pikas — darting on the scree
    const pikas = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 11 - (s.tps || 0) / 13);
      const y = GY + 35 + (i % 3) * 8;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#988868");
      const x0 = -15;
      const x1 = W + 15;
      return `<g class="tn-pika${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${x0} ${y};${x1} ${(y - 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .55}" fill="${col}"/>
        <circle cx="${size * .6}" cy="${-size * .3}" r="${size * .4}" fill="${col}"/>
        <circle cx="${size * .75}" cy="${-size * .55}" r="${size * .18}" fill="${col}"/>
        <path d="M ${-size * .7} ${size * .3} L ${-size * 1.1} ${size * .8}" stroke="${col}" stroke-width=".6" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="tn-wrap">
        <div class="tn-head"><b>TARNS</b><span>冰斗湖=配额窗 深=用量 鼠兔=会话${hotN ? " · " + hotN + " 燃缘" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${wall}${snow}${ground}${scree}${tarns}${pikas}
          <g class="tn-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="tn-k">${fmt(k.tokens)} · ${sessions.length} 兔</text>
            <text x="22" y="45" class="tn-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "冰斗湖", eyebrow: "TARNS", render };
})();
