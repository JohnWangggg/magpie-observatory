/* --------------------------------------------------------------- arboretum
 * Arboretum — a curated collection of specimen trees on a
 * lawn: every quota window is a tree (canopy spread/leaf glow
 * = used%, ≥85% the fruit burns amber); sessions are curators
 * (a hat + satchel) walking the path between trees.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "arboretum";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(16180339);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 50, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const groundY = TOP + bh;

    const trees = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#60a060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const trunkH = 18 + f * 30;
      const trunkY = groundY - 6;
      const canopyR = 8 + f * 16;
      const canopyY = trunkY - trunkH;
      // three canopy blobs
      const canopies = `
        <ellipse cx="${x}" cy="${canopyY}" rx="${canopyR}" ry="${canopyR * .7}" fill="${col}" opacity="${(0.5 + f * .4).toFixed(2)}"/>
        <ellipse cx="${x - canopyR * .5}" cy="${canopyY + 6}" rx="${canopyR * .7}" ry="${canopyR * .5}" fill="${col}" opacity="${(0.4 + f * .3).toFixed(2)}"/>
        <ellipse cx="${x + canopyR * .5}" cy="${canopyY + 8}" rx="${canopyR * .65}" ry="${canopyR * .45}" fill="${col}" opacity="${(0.35 + f * .3).toFixed(2)}"/>`;
      // fruit dots when hot
      const fruit = hot ? Array.from({ length: 3 }, (_, fi) => {
        const fx = x + (rnd() * canopyR - canopyR / 2);
        const fy = canopyY + (rnd() * canopyR * .6 - canopyR * .3);
        return `<circle cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="2" fill="var(--amber)"/>`;
      }).join("") : "";
      return `<g class="ao-tree${hot ? " hot" : ""}">
        <rect x="${x - 3}" y="${trunkY - trunkH}" width="6" height="${trunkH}" fill="#4a3828"/>
        <line x1="${x - 3}" y1="${trunkY - trunkH * .6}" x2="${x - 10}" y2="${trunkY - trunkH * .9}" stroke="#4a3828" stroke-width="1.5"/>
        <line x1="${x + 3}" y1="${trunkY - trunkH * .5}" x2="${x + 10}" y2="${trunkY - trunkH * .8}" stroke="#4a3828" stroke-width="1.5"/>
        ${canopies}${fruit}
        <text x="${x}" y="${trunkY + 14}" class="ao-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${trunkY + 23}" class="ao-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
        ${hot ? `<circle cx="${x + canopyR}" cy="${canopyY}" r="3.5" fill="var(--amber)">
          <animate attributeName="r" values="3.5;5;3.5" dur="1.5s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // curators — hat + satchel
    const curators = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a08060");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = groundY - 4 - (i % 2) * 3;
      return `<g class="ao-curator${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="-11" rx="5" ry="1.5" fill="#6a5a40"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="-8" y="-2" width="4" height="6" rx="1" fill="#5a4a30"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ao-wrap">
        <div class="ao-head"><b>ARBORETUM</b><span>标本树=配额窗 冠幅=用量 果实=过热 策展人=会话${hotN ? " · " + hotN + " 硕" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141a12" rx="10"/>
          ${trees}${curators}
          <rect x="0" y="${groundY + 2}" width="${W}" height="${BOT - 2}" fill="#1a241a"/>
          <text x="16" y="${H - 18}" class="ao-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="ao-ksub" text-anchor="end">标本=标树</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "树木园", eyebrow: "ARBORETUM", render };
})();
