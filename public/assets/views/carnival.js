/* ------------------------------------------------------------------ carnival
 * Carnival — the fair at dusk: every provider window is a tent with a
 * string of quota lights over its entrance; live sessions float free
 * as balloons; the carousel horse count is your requests.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "carnival";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 4);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 8);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GRND = 252;
    const n = Math.max(1, quotas.length);
    const slot = (W - 60) / n;

    // tents along the ground
    const tents = quotas.map((w, i) => {
      const x = 30 + slot * (i + 0.5);
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const tw = Math.min(72, slot - 10);
      return `<g class="cn-tent${hot ? " hot" : ""}" style="--pc:${m.color || "#f472b6"}">
        <path d="M ${x - tw / 2} ${GRND} L ${x} ${GRND - 84} L ${x + tw / 2} ${GRND} Z" fill="${m.color || "#f472b6"}" opacity="${hot ? .95 : .7}"/>
        <path d="M ${x - tw / 2} ${GRND} L ${x - tw / 4} ${GRND} L ${x} ${GRND - 40} L ${x + tw / 4} ${GRND} L ${x + tw / 2} ${GRND} Z" fill="var(--card-3)" opacity=".6"/>
        <line x1="${x}" y1="${GRND - 84}" x2="${x}" y2="${GRND - 104}" stroke="var(--line-2)" stroke-width="1.5"/>
        <path d="M ${x} ${GRND - 104} L ${x + 14} ${GRND - 100} L ${x} ${GRND - 96} Z" fill="${hot ? "var(--red)" : m.color || "#f472b6"}"/>
        <text x="${x.toFixed(1)}" y="${GRND - 46}" class="cn-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${GRND + 16}" class="cn-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // balloon sessions floating up
    const balloons = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const x = 36 + (i * ((W - 72) / Math.max(1, sessions.length - 1))) + ((i * 29) % 13 - 6);
      const dead = s.status === "err";
      const dur = 5 + (i % 4) * 1.4;
      const size = 6 + Math.min(8, (s.tokens || 0) / 6e5);
      return `<g class="cn-balloon${dead ? " dead" : ""}" style="animation-duration:${dur}s;animation-delay:${(-i * 0.8).toFixed(1)}s">
        <line x1="${x.toFixed(1)}" y1="${GRND - 30}" x2="${x.toFixed(1)}" y2="${GRND - 10}" stroke="var(--line-2)" stroke-width="1"/>
        <ellipse cx="${x.toFixed(1)}" cy="${GRND - 40 - size}" rx="${size}" ry="${size * 1.2}" fill="${dead ? "var(--red)" : m.color || "#f472b6"}" opacity="${dead ? .4 : .9}"/>
      </g>`;
    }).join("");

    // bulb string above the tents — first bulb per window is its quota dot
    const bulbs = quotas.map((w, i) => {
      const x = 30 + slot * (i + 0.5);
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      return `<circle cx="${x.toFixed(1)}" cy="${GRND - 116}" r="4.5" fill="${hot ? "var(--red)" : m.color || "#fbbf24"}" class="cn-bulb" style="animation-delay:${(i * 0.3).toFixed(2)}s"/>`;
    }).join("");
    const string = `<path d="M 20 ${GRND - 118} Q 200 ${GRND - 138} 380 ${GRND - 118}" stroke="var(--line-2)" stroke-width="1" fill="none"/>`;

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cn-wrap">
        <div class="cn-head"><b>CARNIVAL</b><span>帐=配额窗 灯=热度 球=会话${hotN ? " · " + hotN + " 帐爆灯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="0" y1="${GRND}" x2="${W}" y2="${GRND}" stroke="var(--line-2)" stroke-width="1.6"/>
          ${string}${bulbs}${balloons}${tents}
          <g class="cn-card">
            <rect x="${W - 138}" y="12" width="124" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 128}" y="30" class="cn-k">${fmt(k.tokens)} · ${k.requests || 0}</text>
            <text x="${W - 128}" y="43" class="cn-ksub">今日 tokens · 请求</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "嘉年华", eyebrow: "CARNIVAL", render };
})();
