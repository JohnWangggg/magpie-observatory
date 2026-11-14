/* ------------------------------------------------------------------- meteor
 * Meteor shower over a mountain ridge: every quota window is a
 * recurring meteor whose tail length & trail brightness = used %
 * (≥85% the meteor burns red); sessions are satellites gliding
 * the same sky on fixed orbits.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "meteor";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(99182743);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 262;

    // starfield
    let stars = "";
    for (let i = 0; i < 34; i++) {
      const sx = 20 + rnd() * (W - 40);
      const sy = 16 + rnd() * (GY - 40);
      const sr = .5 + rnd() * 1.4;
      stars += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${sr.toFixed(1)}" fill="#dfe8f8" opacity="${(.15 + rnd() * .55).toFixed(2)}">
        ${rnd() < .35 ? `<animate attributeName="opacity" values="${(.15 + rnd() * .5).toFixed(2)};.05;${(.15 + rnd() * .5).toFixed(2)}" dur="${(2 + rnd() * 4).toFixed(1)}s" repeatCount="indefinite"/>` : ""}
      </circle>`;
    }
    // milky way band
    stars += `<path d="M 40 240 Q 140 160 200 130 T 380 30" stroke="#8a9ac8" stroke-width="36" fill="none" opacity=".05" stroke-linecap="round"/>`;

    // ridge silhouette
    const ridge = `<path d="M 0 ${GY} L 60 ${GY - 30} L 110 ${GY - 8} L 165 ${GY - 44} L 230 ${GY - 18} L 290 ${GY - 38} L 350 ${GY - 12} L 400 ${GY - 28} L 400 300 L 0 300 Z" fill="color-mix(in srgb, #14181f 85%, var(--card-2))"/>`;

    const meteors = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#a8c8f0";
      const tail = 40 + f * 140;
      const sx = 60 + i * ((W - 120) / Math.max(1, quotas.length - 1));
      const sy = 30 + rnd() * 60;
      const angle = -28 - rnd() * 14;
      const dur = Math.max(1.6, 5.5 - f * 2.5) + rnd() * 2;
      const delay = -rnd() * dur;
      const rad = angle * Math.PI / 180;
      const dx = Math.cos(rad), dy = Math.sin(rad);
      const ex = sx + dx * tail, ey = sy + dy * tail;
      const glow = hot ? `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(5 + f * 5).toFixed(1)}" fill="var(--red)" opacity=".35">
        <animate attributeName="r" values="${(5 + f * 5).toFixed(1)};${(8 + f * 6).toFixed(1)};${(5 + f * 5).toFixed(1)}" dur="${(dur * .4).toFixed(1)}s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="mt-meteor${hot ? " hot" : ""}">
        <defs><linearGradient id="mt-g-${i}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${hot ? "var(--red)" : col}" stop-opacity=".9"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
        <line x1="${ex.toFixed(1)}" y1="${ey.toFixed(1)}" x2="${sx.toFixed(1)}" y2="${sy.toFixed(1)}" stroke="url(#mt-g-${i})" stroke-width="${(1 + f * 1.8).toFixed(1)}" stroke-linecap="round">
          <animate attributeName="x1" values="${(ex - 20).toFixed(1)};${(ex).toFixed(1)}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
          <animate attributeName="y1" values="${(ey - 20 * Math.tan(rad)).toFixed(1)};${(ey).toFixed(1)}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
          <animate attributeName="x2" values="${(sx - 20).toFixed(1)};${(sx).toFixed(1)}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="${(sy - 20 * Math.tan(rad)).toFixed(1)};${(sy).toFixed(1)}" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0;1;0" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
        </line>
        ${glow}
        <circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(2 + f * 2).toFixed(1)}" fill="${hot ? "var(--red)" : "#f0f4ff"}">
          <animate attributeName="opacity" values="0;1;0" dur="${dur}s" begin="${delay}s" repeatCount="indefinite"/>
        </circle>
        <text x="${sx.toFixed(1)}" y="${GY - 6}" class="mt-pct" text-anchor="middle" opacity="${(.4 + f * .5).toFixed(2)}">${Math.round(w.used)}%</text>
        <text x="${sx.toFixed(1)}" y="${GY + 6}" class="mt-name" text-anchor="middle" opacity=".5">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // satellites — sessions on fixed orbits
    const sats = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const cy = 60 + i * 44 + rnd() * 16;
      const rx = 60 + i * 40;
      const ry = 12 + rnd() * 8;
      const dur = Math.max(10, 22 - (s.tps || 0) / 8);
      const size = 2.5 + Math.min(2.5, (s.tokens || 0) / 90000);
      return `<g class="mt-sat${dead ? " dead" : ""}">
        <path id="mt-orbit-${i}" d="M ${200 - rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0" fill="none" stroke="color-mix(in srgb, ${m.color || "#a8c8f0"} 30%, transparent)" stroke-width=".6" stroke-dasharray="2 3"/>
        <g>
          <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"><mpath href="#mt-orbit-${i}"/></animateMotion>
          <rect x="${-size * 1.6}" y="${-size * .5}" width="${size * 1.2}" height="${size}" rx=".6" fill="${dead ? "var(--red)" : m.color || "#c8d8f0"}"/>
          <rect x="${size * .6}" y="${-size * .5}" width="${size * 1.6}" height="${size}" rx=".6" fill="${dead ? "var(--red)" : m.color || "#c8d8f0"}"/>
          <circle cx="0" cy="0" r="${size * .5}" fill="${dead ? "var(--red)" : "#f0f4ff"}"/>
        </g>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mt-wrap">
        <div class="mt-head"><b>METEOR SHOWER</b><span>雨=配额窗 尾=用量 卫=会话${hotN ? " · " + hotN + " 赤焰" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #0a0d18 56%, transparent)" rx="10"/>
          ${stars}${ridge}${meteors}${sats}
          <g class="mt-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="mt-k">${fmt(k.tokens)} · ${sessions.length} 卫</text>
            <text x="22" y="45" class="mt-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "流星雨", eyebrow: "METEOR", render };
})();
