/* ---------------------------------------------------------------- observatory
 * Observatory — the hilltop dome: each provider window is a dome
 * silhouette on the ridge (the aperture slit opens wider as the
 * window fills); live sessions are telescopes parked on tripods
 * along the ridge; a moon hangs for the day's total.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "observatory";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, RIDGE = 236;
    const n = Math.max(1, quotas.length);
    const slot = (W - 70) / n;
    const dw = Math.min(58, slot - 8);

    const domes = quotas.map((w, i) => {
      const x = 35 + slot * (i + 0.5);
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const r = dw / 2;
      const slitW = 6 + (w.used / 100) * 14; // wider = hotter
      return `<g class="ob-dome${hot ? " hot" : ""}" style="--pc:${m.color || "#8b7cf6"}">
        <path d="M ${(x - r).toFixed(1)} ${RIDGE} A ${r} ${r} 0 0 1 ${(x + r).toFixed(1)} ${RIDGE} Z" fill="${hot ? "color-mix(in srgb, var(--red) 20%, var(--card-2))" : "var(--card-2)"}" stroke="var(--line-2)"/>
        <rect x="${(x - slitW / 2).toFixed(1)}" y="${(RIDGE - r * 0.92).toFixed(1)}" width="${slitW.toFixed(1)}" height="${(r * 0.9).toFixed(1)}" rx="2" fill="${hot ? "var(--red)" : m.color || "#fbbf24"}" opacity=".8"/>
        <rect x="${(x - r).toFixed(1)}" y="${RIDGE}" width="${dw.toFixed(1)}" height="10" fill="var(--card-3)" stroke="var(--line-2)"/>
        <text x="${x.toFixed(1)}" y="${RIDGE + 26}" class="ob-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${RIDGE + 38}" class="ob-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // telescopes — one per session, tilted, tube length = tokens
    const scopes = sessions.map((s, i) => {
      const x = 34 + i * ((W - 68) / Math.max(1, sessions.length - 1));
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const len = 20 + Math.min(16, (s.tokens || 0) / 8e5);
      const tilt = -22 - (i % 3) * 8;
      return `<g class="ob-scope${dead ? " dead" : ""}" transform="translate(${x} ${RIDGE - 12}) rotate(${tilt})">
        <rect x="0" y="-3" width="${len}" height="6" rx="3" fill="${dead ? "var(--red)" : m.color || "#fbbf24"}" opacity="${dead ? .4 : .95}"/>
        <line x1="${len * 0.4}" y1="3" x2="${len * 0.2}" y2="20" stroke="var(--line-2)" stroke-width="1.6"/>
        <line x1="${len * 0.4}" y1="3" x2="${len * 0.6}" y2="20" stroke="var(--line-2)" stroke-width="1.6"/>
        <line x1="${len * 0.4}" y1="3" x2="${len * 0.4}" y2="22" stroke="var(--line-2)" stroke-width="1.6"/>
        <text x="0" y="34" class="ob-sname" transform="rotate(${-tilt})">${esc((m.name || s.agent).slice(0, 5))}</text>
      </g>`;
    }).join("");

    // stars + moon
    const stars = Array.from({ length: 18 }, (_, i) => {
      const x = (i * 37) % W, y = (i * 23) % 110;
      return `<circle cx="${x}" cy="${y}" r="${0.8 + (i % 3) * 0.4}" fill="var(--fg-2)" opacity="${0.3 + (i % 4) * 0.15}"/>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ob-wrap">
        <div class="ob-head"><b>OBSERVATORY</b><span>穹=配额窗 镜=会话 缝=用量${hotN ? " · " + hotN + " 顶报警" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          ${stars}
          <circle cx="${W - 50}" cy="44" r="16" fill="color-mix(in srgb, var(--amber) 30%, var(--card-3))" opacity=".8"/>
          <line x1="0" y1="${RIDGE}" x2="${W}" y2="${RIDGE}" stroke="var(--line-2)" stroke-width="1.6"/>
          ${scopes}${domes}
          <g class="ob-card">
            <rect x="${W - 140}" y="${RIDGE + 50}" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 130}" y="${RIDGE + 68}" class="ob-k">${fmt(k.tokens)} · ${sessions.length} 镜</text>
            <text x="${W - 130}" y="${RIDGE + 81}" class="ob-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "天文台", eyebrow: "OBSERVATORY", render };
})();
