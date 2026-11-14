/* ------------------------------------------------------------------ fletcher
 * Fletcher — a rack of arrow shafts: every quota window is an
 * arrow bundle (fletching spread + tip gleam = used%, ≥85%
 * the broadhead burns amber); sessions are fletchers (a cap +
 * feather) binding the vanes.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fletcher";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 54, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const bundles = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c0a060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const bundleY = floorY - 14;
      const arrows = 5;
      const spread = 8 + f * 14;
      const arrowEls = Array.from({ length: arrows }, (_, ai) => {
        const off = (ai - (arrows - 1) / 2) * (spread / (arrows - 1));
        const tipY = bundleY - 34 - Math.abs(off) * .4;
        // fletching vanes at the tail
        const tailY = bundleY - 8;
        return `<g transform="translate(${x + off} 0)">
          <line x1="0" y1="${tailY}" x2="0" y2="${tipY}" stroke="#4a3828" stroke-width="1.5"/>
          <!-- broadhead -->
          <polygon points="0,${tipY - 4} -2,${tipY} 2,${tipY}" fill="${hot ? "var(--amber)" : col}">
            ${hot ? `<animate attributeName="opacity" values="1;.6;1" dur="1.2s" repeatCount="indefinite"/>` : ""}
          </polygon>
          <!-- fletching -->
          <polygon points="0,${tailY} -3,${tailY - 8} 0,${tailY - 6}" fill="${col}" opacity=".7"/>
          <polygon points="0,${tailY} 3,${tailY - 8} 0,${tailY - 6}" fill="${col}" opacity=".7"/>
          <polygon points="0,${tailY - 6} -2,${tailY - 12} 0,${tailY - 9}" fill="${col}" opacity=".5"/>
        </g>`;
      }).join("");
      return `<g class="ft-bundle${hot ? " hot" : ""}">
        <!-- rack -->
        <line x1="${x - bw / 2 + 6}" y1="${bundleY}" x2="${x + bw / 2 - 6}" y2="${bundleY}" stroke="#3a3028" stroke-width="2"/>
        ${arrowEls}
        <!-- binding cord -->
        <line x1="${x - spread / 2 - 4}" y1="${bundleY - 14}" x2="${x + spread / 2 + 4}" y2="${bundleY - 14}" stroke="${col}" stroke-width="2" stroke-dasharray="3 2"/>
        <text x="${x}" y="${bundleY + 14}" class="ft-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${bundleY + 23}" class="ft-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
        ${hot ? `<circle cx="${x + spread / 2 + 6}" cy="${bundleY - 20}" r="3.5" fill="var(--amber)">
          <animate attributeName="r" values="3.5;5;3.5" dur="1.5s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // fletchers — cap + feather + twine
    const fletchers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0a880");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="ft-fletcher${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <ellipse cx="8" cy="-10" rx="2.5" ry="5" fill="${col}" opacity=".7" transform="rotate(30 8 -10)"/>
        <line x1="8" y1="-10" x2="12" y2="-14" stroke="${col}" stroke-width="1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ft-wrap">
        <div class="ft-head"><b>FLETCHER</b><span>箭束=配额窗 展羽=用量 箭簇=过热 箭匠=会话${hotN ? " · " + hotN + " 锋" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141210" rx="10"/>
          ${bundles}${fletchers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241c14"/>
          <text x="16" y="${H - 18}" class="ft-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="ft-ksub" text-anchor="end">绑绳=束线</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "箭匠坊", eyebrow: "FLETCHER", render };
})();
