/* -------------------------------------------------------------------- pond
 * Pond — a lotus pond at noon: each quota window is a lotus pad whose
 * rings of ripple spread as used % climbs (≥85% the pad blushes red);
 * sessions are frogs that hop between pads, each leap a soft plop.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pond";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(91571);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300;
    const n = Math.max(1, quotas.length);
    const gap = (W - 56) / n;

    // pads — lotus leaves with ripple rings
    const pads = quotas.map((w, i) => {
      const cx = 34 + gap / 2 + i * gap;
      const cy = 150 + (i % 2) * 22;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const r = 20 + f * 16;
      // ripple rings: 1–3 spread wider as fill climbs
      const rings = [r + 8, r + 20, r + 34].slice(0, 1 + Math.round(f * 2)).map((rr, j) =>
        `<ellipse cx="${cx.toFixed(1)}" cy="${cy}" rx="${rr}" ry="${rr * .34}" fill="none" stroke="#7db8a8" stroke-width="1" opacity="${(.5 - j * .14).toFixed(2)}">
          <animate attributeName="rx" values="${rr};${rr + 8}" dur="${(3 + j * 1.1).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="ry" values="${(rr * .34).toFixed(1)};${((rr + 8) * .34).toFixed(1)}" dur="${(3 + j * 1.1).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="${(.5 - j * .14).toFixed(2)};0" dur="${(3 + j * 1.1).toFixed(1)}s" repeatCount="indefinite"/>
        </ellipse>`
      ).join("");
      return `<g class="po-pad${hot ? " hot" : ""}">
        ${rings}
        <ellipse cx="${cx.toFixed(1)}" cy="${cy}" rx="${r.toFixed(1)}" ry="${(r * .38).toFixed(1)}"
          fill="color-mix(in srgb, ${hot ? "var(--red)" : "#3f8f6a"} ${52 + Math.round(f * 20)}%, var(--card-2))"/>
        <path d="M ${cx} ${cy} L ${(cx + r * .9).toFixed(1)} ${(cy - r * .18).toFixed(1)}" stroke="var(--card-2)" stroke-width="2.5" opacity=".8"/>
        ${f > .4 ? `<circle cx="${cx.toFixed(1)}" cy="${cy - 7}" r="4" fill="#f5c8d8"/>` : ""}
        <text x="${cx.toFixed(1)}" y="${cy + r + 24}" class="po-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${cy + r + 35}" class="po-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // frogs — sessions hopping on a short arc
    const frogs = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const x = 60 + i * 92, y = 236 + (i % 2) * 12;
      const dur = Math.max(2.2, 5 - (s.tps || 0) / 30);
      return `<g class="po-frog${dead ? " dead" : ""}" transform="translate(${x},${y})">
        <animateTransform attributeName="transform" type="translate" values="${x} ${y};${x + 26} ${y - 18};${x + 52} ${y}" dur="${dur}s" begin="${(-i * .8).toFixed(1)}s" repeatCount="indefinite" keyTimes="0;.5;1" calcMode="spline" keySplines=".4 0 .6 1;.4 0 .6 1"/>
        <ellipse cx="0" cy="-3" rx="6.5" ry="4.5" fill="${dead ? "var(--red)" : m.color || "#58a36a"}"/>
        <circle cx="-3" cy="-7" r="2" fill="${dead ? "var(--red)" : m.color || "#58a36a"}"/>
        <circle cx="3" cy="-7" r="2" fill="${dead ? "var(--red)" : m.color || "#58a36a"}"/>
        <circle cx="-3" cy="-7" r=".8" fill="var(--bg)"/><circle cx="3" cy="-7" r=".8" fill="var(--bg)"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="po-wrap">
        <div class="po-head"><b>POND</b><span>莲=配额窗 漪=用量 蛙=会话${hotN ? " · " + hotN + " 莲泛红" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #14342e 30%, transparent)" rx="10"/>
          ${pads}${frogs}
          <g class="po-card">
            <rect x="14" y="12" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="po-k">${fmt(k.tokens)} · ${sessions.length} 蛙</text>
            <text x="22" y="43" class="po-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "荷塘", eyebrow: "POND", render };
})();
