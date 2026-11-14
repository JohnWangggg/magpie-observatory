/* ------------------------------------------------------------------- apiary
 * Apiary — a meadow of beehive boxes: every quota window is a
 * hive (honeycomb fill = used%, ≥85% the hive glows amber);
 * sessions are bees orbiting their hive in lazy figure-eights.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "apiary";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 46, BOT = 44;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const hives = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#e0b040";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const hiveY = floorY - 12;
      const hiveW = bw - 18, hiveH = 40;
      // stacked supers
      const supers = 3;
      const supH = hiveH / supers;
      const supEls = Array.from({ length: supers }, (_, si) => {
        const sy = hiveY - (si + 1) * supH;
        const sw = hiveW - si * 4;
        return `<rect x="${x - sw / 2}" y="${sy}" width="${sw}" height="${supH - 1}" rx="2" fill="#c0a070" stroke="${hot ? "var(--amber)" : "#6a5a40"}" stroke-width="${hot ? 1.1 : .8}"/>`;
      }).join("");
      // honeycomb fill — hexagons on the middle super
      const combN = Math.round(f * 5);
      const comb = Array.from({ length: combN }, (_, ci) => {
        const cx = x - 8 + (ci % 3) * 8;
        const cy = hiveY - supH * 1.5 + Math.floor(ci / 3) * 7;
        return `<polygon points="${cx},${cy - 3} ${cx + 2.6},${cy - 1.5} ${cx + 2.6},${cy + 1.5} ${cx},${cy + 3} ${cx - 2.6},${cy + 1.5} ${cx - 2.6},${cy - 1.5}" fill="${col}" opacity="${(0.5 + f * .4).toFixed(2)}"/>`;
      }).join("");
      return `<g class="ap-hive${hot ? " hot" : ""}">
        <!-- roof -->
        <path d="M${x - hiveW / 2 - 2} ${hiveY - hiveH} L${x + hiveW / 2 + 2} ${hiveY - hiveH} L${x + hiveW / 2 - 2} ${hiveY - hiveH - 8} L${x - hiveW / 2 + 2} ${hiveY - hiveH - 8} Z" fill="#8a7050"/>
        ${supEls}${comb}
        <!-- entrance -->
        <rect x="${x - 6}" y="${hiveY - 4}" width="12" height="4" rx="1" fill="#1a1208"/>
        <text x="${x}" y="${hiveY + 12}" class="ap-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${hiveY + 21}" class="ap-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
        ${hot ? `<circle cx="${x + hiveW / 2 - 2}" cy="${hiveY - hiveH - 4}" r="3.5" fill="var(--amber)">
          <animate attributeName="r" values="3.5;5;3.5" dur="1.5s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // bees — figure-eight orbit around each hive centre
    const bees = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#f0e0a0");
      const hiveIdx = i % Math.max(1, quotas.length);
      const hx = 12 + hiveIdx * bw + bw / 2;
      const hy = floorY - 20;
      const orbitR = 14 + (i % 3) * 6;
      const dur = Math.max(5, 12 - (s.tps || 0) / 15);
      const path = `M${hx - orbitR} ${hy} C ${hx - orbitR * 1.5} ${hy - orbitR * .8} ${hx - orbitR * .5} ${hy - orbitR * .8} ${hx} ${hy} C ${hx + orbitR * .5} ${hy - orbitR * .8} ${hx + orbitR * 1.5} ${hy - orbitR * .8} ${hx + orbitR} ${hy} C ${hx + orbitR * 1.5} ${hy + orbitR * .8} ${hx + orbitR * .5} ${hy + orbitR * .8} ${hx} ${hy} C ${hx - orbitR * .5} ${hy + orbitR * .8} ${hx - orbitR * 1.5} ${hy + orbitR * .8} ${hx - orbitR} ${hy}`;
      return `<g class="ap-bee">
        <animateMotion path="${path}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="3" ry="2" fill="${col}"/>
        <ellipse cx="0" cy="-2.5" rx="1.5" ry="1" fill="${col}" opacity=".6"/>
        <line x1="-2" y1="0" x2="2" y2="0" stroke="#1a1208" stroke-width="1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ap-wrap">
        <div class="ap-head"><b>APIARY</b><span>蜂箱=配额窗 巢脾=用量 工蜂=会话${hotN ? " · " + hotN + " 满巢" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#181410" rx="10"/>
          ${hives}${bees}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#241a12"/>
          <text x="16" y="${H - 18}" class="ap-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="ap-ksub" text-anchor="end">∞字=蜂航</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "蜂场", eyebrow: "APIARY", render };
})();
