/* ------------------------------------------------------------------ creek
 * Creek — a cold mountain run over smooth stones: every quota
 * window is a boulder whose height = used % (≥85% the stone
 * warms amber); sessions are salmon flicking upstream.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "creek";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(33445566);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 232, SY = 244;

    // forested bank silhouette
    const bank = `<path d="M 0 ${GY} L 0 ${GY - 40} L 60 ${GY - 55} L 140 ${GY - 35} L 220 ${GY - 60} L 310 ${GY - 40} L 400 ${GY - 50} L 400 ${GY} Z" fill="color-mix(in srgb, #1a2818 70%, var(--card-2))" opacity=".85"/>`;
    // creek water
    const water = `<rect x="0" y="${SY}" width="${W}" height="${H - SY}" fill="color-mix(in srgb, #1a3038 75%, var(--card-2))"/>`;
    // current swirl
    let swirl = "";
    for (let i = 0; i < 8; i++) {
      swirl += `<path d="M ${20 + i * 48} ${SY + 8 + rnd() * 30} Q ${40 + i * 48} ${SY + 4 + rnd() * 30} ${60 + i * 48} ${SY + 10 + rnd() * 30}" stroke="#4a6a70" stroke-width=".7" fill="none" opacity="${(.1 + rnd() * .16).toFixed(2)}">
        <animateTransform attributeName="transform" type="translate" values="0 0;${(rnd() - .5) * 8} 0;0 0" dur="${(3 + i * .4).toFixed(1)}s" repeatCount="indefinite"/></path>`;
    }
    // pebbles on the creek bed
    let pebbles = "";
    for (let i = 0; i < 14; i++) {
      pebbles += `<ellipse cx="${(15 + rnd() * (W - 30)).toFixed(1)}" cy="${(SY + 5 + rnd() * 40).toFixed(1)}" rx="${(3 + rnd() * 6).toFixed(1)}" ry="${(1.5 + rnd() * 2.5).toFixed(1)}" fill="#3a4a48" opacity="${(.2 + rnd() * .3).toFixed(2)}"/>`;
    }

    // boulders — stone height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const boulders = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#6a6a5a";
      const bh = 15 + f * 40;
      const bw = 12 + f * 22;
      const tipY = GY - bh;
      // boulder body — rounded stone
      const body = `<path d="M ${cx - bw / 2} ${GY} Q ${cx - bw * .45} ${GY - bh * .7} ${cx} ${tipY} Q ${cx + bw * .45} ${GY - bh * .7} ${cx + bw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 55%, #28241c)"/>`;
      // wet top highlight
      const top = `<ellipse cx="${cx}" cy="${tipY + 3}" rx="${bw * .35}" ry="${bh * .12}" fill="${hot ? "color-mix(in srgb, var(--amber) 55%, #c8c0a0)" : "#c8c0a0"}" opacity="${(.6 + f * .3).toFixed(2)}"/>`;
      // moss on the stone
      const moss = `<ellipse cx="${cx - bw * .15}" cy="${GY - bh * .2}" rx="${bw * .2}" ry="${bh * .08}" fill="#3a5a3a" opacity=".5"/>
        <ellipse cx="${cx + bw * .18}" cy="${GY - bh * .35}" rx="${bw * .15}" ry="${bh * .06}" fill="#3a5a3a" opacity=".4"/>`;
      // hot amber flash
      const flash = hot ? `<ellipse cx="${cx}" cy="${tipY}" rx="${bw * .45}" ry="${bh * .15}" fill="none" stroke="var(--amber)" stroke-width="1" opacity=".5">
        <animate attributeName="rx" values="${bw * .45};${bw * .7}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="${bh * .15};${bh * .22}" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;0" dur="1.8s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="cr-rock${hot ? " hot" : ""}">
        ${body}${top}${moss}${flash}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="cr-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="cr-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // salmon — sessions flicking upstream
    const salmon = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 11 - (s.tps || 0) / 15);
      const y = SY + 10 + (i % 2) * 10;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#d88a6a");
      // upstream — right-to-left
      return `<g class="cr-fish${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${W + 24} ${y};${-24} ${(y - 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.5}" ry="${size * .8}" fill="${col}"/>
        <path d="M ${-size * 1.2} 0 L ${-size * 2} ${-size * .7} L ${-size * 2} ${size * .7} Z" fill="${col}"/>
        <circle cx="${size * .8}" cy="${-size * .3}" r="${size * .25}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cr-wrap">
        <div class="cr-head"><b>CREEK</b><span>溪石=配额窗 高=用量 鲑=会话${hotN ? " · " + hotN + " 暖石" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #121a14 60%, transparent)" rx="10"/>
          ${bank}${water}${swirl}${pebbles}${boulders}${salmon}
          <g class="cr-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="cr-k">${fmt(k.tokens)} · ${sessions.length} 鲑</text>
            <text x="22" y="45" class="cr-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "溪流", eyebrow: "CREEK", render };
})();
