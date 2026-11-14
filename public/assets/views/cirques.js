/* ------------------------------------------------------------------ cirques
 * Cirques — armchair amphitheatres carved by glaciers:
 * every quota window is a cirque bowl whose depth = used %
 * (≥85% the headwall cornice burns amber); sessions are
 * mountain goats on the cliffs.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cirques";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(30771132);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 243;

    // alpine sky
    const sky = `<defs><linearGradient id="ce-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#8898b0"/><stop offset="100%" stop-color="#c0ccd8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ce-s)" rx="10"/>`;
    // distant peaks
    const peaks = `<path d="M 0 ${GY} L 50 ${GY - 80} L 110 ${GY - 45} L 180 ${GY - 90} L 250 ${GY - 50} L 320 ${GY - 85} L 400 ${GY - 60} L 400 ${GY} Z" fill="#98a8b8" opacity=".35"/>`;
    // valley floor
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #889880 55%, var(--card-2))"/>`;
    // alpine meadow dots
    let meadow = "";
    for (let i = 0; i < 12; i++) {
      meadow += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(GY + 6 + rnd() * 35).toFixed(1)}" r="${(1 + rnd() * 1.5).toFixed(1)}" fill="${["#c8d8a8", "#d8c8a8", "#a8c898"][i % 3]}" opacity="${(.5 + rnd() * .2).toFixed(2)}"/>`;
    }

    // cirques — bowl depth = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const bowls = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#788890";
      const bd = 15 + f * 60;
      const bw = 16 + f * 22;
      const rimY = GY - 30;
      // bowl — a scooped armchair
      const bowl = `<path d="M ${cx - bw / 2} ${rimY} Q ${cx - bw * .3} ${rimY + bd} ${cx} ${rimY + bd} Q ${cx + bw * .3} ${rimY + bd} ${cx + bw / 2} ${rimY} L ${cx + bw * .4} ${rimY - 10} L ${cx} ${rimY - 15} L ${cx - bw * .4} ${rimY - 10} Z" fill="color-mix(in srgb, ${col} 60%, #586068)"/>`;
      // headwall — the steep back
      const headwall = `<path d="M ${cx - bw * .4} ${rimY - 10} L ${cx} ${rimY - 15} L ${cx + bw * .4} ${rimY - 10} L ${cx + bw * .2} ${rimY - 12} L ${cx} ${rimY - 16} L ${cx - bw * .2} ${rimY - 12} Z" fill="#485058"/>`;
      // tarn — the little lake at the bottom
      const tarn = `<ellipse cx="${cx}" cy="${rimY + bd - 3}" rx="${bw * .2}" ry="3" fill="#5888a8" opacity=".7"/>`;
      // cornice on the headwall
      const cornice = `<path d="M ${cx - bw * .4} ${rimY - 10} Q ${cx} ${rimY - 18} ${cx + bw * .4} ${rimY - 10}" stroke="${hot ? "var(--amber)" : "#d8e0e8"}" stroke-width="1.5" fill="none" opacity="${hot ? ".8" : ".6"}"/>`;
      const glow = hot ? `<circle cx="${cx}" cy="${rimY - 8}" r="8" fill="var(--amber)" opacity=".2">
        <animate attributeName="r" values="8;13" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".2;.04" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="ce-bowl${hot ? " hot" : ""}">
        ${bowl}${headwall}${tarn}${cornice}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="ce-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="ce-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // mountain goats — on the cliffs
    const goats = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 13 - (s.tps || 0) / 12);
      const lvl = i % quotas.length || 0;
      const row = quotas[lvl];
      const cx2 = 40 + (W - 80) / Math.max(1, quotas.length) / 2 + lvl * ((W - 80) / Math.max(1, quotas.length)) - 10;
      const rimY = GY - 30;
      const y = rimY - 5 + rnd() * 10;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8e8e0");
      return `<g class="ce-goat${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M -5 0 L 5 -3 L -5 0"/>
        <ellipse cx="0" cy="0" rx="${size * .7}" ry="${size * .5}" fill="${col}"/>
        <circle cx="${size * .4}" cy="${-size * .35}" r="${size * .3}" fill="${col}"/>
        <path d="M ${size * .3} ${-size * .55} L ${size * .5} ${-size * .9} M ${size * .5} ${-size * .55} L ${size * .7} ${-size * .9}" stroke="#d0c8a8" stroke-width=".6" fill="none"/>
        <path d="M ${-size * .5} ${size * .3} Q ${-size * .9} ${size * .6} ${-size * 1.1} ${size * .3}" stroke="${col}" stroke-width=".6" fill="none"/>
        <line x1="${size * .4}" y1="${size * .4}" x2="${size * .4}" y2="${size * 1}" stroke="${col}" stroke-width=".5"/>
        <line x1="${-size * .4}" y1="${size * .4}" x2="${-size * .4}" y2="${size * 1}" stroke="${col}" stroke-width=".5"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ce-wrap">
        <div class="ce-head"><b>CIRQUES</b><span>冰斗=配额窗 斗深=用量 山羊=会话${hotN ? " · " + hotN + " 燃檐" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${peaks}${ground}${meadow}${bowls}${goats}
          <g class="ce-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ce-k">${fmt(k.tokens)} · ${sessions.length} 山羊</text>
            <text x="22" y="45" class="ce-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "冰斗", eyebrow: "CIRQUES", render };
})();
