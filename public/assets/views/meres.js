/* ------------------------------------------------------------------ meres
 * Meres — shallow English lakes fringed by reeds: every quota
 * window is a reed bed whose height = used % (≥85% the king-
 * fisher perch burns amber); sessions are coots paddling.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "meres";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(88660022);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WY = 205, GY = 248;

    // english sky
    const sky = `<defs><linearGradient id="mu-s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c0d0d8"/><stop offset="100%" stop-color="#e0e8e0"/>
      </linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#mu-s)" rx="10"/>`;
    // willows far shore
    const willows = `<path d="M 0 ${WY} L 0 ${WY - 35} Q 60 ${WY - 50} 130 ${WY - 38} Q 200 ${WY - 55} 270 ${WY - 40} Q 340 ${WY - 52} 400 ${WY - 42} L 400 ${WY} Z" fill="#78a088" opacity=".3"/>`;
    // water
    const water = `<rect x="0" y="${WY}" width="${W}" height="${GY - WY}" fill="color-mix(in srgb, #486870 60%, var(--card-2))"/>`;
    // lily pads
    let lilies = "";
    for (let i = 0; i < 8; i++) {
      lilies += `<ellipse cx="${(rnd() * W).toFixed(1)}" cy="${(WY + 8 + rnd() * 30).toFixed(1)}" rx="${(3 + rnd() * 4).toFixed(1)}" ry="${(1.5 + rnd() * 2).toFixed(1)}" fill="#589060" opacity="${(.4 + rnd() * .2).toFixed(2)}"/>`;
    }
    // shore
    const shore = `<rect x="0" y="${GY}" width="${W}" height="${H - GY}" fill="color-mix(in srgb, #687858 60%, var(--card-2))"/>`;

    // reed beds — height = used %
    const n = Math.max(1, quotas.length);
    const gap = (W - 80) / n;
    const beds = quotas.map((w, i) => {
      const cx = 40 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#689858";
      const rh = 15 + f * 60;
      const rw = 12 + f * 18;
      // reed stalks
      let stalks = "";
      const stalkN = Math.round(4 + f * 6);
      for (let st = 0; st < stalkN; st++) {
        const sx = cx + (rnd() - .5) * rw;
        const sh = rh * (.6 + rnd() * .4);
        stalks += `<line x1="${sx.toFixed(1)}" y1="${WY + 5}" x2="${(sx + (rnd() - .5) * 3).toFixed(1)}" y2="${(WY + 5 - sh).toFixed(1)}" stroke="color-mix(in srgb, ${col} ${55 + f * 20}%, #587048)" stroke-width="1" opacity="${(.6 + rnd() * .2).toFixed(2)}"/>`;
        // seed head
        stalks += `<ellipse cx="${(sx + (rnd() - .5) * 3).toFixed(1)}" cy="${(WY + 5 - sh).toFixed(1)}" rx="1.5" ry="4" fill="#8a7848" opacity=".7"/>`;
      }
      // perch pole
      const perch = `<line x1="${cx}" y1="${WY + 5}" x2="${cx}" y2="${WY + 5 - rh - 8}" stroke="#685848" stroke-width="1.5"/>`;
      // kingfisher on top
      const bird = `<ellipse cx="${cx}" cy="${WY + 5 - rh - 12}" rx="4" ry="3" fill="${hot ? "var(--amber)" : "#38a0c8"}"/>
        <circle cx="${cx + 3}" cy="${WY + 5 - rh - 14}" r="2" fill="${hot ? "var(--amber)" : "#2888b0"}"/>
        <path d="M ${cx + 4.5} ${WY + 5 - rh - 14} L ${cx + 8} ${WY + 5 - rh - 13}" stroke="#c05030" stroke-width="1" fill="none"/>`;
      // hot glow
      const glow = hot ? `<circle cx="${cx + 1.5}" cy="${WY + 5 - rh - 13}" r="7" fill="var(--amber)" opacity=".25">
        <animate attributeName="r" values="7;11" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".25;.06" dur="1.8s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="mu-bed${hot ? " hot" : ""}">
        ${stalks}${perch}${bird}${glow}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="mu-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="mu-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // coots — paddling
    const coots = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 13 - (s.tps || 0) / 13);
      const y = WY + 18 + (i % 3) * 12;
      const size = 2.5 + Math.min(2, (s.tokens || 0) / 80000);
      const col = dead ? "var(--red)" : (m.color || "#384048");
      return `<g class="mu-coot${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y};${W + 20} ${(y - 4).toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * 1.1}" ry="${size * .5}" fill="${col}"/>
        <circle cx="${size * .7}" cy="${-size * .3}" r="${size * .35}" fill="${col}"/>
        <circle cx="${size * .9}" cy="${-size * .35}" r="${size * .12}" fill="#e8e8e0"/>
        <path d="M ${-size * .9} ${size * .1} Q ${-size * 1.5} ${size * .5} ${-size * 1.3} ${size * .9}" stroke="${col}" stroke-width=".5" fill="none" opacity=".5"/>
        <path d="M ${size * .3} ${size * .4} Q ${size * .5} ${size * .7} ${size * .2} ${size * .9}" stroke="${col}" stroke-width=".4" fill="none" opacity=".4"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mu-wrap">
        <div class="mu-head"><b>MERES</b><span>苇床=配额窗 高=用量 骨顶鸡=会话${hotN ? " · " + hotN + " 燃栖" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          ${sky}${willows}${water}${lilies}${shore}${beds}${coots}
          <g class="mu-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="mu-k">${fmt(k.tokens)} · ${sessions.length} 鸡</text>
            <text x="22" y="45" class="mu-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "湖沼", eyebrow: "MERES", render };
})();
