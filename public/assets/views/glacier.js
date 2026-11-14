/* ------------------------------------------------------------------ glacier
 * Glacier — an ice floe field: every quota window is an iceberg that
 * calts as used % climbs (≥85% the berg cracks and calves); sessions
 * are penguins waddling the shore, sliding belly-first when fast.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "glacier";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(1299709);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, SEA = 216;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    const bergs = quotas.map((w, i) => {
      const cx = 34 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const bh = 30 + f * 84;                          // berg height
      const bw = 26 + f * 8;
      const ice = hot ? "color-mix(in srgb, var(--red) 24%, #bfe6f2)" : "#bfe6f2";
      const crack = hot ? `<path d="M ${cx - 4} ${SEA - bh + 8} l 6 10 l -4 8 l 7 10 l -3 8" fill="none" stroke="var(--red)" stroke-width="1.4" opacity=".9"/>` : "";
      // calving: a small shard dropping into the sea when hot
      const calve = hot ? `<path d="M 0 -4 l 6 4 l -4 5 l -5 -3 Z" fill="#bfe6f2">
          <animateTransform attributeName="transform" type="translate" values="${cx + bw / 2} ${SEA - bh * .4};${cx + bw / 2 + 8} ${SEA + 6}" dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="1;.2" dur="1.8s" repeatCount="indefinite"/></path>` : "";
      return `<g class="gc-berg${hot ? " hot" : ""}">
        <path d="M ${cx - bw / 2} ${SEA} L ${cx - bw / 4} ${SEA - bh} L ${cx + 2} ${SEA - bh - 10} L ${cx + bw / 3} ${SEA - bh * .7} L ${cx + bw / 2} ${SEA} Z"
          fill="${ice}" opacity=".9" stroke="#8fbfd4" stroke-width="1"/>
        ${crack}${calve}
        <path d="M ${cx - bw / 3} ${SEA + 6} q ${bw / 3} 10 ${bw * .66} 0" fill="none" stroke="#6d9fb8" stroke-width="1.4" opacity=".6"/>
        <text x="${cx.toFixed(1)}" y="${SEA + 34}" class="gc-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${SEA + 45}" class="gc-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // penguins — waddle (fast ones slide on the belly)
    const pengs = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const y = SEA + 14 + (i % 2) * 10;
      const fast = (s.tps || 0) > 30;
      const dur = Math.max(6, 16 - (s.tps || 0) / 10);
      const body = fast
        ? `<ellipse cx="0" cy="-1" rx="8" ry="3" fill="${dead ? "var(--red)" : m.color || "#2a3440"}"/><circle cx="6" cy="-2.5" r="2" fill="${dead ? "var(--red)" : m.color || "#2a3440"}"/>`
        : `<ellipse cx="0" cy="-6" rx="4.5" ry="6" fill="${dead ? "var(--red)" : m.color || "#2a3440"}"/><circle cx="0" cy="-13" r="2.6" fill="${dead ? "var(--red)" : m.color || "#2a3440"}"/><ellipse cx="0" cy="-4.5" rx="2.4" ry="3.6" fill="#f2f2ee"/>`;
      return `<g class="gc-peng${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20 + i * 10} ${y};${W + 30} ${y}" dur="${dur}s" begin="${(-i * 3).toFixed(1)}s" repeatCount="indefinite"/>
        ${body}
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gc-wrap">
        <div class="gc-head"><b>GLACIER</b><span>冰=配额窗 高=用量 鹅=会话${hotN ? " · " + hotN + " 冰崩" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #10202e 30%, transparent)" rx="10"/>
          ${bergs}
          <rect x="0" y="${SEA}" width="${W}" height="${H - SEA}" fill="color-mix(in srgb, #3a7a9a 24%, transparent)"/>
          ${pengs}
          <g class="gc-card">
            <rect x="14" y="12" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="gc-k">${fmt(k.tokens)} · ${sessions.length} 鹅</text>
            <text x="22" y="43" class="gc-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "冰川", eyebrow: "GLACIER", render };
})();
