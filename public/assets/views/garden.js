/* -------------------------------------------------------------------- garden
 * Garden — a walled courtyard: every quota window is a flower bed
 * whose blossoms thicken as used % climbs (≥85% petals wilt and
 * drop); sessions are butterflies dancing between the beds.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "garden";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(77391421);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 6);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, SOIL = 240;
    const n = Math.max(1, quotas.length);
    const gap = (W - 60) / n;

    // flower beds — blooms thicken with used %, wilt when hot
    const beds = quotas.map((w, i) => {
      const cx = 30 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#d975a5";
      const stems = 2 + Math.round(f * 5);
      let bloom = "";
      for (let b = 0; b < stems; b++) {
        const bx = cx - gap * .28 + (gap * .56) * (b / Math.max(1, stems - 1));
        const bh = 20 + f * 60 + (b % 3) * 10;
        const petals = 5;
        let pet = "";
        for (let p = 0; p < petals; p++) {
          const a = (p / petals) * Math.PI * 2;
          const px = bx + Math.cos(a) * (3 + f * 3);
          const py = SOIL - bh + Math.sin(a) * (3 + f * 3);
          pet += `<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${(2.5 + f * 2).toFixed(1)}" ry="${(1.8 + f * 1.5).toFixed(1)}" fill="${hot ? "var(--red)" : col}" opacity="${(0.6 + f * .3).toFixed(2)}" transform="rotate(${(a * 57.3).toFixed(0)} ${bx} ${SOIL - bh})"/>`;
        }
        bloom += `<line x1="${bx.toFixed(1)}" y1="${SOIL}" x2="${bx.toFixed(1)}" y2="${(SOIL - bh).toFixed(1)}" stroke="#5a7a3a" stroke-width="1.2"/>
          <circle cx="${bx.toFixed(1)}" cy="${(SOIL - bh).toFixed(1)}" r="${(2 + f * 1.5).toFixed(1)}" fill="#f2d58a"/>
          ${pet}`;
      }
      // falling petals on hot beds
      const drops = hot ? Array.from({ length: 3 }, (_, k) =>
        `<ellipse cx="${(cx + (k - 1) * 10).toFixed(1)}" cy="${(SOIL - 40 - k * 8).toFixed(1)}" rx="2.5" ry="1.8" fill="var(--red)" opacity=".8">
          <animate attributeName="cy" values="${(SOIL - 40 - k * 8).toFixed(1)};${SOIL - 3}" dur="${(2 + k * .4).toFixed(1)}s" begin="${(-k * .6).toFixed(1)}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".8;0" dur="${(2 + k * .4).toFixed(1)}s" begin="${(-k * .6).toFixed(1)}s" repeatCount="indefinite"/></ellipse>`).join("") : "";
      // soil bed
      const soil = `<rect x="${(cx - gap * .38).toFixed(1)}" y="${SOIL}" width="${(gap * .76).toFixed(1)}" height="4" rx="2" fill="#4a3a28" opacity=".8"/>`;
      return `<g class="gd-bed${hot ? " hot" : ""}">
        ${soil}${bloom}${drops}
        <text x="${cx.toFixed(1)}" y="${SOIL + 18}" class="gd-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${SOIL + 29}" class="gd-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // butterflies — sessions dancing between the beds
    const flies = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(6, 14 - (s.tps || 0) / 8);
      const y = 60 + (i % 4) * 28 + rnd() * 12;
      const size = 3 + Math.min(4, (s.tokens || 0) / 40000);
      return `<g class="gd-fly${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-20} ${y.toFixed(1)};${W + 20} ${(y + 12).toFixed(1)}" dur="${dur}s" begin="${(-i * 2.2).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * .5}" ry="${size * .8}" fill="${dead ? "var(--red)" : m.color || "#d9a5d9"}"/>
        <ellipse cx="${-size * .5}" cy="0" rx="${size * .5}" ry="${size * .6}" fill="${dead ? "var(--red)" : m.color || "#d9a5d9"}" opacity=".8">
          <animate attributeName="ry" values="${size * .6};${size * .2};${size * .6}" dur=".5s" repeatCount="indefinite"/>
        </ellipse>
        <ellipse cx="${size * .5}" cy="0" rx="${size * .5}" ry="${size * .6}" fill="${dead ? "var(--red)" : m.color || "#d9a5d9"}" opacity=".8">
          <animate attributeName="ry" values="${size * .2};${size * .6};${size * .2}" dur=".5s" repeatCount="indefinite"/>
        </ellipse>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="gd-wrap">
        <div class="gd-head"><b>GARDEN</b><span>坛=配额窗 茂=用量 蝶=会话${hotN ? " · " + hotN + " 坛谢" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1a1a24 40%, transparent)" rx="10"/>
          ${beds}${flies}
          <g class="gd-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="gd-k">${fmt(k.tokens)} · ${sessions.length} 蝶</text>
            <text x="22" y="45" class="gd-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "庭院", eyebrow: "GARDEN", render };
})();
