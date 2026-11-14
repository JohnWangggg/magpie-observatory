/* -------------------------------------------------------------------- mesa
 * Mesa — flat-topped buttes in a red desert: every quota window is
 * a mesa whose cliff height = used % (≥85% rockfall sparks off the
 * rim); sessions are vultures circling thermals between them.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "mesa";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(13579135);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 232;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    // mesas — cliff height = used %
    const mesas = quotas.map((w, i) => {
      const cx = 30 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#c9784a";
      const mw = gap * .36;
      const mh = 20 + f * 96;
      const topW = mw * .86;
      // flat-top butte
      const butte = `<path d="M ${cx - mw} ${GY} L ${cx - topW} ${GY - mh} L ${cx + topW} ${GY - mh} L ${cx + mw} ${GY} Z"
        fill="color-mix(in srgb, ${col} ${32 + f * 34}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1.2"/>`;
      // strata lines
      const strata = [0.3, 0.6].map(t => `<line x1="${(cx - mw + (mw - topW) * t).toFixed(1)}" y1="${(GY - mh * t).toFixed(1)}" x2="${(cx + mw - (mw - topW) * t).toFixed(1)}" y2="${(GY - mh * t).toFixed(1)}" stroke="${hot ? "var(--red)" : col}" stroke-width=".7" opacity=".5"/>`).join("");
      // cap rock highlight
      const cap = `<rect x="${(cx - topW).toFixed(1)}" y="${(GY - mh).toFixed(1)}" width="${(topW * 2).toFixed(1)}" height="3" rx="1" fill="${hot ? "var(--red)" : "#e8b08a"}"/>`;
      // rockfall sparks on hot
      const sparks = hot ? Array.from({ length: 3 }, (_, k) =>
        `<circle cx="${(cx - mw * .7 + k * mw * .7).toFixed(1)}" cy="${(GY - mh * .3 - k * 8).toFixed(1)}" r="1.4" fill="var(--red)">
          <animate attributeName="cy" values="${(GY - mh * .3 - k * 8).toFixed(1)};${GY - 2}" dur="${(1.2 + k * .3).toFixed(1)}s" begin="${(-k * .4).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".9;0" dur="${(1.2 + k * .3).toFixed(1)}s" begin="${(-k * .4).toFixed(1)}s" repeatCount="indefinite"/></circle>`).join("") : "";
      return `<g class="me-mesa${hot ? " hot" : ""}">
        ${butte}${strata}${cap}${sparks}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="me-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="me-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // vultures — sessions circling thermals
    const birds = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const cx = 80 + i * 56 + rnd() * 14;
      const cy = 52 + (i % 3) * 24 + rnd() * 10;
      const r = 12 + (i % 3) * 6;
      const dur = Math.max(5, 11 - (s.tps || 0) / 12);
      const size = 3 + Math.min(3, (s.tokens || 0) / 60000);
      return `<g class="me-vult${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * 1.7).toFixed(1)}s" repeatCount="indefinite"
          path="M ${cx + r} ${cy} A ${r} ${r * .55} 0 1 1 ${cx - r} ${cy} A ${r} ${r * .55} 0 1 1 ${cx + r} ${cy}"/>
        <path d="M ${-size * 1.6} 0 Q ${-size * .5} ${-size * .7} 0 ${-size * .2} Q ${size * .5} ${-size * .7} ${size * 1.6} 0 Q ${size * .5} ${size * .3} 0 ${size * .15} Q ${-size * .5} ${size * .3} ${-size * 1.6} 0 Z"
          fill="${dead ? "var(--red)" : m.color || "#4a3a30"}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="me-wrap">
        <div class="me-head"><b>MESA</b><span>台=配额窗 壁=用量 鹫=会话${hotN ? " · " + hotN + " 台崩" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #221410 46%, transparent)" rx="10"/>
          <rect x="14" y="${GY}" width="${W - 28}" height="3" rx="1.5" fill="#c98a5a" opacity=".4"/>
          ${mesas}${birds}
          <g class="me-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="me-k">${fmt(k.tokens)} · ${sessions.length} 鹫</text>
            <text x="22" y="45" class="me-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "台地", eyebrow: "MESA", render };
})();
