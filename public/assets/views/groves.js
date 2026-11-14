/* ------------------------------------------------------------------ groves
 * Groves — gnarled olive trees on a terraced hillside: every
 * quota window is a tree whose crown spread = used % (≥85% the
 * canopy burns amber); sessions are finches weaving through.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "groves";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11993355);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 243;

    // mediterranean sky
    const sky = `<defs><linearGradient id="gs-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d8e0e8"/><stop offset="100%" stop-color="#f0e8d8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#gs-s)" rx="10"/>`;
    // hill
    const hill = `<path d="M 0 ${GY} L 0 ${GY - 35} L 60 ${GY - 50} L 130 ${GY - 30} L 200 ${GY - 55} L 270 ${GY - 38} L 340 ${GY - 50} L 400 ${GY - 45} L 400 ${GY} Z" fill="#b8a888" opacity=".25"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #b09868 55%, var(--card-2))"/>`;
    // dry grass
    let tufts = "";
    for (let i = 0; i < 12; i++) {
      tufts += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(GY + 4 + rnd() * 25).toFixed(1)}" x2="${(rnd() * W).toFixed(1)}" y2="${(GY + 2 + rnd() * 25).toFixed(1)}" stroke="#c0a878" stroke-width=".7" opacity="${(.25 + rnd() * .15).toFixed(2)}"/>`;
    }

    // olive trees — crown spread = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const trees = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#788858";
      const th = 20 + f * 60;
      const cw = 10 + f * 22;
      const topY = GY - th;
      // gnarled trunk
      const trunk = `<path d="M ${cx} ${GY} Q ${cx - 4} ${GY - th * .4} ${cx + 2} ${topY + 15} L ${cx + 5} ${topY + 15} Q ${cx + 1} ${GY - th * .3} ${cx + 4} ${GY} Z" fill="color-mix(in srgb, #786848 60%, #585038)"/>`;
      // crown — olive grey-green blobs
      const leafN = Math.round(3 + f * 7);
      let crown = "";
      for (let l = 0; l < leafN; l++) {
        const lx = cx + (rnd() - .5) * cw * 1.4;
        const ly = topY + (rnd() - .5) * cw * .6 + 8;
        const lr = 4 + rnd() * 5;
        crown += `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${lr.toFixed(1)}" ry="${(lr * .7).toFixed(1)}" fill="color-mix(in srgb, ${col} ${50 + f * 25}%, #8a9868)" opacity="${(.55 + f * .25).toFixed(2)}"/>`;
      }
      // olives
      let olives = "";
      const oliveN = Math.round(1 + f * 4);
      for (let o = 0; o < oliveN; o++) {
        const ox = cx + (rnd() - .5) * cw;
        const oy = topY + 10 + rnd() * cw * .4;
        olives += `<circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="1.6" fill="#4a4838" opacity=".8"/>`;
      }
      // hot amber canopy edge
      const glow = hot ? `<ellipse cx="${cx}" cy="${topY + 6}" rx="${(cw * .6).toFixed(1)}" ry="4" fill="none" stroke="var(--amber)" stroke-width="1.5" opacity=".55">
        <animate attributeName="opacity" values=".55;.15;.55" dur="1.8s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="gs-tree${hot ? " hot" : ""}">
        ${trunk}${crown}${olives}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="gs-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="gs-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // finches — weaving through
    const finches = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 12 - (s.tps || 0) / 13);
      const y = GY - 40 - (i % 3) * 14;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#c8a030");
      const cx2 = W / 2 + (rnd() - .5) * 70;
      const rx2 = 35 + rnd() * 50;
      const ry2 = 8 + rnd() * 10;
      return `<g class="gs-finch${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${y}"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .38}" fill="${col}"/>
        <circle cx="${size * .6}" cy="${-size * .15}" r="${size * .28}" fill="${col}"/>
        <path d="M ${-size * .7} 0 L ${-size * 1.4} ${-size * .45} L ${-size * 1.4} ${size * .45} Z" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gs-wrap">
        <div class="gs-head"><b>GROVES</b><span>橄树=配额窗 冠幅=用量 雀=会话${hotN ? " · " + hotN + " 燃冠" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${hill}${ground}${tufts}${trees}${finches}
          <g class="gs-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="gs-k">${fmt(k.tokens)} · ${sessions.length} 雀</text>
            <text x="22" y="45" class="gs-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "橄榄林", eyebrow: "GROVES", render };
})();
