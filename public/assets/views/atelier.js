/* -------------------------------------------------------------------- atelier
 * Atelier — a garret studio under skylights: every quota
 * window is a canvas on an easel (paint daub + easel tilt =
 * used%, ≥85% the palette knife burns amber); sessions are
 * painters (a beret + brush) at the stool.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "atelier";
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

    // skylight
    const skylight = `<polygon points="${W / 4},${TOP - 8} ${W * 3 / 4},${TOP - 8} ${W / 2},${TOP + 20}" fill="#1a2030" stroke="#384058" stroke-width="1.5" opacity=".7"/>`;

    const canvases = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#d0a060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const canY = floorY - 20;
      const canW = bw - 20, canH = 24;
      const tilt = -5 - f * 10;
      // daubs = f
      const daubs = Array.from({ length: Math.round(2 + f * 4) }, (_, di) => {
        const dx = x - canW / 2 + 5 + (di % 3) * (canW - 10) / 2;
        const dy = canY - canH + 6 + Math.floor(di / 3) * 8;
        return `<ellipse cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" rx="2.5" ry="1.5" fill="${col}" opacity="${(0.5 + f * 0.4).toFixed(2)}" transform="rotate(${tilt} ${dx} ${dy})"/>`;
      }).join("");
      // palette knife when hot
      const knife = hot ? `<line x1="${x + canW / 2 + 4}" y1="${canY - 4}" x2="${x + canW / 2 + 12}" y2="${canY - 14}" stroke="var(--amber)" stroke-width="2">
          <animate attributeName="opacity" values="1;.4;1" dur="1.3s" repeatCount="indefinite"/></line>` : "";
      return `<g class="aw-canvas${hot ? " hot" : ""}" transform="rotate(${tilt} ${x} ${canY})">
        <!-- easel legs -->
        <line x1="${x - canW / 2 - 6}" y1="${canY + 8}" x2="${x - canW / 2 + 2}" y2="${canY - canH}" stroke="#4a3a28" stroke-width="2"/>
        <line x1="${x + canW / 2 + 6}" y1="${canY + 8}" x2="${x + canW / 2 - 2}" y2="${canY - canH}" stroke="#4a3a28" stroke-width="2"/>
        <line x1="${x}" y1="${canY + 8}" x2="${x}" y2="${canY - canH - 6}" stroke="#4a3a28" stroke-width="1.5"/>
        <!-- canvas -->
        <rect x="${x - canW / 2}" y="${canY - canH}" width="${canW}" height="${canH}" rx="1" fill="#e8e4dc" stroke="${hot ? "var(--amber)" : "#c0b8a8"}" stroke-width="${hot ? 1.4 : .8}"/>
        ${daubs}${knife}
        <text x="${x}" y="${canY + 20}" class="aw-num" text-anchor="middle" transform="rotate(${-tilt} ${x} ${canY + 20})">${Math.round(w.used)}%</text>
        <text x="${x}" y="${canY + 30}" class="aw-name" text-anchor="middle" transform="rotate(${-tilt} ${x} ${canY + 30})">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // painters — beret + brush
    const painters = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#b08050");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="aw-painter${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <ellipse cx="-1" cy="-12" rx="5" ry="2.5" fill="#3a3028"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-4" x2="10" y2="-10" stroke="${col}" stroke-width="1.2"/>
        <circle cx="10" cy="-10" r="1.5" fill="var(--amber)"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="aw-wrap">
        <div class="aw-head"><b>ATELIER</b><span>画布=配额窗 彩点=用量 调色刀=过热 画工=会话${hotN ? " · " + hotN + " 完" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#181410" rx="10"/>
          ${skylight}${canvases}${painters}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241c14"/>
          <text x="16" y="${H - 18}" class="aw-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="aw-ksub" text-anchor="end">斜架=画架</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "画室", eyebrow: "ATELIER", render };
})();
