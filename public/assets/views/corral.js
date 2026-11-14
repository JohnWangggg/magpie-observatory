/* -------------------------------------------------------------------- corral
 * Corral — a round pen for breaking horses: every quota
 * window is a bronco in the ring (hoof dust + ear flick =
 * used%, ≥85% the gate post burns amber); sessions are
 * wranglers (a bandana + rope) working the lunge line.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "corral";
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
    const penY = TOP + bh;

    // ring
    const ring = `<ellipse cx="${W / 2}" cy="${penY - 20}" rx="${W / 2 - 30}" ry="16" fill="none" stroke="#4a3a28" stroke-width="2" opacity=".6"/>`;

    const broncos = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a07040";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const ang = (i / quotas.length) * Math.PI * 2;
      const x = W / 2 + Math.cos(ang) * (W / 2 - 50);
      const y = penY - 20 + Math.sin(ang) * 12;
      const bodyW = bw - 30, bodyH = 10;
      // dust = f
      const dust = Array.from({ length: Math.round(f * 3) }, (_, di) => `<circle cx="${x - 6 + di * 6}" cy="${y + 6}" r="${1 + f}" fill="#8a7a60" opacity="${(0.3 + f * 0.4).toFixed(2)}">
          <animate attributeName="cy" values="${y + 6};${y + 10};${y + 6}" dur="${(1 + di * .3).toFixed(1)}s" repeatCount="indefinite"/></circle>`).join("");
      // gate post when hot
      const post = hot ? `<rect x="${x + bodyW / 2 + 4}" y="${y - 16}" width="3" height="12" fill="var(--amber)">
          <animate attributeName="opacity" values="1;.4;1" dur="1.3s" repeatCount="indefinite"/></rect>` : "";
      // ear flick
      const ear = `<line x1="${x - bodyW / 2 - 1}" y1="${y - 6}" x2="${x - bodyW / 2 - 3}" y2="${y - 10}" stroke="${col}" stroke-width="1.5">
          <animate attributeName="x2" values="${x - bodyW / 2 - 3};${x - bodyW / 2 - 6};${x - bodyW / 2 - 3}" dur="${(1.5 - f * .8).toFixed(2)}s" repeatCount="indefinite"/></line>`;
      return `<g class="mq-bronco${hot ? " hot" : ""}">
        ${post}${dust}
        <ellipse cx="${x}" cy="${y}" rx="${bodyW / 2}" ry="${bodyH / 2}" fill="#5a4030" stroke="${hot ? "var(--amber)" : "#4a3520"}" stroke-width="${hot ? 1.2 : .8}"/>
        <circle cx="${x - bodyW / 2 - 2}" cy="${y - 3}" r="3" fill="#4a3520"/>
        ${ear}
        <text x="${x}" y="${y - 14}" class="mq-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${y + 14}" class="mq-name" text-anchor="middle">${esc(w.name.slice(0, 4))}</text>
      </g>`;
    }).join("");

    // wranglers — bandana + rope
    const wranglers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a08060");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = penY - 6 - (i % 2) * 3;
      return `<g class="mq-wrang${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <path d="M0 -12 L4 -10 L0 -8 Z" fill="#5a4030"/>
        <circle cx="10" cy="-4" r="5" fill="none" stroke="${col}" stroke-width="1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mq-wrap">
        <div class="mq-head"><b>CORRAL</b><span>烈马=配额窗 蹄尘=用量 门柱=过热 驯马=会话${hotN ? " · " + hotN + " 跳" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#161210" rx="10"/>
          ${ring}${broncos}${wranglers}
          <rect x="0" y="${penY + 2}" width="${W}" height="${BOT - 2}" fill="#1e1812"/>
          <text x="16" y="${H - 18}" class="mq-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="mq-ksub" text-anchor="end">环=驯马圈</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "畜栏", eyebrow: "CORRAL", render };
})();
