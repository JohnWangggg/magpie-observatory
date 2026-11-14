/* -------------------------------------------------------------------- arena
 * Arena — a circular fighting ring: quota windows as banners
 * hung on the outer wall (banner colour = provider, fill = used%,
 * ≥85% burns amber); sessions are gladiators (head + sword arm)
 * striding around the sand floor.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "arena";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 8);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, cx = W / 2, cy = H / 2 + 4, TOP = 36, BOT = 40;
    const ring = Math.min(W, H - TOP - BOT) / 2 - 22;
    const sandR = ring - 34;

    // banners on the wall
    const banners = quotas.map((w, i) => {
      const a = (i / quotas.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * ring;
      const y = cy + Math.sin(a) * ring;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c0a060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const bw = 18, bh = 28;
      return `<g class="aj-banner${hot ? " hot" : ""}">
        <line x1="${(x - bw / 2).toFixed(1)}" y1="${(y - bh / 2 - 4).toFixed(1)}" x2="${(x + bw / 2).toFixed(1)}" y2="${(y - bh / 2 - 4).toFixed(1)}" stroke="#4a4040" stroke-width="2"/>
        <path d="M${(x - bw / 2).toFixed(1)} ${(y - bh / 2).toFixed(1)} L${(x + bw / 2).toFixed(1)} ${(y - bh / 2).toFixed(1)} L${(x + bw / 2).toFixed(1)} ${(y + bh / 2 - 6).toFixed(1)} L${x.toFixed(1)} ${(y + bh / 2).toFixed(1)} L${(x - bw / 2).toFixed(1)} ${(y + bh / 2 - 6).toFixed(1)} Z"
          fill="#1a2128" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.2 : .8}"/>
        <clipPath id="aj-clip-${i}"><path d="M${(x - bw / 2).toFixed(1)} ${(y - bh / 2).toFixed(1)} L${(x + bw / 2).toFixed(1)} ${(y - bh / 2).toFixed(1)} L${(x + bw / 2).toFixed(1)} ${(y + bh / 2 - 6).toFixed(1)} L${x.toFixed(1)} ${(y + bh / 2).toFixed(1)} L${(x - bw / 2).toFixed(1)} ${(y + bh / 2 - 6).toFixed(1)} Z"/></clipPath>
        <g clip-path="url(#aj-clip-${i})">
          <rect x="${(x - bw / 2).toFixed(1)}" y="${(y + bh / 2 - f * bh).toFixed(1)}" width="${bw}" height="${(f * bh).toFixed(1)}" fill="${col}" opacity=".85"/>
        </g>
        <text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" class="aj-num" text-anchor="middle">${Math.round(w.used)}</text>
        ${hot ? `<circle cx="${(x + bw / 2 - 3).toFixed(1)}" cy="${(y - bh / 2 + 3).toFixed(1)}" r="3" fill="var(--amber)">
          <animate attributeName="r" values="3;5;3" dur="1.4s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // gladiators — around the sand floor
    const gladiators = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#d0a060");
      const dur = Math.max(9, 18 - (s.tps || 0) / 10);
      return `<g class="aj-gladiator${s.status === "err" ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M${cx + sandR} ${cy} A ${sandR} ${sandR} 0 1 1 ${cx - sandR} ${cy} A ${sandR} ${sandR} 0 1 1 ${cx + sandR} ${cy}"/>
        <circle cx="0" cy="-6" r="3.5" fill="${col}"/>
        <rect x="-4" y="-3" width="8" height="8" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-2" x2="9" y2="-8" stroke="${col}" stroke-width="1.5"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="aj-wrap">
        <div class="aj-head"><b>ARENA</b><span>旌旗=配额窗 满度=用量 斗士=会话${hotN ? " · " + hotN + " 血旗" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#1a140e" rx="10"/>
          <circle cx="${cx}" cy="${cy}" r="${ring + 12}" fill="#241c12"/>
          <circle cx="${cx}" cy="${cy}" r="${sandR}" fill="#3a2e1c"/>
          ${banners}${gladiators}
          <text x="${cx}" y="${cy + 4}" class="aj-k" text-anchor="middle">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 16}" class="aj-ksub" text-anchor="end">沙地=擂台</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "竞技场", eyebrow: "ARENA", render };
})();
