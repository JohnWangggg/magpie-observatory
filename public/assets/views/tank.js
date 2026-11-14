/* -------------------------------------------------------------------- tank
 * Tank — an aquarium wall: each quota window is a fish tank, its water
 * level is the used % (≥85% the water reddens and the fish float up
 * tired); sessions are fish cruising between the gravel and the glass.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tank";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(15485863);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 40, BOT = 250;

    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;
    const tanks = quotas.map((w, i) => {
      const x = 30 + i * gap + 3;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const fill = Math.min(1, w.used / 100);
      const tw = gap - 8, th = BOT - TOP;
      const wy = TOP + th * (1 - fill);               // water surface y
      const water = hot ? "color-mix(in srgb, var(--red) 30%, transparent)" : "color-mix(in srgb, #4f9bd9 26%, transparent)";
      // bubbles inside the water
      let bub = "";
      for (let b = 0; b < 4; b++) {
        const bx = x + 8 + rnd() * (tw - 16);
        bub += `<circle cx="${bx.toFixed(1)}" r="${(1.2 + rnd() * 1.6).toFixed(1)}" fill="none" stroke="#9cc4e8" stroke-width=".7" opacity=".5">
          <animate attributeName="cy" values="${BOT - 6};${wy + 4}" dur="${(3 + rnd() * 3).toFixed(1)}s" begin="${(-b * 0.9).toFixed(1)}s" repeatCount="indefinite"/>
        </circle>`;
      }
      return `<g class="tk-tank${hot ? " hot" : ""}">
        <rect x="${x}" y="${TOP}" width="${tw}" height="${th}" rx="6" fill="color-mix(in srgb, var(--card-2) 55%, transparent)" stroke="${hot ? "var(--red)" : "var(--line-2)"}"/>
        <clipPath id="tk-clip-${i}"><rect x="${x + 1.5}" y="${TOP + 1.5}" width="${tw - 3}" height="${th - 3}" rx="4.5"/></clipPath>
        <g clip-path="url(#tk-clip-${i})">
          <rect x="${x + 1.5}" y="${wy.toFixed(1)}" width="${tw - 3}" height="${(BOT - wy).toFixed(1)}" fill="${water}"/>
          <path d="M ${x} ${wy.toFixed(1)} q ${tw / 4} -4 ${tw / 2} 0 t ${tw / 2} 0" fill="none" stroke="#bfe0f5" stroke-width="1.2" opacity=".7">
            <animate attributeName="d" values="M ${x} ${wy.toFixed(1)} q ${tw / 4} -4 ${tw / 2} 0 t ${tw / 2} 0;M ${x} ${wy.toFixed(1)} q ${tw / 4} 4 ${tw / 2} 0 t ${tw / 2} 0;M ${x} ${wy.toFixed(1)} q ${tw / 4} -4 ${tw / 2} 0 t ${tw / 2} 0" dur="4s" repeatCount="indefinite"/>
          </path>
          ${bub}
          <rect x="${x + 1.5}" y="${BOT - 8}" width="${tw - 3}" height="7" fill="color-mix(in srgb, var(--amber) 34%, var(--card-2))"/>
        </g>
        <text x="${(x + tw / 2).toFixed(1)}" y="${TOP + th + 16}" class="tk-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${(x + tw / 2).toFixed(1)}" y="${TOP + th + 27}" class="tk-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // fish — sessions cruising the whole aquarium (free swim across tanks)
    const fish = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const y0 = TOP + 30 + i * 30;
      const dur = Math.max(6, 16 - (s.tps || 0) / 10);
      const flip = i % 2;
      return `<g class="tk-fish${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${flip ? W - 20 : 20} ${y0};${flip ? 20 : W - 20} ${y0 + (i % 3 - 1) * 12}" dur="${dur}s" repeatCount="indefinite"/>
        <g${flip ? ' transform="scale(-1,1)"' : ""}>
          <path d="M 0 0 q 6 -4 10 0 q -6 4 -10 0 Z M -3 0 l -4 -3 l 0 6 Z" fill="${dead ? "var(--red)" : m.color || "#e8b25a"}"/>
          <circle cx="6.5" cy="-1" r=".9" fill="var(--bg)"/>
        </g>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="tk-wrap">
        <div class="tk-head"><b>TANK</b><span>缸=配额窗 水=用量 鱼=会话${hotN ? " · " + hotN + " 缸缺氧" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #0e1e2e 30%, transparent)" rx="10"/>
          ${tanks}${fish}
          <g class="tk-card">
            <rect x="14" y="12" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="tk-k">${fmt(k.tokens)} · ${sessions.length} 鱼</text>
            <text x="22" y="43" class="tk-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "水族馆", eyebrow: "TANK", render };
})();
