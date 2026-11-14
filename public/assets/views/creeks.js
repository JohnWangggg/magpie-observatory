/* ------------------------------------------------------------------ creeks
 * Creeks — tidal channels snaking through mudflats: every
 * quota window is a channel bend whose width = used %
 * (≥85% the channel marker burns amber); sessions are
 * sandpipers probing the mud.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "creeks";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(14115577);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 245;

    // estuary sky
    const sky = `<defs><linearGradient id="cq-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c0ccd0"/><stop offset="100%" stop-color="#e0dcd0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#cq-s)" rx="10"/>`;
    // distant sea line
    const seaLine = `<rect x="0" y="80" width="${W}" height="12" fill="color-mix(in srgb, #5888a0 50%, var(--card-2))" opacity=".5"/>`;
    // mudflat
    const mud = `<rect x="0" y="92" width="${W}" height="${GY - 92}" fill="color-mix(in srgb, #988878 60%, var(--card-2))"/>`;
    // mud texture
    let cracks = "";
    for (let i = 0; i < 12; i++) {
      cracks += `<path d="M ${(rnd() * W).toFixed(1)} ${(100 + rnd() * 130).toFixed(1)} l ${(rnd() * 15 - 7).toFixed(1)} ${(rnd() * 8).toFixed(1)} l ${(rnd() * 10 - 5).toFixed(1)} ${(rnd() * 6).toFixed(1)}" stroke="#786858" stroke-width=".6" fill="none" opacity="${(.3 + rnd() * .2).toFixed(2)}"/>`;
    }
    // shore grass
    const shore = `<path d="M 0 ${GY} L 0 ${GY - 15} Q 100 ${GY - 28} 200 ${GY - 18} Q 300 ${GY - 30} 400 ${GY - 20} L 400 ${GY} Z" fill="color-mix(in srgb, #687858 65%, var(--card-2))"/>`;
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #586848 60%, var(--card-2))"/>`;

    // channels — bend width = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const channels = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#487890";
      const cw = 6 + f * 22;
      // winding channel — S-curve from top to bottom
      const ch = `<path d="M ${cx} 92 Q ${cx + cw} ${92 + (GY - 92) * .25} ${cx - cw * .5} ${92 + (GY - 92) * .5} Q ${cx - cw * 1.2} ${92 + (GY - 92) * .75} ${cx} ${GY}" stroke="color-mix(in srgb, ${col} 65%, #385868)" stroke-width="${cw}" fill="none" opacity=".8" stroke-linecap="round"/>`;
      // inner water shine
      const shine = `<path d="M ${cx} 92 Q ${cx + cw} ${92 + (GY - 92) * .25} ${cx - cw * .5} ${92 + (GY - 92) * .5} Q ${cx - cw * 1.2} ${92 + (GY - 92) * .75} ${cx} ${GY}" stroke="#88b8d0" stroke-width="${cw * .3}" fill="none" opacity=".3"/>`;
      // channel marker post
      const postY = 92 + (GY - 92) * .5;
      const post = `<line x1="${cx - cw * .5}" y1="${postY}" x2="${cx - cw * .5}" y2="${postY - 15}" stroke="#685848" stroke-width="1.5"/>`;
      const flag = `<path d="M ${cx - cw * .5} ${postY - 15} L ${cx - cw * .5 + 7} ${postY - 12} L ${cx - cw * .5} ${postY - 9} Z" fill="${hot ? "var(--amber)" : "#c05040"}"/>`;
      const glow = hot ? `<circle cx="${cx - cw * .5 + 2}" cy="${postY - 12}" r="6" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="6;10" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="cq-chan${hot ? " hot" : ""}">
        ${ch}${shine}${post}${flag}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="cq-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="cq-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // sandpipers — probing the mud
    const pipers = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 11 - (s.tps || 0) / 13);
      const y = 130 + (i % 3) * 30;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#887858");
      const x0 = 40 + rnd() * (W - 100);
      return `<g class="cq-piper${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${x0.toFixed(1)} ${y};${(x0 + 50).toFixed(1)} ${(y - 3).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1" keyTimes="0;1"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .45}" fill="${col}"/>
        <circle cx="${size * .6}" cy="${-size * .25}" r="${size * .3}" fill="${col}"/>
        <line x1="${size * .8}" y1="${-size * .2}" x2="${size * 1.6}" y2="${size * .3}" stroke="${col}" stroke-width=".6" opacity=".8"/>
        <line x1="0" y1="${size * .4}" x2="-.5" y2="${size * 1.1}" stroke="${col}" stroke-width=".4"/>
        <line x1="${size * .3}" y1="${size * .4}" x2="${size * .4}" y2="${size * 1.1}" stroke="${col}" stroke-width=".4"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cq-wrap">
        <div class="cq-head"><b>CREEKS</b><span>潮沟=配额窗 宽=用量 鹬=会话${hotN ? " · " + hotN + " 燃标" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${seaLine}${mud}${cracks}${shore}${ground}${channels}${pipers}
          <g class="cq-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="cq-k">${fmt(k.tokens)} · ${sessions.length} 鹬</text>
            <text x="22" y="45" class="cq-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "潮沟", eyebrow: "CREEKS", render };
})();
