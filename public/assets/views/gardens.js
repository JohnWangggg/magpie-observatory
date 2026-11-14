/* ------------------------------------------------------------------ gardens
 * Gardens — formal parterre beds in a walled garden: every
 * quota window is a flower bed whose bloom count = used %
 * (≥85% the sundial burns amber); sessions are butterflies
 * drifting between the beds.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "gardens";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(99880011);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 245;

    // walled garden sky
    const sky = `<defs><linearGradient id="gi-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#e0e8f0"/><stop offset="100%" stop-color="#f0f0e8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#gi-s)" rx="10"/>`;
    // garden wall
    const wall = `<rect x="0" y="${GY - 60}" width="${W}" height="12" fill="#b0a898" opacity=".3"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #a8b888 55%, var(--card-2))"/>`;
    // gravel paths between beds
    const path = `<rect x="0" y="${GY + 10}" width="${W}" height="8" fill="#c8c0b0" opacity=".5"/>`;

    // parterre beds — bloom count = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const beds = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#c86878";
      const bw = 15 + f * 25;
      const bh = 12 + f * 30;
      const topY = GY - bh;
      // bed rim — clipped box edging
      const rim = `<rect x="${cx - bw / 2}" y="${topY}" width="${bw}" height="${bh}" rx="3" fill="color-mix(in srgb, #6a8858 60%, var(--card-2))" stroke="#4a6840" stroke-width="1.5"/>`;
      // flowers — count = used %
      const flowerN = Math.round(2 + f * 8);
      let blooms = "";
      const cols = [col, "#c04050", "#e8a030", "#8a68b8", "#e07090"];
      for (let b = 0; b < flowerN; b++) {
        const bx = cx + (rnd() - .5) * bw * .8;
        const by = topY + 3 + rnd() * (bh - 6);
        const br = 2 + rnd() * 2;
        blooms += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${br.toFixed(1)}" fill="${cols[b % cols.length]}" opacity="${(.6 + rnd() * .3).toFixed(2)}"/>`;
      }
      // sundial in hot beds
      const dial = hot ? `<line x1="${cx}" y1="${topY - 8}" x2="${cx}" y2="${topY}" stroke="var(--amber)" stroke-width="1.5"/><circle cx="${cx}" cy="${topY - 8}" r="3" fill="var(--amber)" opacity=".7">
        <animate attributeName="r" values="3;5" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;.2" dur="1.5s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="gi-bed${hot ? " hot" : ""}">
        ${rim}${blooms}${dial}
        <text x="${cx.toFixed(1)}" y="${GY + 22}" class="gi-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 33}" class="gi-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // butterflies — drifting between beds
    const flies = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 13 - (s.tps || 0) / 12);
      const y = GY - 30 - (i % 3) * 15;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#e08838");
      const cx2 = W / 2 + (rnd() - .5) * 80;
      const rx2 = 40 + rnd() * 50;
      const ry2 = 12 + rnd() * 10;
      return `<g class="gi-fly${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${y}"/>
        <ellipse cx="0" cy="${-size * .3}" rx="${size * .5}" ry="${size * .8}" fill="${col}" opacity=".8" transform="rotate(-25)"/>
        <ellipse cx="0" cy="${size * .3}" rx="${size * .5}" ry="${size * .8}" fill="${col}" opacity=".7" transform="rotate(25)"/>
        <ellipse cx="0" cy="0" rx="${size * .12}" ry="${size}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gi-wrap">
        <div class="gi-head"><b>GARDENS</b><span>花坛=配额窗 花量=用量 蝴蝶=会话${hotN ? " · " + hotN + " 燃晷" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${wall}${ground}${path}${beds}${flies}
          <g class="gi-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="gi-k">${fmt(k.tokens)} · ${sessions.length} 蝶</text>
            <text x="22" y="45" class="gi-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "花坛", eyebrow: "GARDENS", render };
})();
