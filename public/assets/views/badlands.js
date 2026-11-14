/* ----------------------------------------------------------------- badlands
 * Badlands — striped hoodoos under a hard sun: every quota window is
 * a hoodoo whose band height = used % (≥85% the capstone bleaches
 * white-hot); sessions are bighorn sheep traversing the ridges.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "badlands";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(88776655);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 246;

    // hard sun + heat shimmer
    const sun = `<circle cx="330" cy="44" r="20" fill="#f0d0a0" opacity=".9"/>
      <circle cx="330" cy="44" r="30" fill="#f0d0a0" opacity=".15">
        <animate attributeName="r" values="30;36;30" dur="3s" repeatCount="indefinite"/></circle>`;
    let shimmer = "";
    for (let i = 0; i < 3; i++) {
      shimmer += `<rect x="${60 + i * 120}" y="${180 + i * 14}" width="${60 + i * 20}" height="2" rx="1" fill="#e8c8a0" opacity="${.08 + i * .04}">
        <animateTransform attributeName="transform" type="translate" values="0 0;${(i % 2 ? -4 : 4)} 0;0 0" dur="${(2 + i).toFixed(1)}s" repeatCount="indefinite"/></rect>`;
    }

    // scree floor
    const floor = `<path d="M 0 ${GY} L 400 ${GY} L 400 300 L 0 300 Z" fill="color-mix(in srgb, #2a1e14 78%, var(--card-2))"/>`;
    let scree = "";
    for (let i = 0; i < 14; i++) {
      scree += `<ellipse cx="${(20 + rnd() * (W - 40)).toFixed(1)}" cy="${(GY + 4 + rnd() * 40).toFixed(1)}" rx="${(2 + rnd() * 4).toFixed(1)}" ry="${(1 + rnd() * 1.4).toFixed(1)}" fill="#8a6a4a" opacity="${(.2 + rnd() * .3).toFixed(2)}"/>`;
    }

    // hoodoos — banded towers, height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const hoodoos = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#a8764a";
      const th = 40 + f * 120;
      const tw = 12 + f * 16;
      const tipY = GY - th;
      // banded body — alternating strata
      const bands = Math.round(3 + f * 5);
      let body = "";
      for (let b = 0; b < bands; b++) {
        const t = b / Math.max(1, bands - 1);
        const y0 = GY - t * (th - 16);
        const y1 = y0 - (th - 16) / bands;
        const bw = tw * (1 - t * .35) + Math.sin(b * 2.3) * 2;
        const shade = b % 2 ? .75 : 1;
        body += `<path d="M ${cx - bw} ${y0} L ${cx - bw * .9} ${y1} L ${cx + bw * .9} ${y1} L ${cx + bw} ${y0} Z" fill="color-mix(in srgb, ${col} ${(50 + f * 30) * shade}%, #3a2a1a)"/>`;
      }
      // capstone — wide flat top
      const capW = tw * (1.1 + f * .3);
      const cap = `<path d="M ${cx - capW} ${tipY + 8} L ${cx - capW * .9} ${tipY} L ${cx + capW * .9} ${tipY} L ${cx + capW} ${tipY + 8} Z" fill="${hot ? "#f0e0d0" : "color-mix(in srgb, " + col + " 70%, #e8d0b0)"}"/>`;
      // glow when hot
      const glow = hot ? `<circle cx="${cx}" cy="${tipY}" r="${(6 + f * 4).toFixed(1)}" fill="#f0e0d0" opacity=".3">
        <animate attributeName="r" values="${(6 + f * 4).toFixed(1)};${(9 + f * 5).toFixed(1)};${(6 + f * 4).toFixed(1)}" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="bl-hoodoo${hot ? " hot" : ""}">
        ${body}${cap}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 16}" class="bl-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 27}" class="bl-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // bighorn sheep — sessions traversing ridges
    const sheep = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(7, 16 - (s.tps || 0) / 12);
      const y = GY - 8 - (i % 3) * 12;
      const size = 4 + Math.min(3, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#a88a5a");
      return `<g class="bl-sheep${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-24} ${y};${W + 24} ${(y + 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.6}" ry="${size * .9}" fill="${col}"/>
        <path d="M ${size * 1.3} ${-size * .3} L ${size * 2} ${-size * 1.3} L ${size * 2.4} ${-size * 1} L ${size * 1.9} 0 Z" fill="${col}"/>
        <circle cx="${size * 2.2}" cy="${-size * 1.1}" r="${size * .45}" fill="${col}"/>
        <path d="M ${size * 2.2} ${-size * 1.5} Q ${size * 2.6} ${-size * 2.2} ${size * 2.2} ${-size * 2.4} Q ${size * 1.9} ${-size * 2.2} ${size * 2} ${-size * 1.8}" stroke="#6a5a3a" stroke-width="1" fill="none"/>
        <line x1="${-size * .8}" y1="${size * .7}" x2="${-size * .8}" y2="${size * 1.7}" stroke="#6a5a3a" stroke-width="1.1"/>
        <line x1="${size * .8}" y1="${size * .7}" x2="${size * .8}" y2="${size * 1.7}" stroke="#6a5a3a" stroke-width="1.1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="bl-wrap">
        <div class="bl-head"><b>BADLANDS</b><span>柱=配额窗 高=用量 羊=会话${hotN ? " · " + hotN + " 白热" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1c1410 52%, transparent)" rx="10"/>
          ${sun}${shimmer}${floor}${scree}${hoodoos}${sheep}
          <g class="bl-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="bl-k">${fmt(k.tokens)} · ${sessions.length} 羊</text>
            <text x="22" y="45" class="bl-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "恶地", eyebrow: "BADLANDS", render };
})();
