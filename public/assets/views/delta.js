/* -------------------------------------------------------------------- delta
 * Delta — a river forking into the sea: every quota window is a
 * distributary channel whose flow width = used % (≥85% the channel
 * churns red); sessions are punts drifting toward the sea.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "delta";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 232;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;
    const SRC = { x: 200, y: 40 };

    // distributaries — channel width = used %
    const channels = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#4a8ab8";
      const ex = 30 + gap / 2 + i * gap;
      const cw = 5 + f * 16;
      // channel path — bezier from source fanning out
      const c1x = SRC.x + (ex - SRC.x) * .3, c1y = SRC.y + 60;
      const c2x = ex, c2y = GY - 90;
      const d = `M ${SRC.x - cw * .5} ${SRC.y} C ${c1x - cw * .4} ${c1y} ${c2x - cw * .4} ${c2y} ${ex - cw * .5} ${GY}
        L ${ex + cw * .5} ${GY} C ${c2x + cw * .4} ${c2y} ${c1x + cw * .4} ${c1y} ${SRC.x + cw * .5} ${SRC.y} Z`;
      // churn lines on hot channels
      const churn = hot ? Array.from({ length: 3 }, (_, k) =>
        `<path d="M ${(ex - cw * .3 + k * cw * .3).toFixed(1)} ${GY - 20 - k * 8} q ${cw * .25} -4 ${cw * .5} 0" fill="none" stroke="var(--red)" stroke-width="1.2" opacity=".8">
          <animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0" dur="${(1 + k * .3).toFixed(1)}s" repeatCount="indefinite"/></path>`).join("") : "";
      // flow dashes down the channel
      const dashes = `<path d="M ${SRC.x} ${SRC.y + 8} C ${c1x} ${c1y} ${c2x} ${c2y} ${ex} ${GY - 6}" fill="none" stroke="${hot ? "var(--red)" : "#8ad0e8"}" stroke-width="${(1 + f * 1.5).toFixed(1)}" stroke-dasharray="3 7" opacity=".55">
        <animate attributeName="stroke-dashoffset" from="0" to="-30" dur="${(2.2 - f).toFixed(1)}s" repeatCount="indefinite"/></path>`;
      // mouth label
      return `<g class="dt-chan${hot ? " hot" : ""}">
        <path d="${d}" fill="color-mix(in srgb, ${col} ${25 + f * 30}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width=".9" opacity=".9"/>
        ${dashes}${churn}
        <text x="${ex.toFixed(1)}" y="${GY + 18}" class="dt-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${ex.toFixed(1)}" y="${GY + 29}" class="dt-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // source spring
    const src = `<ellipse cx="${SRC.x}" cy="${SRC.y}" rx="22" ry="10" fill="color-mix(in srgb, #4a9ac8 40%, var(--card-2))" stroke="#6ab0d8" stroke-width="1.4"/>
      <text x="${SRC.x}" y="${SRC.y + 3}" class="dt-src" text-anchor="middle">上游</text>`;

    // punts — sessions drifting down the channels
    const punts = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const ch = i % Math.max(1, quotas.length);
      const ex = 30 + gap / 2 + (ch % n) * gap;
      const dur = Math.max(5, 12 - (s.tps || 0) / 10);
      const size = 3 + Math.min(3, (s.tokens || 0) / 60000);
      const path = `M ${SRC.x} ${SRC.y + 10} C ${SRC.x + (ex - SRC.x) * .3} ${SRC.y + 60} ${ex} ${GY - 90} ${ex} ${GY - 10}`;
      return `<g class="dt-punt${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * 1.8).toFixed(1)}s" repeatCount="indefinite" path="${path}"/>
        <path d="M ${-size * 1.5} 0 Q 0 ${size * .7} ${size * 1.5} 0 Z" fill="${dead ? "var(--red)" : m.color || "#a8794a"}"/>
        <circle cx="0" cy="${-size * .5}" r="${size * .4}" fill="${dead ? "var(--red)" : m.color || "#d9b98a"}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="dt-wrap">
        <div class="dt-head"><b>DELTA</b><span>汊=配额窗 流=用量 艇=会话${hotN ? " · " + hotN + " 汊沸" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #142430 44%, transparent)" rx="10"/>
          <rect x="14" y="${GY}" width="${W - 28}" height="${H - GY - 8}" rx="4" fill="color-mix(in srgb, #2a7a9a 16%, transparent)" opacity=".6"/>
          ${src}${channels}${punts}
          <g class="dt-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="dt-k">${fmt(k.tokens)} · ${sessions.length} 艇</text>
            <text x="22" y="45" class="dt-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "河口", eyebrow: "DELTA", render };
})();
