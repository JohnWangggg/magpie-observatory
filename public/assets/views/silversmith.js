/* --------------------------------------------------------------- silversmith
 * Silversmith — a pitch bowl of goblets: every quota window is
 * a goblet on a stake (bowl sheen + stem polish = used%, ≥85%
 * the rim glints amber); sessions are silversmiths (a visor +
 * planishing hammer) raising the bowls.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "silversmith";
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

    const goblets = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c0d0e0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const gobY = floorY - 14;
      const bowlW = 16 + f * 10, bowlH = 14 + f * 6;
      const stemH = 8 + f * 6;
      // hammering sparks when hot
      const sparks = hot ? Array.from({ length: 3 }, (_, si) => {
        const sa = (si * 120 - 30) * Math.PI / 180;
        const sx = x + Math.cos(sa) * bowlW / 2;
        const sy = gobY - bowlH - 4 + Math.sin(sa) * 8;
        return `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="1.2" fill="var(--amber)">
          <animate attributeName="opacity" values="0;.9;0" dur="${(0.7 + si * 0.2).toFixed(1)}s" begin="${(-si * 0.25).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
      }).join("") : "";
      return `<g class="ss-goblet${hot ? " hot" : ""}">
        <!-- stake -->
        <line x1="${x}" y1="${gobY}" x2="${x}" y2="${gobY + 10}" stroke="#4a3a28" stroke-width="3"/>
        <!-- stem -->
        <line x1="${x}" y1="${gobY}" x2="${x}" y2="${gobY - stemH}" stroke="${col}" stroke-width="2.5"/>
        <ellipse cx="${x}" cy="${gobY - stemH}" rx="${bowlW / 2}" ry="2.5" fill="${col}" opacity=".7"/>
        <!-- bowl -->
        <path d="M${x - bowlW / 2} ${gobY - stemH} A ${bowlW / 2} ${bowlH / 2} 0 0 0 ${x + bowlW / 2} ${gobY - stemH}" fill="#8a98a8" stroke="${hot ? "var(--amber)" : "#6a7888"}" stroke-width="${hot ? 1.4 : .8}"/>
        <ellipse cx="${x}" cy="${gobY - stemH}" rx="${bowlW / 2}" ry="${bowlH / 4}" fill="${col}" opacity="${(0.3 + f * 0.5).toFixed(2)}"/>
        <!-- sheen -->
        <path d="M${x - bowlW / 3} ${gobY - stemH - bowlH * .3} Q${x} ${gobY - stemH - bowlH * .6} ${x + bowlW / 3} ${gobY - stemH - bowlH * .3}" fill="none" stroke="#f0f4f8" stroke-width="1.2" opacity="${(0.3 + f * 0.4).toFixed(2)}"/>
        ${sparks}
        <text x="${x}" y="${gobY + 18}" class="ss-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${gobY + 27}" class="ss-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // silversmiths — visor + planishing hammer
    const smiths = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0d0e0");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="ss-smith${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-4" x2="9" y2="-11" stroke="${col}" stroke-width="1.5"/>
        <circle cx="10" cy="-12" r="2.5" fill="#8a98a8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ss-wrap">
        <div class="ss-head"><b>SILVERSMITH</b><span>银杯=配额窗 碗光=用量 锤点=过热 银匠=会话${hotN ? " · " + hotN + " 亮" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#14161a" rx="10"/>
          ${goblets}${smiths}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1c2028"/>
          <text x="16" y="${H - 18}" class="ss-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="ss-ksub" text-anchor="end">细颈=杯柄</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "银匠坊", eyebrow: "SILVERSMITH", render };
})();
