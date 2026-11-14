/* ------------------------------------------------------------------ reefs
 * Reefs — coral heads under clear shallows: every quota
 * window is a coral head whose height = used % (≥85% the
 * anemone burns amber); sessions are fish shoals weaving
 * through.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "reefs";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(18559911);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, SB = 245;

    // underwater gradient
    const water = `<defs><linearGradient id="rr-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#58b8d8"/><stop offset="60%" stop-color="#2890b8"/><stop offset="100%" stop-color="#186888"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#rr-s)" rx="10"/>`;
    // light rays
    let rays = "";
    for (let i = 0; i < 4; i++) {
      const rx = 60 + i * 90;
      rays += `<path d="M ${rx} 0 L ${rx + 30} ${SB}" stroke="#c8ecf8" stroke-width="${12 + i * 4}" fill="none" opacity=".08"/>`;
    }
    // seabed
    const bed = `<path d="M 0 ${SB} Q 100 ${SB - 15} 200 ${SB - 8} Q 300 ${SB - 18} 400 ${SB - 10} L 400 ${H} L 0 ${H} Z" fill="color-mix(in srgb, #d0c090 50%, #806848)"/>`;
    // bubbles
    let bubbles = "";
    for (let i = 0; i < 8; i++) {
      const bx = rnd() * W, by = 40 + rnd() * (SB - 60), br = 1 + rnd() * 2;
      bubbles += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="${br.toFixed(1)}" fill="none" stroke="#c8ecf8" stroke-width=".6" opacity=".4">
        <animate attributeName="cy" values="${by.toFixed(1)};${(by - 30).toFixed(1)}" dur="${(3 + rnd() * 3).toFixed(1)}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".4;.1" dur="${(3 + rnd() * 3).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
    }

    // coral heads — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const corals = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#e07858";
      const ch = 15 + f * 60;
      const cw = 10 + f * 18;
      const topY = SB - ch;
      // branching coral
      let branches = "";
      const brN = Math.round(3 + f * 5);
      for (let b = 0; b < brN; b++) {
        const bx = cx + (rnd() - .5) * cw;
        const bh = ch * (.5 + rnd() * .5);
        const lean = (rnd() - .5) * 8;
        branches += `<path d="M ${bx.toFixed(1)} ${SB - 2} Q ${(bx + lean).toFixed(1)} ${SB - bh * .6} ${(bx + lean * 1.5).toFixed(1)} ${SB - bh}" stroke="color-mix(in srgb, ${col} ${60 + f * 20}%, #c05838)" stroke-width="${(2.5 + f * 2).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
      }
      // anemone on top
      const anem = `<g transform="translate(${cx} ${topY})">
        <circle r="${(3 + f * 3).toFixed(1)}" fill="${hot ? "var(--amber)" : "#e898c0"}" opacity=".85"/>
        ${[0,1,2,3,4,5].map(j => {
          const a = j * Math.PI / 3;
          return `<line x1="0" y1="0" x2="${(Math.cos(a) * (6 + f * 4)).toFixed(1)}" y2="${(Math.sin(a) * (6 + f * 4)).toFixed(1)}" stroke="${hot ? "var(--amber)" : "#e898c0"}" stroke-width="1" opacity=".6">
            <animateTransform attributeName="transform" type="rotate" values="-10;10;-10" dur="${(1.5 + j * .2).toFixed(1)}s" repeatCount="indefinite"/></line>`;
        }).join("")}
      </g>`;
      const glow = hot ? `<circle cx="${cx}" cy="${topY}" r="${(8 + f * 5).toFixed(1)}" fill="var(--amber)" opacity=".2">
        <animate attributeName="r" values="${(8 + f * 5).toFixed(1)};${(12 + f * 6).toFixed(1)}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".2;.05" dur="2s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="rr-coral${hot ? " hot" : ""}">
        ${branches}${anem}${glow}
        <text x="${cx.toFixed(1)}" y="${SB + 20}" class="rr-pct" text-anchor="middle" fill="#c8e0f0">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${SB + 31}" class="rr-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // fish shoals — weaving through
    const fishes = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(4, 10 - (s.tps || 0) / 14);
      const y = 60 + (i % 3) * 40;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#f0c030");
      const cx2 = W / 2 + (rnd() - .5) * 80;
      const rx2 = 60 + rnd() * 60;
      const ry2 = 15 + rnd() * 15;
      return `<g class="rr-fish${dead ? " dead" : ""}">
        <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"
          path="M ${(cx2 - rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 + rx2).toFixed(1)} ${y} A ${rx2} ${ry2} 0 0 0 ${(cx2 - rx2).toFixed(1)} ${y}"/>
        <ellipse cx="0" cy="0" rx="${size * .9}" ry="${size * .4}" fill="${col}"/>
        <path d="M ${-size * .9} 0 L ${-size * 1.5} ${-size * .4} L ${-size * 1.5} ${size * .4} Z" fill="${col}"/>
        <path d="M ${size * .3} ${-size * .3} L ${size * .8} ${-size * .6}" stroke="${col}" stroke-width=".5" fill="none"/>
        <circle cx="${size * .6}" cy="${-size * .05}" r="${size * .08}" fill="#283848"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="rr-wrap">
        <div class="rr-head"><b>REEFS</b><span>珊瑚=配额窗 高=用量 鱼群=会话${hotN ? " · " + hotN + " 燃葵" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${water}${rays}${bed}${corals}${fishes}${bubbles}
          <g class="rr-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="rr-k">${fmt(k.tokens)} · ${sessions.length} 鱼</text>
            <text x="22" y="45" class="rr-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "礁脉", eyebrow: "REEFS", render };
})();
