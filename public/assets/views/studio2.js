/* ------------------------------------------------------------------- studio2
 * Studio II — a pottery wheel room: every quota window is a
 * throwing wheel (clay mound + splash pan = used%, ≥85% the
 * kiln spy hole burns amber); sessions are potters (a apron +
 * wire) centering the lump.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "studio2";
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

    const wheels = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#b08060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const wheelY = floorY - 16;
      const wheelR = bw / 2 - 10;
      // clay mound = f
      const clayH = 8 + f * 10;
      const clay = `<ellipse cx="${x}" cy="${wheelY - 2}" rx="${wheelR * .5}" ry="${clayH / 2}" fill="${col}" opacity="${(0.4 + f * 0.4).toFixed(2)}"/>`;
      // splash pan
      const pan = `<ellipse cx="${x}" cy="${wheelY}" rx="${wheelR + 4}" ry="6" fill="#2a3038" stroke="${hot ? "var(--amber)" : "#384048"}" stroke-width="${hot ? 1.4 : .8}"/>`;
      // kiln spy hole when hot
      const spy = hot ? `<circle cx="${x + wheelR + 10}" cy="${wheelY - 10}" r="3" fill="var(--amber)">
          <animate attributeName="r" values="3;4.5;3" dur="1.3s" repeatCount="indefinite"/></circle>` : "";
      // spin lines = f
      const spin = Array.from({ length: Math.round(2 + f * 3) }, (_, si) => {
        const sy = wheelY - 4 + si * 3;
        return `<line x1="${x - wheelR * .4}" y1="${sy}" x2="${x + wheelR * .4}" y2="${sy}" stroke="#f0f0e0" stroke-width=".8" opacity="${(0.3 + f * 0.4).toFixed(2)}"/>`;
      }).join("");
      return `<g class="wl-wheel${hot ? " hot" : ""}">
        ${pan}${clay}${spin}${spy}
        <text x="${x}" y="${wheelY - wheelR - 14}" class="wl-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${wheelY + 14}" class="wl-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // potters — apron + wire
    const potters = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a07050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="wl-potter${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="-4" y="-5" width="8" height="5" fill="#4a3a30"/>
        <line x1="4" y1="-4" x2="10" y2="-8" stroke="${col}" stroke-width="1"/>
        <line x1="10" y1="-8" x2="12" y2="-4" stroke="${col}" stroke-width="1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="wl-wrap">
        <div class="wl-head"><b>STUDIO II</b><span>轮盘=配额窗 泥堆=用量 窥孔=过热 陶工=会话${hotN ? " · " + hotN + " 烧" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141210" rx="10"/>
          ${wheels}${potters}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#201a16"/>
          <text x="16" y="${H - 18}" class="wl-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="wl-ksub" text-anchor="end">盘=陶轮</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "工坊二号", eyebrow: "STUDIO II", render };
})();
