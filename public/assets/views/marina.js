/* -------------------------------------------------------------------- marina
 * Marina — a moonlit dock: every quota window is a moored boat whose
 * mast stands taller as used % climbs (≥85% the hull sits low and the
 * masthead lamp glows red); sessions are gulls crossing the harbour.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "marina";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(33051791);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WL = 198;                     // waterline
    const n = Math.max(1, quotas.length);
    const gap = (W - 72) / n;

    // boats — hull & mast, taller mast = higher usage
    const boats = quotas.map((w, i) => {
      const cx = 36 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const mast = 34 + f * 88;                           // mast height above hull
      const hullW = 30 + f * 8;
      const sink = f * 7;                                 // sinks lower when loaded
      const col = m.color || "#7a9ab5";
      const lamp = hot
        ? `<circle cx="${cx.toFixed(1)}" cy="${(WL - sink - mast - 5).toFixed(1)}" r="2.4" fill="var(--red)">
             <animate attributeName="opacity" values="1;.25;1" dur="1.2s" repeatCount="indefinite"/></circle>`
        : `<circle cx="${cx.toFixed(1)}" cy="${(WL - sink - mast - 5).toFixed(1)}" r="1.8" fill="#f7e1a3" opacity=".9"/>`;
      // reflection below waterline
      const refl = `<rect x="${(cx - hullW / 2).toFixed(1)}" y="${WL + 2}" width="${hullW.toFixed(1)}" height="${(8 + f * 6).toFixed(1)}" rx="2" fill="${col}" opacity="${(0.16 - f * .08).toFixed(2)}">
        <animate attributeName="height" values="${(8 + f * 6).toFixed(1)};${(6 + f * 4).toFixed(1)};${(8 + f * 6).toFixed(1)}" dur="2.8s" repeatCount="indefinite"/></rect>`;
      return `<g class="mr-boat${hot ? " hot" : ""}">
        ${refl}
        <path d="M ${(cx - hullW / 2).toFixed(1)} ${WL - sink} L ${(cx + hullW / 2).toFixed(1)} ${WL - sink} L ${(cx + hullW / 2 - 4).toFixed(1)} ${WL - sink + 10} L ${(cx - hullW / 2 + 4).toFixed(1)} ${WL - sink + 10} Z"
          fill="color-mix(in srgb, ${col} ${34 + f * 26}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1"/>
        <line x1="${cx.toFixed(1)}" y1="${(WL - sink).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(WL - sink - mast).toFixed(1)}" stroke="${col}" stroke-width="1.6"/>
        <path d="M ${cx.toFixed(1)} ${(WL - sink - mast).toFixed(1)} L ${(cx + 10).toFixed(1)} ${(WL - sink - mast + 4).toFixed(1)} L ${(cx + 6).toFixed(1)} ${(WL - sink - mast + 16).toFixed(1)} L ${cx.toFixed(1)} ${(WL - sink - mast + 14).toFixed(1)} Z"
          fill="color-mix(in srgb, ${col} 70%, #fff)" opacity=".92"/>
        ${lamp}
        <text x="${cx.toFixed(1)}" y="${WL + 24}" class="mr-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${WL + 35}" class="mr-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // gulls — sessions gliding across the sky
    const gulls = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(7, 18 - (s.tps || 0) / 8);
      const y = 40 + (i % 3) * 22 + rnd() * 8;
      return `<g class="mr-gull${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-24 + i * 20} ${y};${W + 24} ${y}" dur="${dur}s" begin="${(-i * 2.8).toFixed(1)}s" repeatCount="indefinite"/>
        <path d="M -8 0 Q -4 -5 0 0 Q 4 -5 8 0" fill="none" stroke="${dead ? "var(--red)" : m.color || "#cfd8dc"}" stroke-width="1.6" stroke-linecap="round">
          <animate attributeName="d" values="M -8 0 Q -4 -5 0 0 Q 4 -5 8 0;M -8 -2 Q -4 3 0 -2 Q 4 3 8 -2;M -8 0 Q -4 -5 0 0 Q 4 -5 8 0" dur=".9s" repeatCount="indefinite"/>
        </path>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mr-wrap">
        <div class="mr-head"><b>MARINA</b><span>船=配额窗 桅=用量 鸥=会话${hotN ? " · " + hotN + " 船沉半" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #101822 38%, transparent)" rx="10"/>
          <circle cx="348" cy="46" r="18" fill="#f2e3b3" opacity=".9"/>
          <circle cx="340" cy="40" r="4" fill="#d4c48a" opacity=".5"/>
          <circle cx="354" cy="52" r="3" fill="#d4c48a" opacity=".5"/>
          <rect x="0" y="${WL}" width="${W}" height="${H - WL}" fill="color-mix(in srgb, #1e3a52 24%, transparent)"/>
          <line x1="0" y1="${WL}" x2="${W}" y2="${WL}" stroke="var(--line-2)" stroke-opacity=".45"/>
          ${boats}${gulls}
          <g class="mr-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="mr-k">${fmt(k.tokens)} · ${sessions.length} 鸥</text>
            <text x="22" y="45" class="mr-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "码头", eyebrow: "MARINA", render };
})();
