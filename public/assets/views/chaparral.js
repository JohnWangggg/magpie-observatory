/* ---------------------------------------------------------------- chaparral
 * Chaparral — drought-scrub hills in dry heat: every quota window
 * is a scrub bush whose height = used % (≥85% the bush scorches
 * ember-red); sessions are coyotes loping the ridgeline.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "chaparral";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(33445566);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 244;

    // dry hill silhouette
    const hill = `<path d="M 0 ${GY} Q 100 ${GY - 20} 200 ${GY - 10} T 400 ${GY - 16} L 400 300 L 0 300 Z" fill="color-mix(in srgb, #2a2014 76%, var(--card-2))"/>`;
    // dry grass tufts
    let dry = "";
    for (let i = 0; i < 20; i++) {
      const bx = 15 + rnd() * (W - 30);
      dry += `<path d="M ${bx.toFixed(1)} ${GY + 4} L ${(bx + (rnd() - .5) * 3).toFixed(1)} ${(GY - 6 - rnd() * 8).toFixed(1)}" stroke="#9a8a5a" stroke-width=".7" fill="none" opacity="${(.25 + rnd() * .25).toFixed(2)}"/>`;
    }

    // scrub bushes — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const bushes = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#5a7a4a";
      const bh = 20 + f * 70;
      const bw = 14 + f * 18;
      const tipY = GY - bh;
      // scrubby branches — gnarled lines
      let branches = "";
      for (let b = 0; b < 5 + Math.round(f * 6); b++) {
        const bx = cx - bw * .6 + rnd() * bw * 1.2;
        const bbh = bh * (.4 + rnd() * .6);
        branches += `<path d="M ${bx.toFixed(1)} ${GY} Q ${(bx + (rnd() - .5) * 8).toFixed(1)} ${(GY - bbh * .6).toFixed(1)} ${(bx + (rnd() - .5) * 10).toFixed(1)} ${(GY - bbh).toFixed(1)}" stroke="${hot ? "#8a5a2a" : "#4a6a3a"}" stroke-width="${(1 + f * .8).toFixed(1)}" fill="none" opacity=".8"/>`;
      }
      // crown — denser when hot
      const crown = `<ellipse cx="${cx}" cy="${tipY + 6}" rx="${bw.toFixed(1)}" ry="${(bh * .35).toFixed(1)}" fill="${hot ? "color-mix(in srgb, var(--red) 35%, " + col + ")" : col}" opacity="${(.5 + f * .3).toFixed(2)}"/>`;
      return `<g class="ch-bush${hot ? " hot" : ""}">
        ${branches}${crown}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="ch-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="ch-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // coyotes — sessions loping the ridgeline
    const coyotes = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(7, 16 - (s.tps || 0) / 10);
      const y = GY - 14 - (i % 2) * 12;
      const size = 4 + Math.min(3, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#a88a5a");
      return `<g class="ch-coyote${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-26} ${y};${W + 26} ${(y + 6).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.7}" ry="${size * .8}" fill="${col}"/>
        <path d="M ${size * 1.4} ${-size * .3} L ${size * 2.2} ${-size * 1} L ${size * 2.6} ${-size * .8} L ${size * 1.9} ${size * .2} Z" fill="${col}"/>
        <circle cx="${size * 2.4}" cy="${-size * .9}" r="${size * .4}" fill="${col}"/>
        <path d="M ${size * 2.4} ${-size * 1.2} L ${size * 2.6} ${-size * 1.8} M ${size * 2.4} ${-size * 1.2} L ${size * 2.1} ${-size * 1.7}" stroke="${col}" stroke-width="1"/>
        <path d="M ${-size * 1.5} ${size * .3} Q ${-size * 2.4} ${size * .6} ${-size * 2.7} ${-size * .2}" stroke="${col}" stroke-width="1.2" fill="none"/>
        <line x1="${-size * .8}" y1="${size * .7}" x2="${-size * .8}" y2="${size * 1.8}" stroke="${col}" stroke-width="1.1"/>
        <line x1="${size * .8}" y1="${size * .7}" x2="${size * .8}" y2="${size * 1.8}" stroke="${col}" stroke-width="1.1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ch-wrap">
        <div class="ch-head"><b>CHAPARRAL</b><span>灌=配额窗 高=用量 狼=会话${hotN ? " · " + hotN + " 焦冠" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1c1610 52%, transparent)" rx="10"/>
          ${hill}${dry}${bushes}${coyotes}
          <g class="ch-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ch-k">${fmt(k.tokens)} · ${sessions.length} 狼</text>
            <text x="22" y="45" class="ch-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "灌丛", eyebrow: "CHAPARRAL", render };
})();
