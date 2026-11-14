/* -------------------------------------------------------------------- oasis2
 * Oasis II — a palm-ringed pool in the erg: every quota
 * window is a palm clump (frond spread + bird = used%,
 * ≥85% the mirage pool burns amber); sessions are
 * bedouins (a keffiyeh + waterskin) drawing at the edge.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "oasis2";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, CX = W / 2, CY = H / 2 + 10;
    // dune
    const dune = `<path d="M0 ${H} L${W} ${H} L${W} ${CY + 40} Q ${W * .7} ${CY + 60} ${CX} ${CY + 58} Q ${W * .3} ${CY + 60} 0 ${CY + 40} Z" fill="#2a2218"/>`;
    // pool
    const pool = `<ellipse cx="${CX}" cy="${CY + 30}" rx="80" ry="14" fill="#0e1a22" stroke="#2a4a58" stroke-width="1.5"/>`;

    const palms = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#80a060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const ang = (i / quotas.length) * Math.PI * 2 - Math.PI / 2;
      const px = CX + Math.cos(ang) * 90;
      const py = CY + 20 + Math.sin(ang) * 30;
      const trunkH = 20 + f * 10;
      const frondR = 8 + f * 6;
      // fronds = f
      const fronds = Array.from({ length: Math.round(3 + f * 4) }, (_, fi) => {
        const fa = (fi * 50 - 30) * Math.PI / 180;
        const fx = px + Math.cos(fa) * frondR;
        const fy = py - trunkH - 4 + Math.sin(fa) * frondR * .6;
        return `<ellipse cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" rx="${3 + f * 2}" ry="${1.5 + f}" fill="${col}" opacity="${(0.4 + f * 0.4).toFixed(2)}" transform="rotate(${fi * 30} ${fx} ${fy})"/>`;
      }).join("");
      // mirage when hot
      const mirage = hot ? `<ellipse cx="${px}" cy="${py + 8}" rx="10" ry="2" fill="var(--amber)" opacity=".4">
          <animate attributeName="opacity" values=".4;.1;.4" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="oy-palm${hot ? " hot" : ""}">
        <line x1="${px}" y1="${py}" x2="${px}" y2="${py - trunkH}" stroke="#5a4a30" stroke-width="2.5"/>
        ${fronds}${mirage}
        <text x="${px}" y="${py - trunkH - 16}" class="oy-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${px}" y="${py + 18}" class="oy-name" text-anchor="middle">${esc(w.name.slice(0, 4))}</text>
      </g>`;
    }).join("");

    // bedouins — keffiyeh + waterskin
    const bedouins = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a08060");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = CY + 38 - (i % 2) * 4;
      return `<g class="oy-bed${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <path d="M0 -12 L5 -10 L0 -8 Z" fill="#d0c0a0"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <ellipse cx="8" cy="-2" rx="3" ry="4" fill="#6a5a40"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="oy-wrap">
        <div class="oy-head"><b>OASIS II</b><span>椰=配额窗 叶展=用量 蜃=过热 驼客=会话${hotN ? " · " + hotN + " 泉" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#181410" rx="10"/>
          ${dune}${pool}${palms}${bedouins}
          <text x="16" y="${H - 18}" class="oy-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="oy-ksub" text-anchor="end">池=水源</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "绿洲二号", eyebrow: "OASIS II", render };
})();
