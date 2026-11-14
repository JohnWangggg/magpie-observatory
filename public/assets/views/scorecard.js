/* ------------------------------------------------------------------ scorecard
 * Scorecard — routing health at a glance: per provider, a gauge
 * of ok-rate (green→red arc), mean latency as a needle, and a
 * fallback ribbon for requests that didn't get their first pick.
 * Sessions are judge paddles scoring each lane.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "scorecard";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []);
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    // per-provider: ok rate, mean ttft, fallback count
    const byProv = {};
    sessions.forEach(s => {
      const tries = s.tries || [];
      tries.forEach(t => {
        const p = t.provider || s.provider || "?";
        byProv[p] = byProv[p] || { ok: 0, err: 0, ms: [], fallbacks: 0, tries: 0 };
        byProv[p].tries += 1;
        if (t.state === "ok") byProv[p].ok += 1;
        else if (t.state === "fail" || t.state === "err") byProv[p].err += 1;
        if (t.ms) byProv[p].ms.push(t.ms);
      });
      const first = tries[0];
      if (tries.length > 1 && first && first.state !== "ok") {
        const p2 = (s.provider || "?");
        byProv[p2] = byProv[p2] || { ok: 0, err: 0, ms: [], fallbacks: 0, tries: 0 };
        byProv[p2].fallbacks += 1;
      }
    });
    logs.forEach(r => {
      const p = r.provider || "?";
      byProv[p] = byProv[p] || { ok: 0, err: 0, ms: [], fallbacks: 0, tries: 0 };
      if (r.status === "err" || r.status === "fail") byProv[p].err += 1;
      else byProv[p].ok += 1;
      if (r.ttft) byProv[p].ms.push(r.ttft);
    });

    const rows = Object.entries(byProv).map(([p, v]) => {
      const total = v.ok + v.err;
      const okRate = total ? v.ok / total : 1;
      const meanMs = v.ms.length ? v.ms.reduce((a, b) => a + b, 0) / v.ms.length : 0;
      const m = metaOf(pmeta, p);
      return { prov: p, name: m.name || p, col: m.color || "#8ab4f8", okRate, meanMs, ok: v.ok, err: v.err, tries: v.tries, fallbacks: v.fallbacks, total: v.ok + v.err + v.tries };
    }).sort((a, b) => b.total - a.total).slice(0, 6);

    const W = 400, H = 300, TOP = 34, BOT = 40;
    const rowH = (H - TOP - BOT) / Math.max(1, rows.length);

    const cards = rows.map((r, i) => {
      const y = TOP + i * rowH;
      const cx = 34, cy = y + rowH / 2 + 3;
      const R = 13;
      // ok-rate arc
      const startA = -Math.PI / 2;
      const endA = startA + r.okRate * Math.PI * 2;
      const large = r.okRate > .5 ? 1 : 0;
      const x1 = cx + R * Math.cos(endA), y1 = cy + R * Math.sin(endA);
      const arcCol = r.okRate > .9 ? "#68c078" : r.okRate > .75 ? "#e8c860" : "#e06048";
      const arc = r.okRate >= .995
        ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${arcCol}" stroke-width="3"/>`
        : `<path d="M ${cx} ${cy - R} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${arcCol}" stroke-width="3" stroke-linecap="round"/>`;
      const track = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--line-2)" stroke-width="3" opacity=".5"/>`;
      // latency needle — 0..2000ms → -120°..+120°
      const needleA = -Math.PI * 2 / 3 + Math.min(1, r.meanMs / 2000) * Math.PI * 4 / 3;
      const nx = cx + (R - 4) * Math.cos(needleA - Math.PI / 2);
      const ny = cy + (R - 4) * Math.sin(needleA - Math.PI / 2);
      const needle = `<line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="var(--fg)" stroke-width="1.4" stroke-linecap="round"/>`;

      // bar: tries ok vs err
      const barX = 70, barW = 200, barY = cy - 5;
      const okW = r.total ? barW * (r.ok + (r.tries - r.ok - r.err)) / Math.max(1, r.total) : 0;
      const errW = r.total ? barW * r.err / r.total : 0;
      const bar = `<rect x="${barX}" y="${barY}" width="${okW.toFixed(1)}" height="9" fill="${r.col}" rx="2"/>
        <rect x="${barX + okW}" y="${barY}" width="${errW.toFixed(1)}" height="9" fill="#e06048" rx="0"/>`;
      // fallback ribbon
      const fb = r.fallbacks ? `<g class="sd-fb">${Array.from({ length: Math.min(4, r.fallbacks) }, (_, f) =>
        `<path d="M ${barX + f * 7} ${barY + 14} l 5 -4 l 5 4" stroke="var(--amber)" stroke-width="1.2" fill="none"/>`).join("")}
        <text x="${barX + Math.min(4, r.fallbacks) * 7 + 12}" y="${barY + 16}" class="sd-fbn">${r.fallbacks} 次回退</text></g>` : "";

      return `<g class="sd-lane">
        ${track}${arc}${needle}
        <text x="${cx}" y="${cy + 3.5}" text-anchor="middle" class="sd-rate">${Math.round(r.okRate * 100)}</text>
        <text x="${barX}" y="${barY - 4}" class="sd-name">${esc(r.name)}</text>
        ${bar}${fb}
        <text x="${W - 16}" y="${cy + 3}" class="sd-ms" text-anchor="end">${r.meanMs ? Math.round(r.meanMs) + "ms" : "—"}</text>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const totOk = rows.reduce((a, r) => a + r.okRate, 0) / Math.max(1, rows.length);

    host.innerHTML = `
      <div class="sd-wrap">
        <div class="sd-head"><b>SCORECARD</b><span>弧=成功率 针=延迟 V=回退 · 均健康 ${(totOk * 100).toFixed(0)}%</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="var(--card)" rx="10"/>
          ${cards}
          <g class="sd-foot"><text x="16" y="${H - 18}" class="sd-k">${fmt(k.tokens)}</text>
            <text x="120" y="${H - 18}" class="sd-ksub">今日 tokens · ${rows.length} 服务商 · ${logs.length} 日志</text></g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "计分卡", eyebrow: "SCORECARD", render };
})();
