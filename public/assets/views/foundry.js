/* ------------------------------------------------------------------- foundry
 * Foundry — a melt shop of crucibles: every quota window is a
 * furnace with a pouring spout (metal glow + slag arc = used%,
 * ≥85% the tap hole burns amber); sessions are founders (a
 * helmet + tongs) tending the melts.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "foundry";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 50, BOT = 44;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const furnaces = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#e07030";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const furnY = floorY - 12;
      const furnW = bw - 18, furnH = 40;
      const glowH = furnH * f;
      const tapY = furnY - 10;
      // slag sparks when hot
      const sparks = hot ? Array.from({ length: 3 }, (_, si) => {
        const sx = x + (si - 1) * 6;
        const dur = (0.8 + si * 0.2).toFixed(1);
        return `<circle cx="${sx}" cy="${furnY - furnH - 4}" r="1.5" fill="var(--amber)">
          <animate attributeName="cy" values="${furnY - furnH - 4};${furnY - furnH - 18};${furnY - furnH - 4}" dur="${dur}s" begin="${(-si * 0.3).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".9;0;.9" dur="${dur}s" begin="${(-si * 0.3).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
      }).join("") : "";
      return `<g class="fp-furn${hot ? " hot" : ""}">
        <!-- furnace body -->
        <path d="M${x - furnW / 2} ${furnY} L${x - furnW / 2 + 2} ${furnY - furnH} Q${x} ${furnY - furnH - 4} ${x + furnW / 2 - 2} ${furnY - furnH} L${x + furnW / 2} ${furnY} Z"
          fill="#3a2a20" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.4 : .8}"/>
        <!-- molten interior -->
        <clipPath id="fp-clip-${i}"><path d="M${x - furnW / 2 + 2} ${furnY} L${x - furnW / 2 + 4} ${furnY - furnH + 2} Q${x} ${furnY - furnH - 2} ${x + furnW / 2 - 4} ${furnY - furnH + 2} L${x + furnW / 2 - 2} ${furnY} Z"/></clipPath>
        <g clip-path="url(#fp-clip-${i})">
          <rect x="${x - furnW / 2}" y="${furnY - glowH}" width="${furnW}" height="${glowH.toFixed(1)}" fill="${col}" opacity=".85">
            <animate attributeName="opacity" values=".85;.65;.85" dur="${(1 + f).toFixed(1)}s" repeatCount="indefinite"/></rect>
        </g>
        <!-- tap hole -->
        <circle cx="${x}" cy="${tapY}" r="3.5" fill="#180e08"/>
        <circle cx="${x}" cy="${tapY}" r="2" fill="${col}" opacity="${(0.5 + f * 0.5).toFixed(2)}"/>
        ${hot ? `<circle cx="${x}" cy="${tapY}" r="5" fill="var(--amber)" opacity=".5">
          <animate attributeName="r" values="5;7;5" dur="1.3s" repeatCount="indefinite"/></circle>` : ""}
        ${sparks}
        <!-- chimney -->
        <rect x="${x - 4}" y="${furnY - furnH - 10}" width="8" height="10" fill="#4a3428"/>
        <text x="${x}" y="${furnY + 12}" class="fp-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${furnY + 21}" class="fp-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // founders — helmet + tongs
    const founders = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#e0a060");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="fp-founder${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="#f0e0a0"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <path d="M4 -4 L10 -6 L11 -3 L5 -1 Z" fill="${col}"/>
        <circle cx="11" cy="-5" r="1.5" fill="#384048"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="fp-wrap">
        <div class="fp-head"><b>FOUNDRY</b><span>熔炉=配额窗 熔液=用量 出渣=过热 铸工=会话${hotN ? " · " + hotN + " 满炉" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#140f0a" rx="10"/>
          ${furnaces}${founders}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241a12"/>
          <text x="16" y="${H - 18}" class="fp-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="fp-ksub" text-anchor="end">铁钳=夹具</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "铸造厂", eyebrow: "FOUNDRY", render };
})();
