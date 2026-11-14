/* ------------------------------------------------------------------ vineyard2
 * Vineyard II — a terraced slope of vines: every quota
 * window is a vine row (leaf canopy + bunch = used%, ≥85%
 * the harvest horn burns amber); sessions are pruners (a
 * scarf + secateurs) tying the canes.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "vineyard2";
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

    const vines = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a06080";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const vineY = floorY - 14;
      const postH = 18 + f * 8;
      // canopy = f
      const canopy = `<path d="M${x - 12} ${vineY - postH} Q${x} ${vineY - postH - 10 - f * 4} ${x + 12} ${vineY - postH}" fill="#3a4a2a" stroke="${hot ? "var(--amber)" : "#4a5a3a"}" stroke-width="${hot ? 1.2 : .8}"/>`;
      // bunches = f
      const bunches = Array.from({ length: Math.round(f * 4) }, (_, bi) => {
        const bx = x - 8 + bi * 6;
        const by = vineY - postH + 4 + (bi % 2) * 3;
        return `<ellipse cx="${bx}" cy="${by}" rx="1.5" ry="2.5" fill="${col}" opacity=".85"/>`;
      }).join("");
      // horn when hot
      const horn = hot ? `<path d="M${x + 14} ${vineY - postH - 4} L${x + 20} ${vineY - postH - 8} L${x + 18} ${vineY - postH - 2} Z" fill="var(--amber)">
          <animate attributeName="opacity" values="1;.4;1" dur="1.3s" repeatCount="indefinite"/></path>` : "";
      return `<g class="vt-vine${hot ? " hot" : ""}">
        <!-- posts -->
        <line x1="${x - 8}" y1="${vineY}" x2="${x - 8}" y2="${vineY - postH}" stroke="#4a3a28" stroke-width="2"/>
        <line x1="${x + 8}" y1="${vineY}" x2="${x + 8}" y2="${vineY - postH}" stroke="#4a3a28" stroke-width="2"/>
        <line x1="${x - 8}" y1="${vineY - postH / 2}" x2="${x + 8}" y2="${vineY - postH / 2}" stroke="#4a3a28" stroke-width="1"/>
        ${canopy}${bunches}${horn}
        <text x="${x}" y="${vineY - postH - 12}" class="vt-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${vineY + 12}" class="vt-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // pruners — scarf + secateurs
    const pruners = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a07080");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="vt-pruner${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <path d="M0 -12 L4 -10 L0 -8 Z" fill="#5a4030"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <path d="M4 -4 L9 -9 L11 -7" stroke="${col}" stroke-width="1.2" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="vt-wrap">
        <div class="vt-head"><b>VINEYARD II</b><span>藤行=配额窗 叶冠=用量 穗=过热 剪工=会话${hotN ? " · " + hotN + " 摘" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141210" rx="10"/>
          ${vines}${pruners}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1e1a14"/>
          <text x="16" y="${H - 18}" class="vt-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="vt-ksub" text-anchor="end">桩=棚架</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "葡萄园二号", eyebrow: "VINEYARD II", render };
})();
