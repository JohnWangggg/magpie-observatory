/* ------------------------------------------------------------------ shoal
 * Shoal — a sunlit coral flat: every quota window is a sand
 * bar whose size = used % (≥85% the bar flashes amber);
 * sessions are dolphins riding the shallow current.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "shoal";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(66778899);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 234;

    // turquoise water
    const water = `<defs><linearGradient id="sh-w" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3a8a8a"/><stop offset="100%" stop-color="#1a5a6a"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#sh-w)" rx="10"/>`;
    // sun rays
    let rays = "";
    for (let i = 0; i < 6; i++) {
      rays += `<line x1="${(W / 2 + (i - 2.5) * 30).toFixed(1)}" y1="0" x2="${(W / 2 + (i - 2.5) * 40).toFixed(1)}" y2="${GY}" stroke="#e8d8a0" stroke-width="1.5" opacity="${(.08 + rnd() * .08).toFixed(2)}"/>`;
    }
    // seabed
    const seabed = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #3a5a50 70%, var(--card-2))"/>`;
    // sand ripples
    let ripples = "";
    for (let i = 0; i < 8; i++) {
      ripples += `<path d="M ${i * 52} ${GY + 10} Q ${i * 52 + 25} ${GY + 14} ${i * 52 + 50} ${GY + 10}" stroke="#5a8a7a" stroke-width=".8" fill="none" opacity=".2"/>`;
    }
    // bubbles
    let bubbles = "";
    for (let i = 0; i < 12; i++) {
      bubbles += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(GY - 10 - rnd() * 40).toFixed(1)}" r="${(1 + rnd() * 2).toFixed(1)}" fill="#a8d8d8" opacity="${(.15 + rnd() * .15).toFixed(2)}"/>`;
    }

    // sand bars — size = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const bars = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a7a5a";
      const bw = 15 + f * 35;
      const bh = 8 + f * 18;
      const by = GY - bh * .4;
      // sand bar — elongated dune
      const body = `<ellipse cx="${cx}" cy="${by}" rx="${bw}" ry="${bh}" fill="color-mix(in srgb, ${col} 55%, #5a7a6a)"/>`;
      // water ripple on top
      const ripple = `<path d="M ${cx - bw * .6} ${by - 3} Q ${cx} ${by - 8} ${cx + bw * .6} ${by - 3}" stroke="#6a9a8a" stroke-width="1" fill="none" opacity=".4"/>`;
      // hot amber flash
      const flash = hot ? `<ellipse cx="${cx}" cy="${by}" rx="${bw * .4}" ry="${bh * .5}" fill="var(--amber)" opacity=".5">
        <animate attributeName="rx" values="${bw * .4};${bw * .7}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.15" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="sh-bar${hot ? " hot" : ""}">
        ${body}${ripple}${flash}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="sh-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="sh-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // dolphins — riding the current
    const dolphins = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 11 - (s.tps || 0) / 14);
      const y = GY - 25 - (i % 3) * 12;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#5a7a8a");
      return `<g class="sh-dolphin${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-30} ${y};${W + 30} ${(y - 8).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <path d="M ${-size * 1.5} 0 Q ${-size * .8} ${-size * .8} ${size * .5} ${-size * .4} Q ${size * 1.2} 0 ${size * 1.5} ${size * .5}" stroke="${col}" stroke-width="${size * .8}" fill="none" stroke-linecap="round"/>
        <ellipse cx="${size * .8}" cy="${-size * .3}" rx="${size * .25}" ry="${size * .2}" fill="${col}"/>
        <ellipse cx="${-size * .5}" cy="${size * .2}" rx="${size * .15}" ry="${size * .1}" fill="${col}" opacity=".6"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sh-wrap">
        <div class="sh-head"><b>SHOAL</b><span>沙洲=配额窗 大=用量 海豚=会话${hotN ? " · " + hotN + " 闪洲" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${water}${rays}${seabed}${ripples}${bubbles}${bars}${dolphins}
          <g class="sh-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="sh-k">${fmt(k.tokens)} · ${sessions.length} 豚</text>
            <text x="22" y="45" class="sh-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "浅滩", eyebrow: "SHOAL", render };
})();
