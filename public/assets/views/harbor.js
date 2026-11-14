/* ------------------------------------------------------------------ harbor
 * Harbor — lighthouses on a night coast: each quota window is a tower,
 * its beacon sweeps faster the fuller it runs (≥85% the light goes
 * alarm-red); sessions are boats crossing the water under the beams.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "harbor";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(49979687);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 208, SEA = 224;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    // stars + moon
    let stars = "";
    for (let i = 0; i < 14; i++) {
      stars += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(rnd() * 96).toFixed(1)}" r="${(rnd() * .9 + .4).toFixed(1)}" fill="#dfe8f5" opacity="${(.2 + rnd() * .45).toFixed(2)}"/>`;
    }
    const moon = `<circle cx="352" cy="46" r="14" fill="#e8e3cf" opacity=".9"/><circle cx="347" cy="42" r="13" fill="var(--card-2)" opacity=".55"/>`;

    const towers = quotas.map((w, i) => {
      const cx = 36 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = hot ? "var(--red)" : m.color || "#ffd98a";
      const spin = Math.max(1.1, 6 - f * 4.6).toFixed(2);          // fuller → faster sweep
      const th = 62 + f * 30;                                     // tower height
      const top = GY - th;
      // tapered tower + lamp room + rotating beam (two wedges)
      return `<g class="hb-tower${hot ? " hot" : ""}">
        <path d="M ${cx - 11} ${GY} L ${cx - 5.5} ${top} h 11 L ${cx + 11} ${GY} Z"
          fill="var(--card-3)" stroke="${hot ? "var(--red)" : "var(--line-2)"}" stroke-width="1"/>
        <rect x="${cx - 7}" y="${top - 10}" width="14" height="10" rx="2" fill="${col}" opacity="${hot ? ".95" : ".8"}"/>
        <g class="hb-beam" style="animation-duration:${spin}s" transform-origin="${cx} ${top - 5}">
          <path d="M ${cx} ${top - 5} L ${cx - 90} ${top - 26} L ${cx - 90} ${top + 4} Z" fill="${col}" opacity="${hot ? ".30" : ".18"}"/>
          <path d="M ${cx} ${top - 5} L ${cx + 90} ${top - 26} L ${cx + 90} ${top + 4} Z" fill="${col}" opacity="${hot ? ".30" : ".18"}"/>
        </g>
        <text x="${cx.toFixed(1)}" y="${GY + 40}" class="hb-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 51}" class="hb-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // sea — layered wave bands
    const waves = [0, 1, 2].map(i =>
      `<path d="M 0 ${SEA + i * 10} q 50 -6 100 0 t 100 0 t 100 0 t 100 0 v 60 H 0 Z"
        fill="color-mix(in srgb, #2a5f8a ${22 - i * 6}%, transparent)"/>`
    ).join("");

    // boats — sessions on the water
    const boats = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const y = SEA + 14 + (i % 3) * 12;
      const dur = Math.max(8, 20 - (s.tps || 0) / 8);
      const dir = i % 2;
      return `<g class="hb-boat${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${dir ? W + 30 : -30} ${y};${dir ? -30 : W + 30} ${y}" dur="${dur}s" begin="${(-i * 3).toFixed(1)}s" repeatCount="indefinite"/>
        <g${dir ? ' transform="scale(-1,1)"' : ""}>
          <path d="M -10 0 h 20 l -4 7 h -12 Z" fill="${dead ? "var(--red)" : "var(--card-3)"}"/>
          <line x1="0" y1="0" x2="0" y2="-12" stroke="var(--line-2)" stroke-width="1.4"/>
          <path d="M 1 -12 L 9 -2 L 1 -2 Z" fill="${dead ? "var(--red)" : m.color || "#9db8d9"}" opacity=".9"/>
        </g>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="hb-wrap">
        <div class="hb-head"><b>HARBOR</b><span>塔=配额窗 扫=用量 船=会话${hotN ? " · " + hotN + " 塔警戒" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #0b1524 34%, transparent)" rx="10"/>
          ${stars}${moon}
          <rect x="16" y="${GY}" width="${W - 32}" height="3" rx="1.5" fill="var(--card-3)"/>
          ${towers}${waves}${boats}
          <g class="hb-card">
            <rect x="14" y="12" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="hb-k">${fmt(k.tokens)} · ${sessions.length} 船</text>
            <text x="22" y="43" class="hb-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "灯塔港", eyebrow: "HARBOR", render };
})();
