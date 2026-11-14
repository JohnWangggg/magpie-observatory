/* ------------------------------------------------------------------- sakura
 * Sakura — a path under cherry trees: each quota window is a tree whose
 * canopy fills with blossom as its used % climbs (≥85% the boughs go
 * bare); sessions are petals in a spring flurry, drifting to the path.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sakura";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(48271);

  // one blossom cluster at (x,y), radius r — five petal dabs
  function puff(x, y, r, fill, op) {
    let d = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${fill}" opacity="${op}"/>`;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      d += `<circle cx="${(x + Math.cos(a) * r * .8).toFixed(1)}" cy="${(y + Math.sin(a) * r * .8).toFixed(1)}" r="${(r * .55).toFixed(1)}" fill="${fill}" opacity="${(op * .8).toFixed(2)}"/>`;
    }
    return d;
  }

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GROUND = 236;

    // path — a pale lane with stepping stones
    const stones = [0, 1, 2, 3, 4, 5].map(i =>
      `<ellipse cx="${62 + i * 58}" cy="${GROUND + 20 + (i % 2) * 7}" rx="13" ry="4.6" fill="var(--card-3)" opacity=".5"/>`
    ).join("");

    // trees — canopies bloom with used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 56) / n;
    const trees = quotas.map((w, i) => {
      const cx = 34 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const fill = w.used / 100;
      const pink = m.color || "#f5a8bd";
      const trunkH = 74;
      const cy = GROUND - trunkH;
      // canopy puffs: 3 + fill*7, bare (hot) trees get only branches
      const np = hot ? 0 : 3 + Math.round(fill * 7);
      let canopy = "";
      for (let p = 0; p < np; p++) {
        const a = rnd() * Math.PI * 2, rr = rnd() * 22 + 6;
        canopy += puff(cx + Math.cos(a) * rr * 1.4, cy - Math.abs(Math.sin(a) * rr) - 6, 7 + rnd() * 7,
          p % 3 === 0 ? "var(--sakura-pale,#ffd9e4)" : pink, .55 + rnd() * .35);
      }
      const branches = hot ? `<path d="M ${cx.toFixed(1)} ${cy + 6} q -14 -14 -24 -16 M ${cx.toFixed(1)} ${cy + 2} q 12 -16 26 -18 M ${cx.toFixed(1)} ${cy + 10} q -18 -6 -26 2" fill="none" stroke="var(--red)" stroke-width="1.3" opacity=".8"/>` : "";
      return `<g class="sk-tree${hot ? " hot" : ""}">
        <path d="M ${cx.toFixed(1)} ${GROUND} C ${(cx - 4).toFixed(1)} ${GROUND - 30} ${(cx + 4).toFixed(1)} ${cy + 18} ${cx.toFixed(1)} ${cy}" fill="none" stroke="var(--line-2)" stroke-width="3" stroke-linecap="round"/>
        ${branches}${canopy}
        <text x="${cx.toFixed(1)}" y="${GROUND + 42}" class="sk-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GROUND + 53}" class="sk-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // petals — sessions as a spring flurry
    const petals = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const sx = 40 + rnd() * 320;
      const dur = Math.max(4, 11 - (s.tps || 0) / 15);
      return `<g class="sk-petal${dead ? " dead" : ""}">
        <path d="M 0 -4 Q 5 -2 4 2 Q 0 5 -4 2 Q -5 -2 0 -4 Z" fill="${dead ? "var(--red)" : "var(--sakura-pale,#ffd9e4)"}" opacity=".9">
          <animateTransform attributeName="transform" type="rotate" values="0;120;240;360" dur="${(dur * .4).toFixed(1)}s" repeatCount="indefinite"/>
        </path>
        <animateTransform attributeName="transform" type="translate" values="${sx.toFixed(0)} 14;${(sx + 60 + rnd() * 40).toFixed(0)} ${GROUND - 6}" dur="${dur}s" begin="${(-i * 1.2).toFixed(1)}s" repeatCount="indefinite"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sk-wrap">
        <div class="sk-head"><b>SAKURA</b><span>树=配额窗 花=用量 瓣=会话${hotN ? " · " + hotN + " 树秃" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <rect x="24" y="${GROUND}" width="352" height="50" rx="9" fill="color-mix(in srgb, var(--card-2) 55%, transparent)"/>
          ${stones}${trees}${petals}
          <g class="sk-card">
            <rect x="14" y="12" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="sk-k">${fmt(k.tokens)} · ${sessions.length} 瓣</text>
            <text x="22" y="43" class="sk-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "樱道", eyebrow: "SAKURA", render };
})();
