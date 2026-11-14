/* ------------------------------------------------------------------ threshold2
 * Threshold II — a stone lintel between worlds: every quota
 * window is a doorway (veil shimmer + step = used%, ≥85%
 * the lintel key burns amber); sessions are porters (a hood
 * + lantern) crossing the sill.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "threshold2";
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

    const doors = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a080c0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const doorY = floorY - 14;
      const doorW = bw - 22, doorH = 28;
      // veil = f
      const veil = `<rect x="${x - doorW / 2 + 3}" y="${doorY - doorH + 4}" width="${doorW - 6}" height="${doorH - 8}" fill="${col}" opacity="${(0.15 + f * 0.3).toFixed(2)}"/>`;
      // shimmer
      const shimmer = f > .3 ? `<line x1="${x - doorW / 2 + 4}" y1="${doorY - doorH / 2}" x2="${x + doorW / 2 - 4}" y2="${doorY - doorH / 2}" stroke="#f0f0f8" stroke-width="1" opacity="${(f * .5).toFixed(2)}">
          <animate attributeName="opacity" values="${(f * .5).toFixed(2)};.1;${(f * .5).toFixed(2)}" dur="${(2 - f).toFixed(1)}s" repeatCount="indefinite"/></line>` : "";
      // step = f
      const step = `<rect x="${x - 8}" y="${doorY + 2}" width="${16 - f * 8}" height="3" fill="${col}" opacity="${(0.4 + f * 0.4).toFixed(2)}"/>`;
      // lintel key when hot
      const key = hot ? `<circle cx="${x + doorW / 2 + 4}" cy="${doorY - doorH - 4}" r="3" fill="var(--amber)">
          <animate attributeName="r" values="3;4.5;3" dur="1.3s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="tm-door${hot ? " hot" : ""}">
        <!-- frame -->
        <rect x="${x - doorW / 2}" y="${doorY - doorH}" width="${doorW}" height="${doorH}" rx="2" fill="#1a1824" stroke="${hot ? "var(--amber)" : "#3a3448"}" stroke-width="${hot ? 1.4 : .8}"/>
        <!-- lintel -->
        <rect x="${x - doorW / 2 - 4}" y="${doorY - doorH - 6}" width="${doorW + 8}" height="6" fill="#3a3448"/>
        ${veil}${shimmer}${step}${key}
        <text x="${x}" y="${doorY - doorH - 12}" class="tm-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${doorY + 14}" class="tm-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // porters — hood + lantern
    const porters = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a090c0");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="tm-porter${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <ellipse cx="0" cy="-11" rx="4" ry="2" fill="#3a3448"/>
        <rect x="4" y="-4" width="5" height="6" fill="${col}" opacity=".7"/>
        <circle cx="6" cy="-1" r="1.5" fill="var(--amber)" opacity=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="tm-wrap">
        <div class="tm-head"><b>THRESHOLD II</b><span>门=配额窗 雾=用量 钥=过热 越客=会话${hotN ? " · " + hotN + " 启" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141218" rx="10"/>
          ${doors}${porters}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1c1a24"/>
          <text x="16" y="${H - 18}" class="tm-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="tm-ksub" text-anchor="end">槛=门槛</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "阈界二号", eyebrow: "THRESHOLD II", render };
})();
