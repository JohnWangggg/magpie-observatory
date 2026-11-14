/* ------------------------------------------------------------------ pasture2
 * Pasture II — a rolling meadow with sheep: every quota
 * window is a ewe at a salt lick (wool depth + graze arc =
 * used%, ≥85% the lick stone burns amber); sessions are
 * shepherds (a crook + cloak) tending the flock.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "pasture2";
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

    // grass
    const grass = `<path d="M0 ${floorY - 10} Q ${W / 4} ${floorY - 20} ${W / 2} ${floorY - 10} T ${W} ${floorY - 10} L ${W} ${floorY} L 0 ${floorY} Z" fill="#1e2418"/>`;

    const ewes = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c0b0a0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const eweY = floorY - 12;
      const bodyW = bw - 20, bodyH = 8;
      // wool = f
      const wool = `<ellipse cx="${x}" cy="${eweY - 4}" rx="${bodyW / 2 - 2}" ry="${bodyH / 2 + f * 2}" fill="#e0d8d0" opacity="${(0.5 + f * 0.4).toFixed(2)}"/>`;
      // salt lick
      const lick = `<rect x="${x + bodyW / 2 + 2}" y="${eweY - 6}" width="4" height="5" fill="${hot ? "var(--amber)" : "#8a9a8a"}">
          ${hot ? `<animate attributeName="opacity" values="1;.4;1" dur="1.4s" repeatCount="indefinite"/>` : ""}
        </rect>`;
      // graze arc = f
      const graze = `<path d="M${x - 8} ${eweY + 6} Q${x} ${eweY + 10 + f * 4} ${x + 8} ${eweY + 6}" fill="none" stroke="${col}" stroke-width="1" opacity="${(0.3 + f * 0.4).toFixed(2)}"/>`;
      return `<g class="mf-ewe${hot ? " hot" : ""}">
        ${lick}${graze}
        ${wool}
        <circle cx="${x - bodyW / 2 - 1}" cy="${eweY - 2}" r="2.5" fill="#3a3530"/>
        <text x="${x}" y="${eweY - bodyH / 2 - 10}" class="mf-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${eweY + 14}" class="mf-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // shepherds — crook + cloak
    const shepherds = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a09070");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="mf-shep${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <path d="M0 -5 L-6 2 L-2 4" stroke="${col}" stroke-width="2" fill="none"/>
        <path d="M4 -4 L8 -14 L10 -12" stroke="${col}" stroke-width="1.2" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mf-wrap">
        <div class="mf-head"><b>PASTURE II</b><span>羊=配额窗 绒深=用量 舔石=过热 牧人=会话${hotN ? " · " + hotN + " 肥" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#121410" rx="10"/>
          ${grass}${ewes}${shepherds}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1a1c14"/>
          <text x="16" y="${H - 18}" class="mf-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="mf-ksub" text-anchor="end">坡=草坡</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "草场二号", eyebrow: "PASTURE II", render };
})();
