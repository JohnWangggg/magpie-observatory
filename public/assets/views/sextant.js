/* --------------------------------------------------------------- sextant
 * Sextant view — model latencies map to altitude arcs on a navigator's
 * half-circle. Slow models point high, fast models skim the horizon;
 * color = provider.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sextant";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  const LAT_MIN = 50, LAT_MAX = 4000;

  function altitude(ms) {
    // log-scaled latency → 0..1 → altitude arc 0..90°
    const f = (Math.log(ms) - Math.log(LAT_MIN)) / (Math.log(LAT_MAX) - Math.log(LAT_MIN));
    return Math.max(0, Math.min(1, f));
  }

  function render(host, ctx) {
    const logs = ctx.data.logs || [];
    const sessions = ctx.data.sessions || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const modelStats = new Map();
    logs.forEach(l => {
      const ms = l.ttft_ms || l.ms || 0;
      if (!ms) return;
      const m = (l.model || "?").split("/").pop();
      if (!modelStats.has(m)) modelStats.set(m, { n: 0, ms: 0, prov: l.provider, model: m });
      const s = modelStats.get(m);
      s.n++; s.ms += ms;
    });
    sessions.forEach(s => {
      const ms = s.ttft || 0;
      if (!ms) return;
      const m = (s.model || "?").split("/").pop();
      if (!modelStats.has(m)) modelStats.set(m, { n: 0, ms: 0, prov: s.provider, model: m });
      const st = modelStats.get(m);
      st.n++; st.ms += ms;
    });

    const rows = [...modelStats.values()].map(s => ({
      ...s, avg: s.ms / Math.max(1, s.n), alt: altitude(s.ms / Math.max(1, s.n)), col: metaOf(s.prov).color || "#8b7cf6",
    })).sort((a, b) => a.avg - b.avg).slice(0, 14);

    if (!rows.length) { host.innerHTML = `<div class="sx-empty">暂无延迟样本</div>`; return; }

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H - 24, R = Math.min(W / 2 - 40, H - 60);

    let g = `<g class="sx-frame">
      <path d="M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}" fill="none" stroke="var(--faint)" stroke-width="1"/>
      ${[30, 60, 90].map(a => {
        const rad = a * Math.PI / 180;
        const r2 = R * a / 90;
        return `<path d="M ${cx - r2} ${cy} A ${r2} ${r2} 0 0 1 ${cx + r2} ${cy}" fill="none" stroke="var(--faint)" stroke-width=".5" stroke-dasharray="2 3"/>`;
      }).join("")}
      <line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="var(--line)" stroke-width="1"/>
    </g>`;

    rows.forEach((s, i) => {
      const spread = (i / Math.max(1, rows.length - 1) - 0.5) * 0.55; // ±0.275 rad spread
      const altRad = s.alt * Math.PI / 2;                          // 0..90°
      const az = spread * Math.PI;                                  // ±0.55π spread
      const x = cx + Math.sin(az) * R * Math.cos(altRad) * (1 - s.alt * 0.15);
      const y = cy - R * Math.sin(altRad) * 0.94;
      const rr = 3 + Math.min(6, s.n * 0.35);
      g += `<g class="sx-mark" data-alt="${(s.alt * 90).toFixed(1)}">
        <line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${s.col}" stroke-width=".4" opacity=".45"/>
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(1)}" fill="${s.col}" opacity=".85" data-model="${esc(s.model)}"/>
        <text x="${x.toFixed(1)}" y="${(y - rr - 3).toFixed(1)}" text-anchor="middle" class="sx-lab">${esc(s.model)} · ${Math.round(s.avg)}ms</text>
      </g>`;
    });
    g += `<text x="${cx}" y="${cy + 18}" text-anchor="middle" class="sx-cap">慢=高角 · 快=贴地平线 · 点大小=样本数</text>`;

    host.innerHTML = `<svg class="sx-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "六分仪", eyebrow: "LATITUDE OF LATENCY", render };
})();
