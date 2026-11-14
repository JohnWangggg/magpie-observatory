/* --------------------------------------------------------------------- beach
 * Beach — a sandy shore: every quota window is a wave rolling in,
 * taller as used % climbs (≥85% the crest foams and breaks);
 * sessions are crabs sidling across the sand.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "beach";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(66029413);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, SHORE = 226;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    // waves — curl height = usage; over-quota crests break white/red
    const waves = quotas.map((w, i) => {
      const cx = 30 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const hgt = 24 + f * 120;
      const col = m.color || "#4a8ab8";
      const crestY = SHORE - hgt;
      // curl — a C-path from shore up and back down
      const curl = `<path d="M ${(cx - gap * .4).toFixed(1)} ${SHORE}
        Q ${cx.toFixed(1)} ${crestY.toFixed(1)} ${(cx + gap * .35).toFixed(1)} ${(SHORE - hgt * .4).toFixed(1)}
        Q ${(cx + gap * .5).toFixed(1)} ${SHORE} ${(cx + gap * .1).toFixed(1)} ${SHORE} Z"
        fill="color-mix(in srgb, ${col} ${36 + f * 30}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1.2"/>`;
      // foam dots on the crest when hot
      const foam = hot ? Array.from({ length: 3 }, (_, k) =>
        `<circle cx="${(cx + (k - 1) * 8).toFixed(1)}" cy="${(crestY + 4 + k * 2).toFixed(1)}" r="${(1.4 + f).toFixed(1)}" fill="var(--red)">
          <animate attributeName="cy" values="${(crestY + 4 + k * 2).toFixed(1)};${SHORE - 4}" dur="${(1.6 + k * .3).toFixed(1)}s" begin="${(-k * .5).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".9;0" dur="${(1.6 + k * .3).toFixed(1)}s" begin="${(-k * .5).toFixed(1)}s" repeatCount="indefinite"/></circle>`).join("") : "";
      // splash base
      const base = `<ellipse cx="${cx.toFixed(1)}" cy="${SHORE + 2}" rx="${(gap * .38).toFixed(1)}" ry="${(4 + f * 3).toFixed(1)}" fill="${col}" opacity=".35"/>`;
      return `<g class="bh2-wave${hot ? " hot" : ""}">
        ${base}${curl}${foam}
        <text x="${cx.toFixed(1)}" y="${SHORE + 22}" class="bh2-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${SHORE + 33}" class="bh2-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // crabs — sessions sidling across the sand
    const crabs = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 16 - (s.tps || 0) / 8);
      const y = SHORE + 8 + (i % 2) * 6;
      const sz = 3 + Math.min(3, (s.tokens || 0) / 50000);
      return `<g class="bh2-crab${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-18 + i * 18} ${y};${W + 18} ${y}" dur="${dur}s" begin="${(-i * 2.4).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${sz}" ry="${sz * .7}" fill="${dead ? "var(--red)" : m.color || "#d9754a"}"/>
        <circle cx="${-sz * .4}" cy="${-sz * .6}" r="${sz * .18}" fill="var(--bg)"/>
        <circle cx="${sz * .4}" cy="${-sz * .6}" r="${sz * .18}" fill="var(--bg)"/>
        <path d="M ${-sz} 0 L ${-sz - 2} -${sz * .4} M ${sz} 0 L ${sz + 2} -${sz * .4}" stroke="${dead ? "var(--red)" : "#a85838"}" stroke-width="1"/>
        <path d="M ${-sz} ${sz * .4} L ${-sz - 2} ${sz * .8} M ${sz} ${sz * .4} L ${sz + 2} ${sz * .8}" stroke="${dead ? "var(--red)" : "#a85838"}" stroke-width="1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="bh2-wrap">
        <div class="bh2-head"><b>BEACH</b><span>浪=配额窗 高=用量 蟹=会话${hotN ? " · " + hotN + " 浪碎" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1a2a38 40%, transparent)" rx="10"/>
          <rect x="0" y="${SHORE}" width="${W}" height="${H - SHORE}" fill="color-mix(in srgb, #c9a875 22%, transparent)"/>
          <line x1="0" y1="${SHORE}" x2="${W}" y2="${SHORE}" stroke="var(--line-2)" stroke-opacity=".4"/>
          ${waves}${crabs}
          <g class="bh2-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="bh2-k">${fmt(k.tokens)} · ${sessions.length} 蟹</text>
            <text x="22" y="45" class="bh2-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "海滩", eyebrow: "BEACH", render };
})();
