/* ------------------------------------------------------------------ hamadas
 * Hamadas — bare rock plateaux swept clean of sand: every
 * quota window is a rock outcrop whose jaggedness = used %
 * (≥85% the desert-varnished face burns amber); sessions
 * are jerboas bounding between the blocks.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "hamadas";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(42993353);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 200, GY = 250;

    // hard glare sky
    const sky = `<defs><linearGradient id="hm-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c8b8a0"/><stop offset="100%" stop-color="#ddd0b8"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#hm-s)" rx="10"/>`;
    // rock pavement
    const pave = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #a89878 60%, var(--card-2))"/>`;
    // shattered rock texture
    let shards = "";
    for (let i = 0; i < 14; i++) {
      shards += `<polygon points="${(rnd() * W).toFixed(1)},${(WY + rnd() * (GY - WY)).toFixed(1)} ${(rnd() * W).toFixed(1)},${(WY + 4 + rnd() * (GY - WY)).toFixed(1)} ${(rnd() * W).toFixed(1)},${(WY + 8 + rnd() * (GY - WY)).toFixed(1)}" fill="#988860" opacity="${(.3 + rnd() * .2).toFixed(2)}"/>`;
    }
    // shore
    const shore = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #b0a080 60%, var(--card-2))"/>`;

    // outcrops — jaggedness = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const crops = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const cy = WY + (GY - WY) * .55;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#987860";
      const rw = 16 + f * 10;
      const rh = 10 + f * 22;
      // jagged silhouette — more teeth when hotter
      const teeth = 2 + Math.round(f * 4);
      let pts = [`${cx - rw / 2},${cy}`];
      for (let t = 0; t <= teeth; t++) {
        const tx = cx - rw / 2 + (t / teeth) * rw;
        const ty = cy - rh * (0.6 + ((t * 37 + i * 11) % 40) / 100);
        pts.push(`${tx.toFixed(1)},${ty.toFixed(1)}`);
        if (t < teeth) pts.push(`${(cx - rw / 2 + (t + .5) / teeth * rw).toFixed(1)},${(cy - rh * .3).toFixed(1)}`);
      }
      pts.push(`${cx + rw / 2},${cy}`);
      const crop = `<polygon points="${pts.join(" ")}" fill="color-mix(in srgb, ${col} 65%, #785848)" stroke="#685038" stroke-width=".8"/>`;
      // desert varnish face
      const varnish = `<polygon points="${(cx - rw * .2).toFixed(1)},${(cy - rh * .5).toFixed(1)} ${(cx + rw * .15).toFixed(1)},${(cy - rh * .65).toFixed(1)} ${(cx + rw * .3).toFixed(1)},${(cy - rh * .3).toFixed(1)}" fill="${hot ? "var(--amber)" : "#483828"}" opacity="${hot ? ".85" : ".5"}"/>`;
      const glow = hot ? `<circle cx="${cx + rw * .1}" cy="${cy - rh * .5}" r="7" fill="var(--amber)" opacity=".25">
        <animate attributeName="r" values="7;11" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".25;.05" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="hm-crop${hot ? " hot" : ""}">
        ${crop}${varnish}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="hm-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="hm-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // jerboas — bounding between the blocks
    const jerboas = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 9 - (s.tps || 0) / 15);
      const y = WY + 12 + (i % 3) * 14;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#c8a878");
      return `<g class="hm-jerb${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${-15} ${y} Q 60 ${y - 25} 130 ${y} Q 200 ${y - 22} 270 ${y - 5} Q 340 ${y - 20} ${W + 15} ${y - 8}"/>
        <ellipse cx="0" cy="0" rx="${size * .7}" ry="${size * .5}" fill="${col}"/>
        <circle cx="${size * .5}" cy="${-size * .4}" r="${size * .35}" fill="${col}"/>
        <path d="M ${size * .5} ${-size * .65} L ${size * .4} ${-size * 1.3} L ${size * .7} ${-size * .7} Z" fill="${col}"/>
        <line x1="${-size * .5}" y1="${size * .3}" x2="${-size * .8}" y2="${size * 1.4}" stroke="${col}" stroke-width=".8"/>
        <line x1="${size * .2}" y1="${size * .4}" x2="${size * .4}" y2="${size * 1.3}" stroke="${col}" stroke-width=".7"/>
        <path d="M ${-size * .6} 0 Q ${-size * 1.6} ${size * .3} ${-size * 2} ${size * .8}" stroke="${col}" stroke-width=".6" fill="none"/>
        <circle cx="${-size * 2}" cy="${size * .8}" r="${size * .18}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="hm-wrap">
        <div class="hm-head"><b>HAMADAS</b><span>石漠=配额窗 嶙峋=用量 跳鼠=会话${hotN ? " · " + hotN + " 燃岩漆" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${pave}${shards}${shore}${crops}${jerboas}
          <g class="hm-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="hm-k">${fmt(k.tokens)} · ${sessions.length} 跳鼠</text>
            <text x="22" y="45" class="hm-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "石漠", eyebrow: "HAMADAS", render };
})();
