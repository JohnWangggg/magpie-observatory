/* ------------------------------------------------------------------- rodeo
 * Rodeo — the ranch arena: every quota window is a fenced pen along
 * the rail — the gate swings wider the fuller the window gets (≥85%
 * the latch glows); sessions are riders lapping the arena, lassos
 * spinning overhead.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "rodeo";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  const CX = 200.0, CY = 168.0, RX = 140.0, RY = 66.0;

  function pt(t) {
    const a = t * Math.PI * 2;
    return [CX + Math.cos(a) * RX, CY + Math.sin(a) * RY];
  }
  function ovalPath() {
    let d = "";
    for (let i = 0; i <= 44; i++) {
      const [x, y] = pt(i / 44);
      d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
    }
    return d + "Z";
  }

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, RAIL = 90;

    // pens on the back rail
    const n = Math.max(1, quotas.length);
    const gap = (W - 90) / n;
    const pens = quotas.map((w, i) => {
      const x = 45 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const open = w.used / 100 * 34; // gate swing angle
      return `<g class="rd-pen${hot ? " hot" : ""}">
        <line x1="${(x - gap / 2 + 6).toFixed(1)}" y1="${RAIL}" x2="${(x - gap / 2 + 6).toFixed(1)}" y2="${RAIL - 24}" stroke="var(--line-2)" stroke-width="2.4"/>
        <line x1="${(x + gap / 2 - 6).toFixed(1)}" y1="${RAIL}" x2="${(x + gap / 2 - 6).toFixed(1)}" y2="${RAIL - 24}" stroke="var(--line-2)" stroke-width="2.4"/>
        <line x1="${(x - gap / 2 + 6).toFixed(1)}" y1="${RAIL - 24}" x2="${(x + gap / 2 - 6).toFixed(1)}" y2="${RAIL - 24}" stroke="var(--line-2)" stroke-width="1.6"/>
        <line x1="${(x - gap / 2 + 6).toFixed(1)}" y1="${RAIL - 14}" x2="${(x + gap / 2 - 6).toFixed(1)}" y2="${RAIL - 14}" stroke="var(--line-2)" stroke-width="1.2" opacity=".7"/>
        <g class="rd-gate" style="transform:rotate(${open.toFixed(0)}deg);transform-origin:${(x - gap / 2 + 6).toFixed(1)}px ${RAIL}px">
          <line x1="${(x - gap / 2 + 6).toFixed(1)}" y1="${RAIL}" x2="${(x - gap / 2 + 6 + gap - 12).toFixed(1)}" y2="${RAIL}" stroke="${hot ? "var(--red)" : m.color || "#d9a03f"}" stroke-width="2.6"/>
        </g>
        <text x="${x.toFixed(1)}" y="${RAIL - 32}" class="rd-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x.toFixed(1)}" y="${RAIL - 42}" class="rd-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // riders — sessions lapping the arena, lasso spinning overhead
    const riders = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(5, 15 - (s.tps || 0) / 15);
      return `<g class="rd-rider${dead ? " dead" : ""}">
        <ellipse cx="0" cy="0" rx="10" ry="5" fill="${dead ? "var(--red)" : m.color || "#d9a03f"}"/>
        <circle cx="6" cy="-7" r="3" fill="${dead ? "var(--red)" : m.color || "#d9a03f"}"/>
        <line x1="2" y1="-4" x2="6" y2="-7" stroke="${dead ? "var(--red)" : m.color || "#d9a03f"}" stroke-width="2"/>
        <circle class="rd-lasso" cx="6" cy="-14" r="6" fill="none" stroke="${dead ? "var(--red)" : m.color || "#d9a03f"}" stroke-width="1.2" stroke-dasharray="3 3"/>
        <animateMotion dur="${dur}s" repeatCount="indefinite" begin="${(-i * (dur / Math.max(1, sessions.length))).toFixed(2)}s" rotate="auto"
          path="${ovalPath()}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="rd-wrap">
        <div class="rd-head"><b>RODEO</b><span>栏=配额窗 骑=会话 门=用量${hotN ? " · " + hotN + " 栏破门" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="30" y1="${RAIL}" x2="${W - 30}" y2="${RAIL}" stroke="var(--line-2)" stroke-width="4"/>
          <path d="${ovalPath()}" fill="none" stroke="var(--line-2)" stroke-width="1.6" stroke-dasharray="5 5" opacity=".7"/>
          ${pens}${riders}
          <g class="rd-card">
            <rect x="${CX - 60}" y="${CY - 22}" width="120" height="44" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${CX}" y="${CY - 4}" class="rd-k" text-anchor="middle">${fmt(k.tokens)} · ${sessions.length} 骑</text>
            <text x="${CX}" y="${CY + 10}" class="rd-ksub" text-anchor="middle">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "牧场", eyebrow: "RODEO", render };
})();
