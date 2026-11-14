/* ---------------------------------------------------------------------- zen
 * Zen — the karesansui garden: every quota window is a stone group
 * in the raked sand — concentric ripples crowd the rock the fuller
 * the window runs (≥85% the sand goes bare); sessions are leaves
 * drifting down to rest on the gravel.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "zen";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, RY = 190;

    // raked sand — horizontal lines with a soft gap around each stone
    const sand = [0,1,2,3,4,5,6].map(i =>
      `<path d="M 30 ${70 + i * 26} q 60 ${i % 2 ? 5 : -5} 120 0 t 120 0 t 100 0" fill="none" stroke="var(--line-2)" stroke-width="1" opacity=".45"/>`
    ).join("");

    // stone groups — ripple rings crowd in as used % climbs
    const n = Math.max(1, quotas.length);
    const gap = (W - 90) / n;
    const stones = quotas.map((w, i) => {
      const x = 45 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const fill = w.used / 100;
      // 1-4 ripple rings depending on fill
      const rings = [34, 42, 50, 58].slice(0, 1 + Math.round(fill * 3)).map((r, j) =>
        `<ellipse cx="${x.toFixed(1)}" cy="${RY}" rx="${r}" ry="${r * .36}" fill="none" stroke="var(--line-2)" stroke-width="1" opacity="${.55 - j * .12}"/>`
      ).join("");
      return `<g class="zn-stone${hot ? " hot" : ""}">
        ${hot ? "" : rings}
        <ellipse cx="${x.toFixed(1)}" cy="${RY}" rx="15" ry="11" fill="${hot ? "var(--red)" : "var(--card-3)"}" stroke="${hot ? "var(--red)" : m.color || "#8d8d94"}" stroke-width="1.4"/>
        <ellipse cx="${(x - 4).toFixed(1)}" cy="${RY - 3}" rx="6" ry="3.4" fill="var(--card-2)" opacity=".6"/>
        <text x="${x.toFixed(1)}" y="${RY + 30}" class="zn-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${RY + 41}" class="zn-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // leaves — sessions drifting down
    const leaves = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const x = 70 + i * 86;
      const dur = Math.max(4, 12 - (s.tps || 0) / 16);
      return `<g class="zn-leaf${dead ? " dead" : ""}" style="animation-duration:${dur}s">
        <path d="M 0 -5 Q 5 -2 4 3 Q 0 6 -4 3 Q -5 -2 0 -5 Z" fill="${dead ? "var(--red)" : m.color || "#d9a03f"}" opacity=".9"/>
        <animateTransform attributeName="transform" type="translate" values="${x} 20;${x + 30} ${RY - 20}" dur="${dur}s" begin="${(-i * 1.4).toFixed(1)}s" repeatCount="indefinite"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="zn-wrap">
        <div class="zn-head"><b>ZEN</b><span>石=配额窗 纹=用量 叶=会话${hotN ? " · " + hotN + " 石秃沙" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          ${sand}${stones}${leaves}
          <g class="zn-card">
            <rect x="14" y="12" width="120" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="zn-k">${fmt(k.tokens)} · ${sessions.length} 叶</text>
            <text x="22" y="43" class="zn-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "枯山水", eyebrow: "ZEN", render };
})();
