/* ------------------------------------------------------------------ ridge
 * Ridge — knife-edge spurs at dusk: every quota window is a spur
 * whose crest height = used % (≥85% the crest bleeds crimson);
 * sessions are falcons riding the updraft.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "ridge";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(33445566);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 244;

    // dusk gradient backdrop
    const sky = `<defs><linearGradient id="rg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1a1420"/><stop offset="50%" stop-color="#2a1a20"/><stop offset="100%" stop-color="#3a2a28"/></linearGradient></defs>`;
    // crescent moon
    const moon = `<circle cx="${W - 70}" cy="45" r="14" fill="#e8e0d0" opacity=".6"/>
      <circle cx="${W - 63}" cy="41" r="12" fill="#1a1420" opacity=".9"/>`;
    // valley mist
    let mist = "";
    for (let i = 0; i < 3; i++) {
      mist += `<path d="M ${-20 + i * 100} ${GY + 20 + i * 12} Q ${80 + i * 100} ${GY + 10 + i * 12} ${180 + i * 100} ${GY + 22 + i * 12} T ${400 + i * 60} ${GY + 18 + i * 12}" stroke="#5a4a5a" stroke-width="14" fill="none" opacity="${(.08 + rnd() * .08).toFixed(2)}" stroke-linecap="round"/>`;
    }

    // spurs — crest height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const spurs = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#7a5a6a";
      const sh = 30 + f * 100;
      const sw = 8 + f * 14;
      const tipY = GY - sh;
      // spur — asymmetric knife edge
      const body = `<path d="M ${cx - sw} ${GY} Q ${cx - sw * .4} ${GY - sh * .6} ${cx} ${tipY} Q ${cx + sw * .3} ${GY - sh * .4} ${cx + sw} ${GY} Z" fill="color-mix(in srgb, ${col} 45%, #1a1218)"/>`;
      // crest highlight
      const crest = `<path d="M ${cx - sw * .8} ${GY - sh * .15} L ${cx} ${tipY} L ${cx + sw * .6} ${GY - sh * .12}" stroke="${hot ? "var(--red)" : "#c8b0b8"}" stroke-width="1.5" fill="none" opacity="${(.5 + f * .4).toFixed(2)}" stroke-linecap="round"/>`;
      // hot crest ember
      const ring = hot ? `<circle cx="${cx}" cy="${tipY}" r="${(3 + f * 2).toFixed(1)}" fill="none" stroke="var(--red)" stroke-width="1" opacity=".7">
        <animate attributeName="r" values="${(3 + f * 2).toFixed(1)};${(7 + f * 3).toFixed(1)}" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;0" dur="1.6s" repeatCount="indefinite"/></circle>` : "";
      // scree
      const scree = `<path d="M ${cx - sw * .6} ${GY - sh * .3} L ${cx - sw * .2} ${GY - sh * .55}" stroke="#3a2a38" stroke-width=".6" opacity=".3"/>
        <path d="M ${cx + sw * .5} ${GY - sh * .25} L ${cx + sw * .1} ${GY - sh * .5}" stroke="#3a2a38" stroke-width=".6" opacity=".3"/>`;
      return `<g class="rg-spur${hot ? " hot" : ""}">
        ${body}${crest}${scree}${ring}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="rg-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="rg-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // falcons — sessions riding updrafts
    const falcons = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 9 - (s.tps || 0) / 16);
      const y = GY - 30 - (i % 3) * 18;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#8a7a8a");
      // updraft flight — soar, dip, soar
      return `<g class="rg-falcon${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${-24} ${y + 20} Q ${W * .3} ${y - 20} ${W * .7} ${y + 15} T ${W + 24} ${y - 10}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.5}" ry="${size * .6}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="0" rx="${size * .4}" ry="${size * .3}" fill="${col}"/>
        <line x1="${-size * 1.3}" y1="0" x2="${-size * 2.2}" y2="${-size * .9}" stroke="${col}" stroke-width=".8"/>
        <line x1="${size * 1.3}" y1="0" x2="${size * 2.2}" y2="${-size * .9}" stroke="${col}" stroke-width=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="rg-wrap">
        <div class="rg-head"><b>RIDGE</b><span>山脊=配额窗 峰高=用量 隼=会话${hotN ? " · " + hotN + " 绯红" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="url(#rg-sky)" rx="10"/>
          ${sky}${moon}${mist}${spurs}${falcons}
          <g class="rg-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="rg-k">${fmt(k.tokens)} · ${sessions.length} 隼</text>
            <text x="22" y="45" class="rg-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "山脊", eyebrow: "RIDGE", render };
})();
