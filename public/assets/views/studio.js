/* ------------------------------------------------------------------- studio
 * Studio — the easel bay: every provider window is a canvas on an
 * easel, its painted area = used %; a palette of pots sits below;
 * live sessions are brushes leaning on the wall.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "studio";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 4);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, FLOOR = 262;
    const n = Math.max(1, quotas.length);
    const slot = (W - 60) / n;
    const cvW = Math.min(78, slot - 14), cvH = 76;

    const easels = quotas.map((w, i) => {
      const x = 30 + slot * (i + 0.5);
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const y = FLOOR - cvH - 40;
      const fillH = (w.used / 100) * cvH;
      return `<g class="st-easel${hot ? " hot" : ""}" style="--pc:${m.color || "#f472b6"}">
        <rect x="${(x - cvW / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${cvW.toFixed(1)}" height="${cvH.toFixed(1)}" rx="3" fill="var(--card-3)" stroke="var(--line-2)"/>
        <rect x="${(x - cvW / 2 + 4).toFixed(1)}" y="${(y + cvH - fillH).toFixed(1)}" width="${(cvW - 8).toFixed(1)}" height="${fillH.toFixed(1)}"
          fill="${hot ? "var(--red)" : m.color || "#f472b6"}" opacity=".75"/>
        <line x1="${(x - cvW / 2 - 12).toFixed(1)}" y1="${FLOOR}" x2="${x.toFixed(1)}" y2="${y + cvH + 10}" stroke="var(--line-2)" stroke-width="2"/>
        <line x1="${(x + cvW / 2 + 12).toFixed(1)}" y1="${FLOOR}" x2="${x.toFixed(1)}" y2="${y + cvH + 10}" stroke="var(--line-2)" stroke-width="2"/>
        <line x1="${x.toFixed(1)}" y1="${FLOOR}" x2="${x.toFixed(1)}" y2="${y + cvH + 6}" stroke="var(--line-2)" stroke-width="2"/>
        <text x="${x.toFixed(1)}" y="${(y + cvH / 2).toFixed(1)}" class="st-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${FLOOR + 16}" class="st-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // brushes — sessions leaning against the wall, length = tokens
    const brushes = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const x = 30 + i * ((W - 60) / Math.max(1, sessions.length - 1));
      const dead = s.status === "err";
      const h = 34 + Math.min(20, (s.tokens || 0) / 8e5);
      return `<g class="st-brush${dead ? " dead" : ""}" style="transform-origin:${x}px 60px;animation-delay:${(i * 0.4).toFixed(2)}s">
        <rect x="${x - 2}" y="${60 - h}" width="4" height="${h}" rx="2" fill="${m.color || "#f472b6"}" opacity="${dead ? .35 : .9}"/>
        <ellipse cx="${x}" cy="${(60 - h - 4).toFixed(1)}" rx="5" ry="7" fill="${dead ? "var(--red)" : m.color || "#f472b6"}"/>
      </g>`;
    }).join("");

    // paint pots — one per provider in use
    const pots = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const x = 30 + slot * (i + 0.5);
      return `<g>
        <rect x="${x - 10}" y="${FLOOR - 12}" width="20" height="12" rx="2" fill="${m.color || "#f472b6"}" opacity=".85"/>
        <ellipse cx="${x}" cy="${FLOOR - 12}" rx="10" ry="3" fill="var(--card-3)" stroke="var(--line-2)" stroke-width=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="st-wrap">
        <div class="st-head"><b>STUDIO</b><span>架=配额窗 笔=会话 罐=provider${hotN ? " · " + hotN + " 架溢出" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="0" y1="${FLOOR}" x2="${W}" y2="${FLOOR}" stroke="var(--line-2)" stroke-width="1.6"/>
          ${brushes}${easels}${pots}
          <g class="st-card">
            <rect x="${W - 136}" y="12" width="122" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 126}" y="30" class="st-k">${fmt(k.tokens)} · ${sessions.length} 笔</text>
            <text x="${W - 126}" y="43" class="st-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "画室", eyebrow: "STUDIO", render };
})();
