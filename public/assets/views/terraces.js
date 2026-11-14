/* ------------------------------------------------------------------ terraces
 * Terraces — flooded rice terraces on a mountainside: every
 * quota window is a terrace level whose water width = used %
 * (≥85% the paddy glows amber); sessions are egrets wading
 * through the water.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "terraces";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(88990011);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 60;

    // hillside sky
    const sky = `<defs><linearGradient id="th-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d8e8e0"/><stop offset="100%" stop-color="#f8f0d0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#th-s)" rx="10"/>`;
    // sun
    const sun = `<circle cx="60" cy="30" r="16" fill="#f0e8b8" opacity=".6"/>`;

    // terraces — water width = used %
    const n = Math.max(1, quotas.length);
    const th = (H - GY - 50) / n;
    const levels = quotas.map((w, i) => {
      const y = GY + i * th;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#7ab890";
      const tw = (W - 40) * (0.5 + f * 0.5);
      const x0 = (W - tw) / 2;
      // terrace rim
      const rim = `<path d="M ${x0.toFixed(1)} ${y + th * .85} L ${(x0 + tw).toFixed(1)} ${y + th * .85} L ${(x0 + tw + 6).toFixed(1)} ${y + th * .7} L ${(x0 - 6).toFixed(1)} ${y + th * .7} Z" fill="color-mix(in srgb, ${col} 55%, #8a9868)"/>`;
      // water surface — width = used %
      const water = `<rect x="${x0.toFixed(1)}" y="${y + 3}" width="${tw.toFixed(1)}" height="${(th * .65).toFixed(1)}" rx="4" fill="color-mix(in srgb, ${col} 35%, #c8e0d8)"/>`;
      // water shimmer
      const shim1 = `<line x1="${(x0 + 8).toFixed(1)}" y1="${(y + th * .2).toFixed(1)}" x2="${(x0 + tw - 8).toFixed(1)}" y2="${(y + th * .2).toFixed(1)}" stroke="#e8f0e8" stroke-width=".6" opacity=".4"><animate attributeName="x2" values="${(x0 + tw - 8).toFixed(1)};${(x0 + tw - 20).toFixed(1)};${(x0 + tw - 8).toFixed(1)}" dur="${(3 + i).toFixed(1)}s" repeatCount="indefinite"/></line>`;
      const shim2 = `<line x1="${(x0 + 12).toFixed(1)}" y1="${(y + th * .45).toFixed(1)}" x2="${(x0 + tw - 12).toFixed(1)}" y2="${(y + th * .45).toFixed(1)}" stroke="#e0e8e0" stroke-width=".5" opacity=".3"><animate attributeName="x1" values="${(x0 + 12).toFixed(1)};${(x0 + 20).toFixed(1)};${(x0 + 12).toFixed(1)}" dur="${(2.5 + i * .7).toFixed(1)}s" repeatCount="indefinite"/></line>`;
      // hot amber on the paddy
      const glow = hot ? `<rect x="${x0.toFixed(1)}" y="${y + 3}" width="${tw.toFixed(1)}" height="${(th * .65).toFixed(1)}" rx="4" fill="var(--amber)" opacity=".15">
        <animate attributeName="opacity" values=".15;.05;.15" dur="2s" repeatCount="indefinite"/></rect>` : "";
      return `<g class="th-ter${hot ? " hot" : ""}">
        ${rim}${water}${shim1}${shim2}${glow}
        <text x="${(x0 + tw + 14).toFixed(1)}" y="${(y + th * .5).toFixed(1)}" class="th-pct">${Math.round(w.used)}%</text>
        <text x="${x0.toFixed(1)}" y="${(y + th * .5).toFixed(1)}" class="th-name" text-anchor="end" transform="translate(-6,0)">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // egrets — wading
    const egrets = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 16 - (s.tps || 0) / 12);
      const lvl = i % quotas.length || 0;
      const y = GY + lvl * th + th * .4;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#f0f0f0");
      return `<g class="th-egret${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y.toFixed(1)};${W + 20} ${(y + 3).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .35}" fill="${col}"/>
        <path d="M ${size * .5} ${-size * .1} Q ${size * 1.1} ${-size * .6} ${size * 1.5} ${-size * .2}" stroke="${col}" stroke-width="1" fill="none"/>
        <circle cx="${size * 1.5}" cy="${-size * .15}" r="${size * .22}" fill="${col}"/>
        <line x1="${size * .6}" y1="${size * .3}" x2="${size * .7}" y2="${size * .9}" stroke="${col}" stroke-width=".4"/>
        <line x1="${size * .2}" y1="${size * .3}" x2="${size * .2}" y2="${size * .9}" stroke="${col}" stroke-width=".4"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="th-wrap">
        <div class="th-head"><b>TERRACES</b><span>梯田=配额窗 水宽=用量 白鹭=会话${hotN ? " · " + hotN + " 炙" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${sun}${levels}${egrets}
          <g class="th-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="th-k">${fmt(k.tokens)} · ${sessions.length} 鹭</text>
            <text x="22" y="45" class="th-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "梯田", eyebrow: "TERRACES", render };
})();
