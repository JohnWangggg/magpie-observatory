/* ------------------------------------------------------------------- subway
 * Subway — the metro map: each provider window is a station on a
 * coloured line (fill = used %, ring glows when hot); sessions are
 * little train cars riding the line; the control-room board shows
 * the day's total.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "subway";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, LINE_Y = 150;

    // one horizontal line; stations sit on it at even spacing
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / (n - 1 || 1);
    const stops = quotas.map((w, i) => {
      const x = 40 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const r = 7;
      const fill = w.used / 100;
      const frac = Math.PI * 2 * fill;
      const x2 = x + Math.cos(-Math.PI / 2 + frac) * r;
      const y2 = LINE_Y + Math.sin(-Math.PI / 2 + frac) * r;
      return `<g class="su-stop${hot ? " hot" : ""}" style="--pc:${m.color || "#f472b6"}">
        <circle cx="${x.toFixed(1)}" cy="${LINE_Y}" r="${r + 4}" fill="none" stroke="var(--line-2)" stroke-width="1" opacity=".5"/>
        <path d="M ${x.toFixed(1)} ${(LINE_Y - r).toFixed(1)} A ${r} ${r} 0 ${fill > 0.5 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}"
          fill="none" stroke="${hot ? "var(--red)" : m.color || "#f472b6"}" stroke-width="3" opacity=".9"/>
        <circle cx="${x.toFixed(1)}" cy="${LINE_Y}" r="${r - 3}" fill="var(--card-3)" stroke="var(--line-2)" stroke-width=".8"/>
        <text x="${x.toFixed(1)}" y="${LINE_Y - 16}" class="su-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${LINE_Y + 24}" class="su-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
        <text x="${x.toFixed(1)}" y="${LINE_Y + 36}" class="su-win" text-anchor="middle">${esc(w.name.slice(0, 8))}</text>
      </g>`;
    }).join("");

    // trains — sessions ride the line; car count = tries, speed = tps
    const trains = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const cars = Math.min(3, Math.max(1, (s.tries || []).length));
      const dur = Math.max(4, 12 - (s.tps || 0) / 18);
      const body = Array.from({ length: cars }, (_, j) =>
        `<rect x="${(-cars * 24 + j * 24).toFixed(1)}" y="-6" width="20" height="10" rx="3" fill="${dead ? "var(--red)" : m.color || "#f472b6"}" opacity="${dead ? .4 : .95}"/>`).join("");
      return `<g class="su-train${dead ? " dead" : ""}" style="animation-duration:${dur}s;animation-delay:${(-i * 1.6).toFixed(1)}s">
        ${body}
        <animateTransform attributeName="transform" type="translate" values="-40 ${LINE_Y};${W + 40} ${LINE_Y}" dur="${dur}s" begin="${(-i * 1.6).toFixed(1)}s" repeatCount="indefinite"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="su-wrap">
        <div class="su-head"><b>SUBWAY</b><span>站=配额窗 车=会话 线=路线${hotN ? " · " + hotN + " 站报警" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="30" y1="${LINE_Y}" x2="${W - 30}" y2="${LINE_Y}" stroke="var(--line-2)" stroke-width="3" opacity=".5"/>
          ${stops}${trains}
          <g class="su-card">
            <rect x="${W - 140}" y="${LINE_Y - 96}" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 130}" y="${LINE_Y - 78}" class="su-k">${fmt(k.tokens)} · ${sessions.length} 列</text>
            <text x="${W - 130}" y="${LINE_Y - 65}" class="su-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "地铁图", eyebrow: "SUBWAY", render };
})();
