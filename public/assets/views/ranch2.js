/* -------------------------------------------------------------------- ranch2
 * Ranch II — a high plain with branding fires: every quota
 * window is a steer at a rail (ear tag + brand smoke = used%,
 * ≥85% the brand iron burns amber); sessions are cowboys
 * (a hat + lasso) riding the fence.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "ranch2";
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

    // fence lines
    const fences = `<line x1="10" y1="${floorY - 24}" x2="${W - 10}" y2="${floorY - 24}" stroke="#4a3a28" stroke-width="1.5"/>
      <line x1="10" y1="${floorY - 12}" x2="${W - 10}" y2="${floorY - 12}" stroke="#4a3a28" stroke-width="1.5"/>`;

    const steers = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a07040";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const steerY = floorY - 14;
      const bodyW = bw - 18, bodyH = 12;
      // brand smoke = f
      const smoke = hot ? Array.from({ length: 2 }, (_, si) => `<ellipse cx="${x + bodyW / 4 + si * 6}" cy="${steerY - 8 - si * 6}" rx="3" ry="2" fill="#c0c0b0" opacity=".4">
          <animate attributeName="cy" values="${steerY - 8 - si * 6};${steerY - 20 - si * 8};${steerY - 8 - si * 6}" dur="${(2 + si * .5).toFixed(1)}s" repeatCount="indefinite"/></ellipse>`).join("") : "";
      // ear tag = f
      const tag = `<rect x="${x + bodyW / 2 - 6}" y="${steerY - bodyH / 2 - 2}" width="4" height="3" fill="${col}" opacity="${(0.4 + f * 0.5).toFixed(2)}"/>`;
      // brand iron when hot
      const brand = hot ? `<line x1="${x - bodyW / 4}" y1="${steerY - 20}" x2="${x - bodyW / 4 + 8}" y2="${steerY - 8}" stroke="var(--amber)" stroke-width="2">
          <animate attributeName="opacity" values="1;.4;1" dur="1.2s" repeatCount="indefinite"/></line>` : "";
      return `<g class="rh-steer${hot ? " hot" : ""}">
        <ellipse cx="${x}" cy="${steerY}" rx="${bodyW / 2}" ry="${bodyH / 2}" fill="#5a4030" stroke="${hot ? "var(--amber)" : "#4a3520"}" stroke-width="${hot ? 1.2 : .8}"/>
        <circle cx="${x - bodyW / 2 - 2}" cy="${steerY - 2}" r="3" fill="#4a3520"/>
        ${tag}${smoke}${brand}
        <text x="${x}" y="${steerY - bodyH / 2 - 10}" class="rh-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${steerY + 14}" class="rh-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // cowboys — hat + lasso
    const cowboys = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a08050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="rh-cowboy${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <ellipse cx="0" cy="-11" rx="5" ry="2" fill="#3a2a1a"/>
        <circle cx="8" cy="-6" r="4" fill="none" stroke="${col}" stroke-width="1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="rh-wrap">
        <div class="rh-head"><b>RANCH II</b><span>牛=配额窗 耳标=用量 烙烟=过热 牛仔=会话${hotN ? " · " + hotN + " 烙" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#161410" rx="10"/>
          ${fences}${steers}${cowboys}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1c1610"/>
          <text x="16" y="${H - 18}" class="rh-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="rh-ksub" text-anchor="end">栏=畜栏</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "牧场二号", eyebrow: "RANCH II", render };
})();
