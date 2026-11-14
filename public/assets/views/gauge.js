/* ----------------------------------------------------------------- gauge
 * Gauge view — every KPI and quota window as a dashboard gauge:
 *   KPI gauges (requests / tokens / cost / TPS / success rate) up top,
 *   one gauge per provider's shortest quota window below.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "gauge";

  function fmt(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
    return String(Math.round(n));
  }
  const pct = v => Math.min(100, Math.max(0, v));
  const risk = p => (p >= 88 ? "#f26d7f" : p >= 62 ? "#fbbf24" : "#5ad4a6");

  // one gauge: SVG arc from -135° to +135°, needle at pct
  function gaugeSvg(p, color, size = 92) {
    const cx = size / 2, cy = size / 2 + 6, r = size / 2 - 8;
    const a0 = -135, a1 = 135;
    const pt = (deg, rr) => {
      const rad = (deg - 90) * Math.PI / 180;
      return [cx + rr * Math.cos(rad), cy + rr * Math.sin(rad)];
    };
    const arc = (deg) => {
      const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
      const large = deg > 180 ? 1 : 0;
      const [xe, ye] = pt(a0 + deg, r);
      return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${large} 1 ${xe.toFixed(1)},${ye.toFixed(1)}`;
    };
    const total = 270;
    const deg = (p / 100) * total;
    const [nx, ny] = pt(a0 + deg, r - 8);
    return `<svg class="gauge-svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <path d="${arc(total)}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="7" stroke-linecap="round"/>
      <path d="${arc(deg)}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round" class="gauge-arc"/>
      <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="${color}" stroke-width="1.8" stroke-linecap="round" class="gauge-needle"/>
      <circle cx="${cx}" cy="${cy}" r="3" fill="${color}"/>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="13" font-weight="700" fill="rgba(255,255,255,.92)" font-family="var(--mono)">${Math.round(p)}%</text>
    </svg>`;
  }

  function render(host, ctx) {
    const kpis = ctx.kpis || {};
    const quotas = ctx.quotas || [];
    const esc = ctx.esc || (x => String(x));
    const meta = ctx.providerMeta || {}; const metaOf = k => (typeof meta === "function" ? meta(k) : (meta[k] || {}));

    // KPI gauges
    const sess = (ctx.data.sessions || []).filter(s => s.status === "streaming" || s.status === "active");
    const errs = (ctx.data.logs || []).filter(l => !l.ok && !l.canceled).length;
    const total = (ctx.data.logs || []).length;
    const kpiDefs = [
      { label: "请求数", val: kpis.requests ?? 0, max: Math.max(kpis.requests ?? 1, (kpis.requests ?? 0) * 1.6), fmt: v => fmt(v), sub: kpis.requestsDelta ? `${kpis.requestsDelta > 0 ? "+" : ""}${kpis.requestsDelta}%` : "" },
      { label: "Token", val: kpis.tokens ?? 0, max: Math.max(kpis.tokens ?? 1, (kpis.tokens ?? 0) * 1.6), fmt: v => fmt(v), sub: kpis.tokensDelta ? `${kpis.tokensDelta > 0 ? "+" : ""}${kpis.tokensDelta}%` : "" },
      { label: "费用", val: kpis.cost ?? 0, max: Math.max(kpis.cost ?? 1, (kpis.cost ?? 0) * 1.6), fmt: v => "$" + (+v).toFixed(1), sub: kpis.costDelta ? `${kpis.costDelta > 0 ? "+" : ""}${kpis.costDelta}%` : "" },
      { label: "成功率", val: total ? ((total - errs) / total * 100) : 0, max: 100, fmt: v => (+v).toFixed(1) + "%", sub: `${errs} 错` },
      { label: "活跃会话", val: sess.length, max: Math.max(sess.length, 4), fmt: v => String(v), sub: `${(ctx.data.sessions || []).length} 总` },
      { label: "在飞请求", val: (ctx.data.concurrency?.inFlight ?? ctx.data.kpis?.inFlight ?? sess.length), max: Math.max(sess.length, 4), fmt: v => String(v), sub: "并发" },
    ];
    const kpiCards = kpiDefs.map(d => {
      const p = pct((d.val / Math.max(1, d.max)) * 100);
      const col = d.label === "成功率" ? (d.val >= 95 ? "#5ad4a6" : d.val >= 80 ? "#fbbf24" : "#f26d7f") : "var(--accent)";
      return `<div class="gauge-card" role="img" aria-label="${d.label} ${Math.round(p)}%">
        ${gaugeSvg(p, col)}
        <div class="gauge-lab"><b>${esc(d.label)}</b><span>${d.fmt(d.val)}${d.sub ? ` <i class="${String(d.sub).startsWith("-") ? "dn" : "up"}">${esc(d.sub)}</i>` : ""}</span></div>
      </div>`;
    }).join("");

    // quota gauges
    const quotaCards = quotas.flatMap(q =>
      (q.windows || []).slice(0, 2).map(w => {
        const p = pct(w.used ?? 0);
        const col = risk(p);
        return `<div class="gauge-card quota" role="button" tabindex="0" data-prov="${esc(q.provider || "")}" data-win="${esc(w.name || "")}" aria-label="${esc(q.name)} ${esc(w.name)} ${Math.round(p)}% · 点击看烧速" title="${esc(q.name)} · ${esc(w.name)} · ${Math.round(p)}% · 点击看烧速">
          ${gaugeSvg(p, col, 84)}
          <div class="gauge-lab"><b>${esc(q.name)}</b><span>${esc(w.name)} · ${w.resetsIn != null ? Math.round(w.resetsIn / 60) + "h" : ""}</span></div>
        </div>`;
      })
    ).join("");

    host.innerHTML = `
      <div class="gauge-wrap">
        <div class="gauge-sec"><h4>关键指标</h4><div class="gauge-grid kpi">${kpiCards}</div></div>
        <div class="gauge-sec"><h4>配额窗口 <small>${quotas.length}</small></h4><div class="gauge-grid">${quotaCards}</div></div>
      </div>`;
    // quota gauge → burn view
    host.querySelectorAll(".gauge-card.quota").forEach(c => {
      const go = () => {
        try {
          if (typeof localStorage !== "undefined") localStorage.setItem("magpie.burnSel", JSON.stringify({ prov: c.dataset.prov, win: c.dataset.win }));
        } catch (_) {}
        document.querySelector('[data-hero="burn"]')?.click();
      };
      c.addEventListener("click", go);
      c.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); go(); } });
    });
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "仪表盘",
    eyebrow: "GAUGE MATRIX",
    render
  };
})();
