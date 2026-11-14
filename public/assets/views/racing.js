/* ------------------------------------------------------------------- racing
 * Racing — the circuit: quota windows are checkpoint gates on the
 * oval — the gate's light goes green→amber→red as the window fills;
 * sessions are cars lapping the track (speed = tps, tries worn as
 * hash marks on the spoiler).
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "racing";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  const CX = 200.0, CY = 150.0, RX = 150.0, RY = 84.0;

  // Parametric point on the oval; t in [0,1) travels the ellipse.
  function pt(t) {
    const a = t * Math.PI * 2;
    return [CX + Math.cos(a) * RX, CY + Math.sin(a) * RY];
  }

  // The oval as an SVG path (48 segments).
  function ovalPath() {
    let d = "";
    for (let i = 0; i <= 48; i++) {
      const [x, y] = pt(i / 48);
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
    }
    return d + "Z";
  }

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300;

    // checkpoint gates — quota windows at even spacings on the oval
    const gates = quotas.map((w, i) => {
      const t = i / Math.max(1, quotas.length);
      const [x, y] = pt(t);
      const [tx, ty] = pt(t + 0.01);
      const ang = Math.atan2(ty - y, tx - x) * 180 / Math.PI + 90;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const light = hot ? "var(--red)" : w.used >= 50 ? "var(--amber)" : "var(--green)";
      return `<g class="rc-gate${hot ? " hot" : ""}">
        <line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y - 26).toFixed(1)}" stroke="var(--fg-2)" stroke-width="1.6"/>
        <rect x="${(x - 9).toFixed(1)}" y="${(y - 34).toFixed(1)}" width="18" height="9" rx="2" fill="var(--card-3)" stroke="var(--line-2)" stroke-width="1"/>
        <circle cx="${x.toFixed(1)}" cy="${(y - 29.5).toFixed(1)}" r="3.2" fill="${light}" class="rc-light"/>
        <text x="${x.toFixed(1)}" y="${(y + 12).toFixed(1)}" class="rc-pct" text-anchor="middle" transform="rotate(${ang.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${(y + 22).toFixed(1)}" class="rc-name" text-anchor="middle" transform="rotate(${ang.toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // cars — sessions lapping; tries = hash marks on the spoiler
    const cars = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 16 - (s.tps || 0) / 14);
      const tries = Math.min(3, (s.tries || []).length);
      const hash = Array.from({ length: tries }, (_, j) =>
        `<line x1="${(-7 + j * 3).toFixed(1)}" y1="-5" x2="${(-7 + j * 3).toFixed(1)}" y2="-1" stroke="var(--card-1)" stroke-width="1.2"/>`
      ).join("");
      return `<g class="rc-car${dead ? " dead" : ""}">
        <rect x="-9" y="-4" width="18" height="8" rx="3" fill="${dead ? "var(--red)" : m.color || "#f472b6"}"/>
        <rect x="-3" y="-3" width="6" height="6" rx="1.5" fill="var(--card-3)" opacity=".9"/>
        ${hash}
        <animateMotion dur="${dur}s" repeatCount="indefinite" begin="${(-i * (dur / Math.max(1, sessions.length))).toFixed(2)}s" rotate="auto"
          path="${ovalPath()}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="rc-wrap">
        <div class="rc-head"><b>RACING</b><span>门=配额窗 车=会话 灯=热度${hotN ? " · " + hotN + " 门红灯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <path d="${ovalPath()}" fill="none" stroke="var(--line-2)" stroke-width="9" opacity=".5"/>
          <path d="${ovalPath()}" fill="none" stroke="var(--card-3)" stroke-width="7"/>
          <line x1="${CX}" y1="${CY - RY - 5}" x2="${CX}" y2="${CY - RY + 5}" stroke="var(--fg)" stroke-width="2" opacity=".8"/>
          ${gates}${cars}
          <g class="rc-card">
            <rect x="${CX - 62}" y="${CY - 22}" width="124" height="44" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${CX}" y="${CY - 4}" class="rc-k" text-anchor="middle">${fmt(k.tokens)} · ${sessions.length} 车</text>
            <text x="${CX}" y="${CY + 10}" class="rc-ksub" text-anchor="middle">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "赛道", eyebrow: "RACING", render };
})();
