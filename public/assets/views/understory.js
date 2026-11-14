/* ------------------------------------------------------------------ understory
 * Understory — the dim floor of a mature forest: every quota
 * window is a sapling whose canopy density = used % (≥85% the
 * crown flashes amber); sessions are squirrels darting between trunks.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "understory";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(22334455);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 228;

    // deep forest backdrop
    const backdrop = `<defs><linearGradient id="un-b" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a1510"/><stop offset="100%" stop-color="#152a20"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#un-b)" rx="10"/>`;
    // canopy above
    const canopy = `<path d="M 0 0 L 0 30 L 40 22 L 90 35 L 160 20 L 230 32 L 300 18 L 370 28 L 400 22 L 400 0 Z" fill="#0a1a12" opacity=".85"/>`;
    // leaf litter
    let litter = "";
    for (let i = 0; i < 18; i++) {
      litter += `<ellipse cx="${(rnd() * W).toFixed(1)}" cy="${(GY + rnd() * 20).toFixed(1)}" rx="${(2 + rnd() * 4).toFixed(1)}" ry="${(1 + rnd() * 2).toFixed(1)}" fill="#4a3a20" opacity="${(.15 + rnd() * .15).toFixed(2)}"/>`;
    }
    // dappled floor
    let dapple = "";
    for (let i = 0; i < 10; i++) {
      dapple += `<ellipse cx="${(rnd() * W).toFixed(1)}" cy="${(GY + 8 + rnd() * 15).toFixed(1)}" rx="${(4 + rnd() * 8).toFixed(1)}" ry="${(2 + rnd() * 3).toFixed(1)}" fill="#5a7a4a" opacity="${(.06 + rnd() * .1).toFixed(2)}"/>`;
    }
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #1a2a20 75%, var(--card-2))"/>`;

    // saplings — canopy density = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const saplings = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#3a7a4a";
      const th = 30 + f * 75;
      const cw = 10 + f * 20;
      const cy2 = GY - th;
      // trunk
      const trunk = `<path d="M ${cx} ${GY} L ${cx - 2} ${cy2 + 10} M ${cx} ${GY} L ${cx + 2} ${cy2 + 10} M ${cx} ${GY - th * .5} L ${cx - 5} ${cy2 + 15}" stroke="#4a3a28" stroke-width="${(1.5 + f * 2).toFixed(1)}" fill="none"/>`;
      // leaf clusters
      const leafCount = 3 + Math.floor(f * 4);
      let leaves = "";
      for (let l = 0; l < leafCount; l++) {
        const lx = cx + (rnd() - .5) * cw;
        const ly = cy2 + (rnd() - .5) * 15;
        leaves += `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${(3 + rnd() * 4).toFixed(1)}" ry="${(2 + rnd() * 2.5).toFixed(1)}" fill="color-mix(in srgb, ${col} ${(40 + l * 12)}%, #1a3020)" opacity="${(.5 + rnd() * .3).toFixed(2)}"/>`;
      }
      // hot amber flash
      const flash = hot ? `<ellipse cx="${cx}" cy="${cy2}" rx="${cw * .4}" ry="6" fill="var(--amber)" opacity=".5">
        <animate attributeName="rx" values="${cw * .4};${cw * .7}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.1" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="un-tree${hot ? " hot" : ""}">
        ${trunk}${leaves}${flash}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="un-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="un-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // squirrels — darting between trunks
    const squirrels = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 15);
      const y = GY + 15 + (i % 2) * 12;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#b08050");
      return `<g class="un-sq${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-25} ${y};${W + 25} ${(y - 3).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .5}" fill="${col}"/>
        <ellipse cx="${size * 1}" cy="${-size * .2}" rx="${size * .3}" ry="${size * .25}" fill="${col}"/>
        <ellipse cx="${-size * .7}" cy="${size * .1}" rx="${size * .2}" ry="${size * .15}" fill="${col}" opacity=".5"/>
        <path d="M ${-size * 1.2} 0 Q ${-size * 1.6} ${size * .3} ${-size * 1.4} ${size * .6}" stroke="${col}" stroke-width=".7" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="un-wrap">
        <div class="un-head"><b>UNDERSTORY</b><span>幼树=配额窗 冠密=用量 松鼠=会话${hotN ? " · " + hotN + " 闪冠" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${backdrop}${canopy}${ground}${litter}${dapple}${saplings}${squirrels}
          <g class="un-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="un-k">${fmt(k.tokens)} · ${sessions.length} 鼠</text>
            <text x="22" y="45" class="un-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "林下", eyebrow: "UNDERSTORY", render };
})();
