/* ------------------------------------------------------------------ harvest2
 * Harvest — a wheat field: every quota window is a furrow whose stalks
 * grow tall as used % climbs (≥85% the ears droop and shed grain);
 * sessions are farmers walking between the rows.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "harvest2";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(48201153);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, FLOOR = 236;
    const n = Math.max(1, quotas.length);
    const gap = (W - 64) / n;

    const furrows = quotas.map((w, i) => {
      const x0 = 32 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const hgt = 30 + f * 130;                            // stalk height
      const nStalk = 3 + Math.round(f * 3);
      let stalk = "";
      for (let k = 0; k < nStalk; k++) {
        const sx = x0 + 6 + (gap - 12) * (nStalk === 1 ? .5 : k / (nStalk - 1));
        const bend = f * 14;                                // ears bend as they grow
        const col = hot ? "#d4a03a" : m.color || "#c9a24b";
        stalk += `<g transform="translate(${sx.toFixed(1)},${FLOOR})">
          <path d="M 0 0 Q ${(bend * .4).toFixed(1)} ${(-hgt * .6).toFixed(1)} ${(bend).toFixed(1)} ${(-hgt).toFixed(1)}" stroke="${col}" stroke-width="1.6" fill="none"/>
          <ellipse cx="${(bend).toFixed(1)}" cy="${(-hgt).toFixed(1)}" rx="${(4 + f * 2).toFixed(1)}" ry="${(5 + f * 3).toFixed(1)}"
            fill="color-mix(in srgb, ${col} ${60 + f * 30}%, #6a5a20)" stroke="${col}"/>
          ${[0,1,2].map(b => `<line x1="${(bend).toFixed(1)}" y1="${(-hgt).toFixed(1)}" x2="${(bend + (b-1)*4).toFixed(1)}" y2="${(-hgt - 6 - b*2).toFixed(1)}" stroke="${col}" stroke-width="1" opacity=".7"/>`).join("")}
        </g>`;
      }
      // shed grains on hot furrows
      const grains = hot ? Array.from({length: 2}, (_, g) => `<circle cx="${(x0 + 10 + g * (gap - 20)).toFixed(1)}" cy="${FLOOR - hgt + 10}" r="1.4" fill="#e8b25a">
          <animate attributeName="cy" values="${FLOOR - hgt + 10};${FLOOR - 3}" dur="${(1.6 + g * .4).toFixed(1)}s" begin="${(-g * .8).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;0" dur="${(1.6 + g * .4).toFixed(1)}s" begin="${(-g * .8).toFixed(1)}s" repeatCount="indefinite"/></circle>`).join("") : "";
      return `<g class="h2-fur${hot ? " hot" : ""}">
        ${stalk}${grains}
        <text x="${(x0 + gap/2).toFixed(1)}" y="${FLOOR + 18}" class="h2-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${(x0 + gap/2).toFixed(1)}" y="${FLOOR + 29}" class="h2-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // farmers — sessions walking between rows
    const farmers = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 16 - (s.tps || 0) / 8);
      const y = FLOOR - 4;
      return `<g class="h2-far${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-22 + i * 26} ${y};${W + 22} ${y}" dur="${dur}s" begin="${(-i * 3).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-14" r="3" fill="${dead ? "var(--red)" : m.color || "#e0b070"}"/>
        <path d="M -5 -12 h 10 l -1 -4 h -8 Z" fill="#4a3a20"/>
        <path d="M -3 -11 h 6 l 2 11 h -10 Z" fill="${dead ? "var(--red)" : "#5a4632"}"/>
        <line x1="-2" y1="0" x2="-2" y2="7" stroke="${dead ? "var(--red)" : "#3a2a1a"}" stroke-width="1.5"/>
        <line x1="2" y1="0" x2="2" y2="7" stroke="${dead ? "var(--red)" : "#3a2a1a"}" stroke-width="1.5"/>
        <path d="M 4 -8 L 9 2" stroke="#8a6a3a" stroke-width="1.2" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="h2-wrap">
        <div class="h2-head"><b>HARVEST</b><span>垄=配额窗 穗=用量 农=会话${hotN ? " · " + hotN + " 垄穗落" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #20180c 36%, transparent)" rx="10"/>
          <rect x="14" y="${FLOOR}" width="${W - 28}" height="3" rx="1.5" fill="#4a3a20" opacity=".9"/>
          ${furrows}${farmers}
          <g class="h2-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="h2-k">${fmt(k.tokens)} · ${sessions.length} 农</text>
            <text x="22" y="45" class="h2-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "麦浪", eyebrow: "HARVEST", render };
})();
