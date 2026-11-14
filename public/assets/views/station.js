/* ------------------------------------------------------------------- station
 * Station — the platform at rush hour: every provider window is a
 * signal gantry (green→amber→red as it fills); sessions are trains
 * rolling under the platform; a station clock keeps the hour.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "station";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TRACK = 218;

    // gantries — signal heads on masts across the top
    const gans = quotas.map((w, i) => {
      const x = 40 + i * ((W - 80) / Math.max(1, quotas.length - 1));
      const m = metaOf(pmeta, w.prov);
      const heat = w.used >= 85 ? "hot" : w.used >= 60 ? "warm" : "cool";
      const lit = heat === "hot" ? 2 : heat === "warm" ? 1 : 0; // 0=green 1=amber 2=red
      return `<g class="st-gan ${heat}">
        <line x1="${x.toFixed(1)}" y1="18" x2="${x.toFixed(1)}" y2="66" stroke="var(--line-2)" stroke-width="2"/>
        <rect x="${x - 8}" y="66" width="16" height="30" rx="4" fill="var(--card-3)" stroke="var(--line-2)"/>
        ${["#4ade80", "#fbbf24", "var(--red)"].map((c, j) => `<circle cx="${x.toFixed(1)}" cy="${74 + j * 8}" r="3" fill="${j === lit ? c : "var(--line-2)"}" opacity="${j === lit ? 1 : .4}" class="st-sig${j === lit ? " lit" : ""}" style="animation-delay:${(i * 0.3).toFixed(2)}s"/>`).join("")}
        <text x="${x.toFixed(1)}" y="108" class="st-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="120" class="st-sname" text-anchor="middle">${esc((m.name || w.prov).slice(0, 5))}</text>
      </g>`;
    }).join("");

    // trains — sessions as boxcars on the track, speed = tps
    const trains = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const pm = metaOf(pmeta, s.provider);
      const dead = s.status === "err";
      const cars = Math.min(3, Math.max(1, Math.ceil((s.tries || []).length / 2)));
      const dur = Math.max(4, 12 - (s.tps || 0) / 15);
      return `<g class="st-train${dead ? " dead" : ""}" style="animation-duration:${dur}s;animation-delay:${(-i * 2.4).toFixed(1)}s">
        ${Array.from({ length: cars }, (_, j) =>
          `<rect x="${(-cars * 34 + j * 34).toFixed(1)}" y="${TRACK - 26}" width="30" height="18" rx="2" fill="${dead ? "var(--red)" : m.color || "#8b7cf6"}" opacity="${dead ? .4 : .85}"/>`).join("")}
        <circle cx="${(-cars * 34 + 4).toFixed(1)}" cy="${TRACK - 4}" r="3" fill="var(--line-2)"/>
        <circle cx="${(-cars * 34 + 26).toFixed(1)}" cy="${TRACK - 4}" r="3" fill="var(--line-2)"/>
        <rect x="${(-cars * 34).toFixed(1)}" y="${TRACK - 34}" width="10" height="8" fill="${pm.color || "var(--amber)"}" opacity=".9"/>
        <animateTransform attributeName="transform" type="translate" values="0 0;${W + cars * 40} 0" dur="${dur}s" begin="${(-i * 2.4).toFixed(1)}s" repeatCount="indefinite"/>
      </g>`;
    }).join("");

    // platform edge + clock
    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;
    const now = new Date();
    const hh = now.getHours(), mm = now.getMinutes();
    const hourA = (hh % 12) / 12 * Math.PI * 2 - Math.PI / 2;
    const minA = mm / 60 * Math.PI * 2 - Math.PI / 2;

    host.innerHTML = `
      <div class="st-wrap">
        <div class="st-head"><b>STATION</b><span>灯=配额窗 车=会话 钟=当前${hotN ? " · " + hotN + " 灯红" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="0" y1="18" x2="${W}" y2="18" stroke="var(--line-2)" stroke-width="2"/>
          <rect x="0" y="${TRACK}" width="${W}" height="12" fill="var(--card-2)" stroke="var(--line-2)"/>
          <line x1="0" y1="${TRACK + 12}" x2="${W}" y2="${TRACK + 12}" stroke="var(--line-2)" stroke-width="1.4" stroke-dasharray="14 8"/>
          <g class="st-clock">
            <circle cx="36" cy="150" r="18" fill="var(--card-3)" stroke="var(--line-2)" stroke-width="1.6"/>
            <line x1="36" y1="150" x2="${(36 + Math.cos(hourA) * 8).toFixed(1)}" y2="${(150 + Math.sin(hourA) * 8).toFixed(1)}" stroke="var(--fg)" stroke-width="2" stroke-linecap="round"/>
            <line x1="36" y1="150" x2="${(36 + Math.cos(minA) * 12).toFixed(1)}" y2="${(150 + Math.sin(minA) * 12).toFixed(1)}" stroke="var(--fg-2)" stroke-width="1.4" stroke-linecap="round"/>
            <circle cx="36" cy="150" r="1.6" fill="var(--fg)"/>
          </g>
          ${gans}${trains}
          <g class="st-card">
            <rect x="${W - 140}" y="134" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 130}" y="152" class="st-k">${fmt(k.tokens)} · ${sessions.length} 列</text>
            <text x="${W - 130}" y="165" class="st-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "车站", eyebrow: "STATION", render };
})();
