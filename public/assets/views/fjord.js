/* -------------------------------------------------------------------- fjord
 * Fjord — a steep-sided inlet at dawn: every quota window is a cliff
 * pair whose water level rises between them as used % climbs
 * (≥85% the water spills over the rim); sessions are rowboats
 * gliding through the channel.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fjord";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(44713391);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 4);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    // cliffs — water level between the walls = used %
    const cliffs = quotas.map((w, i) => {
      const cx = 30 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#6a8a7a";
      const wallW = gap * .4, chW = gap * .4;
      const baseY = 235, topY = 70;
      const waterTop = baseY - f * (baseY - topY - 12);
      // cliff walls left & right
      const rocks = `
        <path d="M ${cx - chW - wallW} ${baseY} L ${cx - chW - wallW * .3} ${topY} L ${cx - chW} ${topY + 14} L ${cx - chW} ${baseY} Z"
          fill="color-mix(in srgb, ${col} 30%, var(--card-2))" stroke="${col}" stroke-width="1"/>
        <path d="M ${cx + chW} ${baseY} L ${cx + chW} ${topY + 14} L ${cx + chW + wallW * .3} ${topY} L ${cx + chW + wallW} ${baseY} Z"
          fill="color-mix(in srgb, ${col} 30%, var(--card-2))" stroke="${col}" stroke-width="1"/>`;
      // water between the cliffs
      const water = `<rect x="${cx - chW}" y="${waterTop.toFixed(1)}" width="${chW * 2}" height="${(baseY - waterTop).toFixed(1)}"
          fill="color-mix(in srgb, ${hot ? "var(--red)" : "#4a7a9a"} ${30 + f * 30}%, var(--card-2))"/>`;
      // spill lines when water over rim
      const spill = hot ? Array.from({ length: 3 }, (_, k) =>
        `<line x1="${(cx - chW + k * chW).toFixed(1)}" y1="${(waterTop - 2).toFixed(1)}" x2="${(cx - chW + k * chW + 4).toFixed(1)}" y2="${(waterTop - 14).toFixed(1)}" stroke="var(--red)" stroke-width="1.4" opacity=".8">
          <animate attributeName="opacity" values="0;.8;0" dur="1.4s" begin="${(-k * .4).toFixed(1)}s" repeatCount="indefinite"/></line>`).join("") : "";
      // snow cap on cliff tops
      const snow = `<path d="M ${cx - chW - wallW * .3} ${topY} L ${cx - chW - wallW * .15} ${topY - 7} L ${cx - chW} ${topY + 14} Z" fill="#e8f0f4" opacity=".8"/>
        <path d="M ${cx + chW + wallW * .3} ${topY} L ${cx + chW + wallW * .15} ${topY - 7} L ${cx + chW} ${topY + 14} Z" fill="#e8f0f4" opacity=".8"/>`;
      return `<g class="fj-cliff${hot ? " hot" : ""}">
        ${water}${rocks}${snow}${spill}
        <text x="${cx.toFixed(1)}" y="${baseY + 18}" class="fj-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${baseY + 29}" class="fj-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // rowboats — sessions gliding through the channel
    const boats = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(9, 20 - (s.tps || 0) / 8);
      const y = 195 + (i % 2) * 16;
      const size = 4 + Math.min(4, (s.tokens || 0) / 40000);
      return `<g class="fj-boat${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-26} ${y.toFixed(1)};${W + 26} ${(y + 4).toFixed(1)}" dur="${dur}s" begin="${(-i * 3.4).toFixed(1)}s" repeatCount="indefinite"/>
        <path d="M ${-size * 1.6} 0 Q 0 ${size * .9} ${size * 1.6} 0 L ${size * 1.3} ${-size * .4} L ${-size * 1.3} ${-size * .4} Z"
          fill="${dead ? "var(--red)" : m.color || "#a8794a"}" stroke="${dead ? "var(--red)" : m.color || "#a8794a"}" stroke-width=".8"/>
        <rect x="${-size * .8}" y="${-size * .9}" width="${size * 1.6}" height="${size * .5}" rx="1" fill="var(--card-2)" opacity=".9"/>
        <line x1="0" y1="${-size * .9}" x2="0" y2="${-size * 1.6}" stroke="#5a4632" stroke-width="1"/>
        <path d="M 0 ${-size * 1.6} L ${size * 1.3} ${-size * 1.2} L 0 ${-size * .8} Z" fill="${m.color || "#d9a5d9"}" opacity=".8"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="fj-wrap">
        <div class="fj-head"><b>FJORD</b><span>崖=配额窗 水=用量 舟=会话${hotN ? " · " + hotN + " 崖漫水" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #141a22 48%, transparent)" rx="10"/>
          ${cliffs}${boats}
          <g class="fj-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="fj-k">${fmt(k.tokens)} · ${sessions.length} 舟</text>
            <text x="22" y="45" class="fj-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "峡湾", eyebrow: "FJORD", render };
})();
