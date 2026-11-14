/* ------------------------------------------------------------------ eclipse
 * Eclipse — a dark disc = today's total tokens, the quota windows are
 * tiles bolted onto its rim, and the sessions fan out as the corona.
 *   - each window is a labelled notch sitting on the rim; colour = prov,
 *     length along the rim = used % of that ring's slot
 *   - sessions radiate outward; ray length = tokens, colour = agent
 *   - when a window hits ≥85%, its rim tile goes red and the corona
 *     leans that way
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "eclipse";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done");
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));
    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");

    const CX = 200, CY = 200, R_DISC = 92, R_RIM = 128;
    const maxTok = Math.max(1, ...sessions.map(s => s.tokens || 0));

    // corona rays — one per session, jittered angular spread
    const rays = sessions.slice(0, 26).map((s, i) => {
      const base = (i / Math.max(1, sessions.length)) * Math.PI * 2 - Math.PI / 2;
      const a = base + ((i * 37) % 11 - 5) * 0.02; // slight jitter
      const m = metaOf(ameta, s.agent);
      const len = R_RIM + 14 + (s.tokens / maxTok) * 46 + (s.status === "err" ? -10 : 0);
      const x1 = CX + Math.cos(a) * R_RIM, y1 = CY + Math.sin(a) * R_RIM;
      const x2 = CX + Math.cos(a) * len, y2 = CY + Math.sin(a) * len;
      const flare = s.tps && s.tps > 30 ? `<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="2.5" fill="${m.color || "#fbbf24"}" opacity=".9"/>` : "";
      return `<line class="ec-ray${s.status === "err" ? " dead" : ""}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${m.color || "#fbbf24"}" stroke-width="${1.2 + Math.min(2, (s.tokens / maxTok) * 3)}" stroke-linecap="round" opacity="${s.status === "err" ? .3 : .85}"/>${flare}`;
    }).join("");

    // rim tiles — each quota window gets an equal angular slot; its fill
    // covers `used`% of that slot, drawn with a dashed arc offset.
    const slot = (Math.PI * 2) / Math.max(1, quotas.length);
    const tiles = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const a0 = -Math.PI / 2 + i * slot + 0.02;
      const aFill = Math.max(0.015, (Math.min(100, w.used) / 100) * (slot - 0.04));
      const x1 = CX + Math.cos(a0) * R_RIM, y1 = CY + Math.sin(a0) * R_RIM;
      const x2 = CX + Math.cos(a0 + aFill) * R_RIM, y2 = CY + Math.sin(a0 + aFill) * R_RIM;
      const mid = a0 + aFill / 2;
      const lx = CX + Math.cos(mid) * (R_RIM + 16), ly = CY + Math.sin(mid) * (R_RIM + 16);
      return `<g class="ec-tile${hot ? " hot" : ""}">
        <path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R_RIM} ${R_RIM} 0 ${aFill > Math.PI ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}"
          fill="none" stroke="${hot ? "var(--red)" : m.color || "var(--accent)"}" stroke-width="7" opacity=".9"/>
        <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" class="ec-pct" text-anchor="middle">${Math.round(w.used)}%</text>
      </g>`;
    }).join("");

    const hotN = quotas.filter(w => w.used >= 85).length;
    const disc = `
      <circle cx="${CX}" cy="${CY}" r="${R_DISC}" fill="color-mix(in srgb, var(--bg) 88%, #000)" stroke="${hotN ? "var(--red)" : "var(--line-2)"}" stroke-width="1.6"/>
      <circle cx="${CX}" cy="${CY}" r="${R_DISC - 8}" fill="none" stroke="var(--line)" stroke-width="1" opacity=".5"/>
      <text x="${CX}" y="${CY - 6}" class="ec-tok" text-anchor="middle">${fmt(k.tokens)}</text>
      <text x="${CX}" y="${CY + 14}" class="ec-sub" text-anchor="middle">今日 tokens</text>`;

    host.innerHTML = `
      <div class="ec-wrap">
        <div class="ec-head"><b>ECLIPSE</b><span>暗盘=今日总量 · 冕光=会话 · 环沿=配额窗${hotN ? " · " + hotN + " 窗将沸" : ""}</span></div>
        <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
          ${rays}${tiles}${disc}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "日蚀", eyebrow: "ECLIPSE", render };
})();
