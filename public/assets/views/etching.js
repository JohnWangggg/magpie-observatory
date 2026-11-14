/* ------------------------------------------------------------------- etching
 * Etching — a copper-plate bath: every quota window is a plate
 * in the acid tray (line bite depth + needle scratch = used%,
 * ≥85% the plate edge burns amber); sessions are etchers (a
 * loupe + needle) drawing through the ground.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "etching";
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

    const plates = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#b08050";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const plateY = floorY - 16;
      const plateW = bw - 18, plateH = 30;
      // etched lines — count = f
      const lines = Array.from({ length: Math.round(3 + f * 5) }, (_, li) => {
        const ly = plateY - plateH + 6 + li * (plateH - 10) / Math.max(1, Math.round(2 + f * 5));
        const lx0 = x - plateW / 2 + 4 + (li % 3) * 2;
        const lx1 = x + plateW / 2 - 4 - ((li + 1) % 3) * 2;
        return `<line x1="${lx0}" y1="${ly.toFixed(1)}" x2="${lx1}" y2="${ly.toFixed(1)}" stroke="${col}" stroke-width="${(0.5 + f * 1).toFixed(1)}" opacity="${(0.5 + f * 0.4).toFixed(2)}"/>`;
      }).join("");
      // scratch marks when hot
      const scratches = hot ? Array.from({ length: 3 }, (_, si) => {
        const sx = x - 6 + si * 6;
        return `<line x1="${sx}" y1="${plateY - plateH + 8}" x2="${sx + 4}" y2="${plateY - 10}" stroke="var(--amber)" stroke-width="1" opacity=".8">
          <animate attributeName="opacity" values="0;.8;0" dur="${(0.9 + si * 0.3).toFixed(1)}s" begin="${(-si * 0.3).toFixed(1)}s" repeatCount="indefinite"/></line>`;
      }).join("") : "";
      // tray
      const tray = `<rect x="${x - plateW / 2 - 4}" y="${plateY + 4}" width="${plateW + 8}" height="8" rx="2" fill="#2a2420"/>
        <rect x="${x - plateW / 2 - 2}" y="${plateY + 6}" width="${plateW + 4}" height="4" fill="${col}" opacity=".3"/>`;
      return `<g class="et-plate${hot ? " hot" : ""}">
        ${tray}
        <rect x="${x - plateW / 2}" y="${plateY - plateH}" width="${plateW}" height="${plateH}" rx="1" fill="#4a3a28" stroke="${hot ? "var(--amber)" : "#6a5030"}" stroke-width="${hot ? 1.4 : .8}"/>
        ${lines}${scratches}
        <text x="${x}" y="${plateY + 16}" class="et-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${plateY + 25}" class="et-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // etchers — loupe + needle
    const etchers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#b09060");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="et-etcher${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <circle cx="4" cy="-9" r="2" fill="none" stroke="${col}" stroke-width="1"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-4" x2="10" y2="-10" stroke="${col}" stroke-width="1"/>
        <circle cx="10" cy="-10" r="1" fill="var(--amber)"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="et-wrap">
        <div class="et-head"><b>ETCHING</b><span>铜版=配额窗 线深=用量 划痕=过热 蚀刻师=会话${hotN ? " · " + hotN + " 咬" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141210" rx="10"/>
          ${plates}${etchers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#201c18"/>
          <text x="16" y="${H - 18}" class="et-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="et-ksub" text-anchor="end">酸槽=槽盘</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "蚀刻坊", eyebrow: "ETCHING", render };
})();
