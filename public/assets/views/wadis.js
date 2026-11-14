/* ------------------------------------------------------------------ wadis
 * Wadis — dry river channels braided through gravel plains:
 * every quota window is a wadi braid whose flow width = used %
 * (≥85% the flash-flood gauge burns amber); sessions are
 * camels pacing the banks.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "wadis";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(40771131);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 195, GY = 250;

    // shimmering heat sky
    const sky = `<defs><linearGradient id="wd-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#d8c090"/><stop offset="100%" stop-color="#ecd8b0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#wd-s)" rx="10"/>`;
    // gravel plain
    const plain = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #c0a070 55%, var(--card-2))"/>`;
    // gravel specks
    let gravel = "";
    for (let i = 0; i < 18; i++) {
      gravel += `<circle cx="${(rnd() * W).toFixed(1)}" cy="${(WY + 4 + rnd() * (GY - WY - 8)).toFixed(1)}" r="${(.6 + rnd() * 1).toFixed(1)}" fill="#a08858" opacity="${(.4 + rnd() * .2).toFixed(2)}"/>`;
    }
    // shore
    const shore = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #b09868 60%, var(--card-2))"/>`;

    // wadi braids — flow width = used %, meandering left→right
    const n = Math.max(1, quotas.length);
    const rows = Math.min(n, 3);
    const cols = Math.ceil(n / rows);
    const braids = quotas.map((w, i) => {
      const row = Math.floor(i / cols), col = i % cols;
      const inRow = Math.min(cols, n - row * cols);
      const cx = 55 + (W - 110) / (inRow + 1) * (col + 1);
      const cy = WY + 12 + row * 18;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const colr = m.color || "#988858";
      const len = 24 + f * 30;
      const wid = 2 + f * 5;
      // braided channel — 2 crossing strands
      const p1 = [], p2 = [];
      for (let s = 0; s <= 16; s++) {
        const px = cx - len / 2 + (s / 16) * len;
        p1.push(`${px.toFixed(1)},${(cy + Math.sin(s * .5 + i) * 3).toFixed(1)}`);
        p2.push(`${px.toFixed(1)},${(cy + Math.sin(s * .5 + i + 2) * 3.5).toFixed(1)}`);
      }
      const strand1 = `<polyline points="${p1.join(" ")}" fill="none" stroke="color-mix(in srgb, ${colr} 75%, #786838)" stroke-width="${wid.toFixed(1)}" stroke-linecap="round"/>`;
      const strand2 = `<polyline points="${p2.join(" ")}" fill="none" stroke="color-mix(in srgb, ${colr} 60%, #887848)" stroke-width="${(wid * .7).toFixed(1)}" stroke-linecap="round" opacity=".8"/>`;
      // flood gauge pole at mid-channel
      const gauge = `<line x1="${cx}" y1="${cy - 4}" x2="${cx}" y2="${cy - 12}" stroke="${hot ? "var(--amber)" : "#e0d0a8"}" stroke-width="1.5"/>
        <rect x="${cx - 2}" y="${cy - 14}" width="4" height="3" fill="${hot ? "var(--amber)" : "#e0d0a8"}"/>`;
      const glow = hot ? `<circle cx="${cx}" cy="${cy - 10}" r="7" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="7;11" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".3;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="wd-braid${hot ? " hot" : ""}">
        ${strand1}${strand2}${gauge}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="wd-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="wd-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // camels — pacing the banks
    const camels = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 14 - (s.tps || 0) / 12);
      const y = WY + 6 + (i % 3) * 16;
      const size = 3 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#c09858");
      return `<g class="wd-camel${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y};${W + 20} ${(y - 4).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <path d="M ${-size} 0 Q ${-size * .5} ${-size * .7} 0 ${-size * .4} Q ${size * .5} ${-size} ${size} ${-size * .3} L ${size} ${size * .4} L ${-size} ${size * .4} Z" fill="${col}"/>
        <path d="M ${size} ${-size * .3} Q ${size * 1.4} ${-size * 1.2} ${size * 1.6} ${-size * 1.3}" stroke="${col}" stroke-width="1.2" fill="none"/>
        <circle cx="${size * 1.6}" cy="${-size * 1.3}" r="${size * .3}" fill="${col}"/>
        <line x1="${-size * .5}" y1="${size * .4}" x2="${-size * .5}" y2="${size * 1.4}" stroke="${col}" stroke-width=".8"/>
        <line x1="${size * .5}" y1="${size * .4}" x2="${size * .5}" y2="${size * 1.4}" stroke="${col}" stroke-width=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="wd-wrap">
        <div class="wd-head"><b>WADIS</b><span>干河谷=配额窗 辫宽=用量 骆驼=会话${hotN ? " · " + hotN + " 燃水位标" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${plain}${gravel}${shore}${braids}${camels}
          <g class="wd-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="wd-k">${fmt(k.tokens)} · ${sessions.length} 驼</text>
            <text x="22" y="45" class="wd-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "干河谷", eyebrow: "WADIS", render };
})();
