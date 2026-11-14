/* ----------------------------------------------------------------- goldsmith
 * Goldsmith — a bench of ring mandrels: every quota window is
 * a ring blank on a mandrel (band gleam + facet = used%, ≥85%
 * the stone burns amber); sessions are goldsmiths (a loupe +
 * graver) setting the gems.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "goldsmith";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 52, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const rings = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#e0c060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const ringY = floorY - 18;
      const ringR = 10 + f * 8;
      const bandW = 3 + f * 3;
      // mandrel cone
      const mandH = 30;
      return `<g class="go-ring${hot ? " hot" : ""}">
        <!-- mandrel -->
        <path d="M${x - 8} ${ringY + mandH / 2} L${x - 4} ${ringY - mandH / 2} L${x + 4} ${ringY - mandH / 2} L${x + 8} ${ringY + mandH / 2} Z" fill="#4a3a28"/>
        <!-- ring band -->
        <circle cx="${x}" cy="${ringY}" r="${ringR.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${bandW.toFixed(1)}"/>
        <circle cx="${x}" cy="${ringY}" r="${(ringR - bandW / 2).toFixed(1)}" fill="none" stroke="#8a7030" stroke-width=".8"/>
        <!-- gleam arc -->
        <path d="M${x - ringR * .7} ${ringY - ringR * .7} A ${ringR} ${ringR} 0 0 1 ${x + ringR * .7} ${ringY - ringR * .7}" fill="none" stroke="#f8f0c0" stroke-width="1.5" opacity="${(0.4 + f * 0.5).toFixed(2)}">
          ${hot ? `<animate attributeName="opacity" values="${(0.4 + f * 0.5).toFixed(2)};.2;${(0.4 + f * 0.5).toFixed(2)}" dur="1.4s" repeatCount="indefinite"/>` : ""}
        </path>
        <!-- setting + stone -->
        <rect x="${x - 4}" y="${ringY - ringR - 8}" width="8" height="6" fill="#8a7030"/>
        <polygon points="${x},${ringY - ringR - 10} ${x - 3},${ringY - ringR - 4} ${x + 3},${ringY - ringR - 4}" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="opacity" values="1;.5;1" dur="1.2s" repeatCount="indefinite"/>` : ""}
        </polygon>
        <text x="${x}" y="${ringY + ringR + 14}" class="go-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${ringY + ringR + 23}" class="go-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // goldsmiths — loupe + graver
    const smiths = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#e0d0a0");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="go-smith${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <circle cx="4" cy="-9" r="2" fill="none" stroke="${col}" stroke-width="1"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-4" x2="9" y2="-9" stroke="${col}" stroke-width="1.2"/>
        <polygon points="9,-9 10,-11 11,-9" fill="#384048"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="go-wrap">
        <div class="go-head"><b>GOLDSMITH</b><span>金环=配额窗 弧光=用量 宝托=过热 金匠=会话${hotN ? " · " + hotN + " 镶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#14120e" rx="10"/>
          ${rings}${smiths}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241c14"/>
          <text x="16" y="${H - 18}" class="go-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="go-ksub" text-anchor="end">锥=芯轴</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "金匠坊", eyebrow: "GOLDSMITH", render };
})();
