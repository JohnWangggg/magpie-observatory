/* ---------------------------------------------------------------------- mill
 * Mill — a watermill over a leat: every quota window is a mill
 * building (waterwheel speed/glow = used%, ≥85% the wheel hub
 * burns amber); sessions are millers (a cap + sack) carrying
 * grain along the bank.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "mill";
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
    const waterY = TOP + bh - 10;

    // leat — water band under the wheels
    const leat = `<rect x="0" y="${waterY}" width="${W}" height="${H - waterY - BOT}" fill="#1a2830"/>
      <path d="M0 ${waterY + 6} Q 50 ${waterY + 2} 100 ${waterY + 6} T 200 ${waterY + 6} T 300 ${waterY + 6} T 400 ${waterY + 6}" fill="none" stroke="#3a5a70" stroke-width="1" opacity=".6">
        <animate attributeName="d" values="M0 ${waterY + 6} Q 50 ${waterY + 2} 100 ${waterY + 6} T 200 ${waterY + 6} T 300 ${waterY + 6} T 400 ${waterY + 6};M0 ${waterY + 6} Q 50 ${waterY + 10} 100 ${waterY + 6} T 200 ${waterY + 6} T 300 ${waterY + 6} T 400 ${waterY + 6};M0 ${waterY + 6} Q 50 ${waterY + 2} 100 ${waterY + 6} T 200 ${waterY + 6} T 300 ${waterY + 6} T 400 ${waterY + 6}" dur="4s" repeatCount="indefinite"/></path>`;

    const mills = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a08060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const wheelR = 10 + f * 8;
      const millY = waterY - 8;
      const millW = bw - 18, millH = 26;
      const rotDur = Math.max(2, 8 - f * 6);
      return `<g class="mp-mill${hot ? " hot" : ""}">
        <!-- building -->
        <rect x="${x - millW / 2}" y="${millY - millH}" width="${millW}" height="${millH}" fill="#5a4838" stroke="${hot ? "var(--amber)" : "#3a3028"}" stroke-width="${hot ? 1.4 : .8}"/>
        <path d="M${x - millW / 2 - 2} ${millY - millH} L${x} ${millY - millH - 10} L${x + millW / 2 + 2} ${millY - millH} Z" fill="#4a3a28"/>
        <rect x="${x - 5}" y="${millY - 8}" width="10" height="8" fill="#2a2018"/>
        <!-- waterwheel -->
        <g transform="translate(${x} ${waterY + 4})">
          <g class="mp-wheel">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${rotDur.toFixed(1)}s" repeatCount="indefinite"/>
            <circle r="${wheelR.toFixed(1)}" fill="none" stroke="${col}" stroke-width="2.5"/>
            <circle r="${wheelR.toFixed(1)}" fill="none" stroke="#4a3828" stroke-width="1" stroke-dasharray="3 5"/>
            ${Array.from({ length: 6 }, (_, si) => `<line x1="0" y1="0" x2="0" y2="${(-wheelR).toFixed(1)}" stroke="${col}" stroke-width="1.5" transform="rotate(${si * 60})"/>`).join("")}
            ${Array.from({ length: 8 }, (_, pi) => `<rect x="-2" y="${(-wheelR - 2).toFixed(1)}" width="4" height="4" fill="${col}" transform="rotate(${pi * 45})"/>`).join("")}
          </g>
          <circle r="3" fill="${hot ? "var(--amber)" : col}"/>
        </g>
        <text x="${x}" y="${millY + 16}" class="mp-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${millY + 25}" class="mp-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // millers — cap + grain sack
    const millers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#d0b080");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = waterY - 6 - (i % 2) * 3;
      return `<g class="mp-miller${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <ellipse cx="-7" cy="-3" rx="3" ry="4" fill="#c0a070"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mp-wrap">
        <div class="mp-head"><b>MILL</b><span>磨坊=配额窗 轮速=用量 轮毂=过热 磨工=会话${hotN ? " · " + hotN + " 满转" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#181610" rx="10"/>
          ${leat}${mills}${millers}
          <text x="16" y="${H - 18}" class="mp-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="mp-ksub" text-anchor="end">桨板=轮辐</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "磨坊", eyebrow: "MILL", render };
})();
