/* ------------------------------------------------------------------ vivarium
 * Vivarium — a glass tank of tropicals: every quota window
 * is a planted terrarium (leaf spread + mist = used%, ≥85%
 * the humidity lamp burns amber); sessions are keepers (a
 * net + spray bottle) misting the glass.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "vivarium";
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

    const tanks = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#60a080";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const tankY = floorY - 12;
      const tankW = bw - 18, tankH = 22;
      // leaf spread = f
      const leaves = Array.from({ length: Math.round(2 + f * 4) }, (_, li) => {
        const la = (li * 60 - 30) * Math.PI / 180;
        const lx = x + Math.cos(la) * (4 + f * 4);
        const ly = tankY - tankH + 4 - Math.sin(la) * (2 + f * 4);
        return `<ellipse cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${3 + f * 2}" ry="${2 + f}" fill="${col}" opacity="${(0.4 + f * 0.4).toFixed(2)}" transform="rotate(${li * 30} ${lx} ${ly})"/>`;
      }).join("");
      // mist = f
      const mist = f > .2 ? `<ellipse cx="${x}" cy="${tankY - 6}" rx="${tankW / 2 - 4}" ry="3" fill="#d0e8e0" opacity="${(f * .4).toFixed(2)}">
          <animate attributeName="opacity" values="${(f * .4).toFixed(2)};.1;${(f * .4).toFixed(2)}" dur="3s" repeatCount="indefinite"/></ellipse>` : "";
      // humidity lamp when hot
      const lamp = hot ? `<circle cx="${x + tankW / 2 - 4}" cy="${tankY - tankH - 4}" r="3" fill="var(--amber)">
          <animate attributeName="r" values="3;4.5;3" dur="1.4s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="vv-tank${hot ? " hot" : ""}">
        <!-- tank -->
        <rect x="${x - tankW / 2}" y="${tankY - tankH}" width="${tankW}" height="${tankH}" rx="2" fill="#0e1a16" stroke="${hot ? "var(--amber)" : "#2a4038"}" stroke-width="${hot ? 1.4 : .8}"/>
        <rect x="${x - tankW / 2 + 2}" y="${tankY - tankH + 2}" width="${tankW - 4}" height="4" fill="#1a2820"/>
        ${leaves}${mist}${lamp}
        <text x="${x}" y="${tankY + 12}" class="vv-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${tankY + 21}" class="vv-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // keepers — net + spray bottle
    const keepers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#70a080");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="vv-keeper${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <circle cx="8" cy="-6" r="4" fill="none" stroke="${col}" stroke-width="1"/>
        <rect x="4" y="-4" width="4" height="6" fill="#d0e8e0"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="vv-wrap">
        <div class="vv-head"><b>VIVARIUM</b><span>缸=配额窗 叶展=用量 湿灯=过热 保育员=会话${hotN ? " · " + hotN + " 湿" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#0e1412" rx="10"/>
          ${tanks}${keepers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#161c18"/>
          <text x="16" y="${H - 18}" class="vv-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="vv-ksub" text-anchor="end">苔=基质</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "生态缸", eyebrow: "VIVARIUM", render };
})();
