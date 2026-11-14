/* ------------------------------------------------------------------ abyss
 * Abyss — deep sea hydrothermal vents: every quota window is a
 * chimney whose smoke-plume height = used % (≥85% the vent glows
 * magma-orange); sessions are anglerfish circling the vents.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "abyss";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(55667788);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 252;

    // black water gradient
    const water = `<defs><linearGradient id="ab-w" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a1218"/><stop offset="100%" stop-color="#050a0d"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ab-w)" rx="10"/>`;
    // seabed
    const seabed = `<path d="M 0 ${GY} L 0 ${GY - 8} L 80 ${GY - 14} L 180 ${GY - 6} L 260 ${GY - 18} L 340 ${GY - 10} L 400 ${GY - 15} L 400 ${GY} Z" fill="#1a1418" opacity=".9"/>`;
    // bioluminescent specks
    let specks = "";
    for (let i = 0; i < 20; i++) {
      specks += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(30 + rnd() * (GY - 40)).toFixed(1)}" r="${(rnd() * 1.2 + .3).toFixed(1)}" fill="#4a8a8a" opacity="${(.05 + rnd() * .15).toFixed(2)}">
        <animate attributeName="opacity" values="${(.05 + rnd() * .15).toFixed(2)};${(.02 + rnd() * .05).toFixed(2)}" dur="${(2 + rnd() * 3).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
    }

    // vents — smoke plume height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const vents = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#888888";
      const vh = 18 + f * 60;
      const vw = 10 + f * 16;
      const tipY = GY - vh;
      // chimney — tapered column with rings
      const body = `<path d="M ${cx - vw / 2} ${GY} L ${cx - vw * .3} ${tipY} L ${cx + vw * .3} ${tipY} L ${cx + vw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 40%, #1a1418)"/>`;
      const rings = `<line x1="${cx - vw * .35}" y1="${GY - vh * .3}" x2="${cx + vw * .35}" y2="${GY - vh * .3}" stroke="${col}" stroke-width="1.5" opacity=".5"/>
        <line x1="${cx - vw * .32}" y1="${GY - vh * .55}" x2="${cx + vw * .32}" y2="${GY - vh * .55}" stroke="${col}" stroke-width="1.2" opacity=".4"/>
        <line x1="${cx - vw * .28}" y1="${GY - vh * .78}" x2="${cx + vw * .28}" y2="${GY - vh * .78}" stroke="${col}" stroke-width="1" opacity=".3"/>`;
      // smoke plume — bubbles rising from tip
      let smoke = "";
      const puffCount = 2 + Math.floor(f * 3);
      for (let p = 0; p < puffCount; p++) {
        const px = cx + (rnd() - .5) * vw * .4;
        const py = tipY - 8 - p * 14;
        const pr = 2.5 + rnd() * 3.5;
        const prise = 20 + rnd() * 30;
        smoke += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${pr.toFixed(1)}" fill="${hot ? "var(--amber)" : col}" opacity="${(.15 + rnd() * .1).toFixed(2)}">
          <animate attributeName="cy" values="${py.toFixed(1)};${(py - prise).toFixed(1)}" dur="${(2.5 + rnd() * 1.5).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="r" values="${pr.toFixed(1)};${(pr * 1.5).toFixed(1)}" dur="${(2.5 + rnd() * 1.5).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="${(.15 + rnd() * .1).toFixed(2)};0" dur="${(2.5 + rnd() * 1.5).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
      }
      // magma glow at base
      const glow = hot ? `<ellipse cx="${cx}" cy="${GY}" rx="${vw * .6}" ry="4" fill="var(--amber)" opacity=".5">
        <animate attributeName="rx" values="${vw * .6};${vw * .9}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.2" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="ab-vent${hot ? " hot" : ""}">
        ${body}${rings}${smoke}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="ab-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="ab-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // anglerfish — sessions circling the vents
    const fish = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 14 - (s.tps || 0) / 12);
      const y = GY - 20 - (i % 3) * 18;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#4a8a9a");
      const cx2 = W / 2 + (rnd() - .5) * 80;
      const cy2 = y;
      const rx2 = 50 + rnd() * 70;
      const ry2 = 12 + rnd() * 12;
      // anglerfish body + light
      return `<g class="ab-fish${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${cy2} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${cy2}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.6}" ry="${size * .7}" fill="${col}"/>
        <ellipse cx="${size * 1.1}" cy="${-size * .1}" rx="${size * .4}" ry="${size * .35}" fill="${col}"/>
        <circle cx="${size * 1.3}" cy="${-size * .4}" r="${size * .15}" fill="${col}"/>
        <line x1="${size * 1.1}" y1="${-size * .2}" x2="${size * 1.4}" y2="${-size * 1.1}" stroke="${col}" stroke-width=".6"/>
        <circle cx="${size * 1.45}" cy="${-size * 1.15}" r="${size * .18}" fill="${col}" opacity=".9">
          <animate attributeName="r" values="${size * .18};${size * .35}" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".9;0" dur="2s" repeatCount="indefinite"/></circle>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ab-wrap">
        <div class="ab-head"><b>ABYSS</b><span>热泉口=配额窗 烟柱=用量 鱼=会话${hotN ? " · " + hotN + " 岩浆" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${water}${seabed}${specks}${vents}${fish}
          <g class="ab-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ab-k">${fmt(k.tokens)} · ${sessions.length} 鱼</text>
            <text x="22" y="45" class="ab-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "深渊", eyebrow: "ABYSS", render };
})();
