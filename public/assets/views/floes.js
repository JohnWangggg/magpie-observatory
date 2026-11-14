/* ------------------------------------------------------------------ floes
 * Floes — pack ice drifting on a grey Arctic sea: every
 * quota window is a floe whose area = used % (≥85% the
 * pressure ridge burns amber); sessions are polar bears
 * padding across.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "floes";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(25215577);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 200, GY = 252;

    // arctic grey sky
    const sky = `<defs><linearGradient id="fl-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#b8c4cc"/><stop offset="100%" stop-color="#d0d8dc"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#fl-s)" rx="10"/>`;
    // sea leads — dark water channels
    const sea = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #2a5060 68%, var(--card-2))"/>`;
    // shore
    const shore = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #d0d8dc 65%, var(--card-2))"/>`;

    // floes — area = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const floes = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const cy = WY + (GY - WY) * .5;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#d8e4e8";
      const fw = 14 + f * 28;
      const fh = 8 + f * 12;
      // irregular floe polygon
      const pts = [
        `${cx - fw / 2},${cy}`,
        `${cx - fw * .35},${cy - fh * .7}`,
        `${cx - fw * .1},${cy - fh}`,
        `${cx + fw * .2},${cy - fh * .8}`,
        `${cx + fw * .45},${cy - fh * .3}`,
        `${cx + fw / 2},${cy + fh * .2}`,
        `${cx + fw * .3},${cy + fh * .7}`,
        `${cx},${cy + fh * .9}`,
        `${cx - fw * .3},${cy + fh * .6}`
      ].join(" ");
      const floe = `<polygon points="${pts}" fill="color-mix(in srgb, ${col} 85%, #c0d0d8)" stroke="#a8c0c8" stroke-width="1"/>`;
      // pressure ridge — jumbled ice blocks
      const ridgeN = Math.round(2 + f * 4);
      let ridge = "";
      for (let r = 0; r < ridgeN; r++) {
        const rx = cx + (rnd() - .5) * fw * .7;
        const ry = cy + (rnd() - .5) * fh * .8;
        ridge += `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${(3 + rnd() * 4).toFixed(1)}" height="${(2 + rnd() * 3).toFixed(1)}" fill="${hot ? "var(--amber)" : "#e0ecf0"}" opacity="${hot ? ".7" : ".6"}" transform="rotate(${(rnd() * 40 - 20).toFixed(0)} ${rx.toFixed(1)} ${ry.toFixed(1)})"/>`;
      }
      // crack
      const crack = `<path d="M ${cx - fw * .4} ${cy + fh * .2} L ${cx - fw * .1} ${cy} L ${cx + fw * .2} ${cy + fh * .3}" stroke="#284050" stroke-width=".8" fill="none" opacity=".5"/>`;
      const glow = hot ? `<ellipse cx="${cx}" cy="${cy}" rx="${fw * .6}" ry="${fh * 1.2}" fill="var(--amber)" opacity=".15">
        <animate attributeName="opacity" values=".15;.04;.15" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="fl-floe${hot ? " hot" : ""}">
        ${floe}${ridge}${crack}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="fl-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="fl-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // polar bears — padding across
    const bears = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(7, 18 - (s.tps || 0) / 11);
      const y = WY + 10 + (i % 3) * 15;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 70000);
      const col = dead ? "var(--red)" : (m.color || "#e8ecef");
      return `<g class="fl-bear${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-25} ${y};${W + 25} ${(y - 5).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1" keyTimes="0;1"/>
        <ellipse cx="0" cy="0" rx="${size * 1.4}" ry="${size * .6}" fill="${col}"/>
        <circle cx="${size * 1.1}" cy="${-size * .35}" r="${size * .4}" fill="${col}"/>
        <circle cx="${size * .9}" cy="${-size * .55}" r="${size * .12}" fill="${col}"/>
        <circle cx="${size * 1.25}" cy="${-size * .55}" r="${size * .12}" fill="${col}"/>
        <line x1="${size * .5}" y1="${size * .5}" x2="${size * .5}" y2="${size * 1.3}" stroke="${col}" stroke-width=".8"/>
        <line x1="${-size * .5}" y1="${size * .5}" x2="${-size * .5}" y2="${size * 1.3}" stroke="${col}" stroke-width=".8"/>
        <path d="M ${-size * 1.2} ${size * .1} Q ${-size * 1.5} ${size * .4} ${-size * 1.4} ${size * .7}" stroke="${col}" stroke-width=".7" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="fl-wrap">
        <div class="fl-head"><b>FLOES</b><span>浮冰=配额窗 面积=用量 北极熊=会话${hotN ? " · " + hotN + " 燃脊" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${sea}${shore}${floes}${bears}
          <g class="fl-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="fl-k">${fmt(k.tokens)} · ${sessions.length} 熊</text>
            <text x="22" y="45" class="fl-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "浮冰", eyebrow: "FLOES", render };
})();
