/* -------------------------------------------------------------------- fair2
 * Fair II — a country fair with show tents: every quota
 * window is a striped tent (pennant + crowd = used%, ≥85%
 * the ringmaster's torch burns amber); sessions are
 * showmen (a top hat + cane) barking the booths.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fair2";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 60, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const tents = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c06060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const tentY = floorY - 12;
      const tentW = bw - 16;
      const tentH = 20 + f * 8;
      // stripes = f
      const stripes = Array.from({ length: Math.round(2 + f * 4) }, (_, si) => {
        const sx = x - tentW / 2 + 4 + si * (tentW - 8) / Math.max(1, Math.round(1 + f * 4));
        return `<line x1="${sx.toFixed(1)}" y1="${tentY - tentH + 4}" x2="${sx.toFixed(1)}" y2="${tentY - 4}" stroke="${col}" stroke-width="2" opacity="${(0.4 + f * 0.4).toFixed(2)}"/>`;
      }).join("");
      // pennant
      const pennant = `<path d="M${x} ${tentY - tentH - 4} L${x + 8} ${tentY - tentH - 1} L${x} ${tentY - tentH + 2} Z" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="opacity" values="1;.4;1" dur="1.3s" repeatCount="indefinite"/>` : ""}
        </path>`;
      // crowd = f
      const crowd = Array.from({ length: Math.round(f * 3) }, (_, ci) => `<circle cx="${x - tentW / 2 - 4 + ci * 6}" cy="${tentY + 4}" r="1.5" fill="#5a5a6a" opacity=".6"/>`).join("");
      return `<g class="fa-tent${hot ? " hot" : ""}">
        <!-- poles -->
        <line x1="${x - tentW / 2}" y1="${tentY}" x2="${x - tentW / 2}" y2="${tentY - tentH}" stroke="#4a3a28" stroke-width="2"/>
        <line x1="${x + tentW / 2}" y1="${tentY}" x2="${x + tentW / 2}" y2="${tentY - tentH}" stroke="#4a3a28" stroke-width="2"/>
        <line x1="${x}" y1="${tentY}" x2="${x}" y2="${tentY - tentH}" stroke="#4a3a28" stroke-width="2.5"/>
        <!-- roof -->
        <path d="M${x - tentW / 2} ${tentY - 4} L${x} ${tentY - tentH - 4} L${x + tentW / 2} ${tentY - 4}" fill="#2a2020" stroke="${hot ? "var(--amber)" : "#4a3030"}" stroke-width="${hot ? 1.2 : .8}"/>
        ${stripes}${pennant}${crowd}
        <text x="${x}" y="${tentY - tentH - 10}" class="fa-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${tentY + 14}" class="fa-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // showmen — top hat + cane
    const showmen = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a06050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="fa-show${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-3" y="-14" width="6" height="5" fill="#2a2020"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-4" x2="10" y2="-10" stroke="${col}" stroke-width="1.2"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="fa-wrap">
        <div class="fa-head"><b>FAIR II</b><span>帐篷=配额窗 条纹=用量 炬=过热 摊主=会话${hotN ? " · " + hotN + " 火" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#181414" rx="10"/>
          ${tents}${showmen}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241a18"/>
          <text x="16" y="${H - 18}" class="fa-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="fa-ksub" text-anchor="end">棚=布棚</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "市集二号", eyebrow: "FAIR II", render };
})();
