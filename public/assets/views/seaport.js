/* -------------------------------------------------------------------- seaport
 * Seaport — a quay of moored barques: every quota window is a
 * vessel at berth (cargo stack + mast pennant = used%, ≥85%
 * the harbour light burns amber); sessions are stevedores
 * (a cap + hook) hauling crates.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "seaport";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 56, BOT = 44;
    const cols = Math.min(quotas.length, 5);
    const bw = (W - 24) / cols;
    const waterY = TOP + (H - TOP - BOT) * .55;
    const quayY = TOP + (H - TOP - BOT) * .78;

    // water lines
    const water = `<rect x="0" y="${waterY}" width="${W}" height="${quayY - waterY}" fill="#101a24"/>
      ${Array.from({length: 6}, (_, i) => `<line x1="${i * 70 + 20}" y1="${waterY + 10 + (i % 2) * 8}" x2="${i * 70 + 40}" y2="${waterY + 10 + (i % 2) * 8}" stroke="#2a3a48" stroke-width="1" opacity=".5"/>`).join("")}
      <rect x="0" y="${quayY}" width="${W}" height="${H - quayY}" fill="#241c18"/>`;

    const vessels = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#60a0c0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const vesselY = waterY + 8;
      const hullW = bw - 20, hullH = 14;
      const mastH = 24 + f * 12;
      // cargo stack = f
      const cargoH = f * 10;
      const cargo = `<rect x="${x - hullW / 2 + 6}" y="${vesselY - cargoH}" width="${hullW - 12}" height="${cargoH}" fill="${col}" opacity=".7"/>`;
      // pennant
      const pennant = `<path d="M${x} ${vesselY - mastH} L${x + 10} ${vesselY - mastH + 3} L${x} ${vesselY - mastH + 6} Z" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="opacity" values="1;.4;1" dur="1.4s" repeatCount="indefinite"/>` : ""}
        </path>`;
      // harbour light
      const light = `<circle cx="${x + bw / 2 - 8}" cy="${quayY - 6}" r="2" fill="${hot ? "var(--amber)" : col}">
          ${hot ? `<animate attributeName="opacity" values="1;.3;1" dur="1.6s" repeatCount="indefinite"/>` : ""}
        </circle>`;
      return `<g class="ha-vessel${hot ? " hot" : ""}">
        <!-- mast -->
        <line x1="${x}" y1="${vesselY - mastH}" x2="${x}" y2="${vesselY}" stroke="#4a3a28" stroke-width="1.5"/>
        ${pennant}
        <!-- hull -->
        <path d="M${x - hullW / 2} ${vesselY} L${x + hullW / 2} ${vesselY} L${x + hullW / 2 - 4} ${vesselY + hullH} L${x - hullW / 2 + 4} ${vesselY + hullH} Z" fill="#3a4858" stroke="${hot ? "var(--amber)" : "#2a3848"}" stroke-width="${hot ? 1.2 : .8}"/>
        ${cargo}
        <!-- mooring line -->
        <line x1="${x + hullW / 2}" y1="${vesselY + hullH / 2}" x2="${x + bw / 2 - 4}" y2="${quayY}" stroke="#6a5030" stroke-width="1" opacity=".6"/>
        ${light}
        <text x="${x}" y="${quayY - 4}" class="ha-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${quayY + 10}" class="ha-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // stevedores — cap + hook
    const stevedores = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#70a0b0");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = quayY - 6 - (i % 2) * 3;
      return `<g class="ha-stev${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-18} ${y.toFixed(1)};${W + 18} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <path d="M4 -2 L10 -6 M10 -6 L12 -3" stroke="${col}" stroke-width="1.2" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ha-wrap">
        <div class="ha-head"><b>SEAPORT</b><span>泊位=配额窗 货垛=用量 桅旗=过热 搬运工=会话${hotN ? " · " + hotN + " 满" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#0e141a" rx="10"/>
          ${water}${vessels}${stevedores}
          <text x="16" y="${H - 18}" class="ha-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="ha-ksub" text-anchor="end">系缆=泊线</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "海埠", eyebrow: "SEAPORT", render };
})();
