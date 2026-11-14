/* ------------------------------------------------------------------ stadium
 * Stadium — a track-and-field night: quota windows as lanes
 * around an oval track, fill = used% of that lane; sessions
 * are runners (head+body+legs) lapping the oval; the centre
 * field carries the totals.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "stadium";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, cx = W / 2, cy = H / 2 + 4, TOP = 36, BOT = 40;
    const rx = 170, ry = 96;

    // lanes — concentric ovals; fill = used% along the ellipse
    const lanes = quotas.map((w, i) => {
      const rx2 = rx - i * 22, ry2 = ry - i * 12;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#8ab4f8";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      // elliptical arc approximated by a path: start top, sweep used% of the ellipse
      const theta = -Math.PI / 2 + f * Math.PI * 2;
      const ex = cx + rx2 * Math.cos(theta), ey = cy + ry2 * Math.sin(theta);
      const large = f > .5 ? 1 : 0;
      return `<g class="sy-lane${hot ? " hot" : ""}">
        <ellipse cx="${cx}" cy="${cy}" rx="${rx2}" ry="${ry2}" fill="none" stroke="var(--line-2)" stroke-width="1.5" opacity=".4"/>
        ${f > .001 ? `<path d="M${cx} ${cy - ry2} A ${rx2} ${ry2} 0 ${large} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${col}" stroke-width="${hot ? 5 : 3}" stroke-linecap="round" opacity="${hot ? .95 : .8}"/>` : ""}
        <text x="${cx + rx2 + 6}" y="${cy}" class="sy-num" transform="rotate(${(i * 30 - 30).toFixed(0)} ${cx + rx2 + 6} ${cy})">${Math.round(w.used)}</text>
        ${hot ? `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="4" fill="var(--amber)">
          <animate attributeName="r" values="4;6;4" dur="1.4s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // runners — animateMotion around each lane's ellipse
    const runners = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#f0a060");
      const laneIdx = i % Math.max(1, quotas.length);
      const rx2 = rx - laneIdx * 22, ry2 = ry - laneIdx * 12;
      const dur = Math.max(9, 18 - (s.tps || 0) / 10);
      return `<g class="sy-runner${s.status === "err" ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M${cx + rx2} ${cy} A ${rx2} ${ry2} 0 1 1 ${cx - rx2} ${cy} A ${rx2} ${ry2} 0 1 1 ${cx + rx2} ${cy}"/>
        <circle cx="0" cy="-5" r="2.8" fill="${col}"/>
        <ellipse cx="0" cy="0" rx="4.5" ry="3" fill="${col}" opacity=".9"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="sy-wrap">
        <div class="sy-head"><b>STADIUM</b><span>跑道=配额窗 弧长=用量 跑者=会话${hotN ? " · " + hotN + " 冲刺" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#0e1a0f" rx="10"/>
          ${lanes}${runners}
          <ellipse cx="${cx}" cy="${cy}" rx="${rx - quotas.length * 22 - 8}" ry="${ry - quotas.length * 12 - 8}" fill="#162418" opacity=".85"/>
          <text x="${cx}" y="${cy + 4}" class="sy-k" text-anchor="middle">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 16}" class="sy-ksub" text-anchor="end">每道=1窗</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "体育场", eyebrow: "STADIUM", render };
})();
