/* ---------------------------------------------------------------------- fen
 * Fen — cotton-grass pools in open bog: every quota window is a
 * cotton-grass tussock whose head height = used % (≥85% the heads
 * flush gold); sessions are dragonflies hawking between tussocks.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fen";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(77788899);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 232;

    // open bog pools
    let pools = "";
    for (let i = 0; i < 4; i++) {
      const px = 50 + i * 100 + rnd() * 20;
      pools += `<ellipse cx="${px.toFixed(1)}" cy="${(GY + 8 + rnd() * 24).toFixed(1)}" rx="${(20 + rnd() * 16).toFixed(1)}" ry="${(3 + rnd() * 3).toFixed(1)}" fill="color-mix(in srgb, #2a5a6a ${30 + rnd() * 20}%, transparent)" opacity=".7"/>`;
    }

    // peat bank
    const bank = `<path d="M 0 ${GY} Q 80 ${GY - 10} 160 ${GY - 4} T 400 ${GY - 6} L 400 300 L 0 300 Z" fill="color-mix(in srgb, #1a2418 70%, var(--card-2))"/>`;

    // tussocks — cotton-grass heads height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const tussocks = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#6a8a4a";
      const th = 24 + f * 72;
      const heads = Math.round(3 + f * 9);
      let tuft = "";
      for (let b = 0; b < heads; b++) {
        const bx = cx - gap * .3 + rnd() * gap * .6;
        const bh = th * (.4 + rnd() * .6);
        const sway = (rnd() - .5) * 8;
        // stem
        tuft += `<path d="M ${bx.toFixed(1)} ${GY} Q ${(bx + sway * .3).toFixed(1)} ${(GY - bh * .5).toFixed(1)} ${(bx + sway).toFixed(1)} ${(GY - bh).toFixed(1)}" stroke="${hot ? "#8a6a2a" : "#5a7a3a"}" stroke-width=".9" fill="none" opacity=".8"/>`;
        // cotton head — white puff, gold when hot
        const puff = `<circle cx="${(bx + sway).toFixed(1)}" cy="${(GY - bh).toFixed(1)}" r="${(1.5 + f * 1.8).toFixed(1)}" fill="${hot ? "var(--amber)" : "#e8f0e8"}" opacity="${(.7 + f * .25).toFixed(2)}">
          <animateTransform attributeName="transform" type="translate" values="0 0;${(rnd() - .5) * 3} ${(rnd() - .5) * 2};0 0" dur="${(2 + rnd() * 2).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
        tuft += puff;
      }
      return `<g class="fn-tussock${hot ? " hot" : ""}">
        <ellipse cx="${cx}" cy="${GY + 2}" rx="${(gap * .3).toFixed(1)}" ry="5" fill="color-mix(in srgb, #3a5a2a 55%, var(--card-2))"/>
        ${tuft}
        <text x="${cx.toFixed(1)}" y="${GY + 22}" class="fn-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 33}" class="fn-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // dragonflies — sessions hawking between tussocks
    const flies = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const fy = 80 + (i % 3) * 36 + rnd() * 14;
      const dur = Math.max(5, 12 - (s.tps || 0) / 14);
      const size = 3 + Math.min(3, (s.tokens || 0) / 70000);
      const col = dead ? "var(--red)" : (m.color || "#5a9ac8");
      // darting path
      const p1x = 40 + rnd() * 60, p1y = fy - 20 - rnd() * 20;
      const p2x = W - 40 - rnd() * 60, p2y = fy + 10 + rnd() * 20;
      return `<g class="fn-fly${dead ? " dead" : ""}">
        <path id="fn-path-${i}" d="M -30 ${fy} Q ${p1x} ${p1y} ${W / 2} ${fy} T ${W + 30} ${p2y}" fill="none"/>
        <g>
          <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"><mpath href="#fn-path-${i}"/></animateMotion>
          <ellipse cx="0" cy="0" rx="${size * 2.2}" ry="${size * .45}" fill="${col}" opacity=".85"/>
          <ellipse cx="${-size * .8}" cy="${-size * .6}" rx="${size * 1.1}" ry="${size * .35}" fill="#d8e8f0" opacity=".5"/>
          <ellipse cx="${size * .8}" cy="${-size * .6}" rx="${size * 1.1}" ry="${size * .35}" fill="#d8e8f0" opacity=".5"/>
          <circle cx="${size * 1.9}" cy="0" r="${size * .42}" fill="${col}"/>
        </g>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="fn-wrap">
        <div class="fn-head"><b>FEN</b><span>棉草=配额窗 高=用量 蜻=会话${hotN ? " · " + hotN + " 金穗" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #141a14 50%, transparent)" rx="10"/>
          ${bank}${pools}${tussocks}${flies}
          <g class="fn-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="fn-k">${fmt(k.tokens)} · ${sessions.length} 蜻</text>
            <text x="22" y="45" class="fn-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "泥沼", eyebrow: "FEN", render };
})();
