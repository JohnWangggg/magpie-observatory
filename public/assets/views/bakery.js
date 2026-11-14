/* ------------------------------------------------------------------- bakery
 * Bakery — the morning shift: every agent is an oven door on the
 * counter, its loaf inside is the session (colour = provider,
 * height = tokens); the quota windows are proofing thermometers
 * nailed above the ovens. Over 85% a thermometer glows and the loaf
 * next to it edges towards burnt.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bakery";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, COUNTER = 244;
    const n = Math.max(1, sessions.length);
    const ovenW = Math.min(64, (W - 40) / n - 10);

    const ovens = sessions.map((s, i) => {
      const x = 20 + (i + 0.5) * ((W - 40) / n);
      const m = metaOf(ameta, s.agent);
      const pm = metaOf(pmeta, s.provider);
      const dead = s.status === "err";
      const loafH = 14 + Math.min(22, (s.tokens || 0) / 4e5);
      const loafY = COUNTER - 20 - loafH;
      return `<g class="bk-oven${dead ? " dead" : ""}" style="--ac:${m.color || "#8b7cf6"}">
        <rect x="${(x - ovenW / 2).toFixed(1)}" y="${(COUNTER - 78).toFixed(1)}" width="${ovenW.toFixed(1)}" height="78" rx="4" fill="var(--card-2)" stroke="var(--line-2)"/>
        <rect x="${(x - ovenW / 2 + 6).toFixed(1)}" y="${(COUNTER - 70).toFixed(1)}" width="${(ovenW - 12).toFixed(1)}" height="56" rx="3"
          fill="color-mix(in srgb, ${m.color || "#f59e0b"} ${dead ? "10" : "20"}%, var(--card))" stroke="var(--line-2)" stroke-width="1"/>
        <rect x="${(x - ovenW / 2).toFixed(1)}" y="${(COUNTER - 88).toFixed(1)}" width="${ovenW.toFixed(1)}" height="12" rx="2" fill="${m.color || "#8b7cf6"}" opacity=".9"/>
        <ellipse class="bk-loaf${dead ? " dead" : ""}" cx="${x.toFixed(1)}" cy="${(loafY + loafH / 2).toFixed(1)}" rx="${(ovenW / 3).toFixed(1)}" ry="${(loafH / 2).toFixed(1)}"
          fill="${dead ? "var(--red)" : pm.color || "#f59e0b"}" opacity=".95"/>
        <text x="${x.toFixed(1)}" y="${(COUNTER - 76).toFixed(1)}" class="bk-tps" text-anchor="middle">${s.tps ? s.tps.toFixed(0) + " t/s" : "—"}</text>
        <text x="${x.toFixed(1)}" y="${COUNTER + 16}" class="bk-name" text-anchor="middle">${esc((m.name || s.agent).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // proofing thermometers on the shelf above
    const therms = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const x = 50 + i * ((W - 100) / Math.max(1, quotas.length - 1));
      const y = 30;
      const h = 26;
      const fill = (w.used / 100) * h;
      const hot = w.used >= 85;
      return `<g class="bk-therm${hot ? " hot" : ""}">
        <rect x="${x - 3}" y="${y - h}" width="6" height="${h}" rx="3" fill="none" stroke="var(--line-2)" stroke-width="1"/>
        <rect x="${x - 2.2}" y="${y - fill}" width="4.4" height="${fill}" rx="2" fill="${hot ? "var(--red)" : m.color || "var(--amber)"}"/>
        <circle cx="${x}" cy="${y + 4}" r="5" fill="${hot ? "var(--red)" : m.color || "var(--amber)"}" opacity=".95"/>
        <text x="${x + 12}" y="${y + 2}" class="bk-tpct">${Math.round(w.used)}%</text>
        <text x="${x + 12}" y="${y + 12}" class="bk-tname">${esc((m.name || w.prov).slice(0, 5))}</text>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="bk-wrap">
        <div class="bk-head"><b>BAKERY</b><span>炉=agent 包=会话 计=配额${hotN ? " · " + hotN + " 计报警" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="0" y1="76" x2="${W}" y2="76" stroke="var(--line-2)" stroke-width="1.2" stroke-dasharray="6 4" opacity=".5"/>
          <line x1="0" y1="${COUNTER}" x2="${W}" y2="${COUNTER}" stroke="var(--line-2)" stroke-width="2"/>
          ${therms}${ovens}
          <g class="bk-card">
            <rect x="${W - 134}" y="${COUNTER + 18}" width="120" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 124}" y="${COUNTER + 36}" class="bk-k">${fmt(k.tokens)} · ${sessions.length} 炉</text>
            <text x="${W - 124}" y="${COUNTER + 49}" class="bk-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "面包房", eyebrow: "BAKERY", render };
})();
