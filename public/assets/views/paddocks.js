/* ------------------------------------------------------------------ paddocks
 * Paddocks — fenced horse paddocks on a farm: every quota
 * window is a paddock whose fence length = used % (≥85% the
 * top rail burns amber); sessions are foals trotting the rails.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "paddocks";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(88779900);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 245;

    // farm sky
    const sky = `<defs><linearGradient id="pd-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c8e0c0"/><stop offset="100%" stop-color="#e0f0d0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#pd-s)" rx="10"/>`;
    // barn silhouette
    const barn = `<rect x="15" y="${GY - 45}" width="30" height="35" rx="2" fill="#b8a898" opacity=".25"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #a8c088 55%, var(--card-2))"/>`;
    // grass tufts
    let grass = "";
    for (let i = 0; i < 15; i++) {
      grass += `<line x1="${(rnd() * W).toFixed(1)}" y1="${(GY + 5 + rnd() * 30).toFixed(1)}" x2="${(rnd() * W).toFixed(1)}" y2="${(GY + 8 + rnd() * 30).toFixed(1)}" stroke="#7a9a58" stroke-width=".7" opacity="${(.2 + rnd() * .15).toFixed(2)}"/>`;
    }

    // paddocks — fence length = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const fences = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#987858";
      const fw = 12 + f * 25;
      const fh = 15 + f * 55;
      const topY = GY - fh;
      // fence posts
      const postL = `<line x1="${cx - fw / 2}" y1="${GY}" x2="${cx - fw / 2}" y2="${topY - 3}" stroke="${col}" stroke-width="2" opacity=".7"/>`;
      const postR = `<line x1="${cx + fw / 2}" y1="${GY}" x2="${cx + fw / 2}" y2="${topY - 3}" stroke="${col}" stroke-width="2" opacity=".7"/>`;
      // rails
      const rail1 = `<line x1="${cx - fw / 2}" y1="${topY}" x2="${cx + fw / 2}" y2="${topY}" stroke="${col}" stroke-width="1.5" opacity=".6"/>`;
      const rail2 = `<line x1="${cx - fw / 2}" y1="${topY + fh * .4}" x2="${cx + fw / 2}" y2="${topY + fh * .4}" stroke="${col}" stroke-width="1.2" opacity=".5"/>`;
      const rail3 = `<line x1="${cx - fw / 2}" y1="${topY + fh * .75}" x2="${cx + fw / 2}" y2="${topY + fh * .75}" stroke="${col}" stroke-width="1" opacity=".45"/>`;
      // hay bale
      const hay = `<circle cx="${cx}" cy="${GY - 10}" r="${(4 + f * 3).toFixed(1)}" fill="#c8b878" opacity=".6"/>`;
      // hot amber top rail
      const glow = hot ? `<line x1="${cx - fw / 2}" y1="${topY - 2}" x2="${cx + fw / 2}" y2="${topY - 2}" stroke="var(--amber)" stroke-width="2" opacity=".6">
        <animate attributeName="opacity" values=".6;.15;.6" dur="1.8s" repeatCount="indefinite"/></line>` : "";
      return `<g class="pd-fence${hot ? " hot" : ""}">
        ${postL}${postR}${rail1}${rail2}${rail3}${hay}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="pd-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="pd-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // foals — trotting the rails
    const foals = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 13 - (s.tps || 0) / 13);
      const y = GY - 10 - (i % 3) * 12;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#a07040");
      return `<g class="pd-foal${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y};${W + 20} ${(y - 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.3}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * .8}" cy="${-size * .25}" rx="${size * .35}" ry="${size * .2}" fill="${col}"/>
        <path d="M ${size * 1} ${-size * .1} L ${size * 1.6} ${-size * .6}" stroke="${col}" stroke-width=".8" fill="none"/>
        <path d="M ${-size * .9} ${size * .3} L ${-size * 1.4} ${size * .9}" stroke="${col}" stroke-width=".7" fill="none"/>
        <path d="M ${-size * .2} ${size * .4} L ${-size * .3} ${size * 1.2}" stroke="${col}" stroke-width=".5" fill="none"/>
        <path d="M ${size * .3} ${size * .4} L ${size * .4} ${size * 1.1}" stroke="${col}" stroke-width=".5" fill="none"/>
        <path d="M ${size * 1.5} ${-size * .4} L ${size * 1.9} ${-size * .1}" stroke="${col}" stroke-width=".3" fill="none" opacity=".6"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="pd-wrap">
        <div class="pd-head"><b>PADDOCKS</b><span>围场=配额窗 栏长=用量 小马=会话${hotN ? " · " + hotN + " 燃栏" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${barn}${ground}${grass}${fences}${foals}
          <g class="pd-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="pd-k">${fmt(k.tokens)} · ${sessions.length} 驹</text>
            <text x="22" y="45" class="pd-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "围场", eyebrow: "PADDOCKS", render };
})();
