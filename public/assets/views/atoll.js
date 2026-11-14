/* -------------------------------------------------------------------- atoll
 * Atoll — a ring of islets around a lagoon: every quota window is an
 * islet on the reef (island size = used %, ≥85% the coral flashes
 * red); sessions are sailboats circling the lagoon.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "atoll";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 7);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, CX = 200, CY = 150, R = 108;
    const n = Math.max(1, quotas.length);

    // islets around the ring — size = used %
    const islets = quotas.map((w, i) => {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const cx = CX + Math.cos(a) * R, cy = CY + Math.sin(a) * R * .82;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#d9b46a";
      const ir = 7 + f * 15;
      // palm on bigger islets
      const palm = ir > 14 ? `<path d="M ${cx} ${cy - ir * .4} q 0 -7 -4 -9 M ${cx} ${cy - ir * .4} q 0 -8 5 -8 M ${cx} ${cy - ir * .4} q -2 -5 -7 -4 M ${cx} ${cy - ir * .4} q 2 -5 7 -3" stroke="#5a8a4a" stroke-width="1.2" fill="none" stroke-linecap="round"/><line x1="${cx}" y1="${cy - ir * .4}" x2="${cx}" y2="${cy - 2}" stroke="#8a6a3a" stroke-width="1"/>` : "";
      // coral flash on hot islets
      const coral = hot ? `<circle cx="${cx + ir * .55}" cy="${cy + ir * .35}" r="2.4" fill="var(--red)">
          <animate attributeName="opacity" values=".9;.25;.9" dur="1.2s" repeatCount="indefinite"/></circle>` : "";
      const labelA = a + Math.PI / n * .6;
      const lx = CX + Math.cos(a) * (R + 20), ly = CY + Math.sin(a) * (R + 20) * .82;
      return `<g class="at-islet${hot ? " hot" : ""}">
        <ellipse cx="${cx.toFixed(1)}" cy="${(cy + ir * .4).toFixed(1)}" rx="${(ir * 1.3).toFixed(1)}" ry="${(ir * .45).toFixed(1)}" fill="color-mix(in srgb, #6a8a9a 30%, transparent)" opacity=".5"/>
        <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${ir.toFixed(1)}" ry="${(ir * .62).toFixed(1)}" fill="color-mix(in srgb, ${col} ${45 + f * 35}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1"/>
        ${palm}${coral}
        <text x="${lx.toFixed(1)}" y="${(ly - 3).toFixed(1)}" class="at-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${lx.toFixed(1)}" y="${(ly + 7).toFixed(1)}" class="at-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // reef ring dashes
    const reef = `<ellipse cx="${CX}" cy="${CY}" rx="${R}" ry="${R * .82}" fill="none" stroke="color-mix(in srgb, #4a8a9a 45%, transparent)" stroke-width="2.5" stroke-dasharray="9 7" opacity=".55"/>`;

    // sailboats — sessions circling the lagoon
    const boats = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(10, 22 - (s.tps || 0) / 8);
      const size = 3.5 + Math.min(4, (s.tokens || 0) / 40000);
      const r2 = R * .52 - i * 7;
      return `<g class="at-boat${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * 2.8).toFixed(1)}s" repeatCount="indefinite"
          path="M ${CX + r2} ${CY} A ${r2} ${r2 * .72} 0 1 1 ${CX - r2} ${CY} A ${r2} ${r2 * .72} 0 1 1 ${CX + r2} ${CY}"/>
        <path d="M ${-size * 1.5} 0 Q 0 ${size * .8} ${size * 1.5} 0 Z" fill="${dead ? "var(--red)" : m.color || "#c98a5a"}"/>
        <line x1="0" y1="0" x2="0" y2="${-size * 1.7}" stroke="#6a5a42" stroke-width="1"/>
        <path d="M 0 ${-size * 1.7} L ${size * 1.25} ${-size * .4} L 0 ${-size * .4} Z" fill="${m.color || "#e8d9b8"}" opacity=".9"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="at-wrap">
        <div class="at-head"><b>ATOLL</b><span>环=配额窗 礁=用量 帆=会话${hotN ? " · " + hotN + " 礁红" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #122028 46%, transparent)" rx="10"/>
          ${reef}${islets}${boats}
          <g class="at-card">
            <rect x="138" y="128" width="124" height="44" rx="8" fill="var(--card-2)" stroke="var(--line-2)" opacity=".92"/>
            <text x="200" y="147" class="at-k" text-anchor="middle">${fmt(k.tokens)} · ${sessions.length} 帆</text>
            <text x="200" y="161" class="at-ksub" text-anchor="middle">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "环礁", eyebrow: "ATOLL", render };
})();
