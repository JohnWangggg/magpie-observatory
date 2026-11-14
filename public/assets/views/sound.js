/* ------------------------------------------------------------------ sound
 * Sound — a deep-water channel between two landmasses: every quota
 * window is a sounding line whose depth = used % (≥85% the plumb
 * bobs amber); sessions are cormorants fishing the channel.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sound";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(22334455);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 226, DY = 240;

    // two landmasses — left headland + right shore
    const left = `<path d="M 0 ${DY} L 0 ${GY} L 50 ${GY - 30} L 90 ${GY - 10} L 100 ${GY} L 100 ${DY} Z" fill="color-mix(in srgb, #3a3028 70%, var(--card-2))"/>`;
    const right = `<path d="M ${W} ${DY} L ${W} ${GY} L ${W - 50} ${GY - 30} L ${W - 90} ${GY - 10} L ${W - 100} ${GY} L ${W - 100} ${DY} Z" fill="color-mix(in srgb, #3a3028 70%, var(--card-2))"/>`;
    // channel floor — rocky seabed
    const bed = `<path d="M 0 ${DY + 20} Q 100 ${DY + 8} 200 ${DY + 15} T 400 ${DY + 18} L 400 ${H} L 0 ${H} Z" fill="color-mix(in srgb, #1a2820 70%, var(--card-2))"/>`;
    // current lines
    let current = "";
    for (let i = 0; i < 6; i++) {
      current += `<line x1="${110 + i * 30}" y1="${DY + 25 + i * 8}" x2="${150 + i * 30}" y2="${DY + 25 + i * 8}" stroke="#4a6a6a" stroke-width=".5" opacity="${(.1 + rnd() * .15).toFixed(2)}">
        <animate attributeName="x1" values="${110 + i * 30};${120 + i * 30};${110 + i * 30}" dur="${(3 + i * .4).toFixed(1)}s" repeatCount="indefinite"/>
        <animate attributeName="x2" values="${150 + i * 30};${160 + i * 30};${150 + i * 30}" dur="${(3 + i * .4).toFixed(1)}s" repeatCount="indefinite"/></line>`;
    }
    // water surface
    const surface = `<line x1="100" y1="${DY}" x2="${W - 100}" y2="${DY}" stroke="#4a6a70" stroke-width=".8" opacity=".5"/>`;

    // sounding lines — plumb depth = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 220) / n;
    const soundings = quotas.map((w, i) => {
      const cx = 110 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#c8b880";
      const depth = 15 + f * 45;
      const plumbY = DY + depth;
      // sounding line — thin rope down to the plumb
      const line = `<line x1="${cx}" y1="${DY - 14}" x2="${cx}" y2="${plumbY}" stroke="${hot ? "var(--amber)" : col}" stroke-width="1.2" opacity=".7" stroke-dasharray="2 2"/>`;
      // plumb bob
      const plumb = `<path d="M ${cx - 4} ${plumbY} L ${cx} ${plumbY + 6} L ${cx + 4} ${plumbY} Z" fill="${hot ? "var(--amber)" : col}" opacity=".85"/>`;
      // hot flash ring
      const flash = hot ? `<ellipse cx="${cx}" cy="${plumbY + 6}" rx="${(3 + f * 2).toFixed(1)}" ry="${(1 + f).toFixed(1)}" fill="none" stroke="var(--amber)" stroke-width=".8" opacity=".6">
        <animate attributeName="rx" values="${(3 + f * 2).toFixed(1)};${(7 + f * 3).toFixed(1)}" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="ry" values="${(1 + f).toFixed(1)};${(2.5 + f * 1.5).toFixed(1)}" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;0" dur="1.6s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="so-sound${hot ? " hot" : ""}">
        ${line}${plumb}${flash}
        <text x="${cx.toFixed(1)}" y="${DY + 20}" class="so-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${DY + 31}" class="so-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // cormorants — sessions fishing the channel
    const corns = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 13 - (s.tps || 0) / 14);
      const y = DY - 8 - (i % 3) * 10;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#2a2a2a");
      return `<g class="so-corn${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-24} ${y};${W + 24} ${(y + 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .7}" fill="${col}"/>
        <ellipse cx="${size * .9}" cy="${-size * .3}" rx="${size * .4}" ry="${size * .4}" fill="${col}"/>
        <line x1="${size * .9}" y1="${size * .1}" x2="${size * 1.6}" y2="${size * .8}" stroke="${col}" stroke-width=".6"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="so-wrap">
        <div class="so-head"><b>SOUND</b><span>深标=配额窗 深=用量 鸬鹚=会话${hotN ? " · " + hotN + " 琥珀" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #141c20 60%, transparent)" rx="10"/>
          ${left}${right}${bed}${current}${surface}${soundings}${corns}
          <g class="so-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="so-k">${fmt(k.tokens)} · ${sessions.length} 鸬鹚</text>
            <text x="22" y="45" class="so-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "海峡", eyebrow: "SOUND", render };
})();
