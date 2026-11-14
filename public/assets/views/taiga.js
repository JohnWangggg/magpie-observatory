/* -------------------------------------------------------------------- taiga
 * Taiga — snow-bent spruces under a pale moon: every quota window is
 * a spruce whose crown bows as used % climbs (≥85% the snow-load
 * turns ice-blue); sessions are moose wading the drifts.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "taiga";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(77441123);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 244;
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;

    // pale moon + drifting snow
    let sky = `<circle cx="340" cy="44" r="20" fill="#e8eef8" opacity=".85"/>
      <circle cx="334" cy="40" r="17" fill="color-mix(in srgb, #1a2434 90%, #e8eef8 10%)"/>`;
    for (let i = 0; i < 10; i++) {
      const sx = 30 + i * 36 + rnd() * 12;
      const dur = 4 + rnd() * 6;
      sky += `<circle cx="${sx.toFixed(1)}" cy="${(14 + rnd() * 190).toFixed(1)}" r="${(.8 + rnd() * 1.3).toFixed(1)}" fill="#e8eef8" opacity="${(.25 + rnd() * .35).toFixed(2)}">
        <animate attributeName="cy" values="${(14 + rnd() * 40).toFixed(1)};${(GY - 12).toFixed(1)}" dur="${dur.toFixed(1)}s" begin="${(-rnd() * dur).toFixed(1)}s" repeatCount="indefinite"/>
        <animate attributeName="cx" values="${sx.toFixed(1)};${(sx + 16).toFixed(1)}" dur="${dur.toFixed(1)}s" begin="${(-rnd() * dur).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
    }

    // spruces — snow-load bow = used %
    const trees = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#3a6a4a";
      const bow = f * 16;
      const th = 70 + f * 60;
      const tipX = cx + bow, tipY = GY - th;
      const layers = 4;
      let crown = "";
      for (let l = 0; l < layers; l++) {
        const t = l / (layers - 1);
        const y0 = GY - 12 - t * (th - 28);
        const y1 = y0 - (th - 28) / layers * 1.4;
        const hw = (26 - t * 18) * (0.8 + f * .3);
        const lx = cx + bow * t;
        crown += `<path d="M ${lx.toFixed(1)} ${y0.toFixed(1)} L ${(lx - hw).toFixed(1)} ${(y0 + 14).toFixed(1)} L ${(lx + hw).toFixed(1)} ${(y0 + 14).toFixed(1)} Z" fill="${hot ? "color-mix(in srgb, " + col + " 55%, #b8d8f0)" : col}" opacity="${(.72 + t * .2).toFixed(2)}"/>`;
        // snow cap on each layer — thicker when hot
        if (t > .12) {
          const snowW = (hw * .55) * (0.5 + f * .7);
          crown += `<ellipse cx="${(lx - hw * .3).toFixed(1)}" cy="${(y0 + 6).toFixed(1)}" rx="${snowW.toFixed(1)}" ry="${(2.5 + f * 2).toFixed(1)}" fill="${hot ? "#c8e0f8" : "#e8eef8"}" opacity="${(.55 + f * .3).toFixed(2)}"/>`;
        }
      }
      const trunk = `<line x1="${cx.toFixed(1)}" y1="${GY}" x2="${tipX.toFixed(1)}" y2="${tipY.toFixed(1)}" stroke="#5a4a3a" stroke-width="${(2.5 + f * 1.5).toFixed(1)}" stroke-linecap="round"/>`;
      return `<g class="tg-spruce${hot ? " hot" : ""}">
        ${trunk}${crown}
        <circle cx="${tipX.toFixed(1)}" cy="${tipY.toFixed(1)}" r="${(2 + f * 1.5).toFixed(1)}" fill="${hot ? "#b8d8f0" : "#e8eef8"}" opacity=".9"/>
        <text x="${cx.toFixed(1)}" y="${GY + 16}" class="tg-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 27}" class="tg-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // moose — sessions wading drifts
    const moose = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(9, 20 - (s.tps || 0) / 9);
      const y = GY - 10 - (i % 2) * 12;
      const size = 5 + Math.min(4, (s.tokens || 0) / 60000);
      return `<g class="tg-moose${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-30} ${y.toFixed(1)};${W + 30} ${(y + 8).toFixed(1)}" dur="${dur}s" begin="${(-i * 3).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.7}" ry="${size * .95}" fill="${dead ? "var(--red)" : m.color || "#6a4a2a"}"/>
        <path d="M ${size * 1.4} ${-size * .3} L ${size * 2.2} ${-size * 1.5} L ${size * 2.6} ${-size * 1.2} L ${size * 1.9} ${size * .2} Z" fill="${dead ? "var(--red)" : m.color || "#6a4a2a"}"/>
        <circle cx="${size * 2.4}" cy="${-size * 1.3}" r="${size * .5}" fill="${dead ? "var(--red)" : m.color || "#6a4a2a"}"/>
        <path d="M ${size * 2.4} ${-size * 1.7} L ${size * 2.6} ${-size * 2.5} M ${size * 2.4} ${-size * 1.7} L ${size * 2.1} ${-size * 2.4} M ${size * 2.5} ${-size * 2.2} L ${size * 3} ${-size * 2.7}" stroke="#3a2a1a" stroke-width="1.2" fill="none"/>
        <line x1="${-size * .9}" y1="${size * .8}" x2="${-size * .9}" y2="${size * 2.1}" stroke="#4a3a22" stroke-width="1.4"/>
        <line x1="${size * .9}" y1="${size * .8}" x2="${size * .9}" y2="${size * 2.1}" stroke="#4a3a22" stroke-width="1.4"/>
        <line x1="${size * .4}" y1="${size * .85}" x2="${size * .4}" y2="${size * 2.1}" stroke="#4a3a22" stroke-width="1.1" opacity=".7"/>
        <line x1="${-size * .4}" y1="${size * .85}" x2="${-size * .4}" y2="${size * 2.1}" stroke="#4a3a22" stroke-width="1.1" opacity=".7"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="tg-wrap">
        <div class="tg-head"><b>TAIGA</b><span>杉=配额窗 雪=用量 鹿=会话${hotN ? " · " + hotN + " 冰冠" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #121c2a 52%, transparent)" rx="10"/>
          <rect x="14" y="${GY}" width="${W - 28}" height="3" rx="1.5" fill="#b8c8d8" opacity=".35"/>
          ${sky}${trees}${moose}
          <g class="tg-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="tg-k">${fmt(k.tokens)} · ${sessions.length} 鹿</text>
            <text x="22" y="45" class="tg-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "针叶林", eyebrow: "TAIGA", render };
})();
