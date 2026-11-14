/* ------------------------------------------------------------------ mangrove
 * Mangrove — a tidal flat at low water: every quota window is a
 * mangrove whose stilt roots spread wider as used % climbs
 * (≥85% the crown flushes red-brown); sessions are mudskippers
 * hopping across the wet sand between the trees.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "mangrove";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(74121391);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 226;
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;

    // mangroves — stilt-root spread = used %
    const trees = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#5a8a5a";
      const canopy = 14 + f * 22;
      const spread = 16 + f * 26;
      const trunk = `M ${cx} ${GY - 34} Q ${cx - 2} ${GY - 30} ${cx - 3} ${GY - 22} L ${cx + 3} ${GY - 22} Q ${cx + 2} ${GY - 30} ${cx} ${GY - 34} Z`;
      // stilt roots fanning out — count = 3 + f*4
      const rootN = 3 + Math.round(f * 4);
      let roots = "";
      for (let r = 0; r < rootN; r++) {
        const t = r / Math.max(1, rootN - 1);
        const rx = cx - spread + t * spread * 2;
        const bend = (t - .5) * 8;
        roots += `<path d="M ${cx} ${GY - 22} Q ${(cx + rx) / 2 + bend} ${GY - 12} ${rx.toFixed(1)} ${GY}" stroke="#7a5a3a" stroke-width="1.2" fill="none"/>`;
      }
      // canopy blob — red-brown when hot
      const crown = `<ellipse cx="${cx}" cy="${GY - 40}" rx="${canopy.toFixed(1)}" ry="${(canopy * .62).toFixed(1)}" fill="color-mix(in srgb, ${hot ? "#a05a3a" : col} ${50 + f * 25}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1"/>`;
      return `<g class="mg-tree${hot ? " hot" : ""}">
        ${roots}
        <path d="${trunk}" fill="#7a5a3a"/>
        ${crown}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="mg-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="mg-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // wet-sand sheen + tide pools
    const pools = `<ellipse cx="120" cy="${GY + 4}" rx="30" ry="3" fill="#6ab0c9" opacity=".18"/>
      <ellipse cx="280" cy="${GY + 5}" rx="38" ry="3.5" fill="#6ab0c9" opacity=".15"/>`;

    // mudskippers — sessions hopping
    const skippers = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(7, 16 - (s.tps || 0) / 10);
      const y = GY - 4 - (i % 3) * 8;
      const size = 3 + Math.min(3.5, (s.tokens || 0) / 60000);
      return `<g class="mg-skip${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y.toFixed(1)};${W + 20} ${(y + 2).toFixed(1)}" dur="${dur}s" begin="${(-i * 2.4).toFixed(1)}s" repeatCount="indefinite"/>
        <animateTransform attributeName="transform" type="translate" values="0 0;0 ${-size * .9};0 0" dur=".6s" begin="${(-i * .4).toFixed(1)}s" repeatCount="indefinite" additive="sum"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .6}" fill="${dead ? "var(--red)" : m.color || "#a8985a"}"/>
        <circle cx="${size * 1.1}" cy="${-size * .7}" r="${size * .45}" fill="${dead ? "var(--red)" : m.color || "#a8985a"}"/>
        <circle cx="${size * 1.3}" cy="${-size * .95}" r="${size * .2}" fill="#fff"/>
        <path d="M ${-size * .8} 0 Q ${-size * 1.5} ${size * .5} ${-size * 1.8} 0" stroke="${dead ? "var(--red)" : m.color || "#a8985a"}" stroke-width="1.4" fill="none"/>
        <path d="M ${size * .4} ${size * .4} L ${size * 1} ${size * .9} M ${-size * .3} ${size * .4} L ${-size * 1} ${size * .9}" stroke="${dead ? "var(--red)" : m.color || "#a8985a"}" stroke-width="1" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mg-wrap">
        <div class="mg-head"><b>MANGROVE</b><span>树=配额窗 根=用量 鱼=会话${hotN ? " · " + hotN + " 树枯红" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1c2218 44%, transparent)" rx="10"/>
          <rect x="14" y="${GY}" width="${W - 28}" height="${H - GY - 6}" rx="4" fill="color-mix(in srgb, #6a8a6a 14%, transparent)"/>
          ${pools}${trees}${skippers}
          <g class="mg-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="mg-k">${fmt(k.tokens)} · ${sessions.length} 鱼</text>
            <text x="22" y="45" class="mg-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "红树林", eyebrow: "MANGROVE", render };
})();
