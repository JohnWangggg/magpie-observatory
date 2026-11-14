/* ---------------------------------------------------------------- plateau
 * Plateau — wind-scoured mesas under a thin sky: every quota window
 * is a tableland whose rim height = used % (≥85% the rim burns
 * amber); sessions are eagles circling the thermals.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "plateau";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(22334455);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 242;

    // thin sky — sparse cirrus
    let cirrus = "";
    for (let i = 0; i < 3; i++) {
      cirrus += `<path d="M ${30 + i * 120} ${40 + i * 20} Q ${80 + i * 120} ${30 + i * 20} ${140 + i * 120} ${45 + i * 20} T ${200 + i * 60} ${38 + i * 20}" stroke="#8aa8b8" stroke-width=".8" fill="none" opacity="${(.1 + rnd() * .1).toFixed(2)}"/>`;
    }
    // wind streaks
    let wind = "";
    for (let i = 0; i < 4; i++) {
      wind += `<line x1="${20 + rnd() * 300}" y1="${GY - 20 - rnd() * 40}" x2="${80 + rnd() * 300}" y2="${GY - 25 - rnd() * 40}" stroke="#c8b898" stroke-width=".5" opacity="${(.08 + rnd() * .12).toFixed(2)}">
        <animate attributeName="x1" values="${20 + rnd() * 300};${40 + rnd() * 300}" dur="${(4 + i).toFixed(1)}s" repeatCount="indefinite"/>
        <animate attributeName="x2" values="${80 + rnd() * 300};${100 + rnd() * 300}" dur="${(4 + i).toFixed(1)}s" repeatCount="indefinite"/></line>`;
    }
    // talus skirt
    let talus = "";
    for (let i = 0; i < 12; i++) {
      talus += `<ellipse cx="${(20 + rnd() * (W - 40)).toFixed(1)}" cy="${(GY + 8 + rnd() * 40).toFixed(1)}" rx="${(4 + rnd() * 8).toFixed(1)}" ry="${(1.5 + rnd() * 2.5).toFixed(1)}" fill="#6a5a4a" opacity="${(.15 + rnd() * .25).toFixed(2)}"/>`;
    }

    // mesas — rim height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const mesas = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#a07858";
      const mh = 30 + f * 90;
      const mw = 14 + f * 24;
      const rimY = GY - mh;
      // mesa body — flat top, steep sides
      const body = `<path d="M ${cx - mw / 2} ${GY} L ${cx - mw * .42} ${rimY} L ${cx + mw * .42} ${rimY} L ${cx + mw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 50%, #2a2018)"/>`;
      // rim cap
      const rim = `<rect x="${cx - mw * .42}" y="${rimY - 2}" width="${mw * .84}" height="4" rx="1.5" fill="${hot ? "color-mix(in srgb, var(--amber) 60%, #c8b090)" : "#c8b090"}" opacity="${(.7 + f * .25).toFixed(2)}"/>`;
      // scree lines
      const scree = `<path d="M ${cx - mw * .3} ${GY - mh * .2} L ${cx - mw * .1} ${GY - mh * .45}" stroke="#4a3a2a" stroke-width=".6" opacity=".35"/>
        <path d="M ${cx + mw * .3} ${GY - mh * .2} L ${cx + mw * .1} ${GY - mh * .45}" stroke="#4a3a2a" stroke-width=".6" opacity=".35"/>`;
      // hot rim pulse
      const ring = hot ? `<ellipse cx="${cx}" cy="${rimY}" rx="${(mw * .5).toFixed(1)}" ry="${(mw * .18).toFixed(1)}" fill="none" stroke="var(--amber)" stroke-width="1" opacity=".6">
        <animate attributeName="rx" values="${(mw * .5).toFixed(1)};${(mw * .75).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="${(mw * .18).toFixed(1)};${(mw * .27).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;0" dur="1.8s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="pl-mesa${hot ? " hot" : ""}">
        ${body}${rim}${scree}${ring}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="pl-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="pl-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // eagles — sessions circling thermals
    const eagles = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 11 - (s.tps || 0) / 14);
      const y = GY - 20 - (i % 3) * 15;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#b09070");
      // elliptical flight path
      const cx2 = W / 2 + (rnd() - .5) * 60;
      const cy2 = y;
      const rx2 = 40 + rnd() * 60;
      const ry2 = 6 + rnd() * 8;
      return `<g class="pl-eagle${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${cy2}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .6}" fill="${col}"/>
        <ellipse cx="${size * .8}" cy="0" rx="${size * .4}" ry="${size * .3}" fill="${col}"/>
        <line x1="${-size * 1.2}" y1="0" x2="${-size * 2}" y2="${-size * .8}" stroke="${col}" stroke-width=".8"/>
        <line x1="${size * 1.2}" y1="0" x2="${size * 2}" y2="${-size * .8}" stroke="${col}" stroke-width=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="pl-wrap">
        <div class="pl-head"><b>PLATEAU</b><span>台原=配额窗 缘高=用量 鹰=会话${hotN ? " · " + hotN + " 琥珀缘" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #14181c 65%, transparent)" rx="10"/>
          ${cirrus}${wind}${talus}${mesas}${eagles}
          <g class="pl-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="pl-k">${fmt(k.tokens)} · ${sessions.length} 鹰</text>
            <text x="22" y="45" class="pl-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "台原", eyebrow: "PLATEAU", render };
})();
