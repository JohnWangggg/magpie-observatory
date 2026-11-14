/* -------------------------------------------------------------------- rain
 * Rain — a window on a wet night: every quota window is a pane in the
 * sash — rain streaks thicken as used % climbs (≥85% the pane lights
 * with a red flash); sessions are rivulets sliding down the glass.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "rain2";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(104729);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300;

    // panes — up to 2×3 grid
    const n = Math.max(1, quotas.length);
    const cols = Math.min(3, n), rows = Math.ceil(n / cols);
    const pw = 340 / cols, ph = 190 / rows;
    const panes = quotas.map((w, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = 30 + c * pw + 4, y = 34 + r * ph + 4;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const fill = w.used / 100;
      // rain streaks: 3 + fill*9 diagonal dashes clipped to the pane
      const nst = hot ? 14 : 3 + Math.round(fill * 9);
      let rain = "";
      for (let j = 0; j < nst; j++) {
        const rx = x + 6 + rnd() * (pw - 16), ry = y - 40 + rnd() * ph;
        const len = 10 + rnd() * 14;
        rain += `<line x1="${rx.toFixed(1)}" y1="${ry.toFixed(1)}" x2="${(rx - 5).toFixed(1)}" y2="${(ry + len).toFixed(1)}" stroke="${hot ? "var(--red)" : "#7fa8d9"}" stroke-width="1" opacity="${.25 + rnd() * .3}">
          <animate attributeName="y1" values="${(ry - 30).toFixed(1)};${(ry + ph + 20).toFixed(1)}" dur="${(0.9 + rnd() * 0.7).toFixed(2)}s" repeatCount="indefinite"/>
          <animate attributeName="y2" values="${(ry - 30 + len).toFixed(1)};${(ry + ph + 20 + len).toFixed(1)}" dur="${(0.9 + rnd() * 0.7).toFixed(2)}s" repeatCount="indefinite"/>
        </line>`;
      }
      return `<g class="rn2-pane${hot ? " hot" : ""}">
        <rect x="${x}" y="${y}" width="${pw - 8}" height="${ph - 8}" rx="5"
          fill="${hot ? "color-mix(in srgb, var(--red) 16%, var(--card-2))" : "color-mix(in srgb, var(--card-2) 62%, transparent)"}"
          stroke="${hot ? "var(--red)" : "var(--line-2)"}" stroke-width="${hot ? 1.4 : 1}"/>
        <clipPath id="rn2-clip-${i}"><rect x="${x + 1}" y="${y + 1}" width="${pw - 10}" height="${ph - 10}" rx="4"/></clipPath>
        <g clip-path="url(#rn2-clip-${i})">${rain}</g>
        ${hot ? `<rect x="${x}" y="${y}" width="${pw - 8}" height="${ph - 8}" rx="5" fill="none" stroke="var(--red)" stroke-width="2" opacity=".0" class="rn2-flash"/>` : ""}
        <text x="${x + 8}" y="${y + 16}" class="rn2-name">${esc((m.name || w.prov).slice(0, 8))}</text>
        <text x="${x + 8}" y="${y + 30}" class="rn2-pct">${Math.round(w.used)}%</text>
      </g>`;
    }).join("");

    // rivulets — sessions running down the outside of the glass
    const rivs = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const x0 = 50 + i * 66;
      const dur = Math.max(5, 13 - (s.tps || 0) / 14);
      return `<path class="rn2-riv${dead ? " dead" : ""}" d="M ${x0} 36 q 4 40 -3 80 q -6 60 4 110 q 4 40 -2 60"
        fill="none" stroke="${dead ? "var(--red)" : m.color || "#8fb8e8"}" stroke-width="1.8" stroke-linecap="round"
        stroke-dasharray="4 10" opacity=".8">
        <animate attributeName="stroke-dashoffset" from="0" to="-140" dur="${dur}s" repeatCount="indefinite"/>
      </path>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="rn2-wrap">
        <div class="rn2-head"><b>RAIN</b><span>格=配额窗 雨=用量 痕=会话${hotN ? " · " + hotN + " 格暴红" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1a2438 26%, transparent)" rx="10"/>
          ${panes}${rivs}
          <g class="rn2-card">
            <rect x="14" y="248" width="128" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="266" class="rn2-k">${fmt(k.tokens)} · ${sessions.length} 痕</text>
            <text x="22" y="279" class="rn2-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "雨窗", eyebrow: "RAIN", render };
})();
