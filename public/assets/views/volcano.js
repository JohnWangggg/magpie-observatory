/* ------------------------------------------------------------------ volcano
 * Volcano — a smoking ridge: each quota window is a cone whose crater
 * bubbles harder as used % climbs (≥85% lava spills over the rim);
 * sessions are birds circling the caldera on warm updrafts.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "volcano";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(22801763489 % 2147483647 || 982451653);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 246;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    const cones = quotas.map((w, i) => {
      const cx = 36 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const ch = 40 + f * 66;                          // cone height
      const cw = 34 + f * 10;                          // cone half-width
      const craterY = GY - ch;
      // smoke puffs rise higher as it gets hotter
      const ns = 1 + Math.round(f * 3);
      let smoke = "";
      for (let p = 0; p < ns; p++) {
        smoke += `<circle cx="${cx.toFixed(1)}" cy="${craterY - 4}" r="${(3 + rnd() * 3).toFixed(1)}" fill="#9aa4b0" opacity=".5">
          <animate attributeName="cy" values="${craterY - 4};${craterY - 34 - rnd() * 20}" dur="${(2.4 - f).toFixed(1)}s" begin="${(-p * .7).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="r" values="${(3 + rnd() * 3).toFixed(1)};${(7 + rnd() * 4).toFixed(1)}" dur="${(2.4 - f).toFixed(1)}s" begin="${(-p * .7).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".5;0" dur="${(2.4 - f).toFixed(1)}s" begin="${(-p * .7).toFixed(1)}s" repeatCount="indefinite"/>
        </circle>`;
      }
      // lava: a hot pool in the crater; spills over the rim when hot
      const lava = `<ellipse cx="${cx.toFixed(1)}" cy="${craterY}" rx="${(6 + f * 8).toFixed(1)}" ry="${(2 + f * 2).toFixed(1)}" fill="${hot ? "var(--red)" : "#f2a541"}" opacity=".9">
          <animate attributeName="ry" values="${(2 + f * 2).toFixed(1)};${(1.6 + f * 2.4).toFixed(1)};${(2 + f * 2).toFixed(1)}" dur="1.6s" repeatCount="indefinite"/>
        </ellipse>`;
      const spill = hot ? `<path d="M ${cx - 4} ${craterY} q -3 ${ch * .5} -6 ${ch * .8} l 4 3 q 2 ${-ch * .55} 5 ${-ch * .82} Z" fill="var(--red)" opacity=".85">
          <animate attributeName="opacity" values=".85;.5;.85" dur="1.2s" repeatCount="indefinite"/></path>` : "";
      return `<g class="vc-cone${hot ? " hot" : ""}">
        <path d="M ${cx - cw} ${GY} L ${cx - 7} ${craterY + 4} q 7 -8 14 0 L ${cx + cw} ${GY} Z"
          fill="color-mix(in srgb, #5a4a3e ${30 + Math.round(f * 30)}%, var(--card-2))" stroke="${hot ? 'var(--red)' : 'var(--line-2)'}" stroke-width="1"/>
        ${smoke}${lava}${spill}
        <text x="${cx.toFixed(1)}" y="${GY + 20}" class="vc-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 31}" class="vc-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // birds — sessions circling above the ridge
    const birds = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const cx = 100 + i * 66, cy = 84 + (i % 2) * 26, rr = 22 + i * 6;
      const dur = Math.max(3, 9 - (s.tps || 0) / 14);
      return `<g class="vc-bird${dead ? " dead" : ""}">
        <path d="M -5 0 q 2.5 -3 5 0 q 2.5 -3 5 0" fill="none" stroke="${dead ? "var(--red)" : m.color || "#c9d4e0"}" stroke-width="1.6" stroke-linecap="round">
          <animateTransform attributeName="transform" type="rotate" values="0 ${cx} ${cy};360 ${cx} ${cy}" dur="${dur}s" begin="${(-i * .8).toFixed(1)}s" repeatCount="indefinite"/>
          <animateMotion path="M ${cx + rr} ${cy} a ${rr} ${rr * .4} 0 1 0 ${-rr * 2} 0 a ${rr} ${rr * .4} 0 1 0 ${rr * 2} 0" dur="${dur}s" begin="${(-i * .8).toFixed(1)}s" repeatCount="indefinite" additive="sum"/>
        </path>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="vc-wrap">
        <div class="vc-head"><b>VOLCANO</b><span>锥=配额窗 烟=用量 鸟=会话${hotN ? " · " + hotN + " 喷发" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #241812 32%, transparent)" rx="10"/>
          <rect x="16" y="${GY}" width="${W - 32}" height="3" rx="1.5" fill="#4a3a2e" opacity=".9"/>
          ${cones}${birds}
          <g class="vc-card">
            <rect x="14" y="12" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="30" class="vc-k">${fmt(k.tokens)} · ${sessions.length} 鸟</text>
            <text x="22" y="43" class="vc-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "火山", eyebrow: "VOLCANO", render };
})();
