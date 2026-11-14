/* --------------------------------------------------------------------- kiln
 * Kiln — a pottery studio: every quota window is a firing
 * chamber (flame height/glow = used%, ≥85% the chimney flares
 * amber); sessions are potters (head + wheel arm) shaping
 * vessels beside the fires.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "kiln";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 48, BOT = 44;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const kilns = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#e08040";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const kilnY = floorY - 14;
      const kilnW = bw - 16, kilnH = 42;
      const mouthW = kilnW * .6, mouthH = 16;
      const flameH = 4 + f * mouthH;
      return `<g class="kn-kiln${hot ? " hot" : ""}">
        <!-- chimney -->
        <rect x="${x - 4}" y="${kilnY - kilnH}" width="8" height="12" fill="#3a2a20"/>
        <rect x="${x - 6}" y="${kilnY - kilnH - 4}" width="12" height="5" rx="1" fill="#4a3428"/>
        ${hot ? `<ellipse cx="${x}" cy="${kilnY - kilnH - 8}" rx="5" ry="2" fill="var(--amber)" opacity=".6">
          <animate attributeName="opacity" values=".6;.25;.6" dur="1.4s" repeatCount="indefinite"/></ellipse>` : ""}
        <!-- body -->
        <path d="M${x - kilnW / 2} ${kilnY} L${x - kilnW / 2 + 2} ${kilnY - kilnH + 6} Q${x} ${kilnY - kilnH - 6} ${x + kilnW / 2 - 2} ${kilnY - kilnH + 6} L${x + kilnW / 2} ${kilnY} Z"
          fill="#3a2e24" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.2 : .8}"/>
        <!-- mouth with fire -->
        <ellipse cx="${x}" cy="${kilnY - 10}" rx="${mouthW / 2}" ry="${mouthH / 2}" fill="#180e08"/>
        <path d="M${x - mouthW / 4} ${kilnY - 10} Q ${x - mouthW / 4 - 2} ${kilnY - 10 - flameH * .5} ${x} ${kilnY - 10 - flameH} Q ${x + mouthW / 4 + 2} ${kilnY - 10 - flameH * .4} ${x + mouthW / 4} ${kilnY - 10} Z"
          fill="${hot ? "var(--amber)" : col}" opacity=".9">
          <animate attributeName="d" values="M${x - mouthW / 4} ${kilnY - 10} Q ${x - mouthW / 4 - 2} ${kilnY - 10 - flameH * .5} ${x} ${kilnY - 10 - flameH} Q ${x + mouthW / 4 + 2} ${kilnY - 10 - flameH * .4} ${x + mouthW / 4} ${kilnY - 10} Z;M${x - mouthW / 4} ${kilnY - 10} Q ${x - mouthW / 4} ${kilnY - 10 - flameH * .7} ${x + 1} ${kilnY - 10 - flameH * 1.2} Q ${x + mouthW / 4} ${kilnY - 10 - flameH * .3} ${x + mouthW / 4} ${kilnY - 10} Z;M${x - mouthW / 4} ${kilnY - 10} Q ${x - mouthW / 4 - 2} ${kilnY - 10 - flameH * .5} ${x} ${kilnY - 10 - flameH} Q ${x + mouthW / 4 + 2} ${kilnY - 10 - flameH * .4} ${x + mouthW / 4} ${kilnY - 10} Z" dur="${(1 + f).toFixed(1)}s" repeatCount="indefinite"/></path>
        <text x="${x}" y="${kilnY + 14}" class="kn-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${kilnY + 23}" class="kn-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // potters — head + wheel arm
    const potters = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#c0a080");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="kn-potter${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <circle cx="8" cy="2" r="4" fill="#3a2e20"/>
        <ellipse cx="8" cy="0" rx="3" ry="2" fill="${col}" opacity=".6"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="kn-wrap">
        <div class="kn-head"><b>KILN</b><span>窑体=配额窗 窑火=用量 烟囱=过热 陶工=会话${hotN ? " · " + hotN + " 满烧" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#1a100a" rx="10"/>
          ${kilns}${potters}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241812"/>
          <text x="16" y="${H - 18}" class="kn-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="kn-ksub" text-anchor="end">转轮=陶工</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "窑炉", eyebrow: "KILN", render };
})();
