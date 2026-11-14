/* ------------------------------------------------------------------ desert
 * Desert — dunes at dusk: every quota window is a dune that swells with
 * used % (≥85% the sand glows ember-red and the shimmer thickens);
 * sessions are a camel caravan crossing in front of the sun.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "desert";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(78510419);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, BASE = 246;
    const n = Math.max(1, quotas.length);
    const gap = W / n;

    // low sun
    const sun = `<circle cx="330" cy="70" r="26" fill="#f2b65a" opacity=".8"/>
      <circle cx="330" cy="70" r="38" fill="#f2b65a" opacity=".14"/>`;

    const dunes = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const h = 24 + f * 74;                          // dune height
      const x0 = i * gap - gap * .3, x1 = (i + 1) * gap + gap * .3;
      const peak = x0 + gap * (.35 + (i % 2) * .3);
      const col = hot ? "#c96a45" : m.color || "#d9a05a";
      // heat shimmer lines over the crest
      const shim = hot ? `<path d="M ${peak - 16} ${BASE - h - 8} q 8 -6 16 0 t 16 0" fill="none" stroke="#e8956a" stroke-width="1" opacity=".5">
          <animate attributeName="d" values="M ${peak - 16} ${BASE - h - 8} q 8 -6 16 0 t 16 0;M ${peak - 16} ${BASE - h - 11} q 8 6 16 0 t 16 0;M ${peak - 16} ${BASE - h - 8} q 8 -6 16 0 t 16 0" dur="2.4s" repeatCount="indefinite"/></path>` : "";
      return `<g class="ds-dune${hot ? " hot" : ""}">
        <path d="M ${x0.toFixed(1)} ${BASE} Q ${peak.toFixed(1)} ${(BASE - h * 1.5).toFixed(1)} ${x1.toFixed(1)} ${BASE} Z"
          fill="color-mix(in srgb, ${col} ${28 + Math.round(f * 30)}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-opacity=".5"/>
        <path d="M ${(peak - 8).toFixed(1)} ${(BASE - h * 1.16).toFixed(1)} q 4 -4 9 -2" fill="none" stroke="#f5d9a8" stroke-width="1" opacity=".6"/>
        ${shim}
        <text x="${(peak).toFixed(1)}" y="${BASE - h * 1.5 + 16}" class="ds-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${(x0 + x1) / 2 + gap * .1}" y="${BASE + 22}" class="ds-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // caravan — camel silhouettes walking across
    const camels = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const y = BASE - 24 - (i % 2) * 10;
      const dur = Math.max(10, 26 - (s.tps || 0) / 6);
      return `<g class="ds-camel${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="-30 ${y};${W + 30} ${y}" dur="${dur}s" begin="${(-i * 4).toFixed(1)}s" repeatCount="indefinite"/>
        <g fill="${dead ? "var(--red)" : "#3a2c20"}">
          <path d="M 0 0 q 3 -8 7 -8 q 2 -5 6 -5 q 5 0 7 6 l 4 1 q 3 6 -1 6 h -20 q -4 0 -3 0 Z"/>
          <line x1="4" y1="0" x2="4" y2="8" stroke="${dead ? "var(--red)" : "#3a2c20"}" stroke-width="1.8"/>
          <line x1="12" y1="0" x2="12" y2="8" stroke="${dead ? "var(--red)" : "#3a2c20"}" stroke-width="1.8"/>
          <line x1="19" y1="0" x2="19" y2="8" stroke="${dead ? "var(--red)" : "#3a2c20"}" stroke-width="1.8"/>
          <rect x="8" y="-12" width="6" height="4" rx="1.5" fill="${m.color || "#e8b25a"}"/>
        </g>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ds-wrap">
        <div class="ds-head"><b>DESERT</b><span>丘=配额窗 高=用量 驼=会话${hotN ? " · " + hotN + " 丘灼热" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #2a1d14 30%, transparent)" rx="10"/>
          ${sun}
          <rect x="0" y="${BASE}" width="${W}" height="${H - BASE}" fill="color-mix(in srgb, #8a5f36 26%, transparent)"/>
          ${dunes}${camels}
          <g class="ds-card">
            <rect x="14" y="12" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="ds-k">${fmt(k.tokens)} · ${sessions.length} 驼</text>
            <text x="22" y="43" class="ds-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "沙丘", eyebrow: "DESERT", render };
})();
