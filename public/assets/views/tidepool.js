/* ---------------------------------------------------------------- tidepool
 * Tide pool — the quota windows as tidal pools:
 *   each provider window is a horizontal band whose water level = used %,
 *   with a wave crest animated by the live tps; sessions are shells on
 *   the sand underneath, coloured by agent.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tidepool";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0, resetsIn: w.resetsIn
    }))).slice(0, 6);
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 10);
    const ameta = ctx.agentMeta || {};
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const n = quotas.length;

    if (!n) { host.innerHTML = `<div class="tp-empty">暂无配额</div>`; return; }

    const rowH = (H - 34) / n;
    const avgTps = sessions.filter(s => s.tps).reduce((a, s) => a + s.tps, 0) || 60;

    // one tidal band per quota window
    const bands = quotas.map((w, i) => {
      const y0 = 30 + i * rowH;
      const lvl = Math.min(1, w.used / 100);
      const waterTop = y0 + rowH * (1 - lvl);
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#56d4dd";
      const hot = w.used >= 85;
      const waveAmp = 2 + Math.min(6, avgTps / 30);
      const dur = (3200 - Math.min(1600, avgTps * 8)).toFixed(0);
      const wave = `M0,${waterTop.toFixed(0)} Q${W * 0.25},${(waterTop - waveAmp).toFixed(0)} ${W * 0.5},${waterTop.toFixed(0)} T${W},${waterTop.toFixed(0)} L${W},${y0 + rowH} L0,${y0 + rowH} Z`;
      return `<g class="tp-band" data-prov="${esc(w.prov)}" data-i="${i}">
        <rect x="0" y="${y0}" width="${W}" height="${rowH - 4}" rx="5" fill="var(--card-2)" stroke="var(--line)"/>
        <path class="tp-water${hot ? " hot" : ""}" d="${wave}" fill="${col}" opacity="${hot ? ".42" : ".22"}">
          <animate attributeName="d" values="${wave};M0,${waterTop.toFixed(0)} Q${W * 0.25},${(waterTop + waveAmp).toFixed(0)} ${W * 0.5},${waterTop.toFixed(0)} T${W},${waterTop.toFixed(0)} L${W},${y0 + rowH} L0,${y0 + rowH} Z;${wave}" dur="${dur}ms" repeatCount="indefinite"/>
        </path>
        <text class="tp-prov" x="12" y="${(y0 + rowH * 0.42).toFixed(0)}">${esc(m.name || w.prov)}</text>
        <text class="tp-name" x="12" y="${(y0 + rowH * 0.72).toFixed(0)}">${esc(w.name)}${w.resetsIn != null ? " · " + w.resetsIn + "h" : ""}</text>
        <text class="tp-pct${hot ? " hot" : ""}" x="${W - 14}" y="${(y0 + rowH * 0.55).toFixed(0)}" text-anchor="end">${Math.round(w.used)}%</text>
      </g>`;
    }).join("");

    // sand + shells under the last band
    const sandY = 30 + n * rowH;
    const shells = sessions.map((s, i) => {
      const t = i / Math.max(1, sessions.length - 1);
      const x = 20 + t * (W - 40);
      const y = sandY + 8 + (i % 3) * 6;
      const col = metaOf(ameta, s.agent).color || "#8b7cf6";
      const dim = s.status === "done" || s.status === "error";
      const r = 2.5 + Math.min(3, (s.tokens || 0) / 300000);
      return `<circle class="tp-shell${dim ? " dim" : ""}" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(1)}" fill="${col}" opacity="${dim ? ".35" : ".85"}"><title>${esc(s.title)}</title></circle>`;
    }).join("");

    host.innerHTML = `
      <div class="tp-wrap">
        <div class="tp-head"><b>TIDEPOOL</b><span>配额潮汐 · 水位=已用% · 浪速=TPS</span></div>
        <svg class="tp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          ${bands}
          <line x1="0" x2="${W}" y1="${sandY.toFixed(0)}" y2="${sandY.toFixed(0)}" stroke="var(--line-2)" stroke-width="1" stroke-dasharray="2 5"/>
          ${shells}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "潮汐池", eyebrow: "TIDEPOOL", render };
})();
