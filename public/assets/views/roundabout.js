/* ------------------------------------------------------------------ roundabout
 * Roundabout — a circus ring in a suburb: every quota window
 * is an entry arm (zebra + yield sign = used%, ≥85% the
 * centre bollard burns amber); sessions are cyclists
 * (a helmet + basket) circling the island.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "roundabout";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, CX = W / 2, CY = H / 2 + 8, R = Math.min(CX, CY) - 40;
    const N = quotas.length;

    // island
    const island = `<circle cx="${CX}" cy="${CY}" r="${R - 24}" fill="#1a241a" stroke="#3a4a3a" stroke-width="2"/>
      <circle cx="${CX}" cy="${CY}" r="${R - 32}" fill="#2a3a2a" opacity=".6"/>`;

    const arms = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c0a060";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const ang = (i / N) * Math.PI * 2;
      const ax = CX + Math.cos(ang) * (R + 30);
      const ay = CY + Math.sin(ang) * (R + 30);
      // zebra
      const zebra = `<line x1="${CX + Math.cos(ang) * (R - 10)}" y1="${CY + Math.sin(ang) * (R - 10)}" x2="${ax}" y2="${ay}" stroke="#e0e0d0" stroke-width="6" stroke-dasharray="4 4" opacity="${(0.3 + f * 0.4).toFixed(2)}"/>`;
      // yield sign = f
      const yieldS = `<polygon points="${ax.toFixed(1)},${ay.toFixed(1) - 8} ${ax.toFixed(1) - 5},${ay.toFixed(1)} ${ax.toFixed(1) + 5},${ay.toFixed(1)}" fill="${col}" opacity="${(0.4 + f * 0.4).toFixed(2)}"/>`;
      // bollard when hot
      const bollard = hot ? `<circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1) - 14}" r="3" fill="var(--amber)">
          <animate attributeName="r" values="3;4.5;3" dur="1.3s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="rx-arm${hot ? " hot" : ""}">
        ${zebra}${yieldS}${bollard}
        <text x="${ax.toFixed(1)}" y="${ay.toFixed(1) + 12}" class="rx-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${ax.toFixed(1)}" y="${ay.toFixed(1) + 20}" class="rx-name" text-anchor="middle">${esc(w.name.slice(0, 4))}</text>
      </g>`;
    }).join("");

    // cyclists — helmet + basket
    const cyclists = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a0a060");
      const dur = Math.max(10, 18 - (s.tps || 0) / 12);
      const orbit = R - 12 - (i % 3) * 10;
      const path = `M ${CX} ${CY} m ${-orbit},0 a ${orbit},${orbit} 0 1,0 ${orbit * 2},0 a ${orbit},${orbit} 0 1,0 -${orbit * 2},0`;
      return `<g class="rx-cyc${s.status === "err" ? " dead" : ""}">
        <circle r="4" fill="${col}" opacity=".9">
          <animateMotion dur="${dur}s" repeatCount="indefinite" path="${path}"/>
        </circle>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="rx-wrap">
        <div class="rx-head"><b>ROUNDABOUT</b><span>入口=配额窗 斑马=用量 岛心=过热 骑行=会话${hotN ? " · " + hotN + " 环" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141414" rx="10"/>
          ${island}${arms}${cyclists}
          <circle cx="${CX}" cy="${CY}" r="16" fill="#241e14" stroke="#4a4030"/>
          <text x="${CX}" y="${CY + 3}" class="rx-k" text-anchor="middle">${fmt(k.tokens)}</text>
          <text x="16" y="${H - 18}" class="rx-ksub">环=环岛</text>
          <text x="${W - 16}" y="${H - 18}" class="rx-ksub" text-anchor="end">${N} 口</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "环岛", eyebrow: "ROUNDABOUT", render };
})();
