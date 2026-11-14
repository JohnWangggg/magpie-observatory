/* -------------------------------------------------------------------- veldt
 * Veldt — flat-topped acacias on golden grass: every quota window
 * is an acacia whose canopy spread = used % (≥85% the canopy burns
 * sunset-orange); sessions are elephants ambling between trees.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "veldt";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(99887766);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 236;

    // golden grass floor
    const grass = `<path d="M 0 ${GY} Q 100 ${GY - 6} 200 ${GY} T 400 ${GY - 4} L 400 300 L 0 300 Z" fill="color-mix(in srgb, #2a2210 74%, var(--card-2))"/>`;
    let blades = "";
    for (let i = 0; i < 30; i++) {
      const bx = 15 + rnd() * (W - 30);
      const bh = 6 + rnd() * 14;
      blades += `<path d="M ${bx.toFixed(1)} ${GY + 4} L ${(bx + (rnd() - .5) * 4).toFixed(1)} ${(GY + 4 - bh).toFixed(1)}" stroke="#8a7a3a" stroke-width=".7" fill="none" opacity="${(.3 + rnd() * .3).toFixed(2)}"/>`;
    }

    // acacias — flat canopy spread = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;
    const trees = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#6a8a4a";
      const th = 60 + f * 80;
      const cw = 18 + f * 30;
      const ch = 8 + f * 10;
      const tipY = GY - th;
      // trunk — slightly leaning
      const lean = (rnd() - .5) * 14;
      const trunk = `<path d="M ${cx - 3} ${GY} Q ${cx - 2 + lean * .3} ${GY - th * .5} ${cx + lean} ${tipY + 4}" stroke="#6a5a3a" stroke-width="${(2.5 + f * 1.5).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
      // flat canopy — umbrella
      const canopy = `<ellipse cx="${cx + lean}" cy="${tipY}" rx="${cw.toFixed(1)}" ry="${ch.toFixed(1)}" fill="${hot ? "color-mix(in srgb, var(--amber) 45%, " + col + ")" : col}" opacity=".85"/>`;
      // canopy highlight
      const hl = `<ellipse cx="${cx + lean}" cy="${tipY - ch * .5}" rx="${(cw * .7).toFixed(1)}" ry="${(ch * .4).toFixed(1)}" fill="${hot ? "var(--amber)" : "color-mix(in srgb, " + col + " 60%, #e8e0a0)"}" opacity=".4"/>`;
      return `<g class="vd-tree${hot ? " hot" : ""}">
        ${trunk}${canopy}${hl}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="vd-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="vd-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // elephants — sessions ambling
    const ellies = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(9, 22 - (s.tps || 0) / 8);
      const y = GY - 10 - (i % 2) * 10;
      const size = 5 + Math.min(4, (s.tokens || 0) / 60000);
      const col = dead ? "var(--red)" : (m.color || "#8a8a7a");
      return `<g class="vd-ellie${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-34} ${y};${W + 34} ${(y + 8).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.8}" ry="${size * 1.1}" fill="${col}"/>
        <path d="M ${size * 1.5} ${-size * .3} L ${size * 2.4} ${-size * .6} L ${size * 2.4} ${size * 1.2} L ${size * 1.8} ${size * 1.2} Z" fill="${col}"/>
        <circle cx="${size * 2}" cy="${-size * .4}" r="${size * .55}" fill="${col}"/>
        <path d="M ${size * 2.4} ${-size * .6} Q ${size * 3} ${-size * .8} ${size * 2.8} ${size * .6}" stroke="${col}" stroke-width="1.4" fill="none"/>
        <ellipse cx="${size * 1.6}" cy="${-size * .4}" rx="${size * .5}" ry="${size * .4}" fill="${col}" opacity=".8"/>
        <line x1="${-size * .9}" y1="${size * .8}" x2="${-size * .9}" y2="${size * 2.2}" stroke="${col}" stroke-width="1.4"/>
        <line x1="${size * .9}" y1="${size * .8}" x2="${size * .9}" y2="${size * 2.2}" stroke="${col}" stroke-width="1.4"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="vd-wrap">
        <div class="vd-head"><b>VELDT</b><span>金合欢=配额窗 冠=用量 象=会话${hotN ? " · " + hotN + " 落日" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1c1810 52%, transparent)" rx="10"/>
          ${grass}${blades}${trees}${ellies}
          <g class="vd-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="vd-k">${fmt(k.tokens)} · ${sessions.length} 象</text>
            <text x="22" y="45" class="vd-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "草原", eyebrow: "VELDT", render };
})();
