/* ------------------------------------------------------------------ bluff
 * Bluff — forested riverbank cliffs at midday: every quota window
 * is a bluff whose face height = used % (≥85% the brow blazes
 * gold); sessions are swifts skimming the river below.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bluff";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(55667788);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 228, RY = 240;

    // midday sky — bright, a few clouds
    const sky = `<defs><linearGradient id="bf-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2a4a5a"/><stop offset="60%" stop-color="#3a5a6a"/><stop offset="100%" stop-color="#4a5a5a"/></linearGradient></defs>`;
    let cloud = "";
    for (let i = 0; i < 3; i++) {
      cloud += `<g opacity="${(.15 + rnd() * .15).toFixed(2)}">
        <ellipse cx="${80 + i * 110}" cy="${30 + i * 12}" rx="${20 + rnd() * 15}" ry="${8 + rnd() * 4}" fill="#e8e8e0"/>
        <ellipse cx="${105 + i * 110}" cy="${28 + i * 12}" rx="${15 + rnd() * 10}" ry="${6 + rnd() * 3}" fill="#f0f0e8"/>
      </g>`;
    }
    // river below
    const river = `<rect x="0" y="${RY}" width="${W}" height="${H - RY}" fill="color-mix(in srgb, #2a4a4a 65%, var(--card-2))"/>`;
    let ripples = "";
    for (let i = 0; i < 8; i++) {
      ripples += `<line x1="${20 + i * 46}" y1="${RY + 12 + rnd() * 35}" x2="${60 + i * 46}" y2="${RY + 12 + rnd() * 35}" stroke="#5a8a8a" stroke-width=".6" opacity="${(.12 + rnd() * .18).toFixed(2)}">
        <animate attributeName="x1" values="${20 + i * 46};${30 + i * 46};${20 + i * 46}" dur="${(3 + i * .5).toFixed(1)}s" repeatCount="indefinite"/>
        <animate attributeName="x2" values="${60 + i * 46};${70 + i * 46};${60 + i * 46}" dur="${(3 + i * .5).toFixed(1)}s" repeatCount="indefinite"/></line>`;
    }
    // treetops on the bluff line
    let trees = "";
    for (let i = 0; i < 8; i++) {
      const tx = 25 + i * 48;
      const th = 8 + rnd() * 10;
      trees += `<path d="M ${tx} ${GY} L ${tx - 4} ${GY - th} L ${tx + 4} ${GY - th} Z" fill="#2a4a2a" opacity=".7"/>`;
    }

    // bluffs — face height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const bluffs = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#7a6a50";
      const bh = 30 + f * 85;
      const bw = 12 + f * 20;
      const browY = GY - bh;
      // bluff face — steep with forested top
      const face = `<path d="M ${cx - bw / 2} ${GY} L ${cx - bw * .38} ${browY} L ${cx + bw * .38} ${browY} L ${cx + bw / 2} ${GY} Z" fill="color-mix(in srgb, ${col} 50%, #201818)"/>`;
      // forested crown
      const crown = `<path d="M ${cx - bw * .4} ${browY} Q ${cx - bw * .2} ${browY - 6} ${cx} ${browY - 4} Q ${cx + bw * .2} ${browY - 8} ${cx + bw * .4} ${browY}" fill="${hot ? "color-mix(in srgb, var(--amber) 50%, #3a5a2a)" : "#3a5a2a"}" opacity=".8"/>`;
      // horizontal strata
      const strata = `<line x1="${cx - bw * .35}" y1="${GY - bh * .3}" x2="${cx + bw * .35}" y2="${GY - bh * .3}" stroke="#4a3a28" stroke-width=".6" opacity=".4"/>
        <line x1="${cx - bw * .32}" y1="${GY - bh * .6}" x2="${cx + bw * .32}" y2="${GY - bh * .6}" stroke="#4a3a28" stroke-width=".6" opacity=".4"/>`;
      // hot brow blaze
      const blaze = hot ? `<circle cx="${cx}" cy="${browY - 4}" r="${(4 + f * 2).toFixed(1)}" fill="var(--amber)" opacity=".7">
        <animate attributeName="r" values="${(4 + f * 2).toFixed(1)};${(7 + f * 3).toFixed(1)}" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;0" dur="1.5s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="bf-bluff${hot ? " hot" : ""}">
        ${face}${crown}${strata}${blaze}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="bf-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="bf-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // swifts — sessions skimming the river
    const swifts = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 9 - (s.tps || 0) / 16);
      const y = RY - 8 - (i % 2) * 6;
      const size = 2 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e8e0d0");
      return `<g class="bf-swift${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${-20} ${y} Q ${W * .4} ${y - 15} ${W * .6} ${y + 8} T ${W + 20} ${y - 10}"/>
        <ellipse cx="0" cy="0" rx="${size * 1.6}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * 1}" cy="${-size * .15}" rx="${size * .35}" ry="${size * .3}" fill="${col}"/>
        <path d="M ${-size * .8} 0 Q ${-size * 1.8} ${-size * .8} ${-size * 2.2} ${-size * .3}" stroke="${col}" stroke-width=".7" fill="none"/>
        <path d="M ${size * .8} 0 Q ${size * 1.8} ${-size * .8} ${size * 2.2} ${-size * .3}" stroke="${col}" stroke-width=".7" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="bf-wrap">
        <div class="bf-head"><b>BLUFF</b><span>峭壁=配额窗 壁高=用量 燕=会话${hotN ? " · " + hotN + " 金冠" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="url(#bf-sky)" rx="10"/>
          ${sky}${cloud}${trees}${river}${ripples}${bluffs}${swifts}
          <g class="bf-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="bf-k">${fmt(k.tokens)} · ${sessions.length} 燕</text>
            <text x="22" y="45" class="bf-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "峭壁", eyebrow: "BLUFF", render };
})();
