/* -------------------------------------------------------------------- marsh
 * Marsh — cattail reeds in shallow water: every quota window is a
 * reed bed whose cattail head height = used % (≥85% the heads go
 * ripe brown and shed fluff); sessions are herons stalking the
 * shallows.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "marsh";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(44556677);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 236;

    // shallow water — duckweed dots + slow ripples
    const water = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #1a3028 68%, var(--card-2))"/>`;
    let duckweed = "";
    for (let i = 0; i < 18; i++) {
      duckweed += `<circle cx="${(15 + rnd() * (W - 30)).toFixed(1)}" cy="${(GY + 6 + rnd() * 50).toFixed(1)}" r="${(.8 + rnd() * 1.6).toFixed(1)}" fill="#5a9a4a" opacity="${(.3 + rnd() * .3).toFixed(2)}"/>`;
    }

    // reed beds — cattail head height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const beds = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#5a8a4a";
      const rh = 30 + f * 80;
      const reeds = Math.round(4 + f * 10);
      let stalks = "";
      for (let b = 0; b < reeds; b++) {
        const bx = cx - gap * .3 + rnd() * gap * .6;
        const bh = rh * (.5 + rnd() * .5);
        const sway = (rnd() - .5) * 10;
        stalks += `<path d="M ${bx.toFixed(1)} ${GY} Q ${(bx + sway * .4).toFixed(1)} ${(GY - bh * .6).toFixed(1)} ${(bx + sway).toFixed(1)} ${(GY - bh).toFixed(1)}" stroke="${hot ? "#7a6a3a" : "#4a7a3a"}" stroke-width=".9" fill="none" opacity=".8"/>`;
        // cattail head — brown cylinder, sheds fluff when hot
        if (bh > 22) {
          stalks += `<rect x="${(bx + sway - 1.4).toFixed(1)}" y="${(GY - bh - 8).toFixed(1)}" width="2.8" height="${(6 + f * 4).toFixed(1)}" rx="1.4" fill="${hot ? "var(--amber)" : "#8a5a2a"}"/>`;
          if (hot) {
            stalks += `<circle cx="${(bx + sway).toFixed(1)}" cy="${(GY - bh - 10).toFixed(1)}" r=".9" fill="#f0e8d0" opacity=".8">
              <animate attributeName="cy" values="${(GY - bh - 10).toFixed(1)};${(GY - bh - 24 - rnd() * 12).toFixed(1)}" dur="${(1.4 + rnd()).toFixed(1)}s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values=".8;0" dur="${(1.4 + rnd()).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
          }
        }
      }
      return `<g class="mh-bed${hot ? " hot" : ""}">
        ${stalks}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="mh-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="mh-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // herons — sessions stalking the shallows
    const herons = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const hx = 50 + i * 70 + rnd() * 20;
      const hy = GY - 4;
      const size = 4 + Math.min(3, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#7a9ab8");
      const step = `<animateTransform attributeName="transform" type="translate" values="${hx.toFixed(1)} ${hy};${(hx + 8 + rnd() * 8).toFixed(1)} ${hy};${hx.toFixed(1)} ${hy}" dur="${(6 + rnd() * 4).toFixed(1)}s" begin="${(-i * 2).toFixed(1)}s" repeatCount="indefinite"/>`;
      return `<g class="mh-heron${dead ? " dead" : ""}">
        ${step}
        <line x1="0" y1="0" x2="0" y2="${-size * 2.2}" stroke="#3a4a5a" stroke-width="1.2"/>
        <line x1="0" y1="${-size * .8}" x2="${size * 1.2}" y2="${-size * 2}" stroke="${col}" stroke-width="1.6"/>
        <ellipse cx="${size * 1.4}" cy="${-size * 2.2}" rx="${size * .9}" ry="${size * .55}" fill="${col}"/>
        <circle cx="${size * 2}" cy="${-size * 2.6}" r="${size * .35}" fill="${col}"/>
        <path d="M ${size * 2.2} ${-size * 2.6} L ${size * 3.2} ${-size * 2.8} L ${size * 2.2} ${-size * 2.4} Z" fill="#d8c880"/>
        <line x1="${-size * .8}" y1="0" x2="${-size * .8}" y2="${size * 1.4}" stroke="#3a4a5a" stroke-width="1"/>
        <line x1="${size * .8}" y1="0" x2="${size * .8}" y2="${size * 1.4}" stroke="#3a4a5a" stroke-width="1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mh-wrap">
        <div class="mh-head"><b>MARSH</b><span>蒲=配额窗 高=用量 鹭=会话${hotN ? " · " + hotN + " 熟穗" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #121a14 54%, transparent)" rx="10"/>
          ${water}${duckweed}${beds}${herons}
          <g class="mh-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="mh-k">${fmt(k.tokens)} · ${sessions.length} 鹭</text>
            <text x="22" y="45" class="mh-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "芦苇荡", eyebrow: "MARSH", render };
})();
