/* ------------------------------------------------------------------- cavern
 * Cavern — dripping stalactites over an underground river: every
 * quota window is a stalactite whose length = used % (≥85% the tip
 * glows amber and drips faster); sessions are bats circling the
 * vault.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cavern";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(31415926);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 30, RY = 258;

    // ceiling rock
    const ceiling = `<path d="M 0 ${GY} Q 60 ${GY - 14} 120 ${GY - 6} T 240 ${GY - 12} T 400 ${GY - 4} L 400 0 L 0 0 Z" fill="color-mix(in srgb, #1a1a1e 88%, var(--card-2))"/>`;
    // river at bottom
    const river = `<rect x="0" y="${RY}" width="${W}" height="${H - RY}" fill="color-mix(in srgb, #1a3a4a 65%, var(--card-2))"/>
      <path d="M 0 ${RY} Q 100 ${RY - 3} 200 ${RY} T 400 ${RY}" stroke="#4a8ab8" stroke-width="1" fill="none" opacity=".4">
        <animate attributeName="d" values="M 0 ${RY} Q 100 ${RY - 3} 200 ${RY} T 400 ${RY};M 0 ${RY} Q 100 ${RY + 3} 200 ${RY} T 400 ${RY};M 0 ${RY} Q 100 ${RY - 3} 200 ${RY} T 400 ${RY}" dur="5s" repeatCount="indefinite"/></path>`;

    // stalactites — length = used %
    const tites = quotas.map((w, i) => {
      const cx = 35 + i * ((W - 70) / Math.max(1, quotas.length - 1));
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#8a7a5a";
      const len = 30 + f * 150;
      const wid = 8 + f * 14;
      const tipY = GY + len;
      const dripDur = hot ? 0.8 : (3 - f * 2);
      // stalactite body — tapered cone
      const body = `<path d="M ${cx - wid} ${GY} Q ${cx - wid * .4} ${GY + len * .5} ${cx} ${tipY} Q ${cx + wid * .4} ${GY + len * .5} ${cx + wid} ${GY} Z" fill="color-mix(in srgb, ${col} ${40 + f * 40}%, #2a2a2e)" opacity="${(.7 + f * .25).toFixed(2)}"/>`;
      // drip — a droplet falling from tip
      const drip = `<circle cx="${cx}" cy="${tipY}" r="${(1.2 + f * 1.5).toFixed(1)}" fill="${hot ? "var(--amber)" : "#a8d8f0"}" opacity=".9">
        <animate attributeName="cy" values="${tipY};${RY - 4}" dur="${dripDur.toFixed(1)}s" begin="${(-rnd() * dripDur).toFixed(1)}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".9;.9;0" dur="${dripDur.toFixed(1)}s" begin="${(-rnd() * dripDur).toFixed(1)}s" repeatCount="indefinite"/></circle>`;
      // tip glow when hot
      const glow = hot ? `<circle cx="${cx}" cy="${tipY}" r="${(3 + f * 3).toFixed(1)}" fill="var(--amber)" opacity=".3">
        <animate attributeName="r" values="${(3 + f * 3).toFixed(1)};${(5 + f * 4).toFixed(1)};${(3 + f * 3).toFixed(1)}" dur="1.4s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="cv-tite${hot ? " hot" : ""}">
        ${body}${drip}${glow}
        <text x="${cx.toFixed(1)}" y="${RY - 8}" class="cv-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${RY + 14}" class="cv-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // stalagmites — mirror columns on the floor
    const mites = quotas.map((w, i) => {
      const cx = 35 + i * ((W - 70) / Math.max(1, quotas.length - 1));
      const f = Math.min(1, w.used / 100);
      const mh = 10 + f * 30;
      const mw = 5 + f * 8;
      return `<path d="M ${cx - mw} ${RY} Q ${cx} ${RY - mh * .5} ${cx} ${RY - mh} Q ${cx} ${RY - mh * .5} ${cx + mw} ${RY} Z" fill="color-mix(in srgb, ${metaOf(pmeta, w.prov).color || "#8a7a5a"} 25%, #2a2a2e)" opacity=".55"/>`;
    }).join("");

    // bats — sessions circling the vault
    const bats = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const cx = 80 + i * 60 + rnd() * 20;
      const cy = GY + 80 + rnd() * 60;
      const rx = 30 + i * 20;
      const ry = 18 + rnd() * 10;
      const dur = Math.max(4, 14 - (s.tps || 0) / 12);
      const size = 3 + Math.min(3, (s.tokens || 0) / 70000);
      const col = dead ? "var(--red)" : (m.color || "#a89070");
      return `<g class="cv-bat${dead ? " dead" : ""}">
        <path id="cv-path-${i}" d="M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${rx * 2} 0 a ${rx} ${ry} 0 1 0 ${-rx * 2} 0" fill="none"/>
        <g>
          <animateMotion dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"><mpath href="#cv-path-${i}"/></animateMotion>
          <path d="M ${-size * 2} 0 Q ${-size} ${-size * 1.5} 0 ${-size * .4} Q ${size} ${-size * 1.5} ${size * 2} 0 Q ${size} ${size * .6} 0 ${size * .4} Q ${-size} ${size * .6} ${-size * 2} 0 Z" fill="${col}" opacity=".9">
            <animateTransform attributeName="transform" type="scale" values="1 1;1 .7;1 1" dur=".3s" repeatCount="indefinite"/></path>
        </g>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="cv-wrap">
        <div class="cv-head"><b>CAVERN</b><span>钟乳=配额窗 长=用量 蝠=会话${hotN ? " · " + hotN + " 泉滴" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #0d0d12 60%, transparent)" rx="10"/>
          ${ceiling}${river}${mites}${tites}${bats}
          <g class="cv-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="cv-k">${fmt(k.tokens)} · ${sessions.length} 蝠</text>
            <text x="22" y="45" class="cv-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "溶洞", eyebrow: "CAVERN", render };
})();
