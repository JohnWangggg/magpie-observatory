/* ------------------------------------------------------------------ checkpoint
 * Checkpoint — a border gate on a pass: every quota window is
 * a barrier arm (arm angle + floodlight = used%, ≥85% the
 * signal lamp burns amber); sessions are border guards (a
 * peaked cap + baton) waving traffic through.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "checkpoint";
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
    const roadY = TOP + bh;

    // road
    const road = `<rect x="0" y="${roadY - 4}" width="${W}" height="8" fill="#24282e"/>
      <line x1="0" y1="${roadY}" x2="${W}" y2="${roadY}" stroke="#f0f0d0" stroke-width="1" stroke-dasharray="8 6" opacity=".4"/>`;

    const gates = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#e0a040";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const gateY = roadY - 6;
      const armLen = bw - 20;
      const armAng = -10 - f * 60; // arm raises with use
      // floodlight pole
      const poleH = 30 + f * 10;
      // signal lamp
      const lamp = `<circle cx="${x + bw / 2 - 8}" cy="${gateY - poleH - 4}" r="3" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="r" values="3;4.5;3" dur="1.2s" repeatCount="indefinite"/>` : ""}
        </circle>`;
      return `<g class="gj-gate${hot ? " hot" : ""}">
        <!-- booth -->
        <rect x="${x - bw / 2 + 4}" y="${gateY - 24}" width="14" height="24" fill="#2a3038" stroke="${hot ? "var(--amber)" : "#384048"}" stroke-width="${hot ? 1.2 : .8}"/>
        <rect x="${x - bw / 2 + 6}" y="${gateY - 20}" width="10" height="6" fill="${col}" opacity=".6"/>
        <!-- pole -->
        <line x1="${x + bw / 2 - 8}" y1="${gateY}" x2="${x + bw / 2 - 8}" y2="${gateY - poleH}" stroke="#4a4038" stroke-width="1.5"/>
        ${lamp}
        <!-- barrier arm -->
        <line x1="${x - bw / 2 + 18}" y1="${gateY - 4}" x2="${x - bw / 2 + 18 + Math.cos(armAng * Math.PI / 180) * armLen}" y2="${gateY - 4 + Math.sin(armAng * Math.PI / 180) * armLen}" stroke="${col}" stroke-width="3"/>
        <line x1="${x - bw / 2 + 18}" y1="${gateY - 4}" x2="${x - bw / 2 + 18 + Math.cos(armAng * Math.PI / 180) * armLen * .6}" y2="${gateY - 4 + Math.sin(armAng * Math.PI / 180) * armLen * .6}" stroke="#f0f0d0" stroke-width="1" stroke-dasharray="4 4" opacity=".7"/>
        <text x="${x}" y="${gateY - 30}" class="gj-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${gateY + 14}" class="gj-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // guards — peaked cap + baton
    const guards = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0a060");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = roadY - 8 - (i % 2) * 3;
      return `<g class="gj-guard${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="2" y="-12" width="6" height="3" fill="#3a3028"/>
        <line x1="4" y1="-4" x2="9" y2="-10" stroke="${col}" stroke-width="1.2"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gj-wrap">
        <div class="gj-head"><b>CHECKPOINT</b><span>岗亭=配额窗 杆角=用量 号灯=过热 哨兵=会话${hotN ? " · " + hotN + " 严" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#14181e" rx="10"/>
          ${road}${gates}${guards}
          <rect x="0" y="${roadY + 4}" width="${W}" height="${BOT - 4}" fill="#1c2028"/>
          <text x="16" y="${H - 18}" class="gj-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="gj-ksub" text-anchor="end">道面=行车线</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "哨卡", eyebrow: "CHECKPOINT", render };
})();
