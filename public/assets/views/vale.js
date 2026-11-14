/* ------------------------------------------------------------------ vale
 * Vale — a misty valley at dawn: every quota window is a fog
 * bank whose density = used % (≥85% the fog glows amber);
 * sessions are deer moving through the haze.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "vale";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(11223344);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 240;

    // dawn sky
    const sky = `<defs><linearGradient id="va-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1a2030"/><stop offset="100%" stop-color="#302838"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#va-s)" rx="10"/>`;
    // hills in mist
    const hills = `<path d="M 0 ${GY} L 0 ${GY - 20} L 80 ${GY - 45} L 160 ${GY - 25} L 240 ${GY - 50} L 320 ${GY - 30} L 400 ${GY - 40} L 400 ${GY} Z" fill="color-mix(in srgb, #2a3830 75%, var(--card-2))"/>`;
    // valley floor
    const floor = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #1a2820 70%, var(--card-2))"/>`;
    // mist layers
    let mist = "";
    for (let i = 0; i < 4; i++) {
      mist += `<rect x="0" y="${GY - 15 - i * 15}" width="${W}" height="15" fill="#c0b8c0" opacity="${(.03 + i * .02).toFixed(2)}"/>`;
    }
    // faint trees in mist
    let trees = "";
    for (let i = 0; i < 8; i++) {
      const tx = 30 + i * 48;
      const th2 = 20 + rnd() * 30;
      trees += `<path d="M ${tx} ${GY} L ${tx} ${GY - th2} M ${tx - 4} ${GY - th2 * .5} L ${tx} ${GY - th2 * .7} M ${tx + 4} ${GY - th2 * .5} L ${tx} ${GY - th2 * .7}" stroke="#3a4838" stroke-width="1" opacity="${(.2 + rnd() * .15).toFixed(2)}"/>`;
    }

    // fog banks — density = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const banks = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a9aa0";
      const fd = .15 + f * .75;
      const fw = 20 + f * 30;
      const fh = 12 + f * 25;
      const fx = cx - fw / 2;
      const fy = GY - fh;
      // fog bank body
      const body = `<ellipse cx="${cx}" cy="${fy + fh / 2}" rx="${fw / 2}" ry="${fh / 2}" fill="color-mix(in srgb, ${col} ${Math.round(fd * 60)}%, #c8c0c8)" opacity="${(0.5 + fd * .4).toFixed(2)}"/>`;
      // hot amber core
      const core = hot ? `<ellipse cx="${cx}" cy="${fy + fh / 2}" rx="${fw * .35}" ry="${fh * .35}" fill="var(--amber)" opacity=".5">
        <animate attributeName="rx" values="${fw * .35};${fw * .6}" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".5;.2" dur="2s" repeatCount="indefinite"/></ellipse>` : "";
      return `<g class="va-bank${hot ? " hot" : ""}">
        ${body}${core}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="va-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="va-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // deer — sessions moving through
    const deer = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 15 - (s.tps || 0) / 12);
      const y = GY + 15 + (i % 2) * 10;
      const size = 3 + Math.min(2.5, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#b0a088");
      return `<g class="va-deer${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-30} ${y};${W + 30} ${(y - 4).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.8}" ry="${size * .9}" fill="${col}"/>
        <ellipse cx="${size * 1.4}" cy="${-size * .4}" rx="${size * .45}" ry="${size * .4}" fill="${col}"/>
        <path d="M ${size * 1.6} ${-size * .3} L ${size * 1.8} ${-size * 1}" stroke="${col}" stroke-width=".8" fill="none"/>
        <path d="M ${size * 1.7} ${-size * .3} L ${size * 2} ${-size * 1.1}" stroke="${col}" stroke-width=".6" fill="none"/>
        <path d="M ${size * 1.5} ${-size * .3} L ${size * 1.6} ${-size * .9}" stroke="${col}" stroke-width=".7" fill="none"/>
        <circle cx="${size * 1.45}" cy="${-size * .35}" r="${size * .15}" fill="${col}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="va-wrap">
        <div class="va-head"><b>VALE</b><span>雾团=配额窗 浓=用量 鹿=会话${hotN ? " · " + hotN + " 暖雾" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${hills}${floor}${mist}${trees}${banks}${deer}
          <g class="va-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="va-k">${fmt(k.tokens)} · ${sessions.length} 鹿</text>
            <text x="22" y="45" class="va-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "幽谷", eyebrow: "VALE", render };
})();
