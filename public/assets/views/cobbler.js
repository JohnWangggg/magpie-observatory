/* ------------------------------------------------------------------ cobbler
 * Cobbler — a bench of lasts and uppers: every quota window is
 * a shoe last (heel height + toe cap glow = used%, ≥85% the
 * burnisher sparks amber); sessions are cobblers (a cap + awl)
 * stitching the welts.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cobbler";
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

    const lasts = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a07050";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const lastY = floorY - 14;
      const lastW = bw - 20, lastH = 22;
      const heelH = 4 + f * 8;
      const toeW = lastW * .35;
      // stitches on the upper
      const stitches = Array.from({ length: 4 }, (_, si) => {
        const sx = x - lastW / 4 + si * (lastW / 6);
        return `<line x1="${sx.toFixed(1)}" y1="${lastY - lastH + 4}" x2="${sx.toFixed(1)}" y2="${lastY - lastH + 8}" stroke="${col}" stroke-width="1" opacity=".7"/>`;
      }).join("");
      return `<g class="cz-last${hot ? " hot" : ""}">
        <!-- bench -->
        <rect x="${x - lastW / 2 - 4}" y="${lastY}" width="${lastW + 8}" height="4" fill="#3a2a18"/>
        <!-- shoe last (upper view) -->
        <path d="M${x - lastW / 2} ${lastY} L${x - lastW / 2 + 2} ${lastY - lastH} Q${x - lastW / 3} ${lastY - lastH - 4} ${x + lastW / 4} ${lastY - lastH + 2} L${x + lastW / 2} ${lastY - 4} L${x + lastW / 2} ${lastY} Z"
          fill="#5a4030" stroke="${hot ? "var(--amber)" : "#3a2a18"}" stroke-width="${hot ? 1.4 : .8}"/>
        <!-- heel -->
        <rect x="${x - lastW / 2 + 2}" y="${lastY - heelH}" width="6" height="${heelH}" fill="${col}" opacity=".8"/>
        <!-- toe cap glow -->
        <ellipse cx="${x + lastW / 3}" cy="${lastY - 8}" rx="${toeW / 2}" ry="4" fill="${col}" opacity="${(0.3 + f * 0.5).toFixed(2)}">
          ${hot ? `<animate attributeName="opacity" values="${(0.3 + f * 0.5).toFixed(2)};.5;${(0.3 + f * 0.5).toFixed(2)}" dur="1.3s" repeatCount="indefinite"/>` : ""}
        </ellipse>
        ${stitches}
        <!-- burnisher sparks when hot -->
        ${hot ? `<circle cx="${x + lastW / 3}" cy="${lastY - 12}" r="2" fill="var(--amber)">
          <animate attributeName="opacity" values="0;.9;0" dur="0.8s" repeatCount="indefinite"/></circle>` : ""}
        <text x="${x}" y="${lastY + 14}" class="cz-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${lastY + 23}" class="cz-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // cobblers — cap + awl + thread
    const cobblers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0a070");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="cz-cobbler${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-4" x2="9" y2="-8" stroke="${col}" stroke-width="1.2"/>
        <circle cx="10" cy="-9" r="1.5" fill="#384048"/>
        <path d="M4 -4 Q 8 -6 10 -9" fill="none" stroke="${col}" stroke-width=".6" stroke-dasharray="2 2"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cz-wrap">
        <div class="cz-head"><b>COBBLER</b><span>鞋楦=配额窗 鞋跟=用量 鞋头=过热 鞋匠=会话${hotN ? " · " + hotN + " 亮" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141210" rx="10"/>
          ${lasts}${cobblers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241c14"/>
          <text x="16" y="${H - 18}" class="cz-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="cz-ksub" text-anchor="end">缝线=虚线</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鞋匠铺", eyebrow: "COBBLER", render };
})();
