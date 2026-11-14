/* ------------------------------------------------------------------ junction2
 * Junction II — a rail yard throat: every quota window is a
 * switch stand (lamp + point = used%, ≥85% the lamp burns
 * amber); sessions are switchmen (a lantern + flag) throwing
 * the levers.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "junction2";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 56, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const trackY = TOP + bh;

    // converging tracks
    const tracks = Array.from({ length: 5 }, (_, i) => {
      const ty = trackY - 20 - i * 8;
      return `<line x1="20" y1="${ty}" x2="${W - 20}" y2="${ty - i * 4}" stroke="#3a3830" stroke-width="1.5" opacity=".6"/>`;
    }).join("");

    const switches = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a08050";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const swY = trackY - 12;
      // lamp = f
      const lampY = swY - 14;
      const lamp = `<rect x="${x - 3}" y="${lampY - 6}" width="6" height="8" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="opacity" values="1;.4;1" dur="1.3s" repeatCount="indefinite"/>` : ""}
        </rect>`;
      // point indicator = f
      const point = `<line x1="${x}" y1="${swY}" x2="${x + 10 - f * 8}" y2="${swY - 6}" stroke="${col}" stroke-width="2"/>`;
      return `<g class="ju-switch${hot ? " hot" : ""}">
        <!-- lever base -->
        <rect x="${x - 4}" y="${swY - 4}" width="8" height="8" fill="#3a3028"/>
        <line x1="${x}" y1="${swY - 4}" x2="${x}" y2="${lampY - 6}" stroke="#4a4038" stroke-width="1.5"/>
        ${lamp}${point}
        <text x="${x}" y="${lampY - 10}" class="ju-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${swY + 12}" class="ju-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // switchmen — lantern + flag
    const switchmen = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#907050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = trackY - 6 - (i % 2) * 3;
      return `<g class="ju-man${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="4" y="-10" width="5" height="5" fill="${col}" opacity=".8"/>
        <path d="M4 -4 L8 -8 L12 -6" stroke="${col}" stroke-width="1" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ju-wrap">
        <div class="ju-head"><b>JUNCTION II</b><span>转辙=配额窗 灯=用量 尖轨=过热 扳道=会话${hotN ? " · " + hotN + " 变" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141412" rx="10"/>
          ${tracks}${switches}${switchmen}
          <rect x="0" y="${trackY + 2}" width="${W}" height="${BOT - 2}" fill="#1e1a16"/>
          <text x="16" y="${H - 18}" class="ju-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="ju-ksub" text-anchor="end">咽喉=岔区</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "枢纽二号", eyebrow: "JUNCTION II", render };
})();
