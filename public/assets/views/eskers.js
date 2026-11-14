/* ------------------------------------------------------------------ eskers
 * Eskers — sinuous gravel ridges snaking across the tundra:
 * every quota window is an esker whose length = used %
 * (≥85% the cairn on its crest burns amber); sessions are
 * ptarmigans strutting the spine.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "eskers";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(29660021);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 200, GY = 252;

    // autumn tundra sky
    const sky = `<defs><linearGradient id="eb-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b0a888"/><stop offset="100%" stop-color="#d0c8a8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#eb-s)" rx="10"/>`;
    // tundra floor
    const tundra = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #a89868 55%, var(--card-2))"/>`;
    // kettle ponds
    const ponds = `<ellipse cx="60" cy="${WY + 20}" rx="20" ry="5" fill="#6898b0" opacity=".5"/>
      <ellipse cx="300" cy="${WY + 35}" rx="16" ry="4" fill="#6898b0" opacity=".45"/>`;
    // shore
    const shore = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #b0a070 60%, var(--card-2))"/>`;

    // eskers — length = used %, drawn as snaking ridges
    const n = Math.max(1, quotas.length);
    const rows = Math.min(n, 3);
    const cols = Math.ceil(n / rows);
    const eskers = quotas.map((w, i) => {
      const row = Math.floor(i / cols), col = i % cols;
      const inRow = Math.min(cols, n - row * cols);
      const cx = 50 + (W - 100) / (inRow + 1) * (col + 1);
      const cy = WY + 15 + row * 20;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const colr = m.color || "#989870";
      const len = 20 + f * 40;
      // snake path
      const amp = 4 + f * 6;
      const pts = [];
      for (let s = 0; s <= 20; s++) {
        const px = cx - len / 2 + (s / 20) * len;
        const py = cy + Math.sin(s / 20 * Math.PI * 2.5 + i) * amp;
        pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
      }
      const snake = `<polyline points="${pts.join(" ")}" fill="none" stroke="color-mix(in srgb, ${colr} 70%, #807050)" stroke-width="${(3 + f * 3).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      // crest cairn
      const cairn = `<polygon points="${cx - 3},${cy - amp - 4} ${cx + 3},${cy - amp - 4} ${cx + 1.5},${cy - amp - 8} ${cx - 1.5},${cy - amp - 8}" fill="${hot ? "var(--amber)" : "#e0d8b8"}"/>`;
      const glow = hot ? `<circle cx="${cx}" cy="${cy - amp - 5}" r="6" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="6;10" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="eb-esker${hot ? " hot" : ""}">
        ${snake}${cairn}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="eb-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="eb-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // ptarmigans — strutting the spine
    const ptarms = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 11 - (s.tps || 0) / 13);
      const lvl = i % quotas.length || 0;
      const row2 = Math.floor(lvl / Math.min(Math.max(1, quotas.length), 3) * 0) || 0;
      const cx2 = 50 + (W - 100) / 2 + (lvl - quotas.length / 2) * 20;
      const y = WY + 12 + row2 * 20;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#d8d0b8");
      return `<g class="eb-ptarm${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - 15).toFixed(1)} ${y.toFixed(1)} Q ${cx2} ${(y - 5).toFixed(1)} ${(cx2 + 15).toFixed(1)} ${y.toFixed(1)} L ${(cx2 - 15).toFixed(1)} ${y.toFixed(1)}"/>
        <ellipse cx="0" cy="0" rx="${size * .8}" ry="${size * .6}" fill="${col}"/>
        <circle cx="${size * .55}" cy="${-size * .35}" r="${size * .35}" fill="${col}"/>
        <path d="M ${-size * .6} ${-size * .2} Q ${-size * 1.2} ${-size * .6} ${-size * 1.1} ${-size * .3}" stroke="${col}" stroke-width=".7" fill="none"/>
        <line x1="${size * .3}" y1="${size * .5}" x2="${size * .3}" y2="${size * 1.2}" stroke="${col}" stroke-width=".6"/>
        <line x1="${-size * .3}" y1="${size * .5}" x2="${-size * .3}" y2="${size * 1.2}" stroke="${col}" stroke-width=".6"/>
        <path d="M ${-size * .2} ${-size * .55} L ${-size * .5} ${-size * .9}" stroke="#c85040" stroke-width=".8" fill="none" opacity=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="eb-wrap">
        <div class="eb-head"><b>ESKERS</b><span>蛇丘=配额窗 长=用量 雷鸟=会话${hotN ? " · " + hotN + " 燃堆" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${tundra}${ponds}${shore}${eskers}${ptarms}
          <g class="eb-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="eb-k">${fmt(k.tokens)} · ${sessions.length} 雷鸟</text>
            <text x="22" y="45" class="eb-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "蛇丘", eyebrow: "ESKERS", render };
})();
