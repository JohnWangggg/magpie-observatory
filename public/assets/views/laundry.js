/* ------------------------------------------------------------------ laundry
 * Laundry — the wash line: every quota window is a front-loader —
 * the drum's water level drops as the window burns (spin speed and
 * foam rise as it fills, ≥85% runs the hot cycle); sessions are
 * garments tumbling inside the drums.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "laundry";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, MAC_Y = 186;

    // machines
    const n = Math.max(1, quotas.length);
    const gap = (W - 90) / n;
    const machines = quotas.map((w, i) => {
      const x = 45 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const room = 1 - w.used / 100;
      const spin = Math.max(0.8, 4 - (w.used / 100) * 3.2);
      const waterY = MAC_Y - 16 - room * 22; // water level inside drum
      return `<g class="ln-mac${hot ? " hot" : ""}">
        <rect x="${(x - 19).toFixed(1)}" y="${MAC_Y - 42}" width="38" height="46" rx="4" fill="var(--card-3)" stroke="var(--line-2)" stroke-width="1.4"/>
        <rect x="${(x - 16).toFixed(1)}" y="${MAC_Y - 39}" width="10" height="4" rx="1.5" fill="var(--card-2)" stroke="var(--line-2)" stroke-width=".8"/>
        <circle class="ln-led" cx="${(x + 11).toFixed(1)}" cy="${MAC_Y - 37}" r="2.2" fill="${hot ? "var(--red)" : "var(--green)"}"/>
        <clipPath id="lnClip${i}"><circle cx="${x.toFixed(1)}" cy="${MAC_Y - 18}" r="14"/></clipPath>
        <circle cx="${x.toFixed(1)}" cy="${MAC_Y - 18}" r="15" fill="var(--card-2)" stroke="var(--line-2)" stroke-width="1.6"/>
        <g clip-path="url(#lnClip${i})">
          <rect x="${(x - 15).toFixed(1)}" y="${waterY.toFixed(1)}" width="30" height="40"
            fill="${hot ? "var(--red)" : m.color || "#56d4dd"}" opacity=".5"/>
          <g class="ln-drum" style="animation-duration:${spin.toFixed(2)}s;transform-origin:${x.toFixed(1)}px ${MAC_Y - 18}px">
            <line x1="${(x - 11).toFixed(1)}" y1="${MAC_Y - 18}" x2="${(x + 11).toFixed(1)}" y2="${MAC_Y - 18}" stroke="var(--line-2)" stroke-width="1" opacity=".6"/>
            <line x1="${x.toFixed(1)}" y1="${MAC_Y - 29}" x2="${x.toFixed(1)}" y2="${MAC_Y - 7}" stroke="var(--line-2)" stroke-width="1" opacity=".6"/>
          </g>
        </g>
        <circle cx="${x.toFixed(1)}" cy="${MAC_Y - 18}" r="15" fill="none" stroke="var(--fg-2)" stroke-width="1" opacity=".5"/>
        <text x="${x.toFixed(1)}" y="${MAC_Y + 16}" class="ln-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${MAC_Y + 27}" class="ln-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // garments — sessions tumbling inside drum circles (orbiting)
    const garments = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const macIdx = Math.min(i, quotas.length - 1);
      const cx = 45 + gap / 2 + macIdx * gap;
      const dur = Math.max(1.2, 3.5 - (s.tps || 0) / 40);
      const shape = i % 2;
      const body = shape
        ? `<rect x="-4" y="-4" width="8" height="8" rx="2" fill="${dead ? "var(--red)" : m.color || "#56d4dd"}"/>`
        : `<path d="M -4 -4 L 0 -7 L 4 -4 L 4 5 L -4 5 Z" fill="${dead ? "var(--red)" : m.color || "#56d4dd"}"/>`;
      return `<g class="ln-sock${dead ? " dead" : ""}" transform="translate(${cx.toFixed(1)} ${MAC_Y - 18})">
        <g>
          <animateTransform attributeName="transform" type="rotate" values="0;360"
            dur="${dur}s" begin="${(-i * 0.5).toFixed(2)}s" repeatCount="indefinite"/>
          <g transform="translate(7 0)">${body}</g>
        </g>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ln-wrap">
        <div class="ln-head"><b>LAUNDRY</b><span>筒=配额窗 衣=会话 位=余量${hotN ? " · " + hotN + " 筒热洗" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="30" y1="${MAC_Y + 40}" x2="${W - 30}" y2="${MAC_Y + 40}" stroke="var(--line-2)" stroke-width="4"/>
          ${garments}${machines}
          <g class="ln-card">
            <rect x="14" y="12" width="120" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="ln-k">${fmt(k.tokens)} · ${sessions.length} 衣</text>
            <text x="22" y="43" class="ln-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "洗衣房", eyebrow: "LAUNDRY", render };
})();
