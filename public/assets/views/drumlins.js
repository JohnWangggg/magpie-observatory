/* ------------------------------------------------------------------ drumlins
 * Drumlins — whaleback hills streamlined by ice flow:
 * every quota window is a drumlin whose elongation = used %
 * (≥85% the summit erratic burns amber); sessions are hares
 * loping over the brows.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "drumlins";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(31882243);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 205, GY = 250;

    // overcast sky
    const sky = `<defs><linearGradient id="dr-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#a8b8a8"/><stop offset="100%" stop-color="#c8d0b8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#dr-s)" rx="10"/>`;
    // pasture
    const pasture = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #98a878 55%, var(--card-2))"/>`;
    // drystone wall
    const wall = `<path d="M 0 ${WY + 28} L 400 ${WY + 24}" stroke="#989080" stroke-width="2" stroke-dasharray="5 3" opacity=".6"/>`;
    // shore
    const shore = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #a8b088 60%, var(--card-2))"/>`;

    // drumlins — elongation = used %, all aligned to ice flow (left→right)
    const n = Math.max(1, quotas.length);
    const rows = Math.min(n, 3);
    const cols = Math.ceil(n / rows);
    const hills = quotas.map((w, i) => {
      const row = Math.floor(i / cols), col = i % cols;
      const inRow = Math.min(cols, n - row * cols);
      const cx = 50 + (W - 100) / (inRow + 1) * (col + 1);
      const cy = WY + 15 + row * 18;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const colr = m.color || "#989878";
      const len = 18 + f * 34;
      const ht = 6 + f * 8;
      // whaleback — steep stoss end left, tapered lee right
      const hill = `<path d="M ${cx - len / 2} ${cy} Q ${cx - len * .3} ${cy - ht} ${cx} ${cy - ht * .8} Q ${cx + len * .35} ${cy - ht * .5} ${cx + len / 2} ${cy} Z" fill="color-mix(in srgb, ${colr} 70%, #788060)"/>`;
      // summit erratic
      const erratic = `<polygon points="${cx - 3},${cy - ht * .85} ${cx + 3},${cy - ht * .85 - 1.5} ${cx + 4},${cy - ht * .85 + 1.5} ${cx - 2},${cy - ht * .85 + 2}" fill="${hot ? "var(--amber)" : "#e0d8b8"}" opacity="${hot ? ".85" : ".8"}"/>`;
      const glow = hot ? `<circle cx="${cx}" cy="${cy - ht * .8}" r="6" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="6;10" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      // flow striations
      const striae = `<path d="M ${cx - len * .3} ${cy - ht * .3} L ${cx + len * .3} ${cy - ht * .35}" stroke="#687050" stroke-width=".6" opacity=".5"/>`;
      return `<g class="dr-hill${hot ? " hot" : ""}">
        ${hill}${striae}${erratic}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="dr-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="dr-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // hares — loping over the brows
    const hares = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 14);
      const y = WY + 12 + (i % 3) * 16;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#c8b898");
      return `<g class="dr-hare${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-15} ${y};${W + 15} ${(y - 8).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .5}" fill="${col}"/>
        <circle cx="${size * .6}" cy="${-size * .3}" r="${size * .35}" fill="${col}"/>
        <path d="M ${size * .5} ${-size * .55} L ${size * .3} ${-size * 1.4} M ${size * .7} ${-size * .55} L ${size * .8} ${-size * 1.4}" stroke="${col}" stroke-width=".8" fill="none" stroke-linecap="round"/>
        <path d="M ${-size * .7} ${size * .2} Q ${-size * 1.1} ${size * .5} ${-size * 1.3} ${size * .2}" stroke="${col}" stroke-width=".7" fill="none"/>
        <line x1="${size * .5}" y1="${size * .4}" x2="${size * .8}" y2="${size * 1.1}" stroke="${col}" stroke-width=".7"/>
        <line x1="${-size * .3}" y1="${size * .4}" x2="${-size * .6}" y2="${size * 1.1}" stroke="${col}" stroke-width=".7"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="dr-wrap">
        <div class="dr-head"><b>DRUMLINS</b><span>鼓丘=配额窗 长=用量 野兔=会话${hotN ? " · " + hotN + " 燃石" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${pasture}${wall}${shore}${hills}${hares}
          <g class="dr-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="dr-k">${fmt(k.tokens)} · ${sessions.length} 兔</text>
            <text x="22" y="45" class="dr-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鼓丘", eyebrow: "DRUMLINS", render };
})();
