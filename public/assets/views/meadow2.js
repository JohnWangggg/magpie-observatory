/* ------------------------------------------------------------------ meadow2
 * Meadow II — a hay meadow in flower: every quota window is
 * a haycock (grass mound + butterfly = used%, ≥85% the
 * hayfork burns amber); sessions are mowers (a smock +
 * scythe) turning the swathes.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "meadow2";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 58, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    // flower heads
    const flowers = Array.from({ length: 12 }, (_, i) => `<circle cx="${i * 35 + 15}" cy="${floorY - 4 - (i % 2) * 3}" r="1" fill="#d0b060" opacity=".6"/>`).join("");

    const cocks = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c0a050";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const cockY = floorY - 10;
      const cockW = bw - 20;
      const cockH = 10 + f * 8;
      // grass strands = f
      const strands = Array.from({ length: Math.round(3 + f * 4) }, (_, si) => {
        const sx = x - cockW / 2 + 3 + si * (cockW - 6) / Math.max(1, Math.round(2 + f * 4));
        return `<line x1="${sx.toFixed(1)}" y1="${cockY}" x2="${sx.toFixed(1)}" y2="${cockY - cockH}" stroke="${col}" stroke-width="1" opacity="${(0.3 + f * 0.4).toFixed(2)}"/>`;
      }).join("");
      // butterfly = f
      const bfly = `<ellipse cx="${x + cockW / 2 + 6}" cy="${cockY - cockH - 6}" rx="2.5" ry="1.5" fill="${col}">
          <animate attributeName="cy" values="${cockY - cockH - 6};${cockY - cockH - 12};${cockY - cockH - 6}" dur="${(2 - f).toFixed(1)}s" repeatCount="indefinite"/></ellipse>`;
      // hayfork when hot
      const fork = hot ? `<line x1="${x - cockW / 2 - 4}" y1="${cockY - 4}" x2="${x - cockW / 2 + 2}" y2="${cockY - 18}" stroke="var(--amber)" stroke-width="1.5">
          <animate attributeName="opacity" values="1;.4;1" dur="1.3s" repeatCount="indefinite"/></line>` : "";
      return `<g class="mj-cock${hot ? " hot" : ""}">
        <ellipse cx="${x}" cy="${cockY}" rx="${cockW / 2}" ry="${cockH / 2}" fill="#5a4a30" stroke="${hot ? "var(--amber)" : "#4a3a20"}" stroke-width="${hot ? 1.2 : .8}"/>
        ${strands}${bfly}${fork}
        <text x="${x}" y="${cockY - cockH - 12}" class="mj-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${cockY + 12}" class="mj-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // mowers — smock + scythe
    const mowers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a08050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="mj-mower${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <path d="M4 -4 L10 -14 L14 -10" stroke="${col}" stroke-width="1.2" fill="none"/>
        <line x1="14" y1="-10" x2="10" y2="-4" stroke="${col}" stroke-width="1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mj-wrap">
        <div class="mj-head"><b>MEADOW II</b><span>草垛=配额窗 草茎=用量 叉=过热 割草=会话${hotN ? " · " + hotN + " 干" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141410" rx="10"/>
          ${flowers}${cocks}${mowers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1e1a14"/>
          <text x="16" y="${H - 18}" class="mj-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="mj-ksub" text-anchor="end">花=野花草甸</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "草甸二号", eyebrow: "MEADOW II", render };
})();
