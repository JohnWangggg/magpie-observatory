/* ------------------------------------------------------------------ garden2
 * Garden II — a walled kitchen garden: every quota window is
 * a raised bed (crop rows + bee skep = used%, ≥85% the
 * sundial gnomon burns amber); sessions are gardeners (a
 * straw hat + trug) hoeing the drills.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "garden2";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 60, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    // wall
    const wall = `<rect x="8" y="${TOP - 4}" width="${W - 16}" height="4" fill="#4a4038" opacity=".6"/>`;

    const beds = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#80a060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const bedY = floorY - 12;
      const bedW = bw - 16, bedH = 10;
      // crop rows = f
      const rows = Array.from({ length: Math.round(2 + f * 4) }, (_, ri) => {
        const ry = bedY - 4 + ri * 2;
        return `<line x1="${x - bedW / 2 + 4}" y1="${ry}" x2="${x + bedW / 2 - 4}" y2="${ry}" stroke="${col}" stroke-width="1" opacity="${(0.4 + f * 0.4).toFixed(2)}"/>`;
      }).join("");
      // skep
      const skep = `<ellipse cx="${x + bedW / 2 - 4}" cy="${bedY - bedH - 6}" rx="3" ry="4" fill="#8a7a50" stroke="${hot ? "var(--amber)" : "#6a5a30"}" stroke-width="${hot ? 1.2 : .8}"/>`;
      // sundial gnomon when hot
      const gnomon = hot ? `<line x1="${x - bedW / 2 + 4}" y1="${bedY - bedH - 4}" x2="${x - bedW / 2 + 8}" y2="${bedY - bedH - 12}" stroke="var(--amber)" stroke-width="1.5">
          <animate attributeName="opacity" values="1;.4;1" dur="1.4s" repeatCount="indefinite"/></line>` : "";
      return `<g class="gz-bed${hot ? " hot" : ""}">
        <rect x="${x - bedW / 2}" y="${bedY - bedH}" width="${bedW}" height="${bedH}" rx="2" fill="#3a2a18" stroke="${hot ? "var(--amber)" : "#4a3a28"}" stroke-width="${hot ? 1.2 : .8}"/>
        ${rows}${skep}${gnomon}
        <text x="${x}" y="${bedY - bedH - 12}" class="gz-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${bedY + 12}" class="gz-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // gardeners — straw hat + trug
    const gardeners = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a08050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="gz-gardener${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <ellipse cx="0" cy="-11" rx="5" ry="2.5" fill="#d0b060"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="4" y="-4" width="8" height="5" rx="1" fill="#6a5a40"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gz-wrap">
        <div class="gz-head"><b>GARDEN II</b><span>苗床=配额窗 垄=用量 晷针=过热 园丁=会话${hotN ? " · " + hotN + " 收" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141210" rx="10"/>
          ${wall}${beds}${gardeners}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1e1a14"/>
          <text x="16" y="${H - 18}" class="gz-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="gz-ksub" text-anchor="end">篱=园墙</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "园囿二号", eyebrow: "GARDEN II", render };
})();
