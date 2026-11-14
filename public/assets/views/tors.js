/* ------------------------------------------------------------------ tors
 * Tors — weathered granite stacks on a moorland crest:
 * every quota window is a tor whose height = used %
 * (≥85% the summit block glows amber); sessions are ponies
 * grazing between the outcrops.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tors";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11223344);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 238;

    // moor sky
    const sky = `<defs><linearGradient id="ts-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4a5058"/><stop offset="100%" stop-color="#5a6068"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ts-s)" rx="10"/>`;
    // moor crest
    const crest = `<path d="M 0 ${GY} L 0 ${GY - 25} L 60 ${GY - 40} L 130 ${GY - 20} L 200 ${GY - 45} L 270 ${GY - 28} L 340 ${GY - 42} L 400 ${GY - 35} L 400 ${GY} Z" fill="#3a4038" opacity=".5"/>`;
    // ground
    const ground = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #4a5048 70%, var(--card-2))"/>`;
    // heather
    let heather = "";
    for (let i = 0; i < 15; i++) {
      heather += `<ellipse cx="${(rnd() * W).toFixed(1)}" cy="${(GY + 5 + rnd() * 20).toFixed(1)}" rx="${(3 + rnd() * 5).toFixed(1)}" ry="${(1.5 + rnd() * 2.5).toFixed(1)}" fill="#5a4a60" opacity="${(.15 + rnd() * .15).toFixed(2)}"/>`;
    }

    // tors — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const tors = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#7a7a6a";
      const th = 20 + f * 70;
      const tw = 10 + f * 20;
      const topY = GY - th;
      // stacked weathered blocks
      const blocks = [];
      const blockCount = 3 + Math.floor(f * 3);
      for (let b = 0; b < blockCount; b++) {
        const by = GY - (b / blockCount) * th;
        const bh2 = th / blockCount;
        const bw2 = tw * (1 - (b / blockCount) * .3);
        const dx = (rnd() - .5) * 4;
        blocks.push(`<rect x="${(cx + dx - bw2 / 2).toFixed(1)}" y="${(by + bh2 * .3).toFixed(1)}" width="${bw2.toFixed(1)}" height="${(bh2 * .7).toFixed(1)}" rx="${(2 + rnd() * 2).toFixed(1)}" fill="color-mix(in srgb, ${col} ${(50 + b * 10)}%, #4a4840)"/>`);
      }
      // summit block
      const summit = `<rect x="${(cx - tw * .35).toFixed(1)}" y="${topY - 2}" width="${tw * .7}" height="8" rx="2" fill="color-mix(in srgb, ${col} 70%, #5a5850)"/>`;
      // hot amber glow
      const glow = hot ? `<ellipse cx="${cx}" cy="${topY}" rx="${tw * .4}" ry="5" fill="var(--amber)" opacity=".6">
        <animate attributeName="rx" values="${tw * .4};${tw * .7}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".6;.15" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="ts-tor${hot ? " hot" : ""}">
        ${blocks.join("")}${summit}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="ts-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="ts-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // ponies — grazing between outcrops
    const ponies = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 15 - (s.tps || 0) / 12);
      const y = GY + 15 + (i % 2) * 12;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#c8b8a8");
      return `<g class="ts-pony${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-30} ${y};${W + 30} ${(y - 4).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.6}" ry="${size * .7}" fill="${col}"/>
        <ellipse cx="${size * 1.2}" cy="${-size * .2}" rx="${size * .4}" ry="${size * .35}" fill="${col}"/>
        <ellipse cx="${-size * .8}" cy="${size * .1}" rx="${size * .3}" ry="${size * .25}" fill="${col}" opacity=".6"/>
        <line x1="${-size * 1.4}" y1="${size * .3}" x2="${-size * 1.4}" y2="${size * .8}" stroke="${col}" stroke-width=".8"/>
        <line x1="${size * 1.4}" y1="${size * .3}" x2="${size * 1.4}" y2="${size * .8}" stroke="${col}" stroke-width=".8"/>
        <path d="M ${size * 1.4} ${-size * .1} Q ${size * 1.8} ${-size * .8} ${size * 1.5} ${-size * 1}" stroke="${col}" stroke-width=".7" fill="none"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="ts-wrap">
        <div class="ts-head"><b>TORS</b><span>岩山=配额窗 高=用量 小马=会话${hotN ? " · " + hotN + " 燃顶" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${crest}${ground}${heather}${tors}${ponies}
          <g class="ts-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="ts-k">${fmt(k.tokens)} · ${sessions.length} 马</text>
            <text x="22" y="45" class="ts-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "岩山", eyebrow: "TORS", render };
})();
