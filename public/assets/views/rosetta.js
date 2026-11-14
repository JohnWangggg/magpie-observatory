/* ---------------------------------------------------------------- rosetta
 * Rosetta — the quota windows as a circle of glyphs on a stone tablet:
 *   each provider is one concentric dial on a clay disc; the filled arc
 *   is the used %, its colour the provider brand. Sessions ring the
 *   outside like carved notches; the hotter the windows, the more the
 *   disc glows.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "rosetta";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done");
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const CX = 200, CY = 200;
    const notches = sessions.slice(0, 20).map((s, i) => {
      const a = (i / Math.max(1, sessions.length)) * Math.PI * 2 - Math.PI / 2;
      const m = metaOf(ameta, s.agent);
      const x1 = CX + Math.cos(a) * 168, y1 = CY + Math.sin(a) * 168;
      const x2 = CX + Math.cos(a) * (168 + (s.status === "err" ? 8 : 14)), y2 = CY + Math.sin(a) * (168 + (s.status === "err" ? 8 : 14));
      return `<line class="ros-notch${s.status === "err" ? " dead" : ""}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${m.color || "#8b7cf6"}" stroke-width="2" stroke-linecap="round"/>`;
    }).join("");

    const rings = quotas.map((w, i) => {
      const r = 148 - i * 21;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const circ = 2 * Math.PI * r;
      const fill = Math.min(1, w.used / 100) * circ;
      const labA = -Math.PI / 2 + (w.used / 100) * Math.PI * 0.5; // tilt label along the arc
      const lx = CX + Math.cos(labA) * r, ly = CY + Math.sin(labA) * r;
      return `<g class="ros-ring${hot ? " hot" : ""}" style="--pc:${m.color || "#8b7cf6"}">
        <circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="var(--line)" stroke-width="8" opacity=".35"/>
        <circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="${hot ? "var(--red)" : m.color || "var(--accent)"}"
            stroke-width="8" stroke-linecap="round" stroke-dasharray="${fill.toFixed(1)} ${(circ - fill).toFixed(1)}"
            transform="rotate(-90 ${CX} ${CY})" opacity=".9"/>
        <text x="${lx.toFixed(1)}" y="${(ly - 4).toFixed(1)}" class="ros-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${lx.toFixed(1)}" y="${(ly + 10).toFixed(1)}" class="ros-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 8))}</text>
      </g>`;
    }).join("");

    // centre medallion: aggregate tokens like a carved seal
    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;
    const glyph = `
      <circle cx="${CX}" cy="${CY}" r="34" fill="color-mix(in srgb, var(--card-3) 80%, transparent)" stroke="${hotN ? "var(--red)" : "var(--line-2)"}" stroke-width="1.5"/>
      <text x="${CX}" y="${CY - 2}" class="ros-tok" text-anchor="middle">${fmt(k.tokens)}</text>
      <text x="${CX}" y="${CY + 13}" class="ros-sub" text-anchor="middle">今日</text>`;

    host.innerHTML = `
      <div class="ros-wrap">
        <div class="ros-head"><b>ROSETTA</b><span>配额=环带 · 会话=刻痕 · 中央=今日总量</span></div>
        <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet">
          <circle cx="${CX}" cy="${CY}" r="192" fill="color-mix(in srgb, var(--card-2) 30%, transparent)" stroke="var(--line)" stroke-width="1" opacity=".6"/>
          ${notches}${rings}${glyph}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "罗塞塔", eyebrow: "ROSETTA", render };
})();
