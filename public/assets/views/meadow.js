/* -------------------------------------------------------------------- meadow
 * Meadow — wildflower tufts at dusk: every quota window is a grass
 * tuft whose stems grow taller as used % climbs (≥85% the tuft
 * goes amber-dry); sessions are butterflies fluttering between
 * the tufts.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "meadow";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(61517611);

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, GY = 236;
    const n = Math.max(1, quotas.length);
    const gap = (W - 70) / n;

    // tufts — stem height = used %
    const tufts = quotas.map((w, i) => {
      const cx = 35 + gap / 2 + i * gap;
      const m = metaOf(pmeta, w.prov);
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const col = m.color || "#7aa05a";
      const dry = hot ? "#c9a04a" : col;
      const stems = 4 + Math.round(f * 7);
      let tuft = "";
      for (let t = 0; t < stems; t++) {
        const bx = cx - gap * .3 + (gap * .6) * (t / Math.max(1, stems - 1));
        const bh = 18 + f * 92 + (t % 3) * 12;
        const sway = (rnd() - .5) * 14;
        // grass blade
        tuft += `<path d="M ${bx.toFixed(1)} ${GY} Q ${(bx + sway).toFixed(1)} ${(GY - bh * .55).toFixed(1)} ${(bx + sway * 1.4).toFixed(1)} ${(GY - bh).toFixed(1)}" stroke="${dry}" stroke-width="${(1 + f).toFixed(1)}" fill="none" opacity="${(0.55 + f * .35).toFixed(2)}"/>`;
        // seed head on taller blades
        if (t % 3 === 0 && bh > 45) {
          tuft += `<ellipse cx="${(bx + sway * 1.4).toFixed(1)}" cy="${(GY - bh).toFixed(1)}" rx="1.8" ry="3" fill="${hot ? "var(--amber)" : "#d9c98a"}" opacity=".9">
            <animateTransform attributeName="transform" type="rotate" values="-5 ${bx} ${GY - bh};5 ${bx} ${GY - bh};-5 ${bx} ${GY - bh}" dur="${(2.2 + rnd()).toFixed(1)}s" repeatCount="indefinite"/></ellipse>`;
        }
      }
      // dew on cool tufts
      const dew = !hot && f < .5 ? `<circle cx="${cx + gap * .2}" cy="${GY - 26}" r="1.4" fill="#bfe0f5" opacity=".8">
        <animate attributeName="opacity" values=".8;.2;.8" dur="3s" repeatCount="indefinite"/></circle>` : "";
      return `<g class="mw-tuft${hot ? " hot" : ""}">
        ${tuft}${dew}
        <text x="${cx.toFixed(1)}" y="${GY + 18}" class="mw-pct" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${cx.toFixed(1)}" y="${GY + 29}" class="mw-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 6))}</text>
      </g>`;
    }).join("");

    // butterflies — sessions fluttering
    const flies = sessions.map((s, i) => {
      const m = metaOf(ameta, s.agent);
      const dead = s.status === "err";
      const dur = Math.max(8, 16 - (s.tps || 0) / 8);
      const y = 70 + (i % 4) * 34 + rnd() * 14;
      const size = 3 + Math.min(4, (s.tokens || 0) / 40000);
      return `<g class="mw-fly${dead ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-18} ${y.toFixed(1)};${W + 18} ${(y + 16).toFixed(1)}" dur="${dur}s" begin="${(-i * 2.5).toFixed(1)}s" repeatCount="indefinite"/>
        <ellipse cx="0" cy="0" rx="${size * .4}" ry="${size * .7}" fill="${dead ? "var(--red)" : m.color || "#e0a5c9"}"/>
        <ellipse cx="${-size * .55}" cy="${-size * .2}" rx="${size * .55}" ry="${size * .7}" fill="${dead ? "var(--red)" : m.color || "#e0a5c9"}" opacity=".85">
          <animateTransform attributeName="transform" type="scale" values="1 1;.3 1;1 1" dur=".45s" repeatCount="indefinite" additive="sum" transform-origin="${-size * .55} 0"/>
        </ellipse>
        <ellipse cx="${size * .55}" cy="${-size * .2}" rx="${size * .55}" ry="${size * .7}" fill="${dead ? "var(--red)" : m.color || "#e0a5c9"}" opacity=".85">
          <animateTransform attributeName="transform" type="scale" values=".3 1;1 1;.3 1" dur=".45s" repeatCount="indefinite" additive="sum" transform-origin="${size * .55} 0"/>
        </ellipse>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mw-wrap">
        <div class="mw-head"><b>MEADOW</b><span>丛=配额窗 茂=用量 蝶=会话${hotN ? " · " + hotN + " 丛枯" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, #1a1f16 42%, transparent)" rx="10"/>
          <rect x="14" y="${GY}" width="${W - 28}" height="3" rx="1.5" fill="#3a3a2a" opacity=".85"/>
          ${tufts}${flies}
          <g class="mw-card">
            <rect x="14" y="14" width="126" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="22" y="32" class="mw-k">${fmt(k.tokens)} · ${sessions.length} 蝶</text>
            <text x="22" y="45" class="mw-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "草甸", eyebrow: "MEADOW", render };
})();
