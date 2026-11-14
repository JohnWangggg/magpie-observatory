/* ------------------------------------------------------------------- geyser
 * Geyser field — steaming vents on mineral terraces: every quota
 * window is a geyser whose eruption column height = used % (≥85%
 * the column flashes red-hot); sessions are tourists with cameras
 * lining the boardwalk.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "geyser";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(51509173);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 246;
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;

    // mineral terraces
    let terr = "";
    for (let i = 0; i < 3; i++) {
      const ty = GY - 4 - i * 7;
      const tw = W - 30 - i * 30;
      terr += `<ellipse cx="${(35 + i * 14).toFixed(1)}" cy="${ty}" rx="${(tw / 2).toFixed(1)}" ry="5" fill="none" stroke="color-mix(in srgb, var(--accent) ${20 + i * 10}%, transparent)" stroke-width="1.2" opacity="${(.5 - i * .12).toFixed(2)}"/>`;
    }

    // steam wisps drifting from vents
    let steam = "";
    for (let i = 0; i < 5; i++) {
      steam += `<ellipse cx="${(60 + i * 70 + rnd() * 20).toFixed(1)}" cy="${(GY - 10 - rnd() * 30).toFixed(1)}" rx="${(8 + rnd() * 10).toFixed(1)}" ry="${(3 + rnd() * 4).toFixed(1)}" fill="#d8e0e8" opacity="${(.14 + rnd() * .12).toFixed(2)}">
        <animate attributeName="cy" values="${(GY - 14).toFixed(1)};${(GY - 60 - rnd() * 30).toFixed(1)}" dur="${(5 + rnd() * 4).toFixed(1)}s" begin="${(-rnd() * 4).toFixed(1)}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".2;.05;.2" dur="${(4 + rnd() * 3).toFixed(1)}s" repeatCount="indefinite"/></ellipse>`;
    }

    // geysers — eruption column = used %
    const geysers = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#5a9ab8";
      const eh = 30 + f * 150;
      const ew = 10 + f * 16;
      const tipY = GY - eh;
      // eruption column — layered plumes
      const plume = `<path d="M ${cx - ew * .5} ${GY} Q ${cx - ew} ${GY - eh * .45} ${cx} ${tipY} Q ${cx + ew} ${GY - eh * .45} ${cx + ew * .5} ${GY} Z" fill="${hot ? "color-mix(in srgb, var(--red) 50%, " + col + ")" : col}" opacity="${(.55 + f * .3).toFixed(2)}">
        <animate attributeName="d" values="M ${cx - ew * .5} ${GY} Q ${cx - ew} ${GY - eh * .45} ${cx} ${tipY} Q ${cx + ew} ${GY - eh * .45} ${cx + ew * .5} ${GY} Z;M ${cx - ew * .5} ${GY} Q ${cx - ew * .6} ${GY - eh * .5} ${cx} ${tipY - 6} Q ${cx + ew * .6} ${GY - eh * .5} ${cx + ew * .5} ${GY} Z;M ${cx - ew * .5} ${GY} Q ${cx - ew} ${GY - eh * .45} ${cx} ${tipY} Q ${cx + ew} ${GY - eh * .45} ${cx + ew * .5} ${GY} Z" dur="${(1.4 + f).toFixed(1)}s" repeatCount="indefinite"/></path>`;
      // spray particles at tip
      const spray = Math.round(2 + f * 4);
      let sparks = "";
      for (let s = 0; s < spray; s++) {
        const sx = cx + (rnd() - .5) * ew * 1.6;
        const sdur = .5 + rnd() * .6;
        sparks += `<circle cx="${sx.toFixed(1)}" cy="${(tipY + rnd() * 10).toFixed(1)}" r="${(1 + rnd() * 1.4).toFixed(1)}" fill="${hot ? "var(--red)" : "#d8e8f0"}" opacity="${(.5 + rnd() * .4).toFixed(2)}">
          <animate attributeName="cy" values="${(tipY).toFixed(1)};${(tipY - 14 - rnd() * 12).toFixed(1)}" dur="${sdur.toFixed(1)}s" begin="${(-rnd() * sdur).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="cx" values="${sx.toFixed(1)};${(sx + (rnd() - .5) * 12).toFixed(1)}" dur="${sdur.toFixed(1)}s" begin="${(-rnd() * sdur).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
      }
      // vent — mineral pool at base
      const vent = `<ellipse cx="${cx}" cy="${GY}" rx="${(10 + f * 6).toFixed(1)}" ry="4" fill="color-mix(in srgb, ${col} 40%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1.2"/>
        <ellipse cx="${cx}" cy="${GY}" rx="${(4 + f * 3).toFixed(1)}" ry="1.8" fill="${hot ? "var(--red)" : "#d8e8f0"}" opacity=".8"/>`;
      return `<g class="gy-geyser${hot ? " hot" : ""}">
        ${plume}${sparks}${vent}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="gy-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="gy-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // boardwalk at bottom
    const bw = `<rect x="30" y="${GY + 40}" width="${W - 60}" height="3" rx="1.5" fill="#8a6a4a" opacity=".8"/>
      <rect x="30" y="${GY + 40}" width="${W - 60}" height="1" rx=".5" fill="#5a4a3a" opacity=".9"/>`;

    // tourists — sessions on the boardwalk with cameras
    const tourists = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const tx = 50 + i * ((W - 100) / Math.max(1, sessions.length - 1));
      const ty = GY + 32;
      const size = 3.5 + Math.min(2.5, (s.tokens || 0) / 80000);
      const sway = `<animateTransform attributeName="transform" type="translate" values="0 0;${(rnd() - .5) * 4} ${(rnd() - .5) * 1.5};0 0" dur="${(1.8 + rnd()).toFixed(1)}s" repeatCount="indefinite"/>`;
      return `<g class="gy-tourist${dead ? " dead" : ""}" transform="translate(${tx.toFixed(1)} ${ty})">
        ${sway}
        <circle cx="0" cy="${-size * 2.2}" r="${size * .75}" fill="${dead ? "var(--red)" : m.color || "#d8b088"}"/>
        <rect x="${-size * .6}" y="${-size * 1.6}" width="${size * 1.2}" height="${size * 1.8}" rx="${size * .3}" fill="${dead ? "var(--red)" : m.color || "#4a6a8a"}"/>
        <rect x="${-size * .45}" y="${-size * 2}" width="${size * .9}" height="${size * .5}" rx="${size * .15}" fill="#2a2a2a"/>
        <circle cx="0" cy="${-size * 1.75}" r="${size * .28}" fill="#d8e8f0"/>
        <line x1="${-size * .5}" y1="${size * .2}" x2="${-size * .7}" y2="${size * 1.6}" stroke="#3a3a3a" stroke-width="1.2"/>
        <line x1="${size * .5}" y1="${size * .2}" x2="${size * .7}" y2="${size * 1.6}" stroke="#3a3a3a" stroke-width="1.2"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gy-wrap">
        <div class="gy-head"><b>GEYSER FIELD</b><span>泉=配额窗 柱=用量 游客=会话${hotN ? " · " + hotN + " 喷发" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1c1c20 48%, transparent)" rx="10"/>
          <rect x="14" y="${GY}" width="${W - 28}" height="3" rx="1.5" fill="#c8a86a" opacity=".4"/>
          ${terr}${steam}${geysers}${bw}${tourists}
          <g class="gy-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="gy-k">${fmt(k.tokens)} · ${sessions.length} 客</text>
            <text x="22" y="45" class="gy-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "间歇泉", eyebrow: "GEYSER", render };
})();
