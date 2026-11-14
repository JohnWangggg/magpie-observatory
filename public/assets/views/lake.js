/* ---------------------------------------------------------------------- lake
 * Lake — a still sheet of water: every quota window is a lily pad whose
 * buoyancy sinks as used % climbs (≥85% the pad tilts and reddens at the
 * rim); sessions are water-striders gliding across the surface.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "lake";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(91740121);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, WL = 176;                       // water line
    const n = Math.max(1, quotas.length);
    const gap = (W - 64) / n;

    // lily pads — buoyancy sinks as used % climbs
    const pads = quotas.map((w, i) => {
      const cx = 36 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const r = 22 + f * 14;
      const cy = WL - (1 - f) * 14 - f * 10;               // sinks under load
      const col = m.color || "#7fb56a";
      const tilt = f * .18;                                 // dips when heavy
      const dew = !hot ? `<circle cx="${cx - r * .3}" cy="${cy - r * .55}" r="1.6" fill="#cfe8ff" opacity=".85"/>` : "";
      // ripple rings
      let rip = "";
      for (let k = 0; k < 2; k++) {
        rip += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r + 4 + k * 7).toFixed(1)}" fill="none" stroke="${col}" stroke-opacity="${(0.2 - k * 0.07).toFixed(2)}" stroke-width="1">
          <animate attributeName="r" values="${(r + 3).toFixed(1)};${(r + 15).toFixed(1)}" dur="${(3 + k * 1.4).toFixed(1)}s" begin="${(-k * 1.5).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="${(0.22 - k * 0.06).toFixed(2)};0" dur="${(3 + k * 1.4).toFixed(1)}s" begin="${(-k * 1.5).toFixed(1)}s" repeatCount="indefinite"/>
        </circle>`;
      }
      // sinking pad tilts + redens at rim when over quota
      const sink = hot ? `<animateTransform attributeName="transform" type="rotate" values="-${(tilt * 60).toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)};${(tilt * 40).toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)};-${(tilt * 60).toFixed(0)} ${cx.toFixed(1)} ${cy.toFixed(1)}" dur="3s" repeatCount="indefinite"/>` : "";
      return `<g class="lk-pad${hot ? " hot" : ""}">
        ${rip}
        <ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * .32).toFixed(1)}"
          fill="color-mix(in srgb, ${col} ${30 + f * 40}%, var(--card-2))" stroke="${hot ? "var(--red)" : col}" stroke-width="1">
          ${sink}
        </ellipse>
        <path d="M ${(cx - r * .9).toFixed(1)} ${(cy - 1).toFixed(1)} Q ${cx.toFixed(1)} ${(cy - r * .2).toFixed(1)} ${(cx + r * .9).toFixed(1)} ${(cy - 1).toFixed(1)}" stroke="${col}" stroke-opacity=".35" fill="none"/>
        ${dew}
        <text x="${cx.toFixed(1)}" y="${WL + 26}" class="lk-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${WL + 37}" class="lk-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // striders — sessions skating on the water
    const striders = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 16 - (s.tps || 0) / 8);
      const y = WL - 4 + (i % 3) * 5;
      return `<g class="lk-str${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20 + i * 22} ${y};${W + 20} ${y}" dur="${dur}s" begin="${(-i * 2.6).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="3" ry="1.4" fill="${dead ? "var(--red)" : m.color || "#4a5a2a"}"/>
        <line x1="-5" y1="-1" x2="-7" y2="-3.5" stroke="${dead ? "var(--red)" : "#3a4a22"}" stroke-width=".9"/>
        <line x1="-2" y1="-1" x2="-4" y2="-4" stroke="${dead ? "var(--red)" : "#3a4a22"}" stroke-width=".9"/>
        <line x1="2" y1="-1" x2="4" y2="-4" stroke="${dead ? "var(--red)" : "#3a4a22"}" stroke-width=".9"/>
        <line x1="5" y1="-1" x2="7" y2="-3.5" stroke="${dead ? "var(--red)" : "#3a4a22"}" stroke-width=".9"/>
        <circle cx="0" cy="-3" r="1.2" fill="${dead ? "var(--red)" : m.color || "#7a9a5a"}"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="lk-wrap">
        <div class="lk-head"><b>LAKE</b><span>莲=配额窗 沉=用量 黾=会话${hotN ? " · " + hotN + " 莲将沉" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #16202a 36%, transparent)" rx="10"/>
          <rect x="0" y="${WL}" width="${W}" height="${H - WL}" fill="color-mix(in srgb, #3a5a72 22%, transparent)"/>
          <line x1="0" y1="${WL}" x2="${W}" y2="${WL}" stroke="var(--line-2)" stroke-opacity=".4"/>
          ${pads}${striders}
          <g class="lk-card">
            <rect x="14" y="14" width="128" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="lk-k">${fmt(k.tokens)} · ${sessions.length} 黾</text>
            <text x="22" y="45" class="lk-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "湖泊", eyebrow: "LAKE", render };
})();
