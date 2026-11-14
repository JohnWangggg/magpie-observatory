/* -------------------------------------------------------------------- smithy
 * Smithy — a forge of anvils: every quota window is an anvil
 * with a glowing workpiece (bar glow + spark burst = used%,
 * ≥85% the workpiece sparks amber); sessions are smiths (a
 * head + hammer arm) striking the iron.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "smithy";
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

    const anvils = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#e09040";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const anvilY = floorY - 14;
      const anvilW = bw - 20;
      const barLen = 8 + f * 18;
      const barY = anvilY - 14;
      // spark burst when hot
      const sparks = hot ? Array.from({ length: 4 }, (_, si) => {
        const sa = (si * 90 + 20) * Math.PI / 180;
        const sx = x + Math.cos(sa) * 10;
        const sy = barY + Math.sin(sa) * 10;
        return `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="1.2" fill="var(--amber)">
          <animate attributeName="opacity" values="0;.9;0" dur="${(0.7 + si * 0.15).toFixed(1)}s" begin="${(-si * 0.2).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
      }).join("") : "";
      return `<g class="sf-anvil${hot ? " hot" : ""}">
        <!-- forge behind -->
        <rect x="${x - bw / 2 + 8}" y="${anvilY - 22}" width="${bw - 16}" height="22" rx="2" fill="#2a1a12" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.2 : .8}"/>
        <rect x="${x - bw / 2 + 12}" y="${anvilY - 18}" width="${bw - 24}" height="10" fill="#180e08"/>
        <rect x="${x - bw / 2 + 14}" y="${anvilY - 16}" width="${(bw - 28) * f}" height="6" fill="${col}" opacity="${(0.4 + f * 0.5).toFixed(2)}"/>
        <!-- anvil -->
        <path d="M${x - anvilW / 2} ${anvilY} L${x - anvilW / 2 + 2} ${anvilY - 12} L${x - anvilW / 3} ${anvilY - 14} L${x + anvilW / 3} ${anvilY - 14} L${x + anvilW / 2 - 2} ${anvilY - 12} L${x + anvilW / 2} ${anvilY} Z"
          fill="#2a3038" stroke="${hot ? "var(--amber)" : "#384048"}" stroke-width="${hot ? 1.4 : .8}"/>
        <rect x="${x - anvilW / 4}" y="${anvilY - 14}" width="${anvilW / 2}" height="6" fill="#384048"/>
        <!-- glowing workpiece -->
        <rect x="${x - barLen / 2}" y="${barY}" width="${barLen}" height="3" rx="1.5" fill="${col}">
          ${hot ? `<animate attributeName="opacity" values="1;.6;1" dur="1s" repeatCount="indefinite"/>` : ""}
        </rect>
        ${sparks}
        <text x="${x}" y="${anvilY + 12}" class="sf-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${anvilY + 21}" class="sf-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // smiths — head + raised hammer arm
    const smiths = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c09060");
      const dur = Math.max(11, 22 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="sf-smith${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-4" x2="8" y2="-11" stroke="${col}" stroke-width="1.8"/>
        <rect x="7" y="-14" width="4" height="4" fill="#384048"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sf-wrap">
        <div class="sf-head"><b>SMITHY</b><span>铁砧=配额窗 锻件=用量 火花=过热 铁匠=会话${hotN ? " · " + hotN + " 锻" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#14100c" rx="10"/>
          ${anvils}${smiths}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241a12"/>
          <text x="16" y="${H - 18}" class="sf-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="sf-ksub" text-anchor="end">锤举=打击</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "铁匠铺", eyebrow: "SMITHY", render };
})();
