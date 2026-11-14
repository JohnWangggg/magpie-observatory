/* ------------------------------------------------------------------- skyline
 * Skyline — a midnight city: every quota window is a tower whose roof
 * rises as used % climbs (≥85% the beacon flashes red); sessions are
 * shooting stars crossing the skyline.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "skyline";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(44178253);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 7);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, FLOOR = 236;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    // stars background
    const stars = Array.from({ length: 22 }, (_, i) =>
      `<circle cx="${(20 + rnd() * 360).toFixed(0)}" cy="${(10 + rnd() * 140).toFixed(0)}" r="${(0.5 + rnd() * 0.9).toFixed(1)}" fill="#e8eef8" opacity="${(0.3 + rnd() * 0.5).toFixed(2)}"/>`).join("");

    // towers — height = usage; lit windows = load
    const towers = quotas.map((w, i) => {
      const x = 30 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const hgt = 30 + f * 160;
      const bw = gap - 6;
      const col = m.color || "#6a7a9a";
      // lit windows — denser at higher usage
      const rows = Math.floor(hgt / 16), colsN = Math.max(2, Math.floor(bw / 12));
      let wins = "";
      for (let r = 0; r < Math.min(rows, 12); r++) {
        for (let c = 0; c < colsN; c++) {
          const lit = rnd() < 0.3 + f * 0.5;
          if (!lit) continue;
          wins += `<rect x="${(x + 4 + c * (bw - 8) / colsN).toFixed(1)}" y="${(FLOOR - hgt + 6 + r * 14).toFixed(1)}" width="${((bw - 8) / colsN - 2).toFixed(1)}" height="5" fill="${hot ? "var(--red)" : "#f2d58a"}" opacity="${(0.4 + f * .5).toFixed(2)}"/>`;
        }
      }
      // rooftop beacon
      const beacon = `<circle cx="${(x + bw / 2).toFixed(1)}" cy="${(FLOOR - hgt - 4).toFixed(1)}" r="2" fill="${hot ? "var(--red)" : "#e8eef8"}">
        <animate attributeName="opacity" values="1;.2;1" dur="${hot ? "0.9s" : "2.4s"}" repeatCount="indefinite"/></circle>`;
      return `<g class="sk-tower${hot ? " hot" : ""}">
        <rect x="${x.toFixed(1)}" y="${(FLOOR - hgt).toFixed(1)}" width="${bw.toFixed(1)}" height="${hgt.toFixed(1)}" rx="2"
          fill="color-mix(in srgb, ${col} ${28 + f * 20}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1"/>
        ${wins}${beacon}
        <text x="${(x + bw / 2).toFixed(1)}" y="${FLOOR + 18}" class="sk-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${(x + bw / 2).toFixed(1)}" y="${FLOOR + 29}" class="sk-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 5))}</text>
      </g>`;
    }).join("");

    // shooting stars — sessions crossing the sky
    const meteors = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 10);
      const y = 40 + (i % 3) * 22 + rnd() * 10;
      const len = 14 + Math.min(12, (s.tokens || 0) / 30000);
      return `<g class="sk-meteor${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${W + 30} ${y.toFixed(1)};${-40} ${(y + 60).toFixed(1)}" dur="${dur}s" begin="${(-i * 1.8).toFixed(1)}s" repeatCount="indefinite"/>
        <line x1="0" y1="0" x2="${-len}" y2="${len * .4}" stroke="${dead ? "var(--red)" : m.color || "#dfeaf5"}" stroke-width="1.4" stroke-linecap="round" opacity=".85">
          <animate attributeName="opacity" values=".9;.3;.9" dur=".7s" repeatCount="indefinite"/>
        </line>
        <circle cx="0" cy="0" r="1.6" fill="${dead ? "var(--red)" : m.color || "#fff"}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sk-wrap">
        <div class="sk-head"><b>SKYLINE</b><span>楼=配额窗 高=用量 星=会话${hotN ? " · " + hotN + " 楼顶红" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #0c1018 46%, transparent)" rx="10"/>
          ${stars}
          <rect x="14" y="${FLOOR}" width="${W - 28}" height="3" rx="1.5" fill="#2a2a3a" opacity=".9"/>
          ${towers}${meteors}
          <g class="sk-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="sk-k">${fmt(k.tokens)} · ${sessions.length} 星</text>
            <text x="22" y="45" class="sk-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "天际线", eyebrow: "SKYLINE", render };
})();
