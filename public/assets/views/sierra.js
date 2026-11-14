/* ------------------------------------------------------------------ sierra
 * Sierra — snow-capped ridges: every quota window is a peak whose
 * summit height = used % (≥85% the summit glows alpenglow pink);
 * sessions are mountain goats stepping the scree.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sierra";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(88990011);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 240;

    // distant haze — second ridge line
    const haze = `<path d="M 0 ${GY - 60} L 60 ${GY - 90} L 140 ${GY - 70} L 220 ${GY - 95} L 310 ${GY - 75} L 400 ${GY - 88} L 400 ${GY + 60} L 0 ${GY + 60} Z" fill="color-mix(in srgb, #2a3a4a 55%, transparent)" opacity=".6"/>`;
    // alpenglow on the sky
    const glow = `<defs><radialGradient id="si-glow" cx="50%" cy="30%" r="60%"><stop offset="0%" stop-color="#c88080" stop-opacity=".25"/><stop offset="100%" stop-color="#c88080" stop-opacity="0"/></radialGradient></defs>`;

    // peaks — summit height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;
    const peaks = quotas.map((w, i) => {
      const cx = 30 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#6a8a9a";
      const ph = 30 + f * 110;
      const pw = 16 + f * 28;
      const tipY = GY - ph;
      // peak body
      const body = `<path d="M ${cx - pw} ${GY} L ${cx} ${tipY} L ${cx + pw} ${GY} Z" fill="color-mix(in srgb, ${col} 45%, #1a2a38)"/>`;
      // snow cap — white summit, grows with f
      const snowH = ph * (.3 + f * .4);
      const snow = `<path d="M ${cx - pw * .55} ${GY - ph + snowH} L ${cx} ${tipY} L ${cx + pw * .55} ${GY - ph + snowH} Z" fill="${hot ? "color-mix(in srgb, var(--amber) 60%, #f0e8e8)" : "#f0e8e8"}" opacity="${(.8 + f * .15).toFixed(2)}"/>`;
      // alpenglow ring at summit when hot
      const ring = hot ? `<circle cx="${cx}" cy="${tipY}" r="${(3 + f * 2).toFixed(1)}" fill="none" stroke="var(--amber)" stroke-width="1" opacity=".7">
        <animate attributeName="r" values="${(3 + f * 2).toFixed(1)};${(8 + f * 3).toFixed(1)}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;0" dur="2s" repeatCount="indefinite"/></circle>` : "";
      // scree lines
      const scree = `<path d="M ${cx - pw * .7} ${GY - ph * .3} Q ${cx - pw * .3} ${GY - ph * .5} ${cx} ${GY - ph * .55}" stroke="#4a5a6a" stroke-width=".8" fill="none" opacity=".4"/>
        <path d="M ${cx + pw * .7} ${GY - ph * .3} Q ${cx + pw * .3} ${GY - ph * .5} ${cx} ${GY - ph * .55}" stroke="#4a5a6a" stroke-width=".8" fill="none" opacity=".4"/>`;
      return `<g class="si-peak${hot ? " hot" : ""}">
        ${body}${snow}${scree}${ring}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="si-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="si-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // goats — sessions on the scree
    const goats = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(7, 16 - (s.tps || 0) / 12);
      const y = GY - 6 - (i % 2) * 8;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#c8b8a0");
      return `<g class="si-goat${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y};${W + 20} ${(y + 8).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.3}" ry="${size * .9}" fill="${col}"/>
        <circle cx="${size * 1.1}" cy="${-size * .4}" r="${size * .45}" fill="${col}"/>
        <line x1="${size * 1.3}" y1="${-size * .6}" x2="${size * 1.8}" y2="${-size * 1.4}" stroke="${col}" stroke-width=".8"/>
        <line x1="${size * 1.5}" y1="${-size * .6}" x2="${size * 2.1}" y2="${-size * 1.3}" stroke="${col}" stroke-width=".8"/>
        <line x1="${-size * .8}" y1="${size * .5}" x2="${-size * .8}" y2="${size * 1.4}" stroke="${col}" stroke-width=".8"/>
        <line x1="${size * .6}" y1="${size * .5}" x2="${size * .6}" y2="${size * 1.4}" stroke="${col}" stroke-width=".8"/>
        <ellipse cx="${-size * 1.1}" cy="${-size * .1}" rx="${size * .3}" ry="${size * .25}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="si-wrap">
        <div class="si-head"><b>SIERRA</b><span>雪岭=配额窗 峰高=用量 山羊=会话${hotN ? " · " + hotN + " 峰尖" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #101820 60%, transparent)" rx="10"/>
          ${glow}${haze}${peaks}${goats}
          <g class="si-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="si-k">${fmt(k.tokens)} · ${sessions.length} 山羊</text>
            <text x="22" y="45" class="si-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "山岭", eyebrow: "SIERRA", render };
})();
