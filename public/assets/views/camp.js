/* -------------------------------------------------------------------- camp
 * Camp — a night clearing: every quota window is a campfire whose flame
 * grows with used % (≥85% it flares wild and red); sessions are tents
 * lit from inside, with fireflies drifting between them.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "camp";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(32452843);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 224;         // ground line
    const n = Math.max(1, quotas.length);
    const gap = (W - 56) / n;

    // stars
    let stars = "";
    for (let i = 0; i < 18; i++) {
      const sx = rnd() * W, sy = rnd() * 110;
      stars += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="${(rnd() * .9 + .4).toFixed(1)}" fill="#dfe8f5" opacity="${(.2 + rnd() * .5).toFixed(2)}"/>`;
    }

    const fires = quotas.map((w, i) => {
      const cx = 34 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const fh = 14 + f * 42;                          // flame height
      const fw = 9 + f * 10;                           // flame width
      const col = hot ? "var(--red)" : f > .6 ? "var(--amber)" : m.color || "#f2a541";
      const dur = (0.5 + (1 - f) * 0.8).toFixed(2);
      // logs
      const logs = `<line x1="${cx - 13}" y1="${GY}" x2="${cx + 11}" y2="${GY - 7}" stroke="#8a6a48" stroke-width="4" stroke-linecap="round"/>
                    <line x1="${cx + 13}" y1="${GY}" x2="${cx - 11}" y2="${GY - 7}" stroke="#7a5c3e" stroke-width="4" stroke-linecap="round"/>`;
      // flame: two overlaid teardrops wobbling
      const flame = (h, w2, y, fill, op, d, delay) => `
        <path d="M ${cx.toFixed(1)} ${y - h} q ${w2} ${h * .45} 0 ${h} q ${-w2} ${-h * .55} 0 ${-h} Z"
          fill="${fill}" opacity="${op}">
          <animateTransform attributeName="transform" type="scale" values="1 1;1.08 .92;.96 1.05;1 1" dur="${d}s" begin="${delay}s" repeatCount="indefinite" additive="sum"/>
        </path>`;
      // sparks
      let sparks = "";
      for (let s2 = 0; s2 < Math.round(f * 4); s2++) {
        sparks += `<circle cx="${cx.toFixed(1)}" cy="${GY - fh}" r=".9" fill="${col}">
          <animate attributeName="cy" values="${GY - fh};${GY - fh - 20 - rnd() * 18}" dur="${(1.4 + rnd()).toFixed(1)}s" begin="${(-s2 * .5).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="cx" values="${cx.toFixed(1)};${(cx + (rnd() * 14 - 7)).toFixed(1)}" dur="${(1.4 + rnd()).toFixed(1)}s" begin="${(-s2 * .5).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".9;0" dur="${(1.4 + rnd()).toFixed(1)}s" begin="${(-s2 * .5).toFixed(1)}s" repeatCount="indefinite"/>
        </circle>`;
      }
      return `<g class="cm-fire${hot ? " hot" : ""}">
        <circle cx="${cx.toFixed(1)}" cy="${(GY - fh * .5).toFixed(1)}" r="${(fh * .9).toFixed(1)}" fill="${col}" opacity="${hot ? ".16" : ".09"}"/>
        ${logs}
        ${flame(fh, fw, GY - 4, col, hot ? ".95" : ".8", dur, 0)}
        ${flame(fh * .62, fw * .6, GY - 5, "#ffe9b0", .9, dur * .8, -.2)}
        ${sparks}
        <text x="${cx.toFixed(1)}" y="${GY + 22}" class="cm-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 33}" class="cm-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // tents — sessions glowing from inside
    const tents = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const x = 60 + i * 92;
      const lit = !dead;
      return `<g class="cm-tent${dead ? " dead" : ""}" transform="translate(${x},${GY - 40})">
        <path d="M 0 26 L 14 0 L 28 26 Z" fill="color-mix(in srgb, ${m.color || "#8fa9c9"} ${lit ? "42%" : "18%"}, var(--card-2))" stroke="${lit ? m.color || "#8fa9c9" : "var(--line-2)"}" stroke-width="1"/>
        ${lit ? `<path d="M 10 26 L 14 14 L 18 26 Z" fill="#ffe9b0" opacity=".85"><animate attributeName="opacity" values=".85;.5;.8;.65" dur="${(2 + i * .4).toFixed(1)}s" repeatCount="indefinite"/></path>` : ""}
        ${dead ? `<line x1="8" y1="8" x2="20" y2="8" stroke="var(--red)" stroke-width="1.4"/>` : ""}
      </g>`;
    }).join("");

    // fireflies wandering
    let flies = "";
    for (let i = 0; i < 6; i++) {
      const fx = 30 + rnd() * 340, fy = 120 + rnd() * 90;
      flies += `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="1.3" fill="#e8ff9a" class="cm-fly" style="animation-delay:${(-i * .9).toFixed(1)}s"/>`;
    }

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cm-wrap">
        <div class="cm-head"><b>CAMP</b><span>火=配额窗 焰=用量 帐=会话${hotN ? " · " + hotN + " 火失控" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #0d1420 34%, transparent)" rx="10"/>
          ${stars}
          <rect x="16" y="${GY}" width="${W - 32}" height="3" rx="1.5" fill="var(--line-2)" opacity=".7"/>
          ${fires}${tents}${flies}
          <g class="cm-card">
            <rect x="14" y="12" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="cm-k">${fmt(k.tokens)} · ${sessions.length} 帐</text>
            <text x="22" y="43" class="cm-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "营地", eyebrow: "CAMP", render };
})();
