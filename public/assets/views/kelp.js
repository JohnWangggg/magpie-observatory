/* -------------------------------------------------------------------- kelp
 * Kelp forest — swaying fronds in cold water: every quota window is
 * a kelp stalk whose height = used % (≥85% the frond tip bleaches
 * red); sessions are sea otters weaving between the stalks.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "kelp";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(42424161);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 238;
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;

    // light rays filtering down
    let rays = "";
    for (let i = 0; i < 3; i++) {
      rays += `<path d="M ${60 + i * 140} 20 L ${40 + i * 140} ${GY} L ${110 + i * 140} ${GY} Z" fill="#bfe8f0" opacity=".05">
        <animate attributeName="opacity" values=".03;.08;.03" dur="${(4 + i * 1.5).toFixed(1)}s" repeatCount="indefinite"/></path>`;
    }

    // kelp stalks — height = used %, sway
    const stalks = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#4a8a5a";
      const kh = 30 + f * 130;
      const tipY = GY - kh;
      // swaying frond body
      const sway = 6 + f * 8;
      const frond = `<path d="M ${cx} ${GY} Q ${cx - sway} ${GY - kh * .4} ${cx + sway * .5} ${tipY}" stroke="${hot ? "var(--red)" : col}" stroke-width="${(2 + f * 2).toFixed(1)}" fill="none" opacity="${(.55 + f * .3).toFixed(2)}" stroke-linecap="round">
        <animate attributeName="d" values="M ${cx} ${GY} Q ${cx - sway} ${GY - kh * .4} ${cx + sway * .5} ${tipY};M ${cx} ${GY} Q ${cx + sway} ${GY - kh * .4} ${cx - sway * .5} ${tipY};M ${cx} ${GY} Q ${cx - sway} ${GY - kh * .4} ${cx + sway * .5} ${tipY}" dur="${(3 + i * .5).toFixed(1)}s" repeatCount="indefinite"/></path>`;
      // side fronds
      const side = Math.round(1 + f * 2);
      let sides = "";
      for (let s = 0; s < side; s++) {
        const sy = GY - kh * (.3 + s * .3);
        const dir = s % 2 ? 1 : -1;
        sides += `<path d="M ${cx + (dir > 0 ? -2 : 2)} ${sy} q ${dir * (10 + f * 8)} -6 ${dir * (14 + f * 10)} -14" stroke="${hot ? "var(--red)" : col}" stroke-width="1.1" fill="none" opacity=".6" stroke-linecap="round"/>`;
      }
      // tip bulb — bleached red when hot
      const bulb = `<circle cx="${cx + sway * .5}" cy="${tipY}" r="${(2 + f * 2).toFixed(1)}" fill="${hot ? "var(--red)" : "#7ab07a"}">
        <animate attributeName="opacity" values=".9;.6;.9" dur="${(2 + f).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
      return `<g class="kp-stalk${hot ? " hot" : ""}">
        ${frond}${sides}${bulb}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="kp-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="kp-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // otters — sessions weaving between stalks
    const otters = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(8, 18 - (s.tps || 0) / 10);
      const y = 90 + (i % 3) * 40 + rnd() * 14;
      const size = 4 + Math.min(4, (s.tokens || 0) / 50000);
      return `<g class="kp-otter${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-22} ${y.toFixed(1)};${W + 22} ${(y + 14).toFixed(1)}" dur="${dur}s" begin="${(-i * 2.6).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.8}" ry="${size * .8}" fill="${dead ? "var(--red)" : m.color || "#8a6a4a"}"/>
        <circle cx="${size * 1.6}" cy="${-size * .3}" r="${size * .6}" fill="${dead ? "var(--red)" : m.color || "#8a6a4a"}"/>
        <ellipse cx="${size * 1.9}" cy="${-size * .4}" rx="${size * .2}" ry="${size * .15}" fill="#3a2a1a"/>
        <path d="M ${-size * 1.6} 0 Q ${-size * 2.4} ${size * .3} ${-size * 2.7} ${-size * .2}" stroke="${dead ? "var(--red)" : m.color || "#8a6a4a"}" stroke-width="1.6" fill="none"/>
        <ellipse cx="${-size * .4}" cy="${size * .7}" rx="${size * .5}" ry="${size * .25}" fill="${dead ? "var(--red)" : m.color || "#8a6a4a"}"/>
        <ellipse cx="${size * .5}" cy="${size * .7}" rx="${size * .5}" ry="${size * .25}" fill="${dead ? "var(--red)" : m.color || "#8a6a4a"}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="kp-wrap">
        <div class="kp-head"><b>KELP FOREST</b><span>藻=配额窗 高=用量 獭=会话${hotN ? " · " + hotN + " 藻枯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #0e2028 48%, transparent)" rx="10"/>
          <rect x="14" y="${GY}" width="${W - 28}" height="3" rx="1.5" fill="#3a5a6a" opacity=".6"/>
          ${rays}${stalks}${otters}
          <g class="kp-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="kp-k">${fmt(k.tokens)} · ${sessions.length} 獭</text>
            <text x="22" y="45" class="kp-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "海藻林", eyebrow: "KELP", render };
})();
