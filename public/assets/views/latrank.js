/* ------------------------------------------------------------------ latrank
 * Latrank — latency leaderboard: every provider lane is a
 * podium bar where bar length = mean TTFT and a second thin
 * bar = TPS. Podium medals on the fastest three; slowest
 * lane gets an amber snail. Sessions are lane judges.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "latrank";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const logs = ctx.data.logs || [];
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const byProv = {};
    const push = (p, ttft, tps) => {
      if (!p) return;
      byProv[p] = byProv[p] || { ttft: [], tps: [], n: 0 };
      if (ttft) byProv[p].ttft.push(ttft);
      if (tps) byProv[p].tps.push(tps);
      byProv[p].n += 1;
    };
    logs.forEach(r => push(r.provider, r.ttft, r.tps));
    sessions.forEach(s => (s.tries || []).forEach(t => push(t.provider, t.ms, 0)));

    const rows = Object.entries(byProv).map(([p, v]) => {
      const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
      const m = metaOf(pmeta, p);
      return { prov: p, name: m.name || p, col: m.color || "#8ab4f8", ttft: mean(v.ttft), tps: mean(v.tps), n: v.n };
    }).filter(r => r.ttft > 0 || r.tps > 0).sort((a, b) => a.ttft - b.ttft).slice(0, 7);

    const W = Math.max(640, host.clientWidth || 760), H = Math.max(280, (host.clientHeight || 360) - 32), TOP = 28, BOT = 36;
    const rowH = (H - TOP - BOT) / Math.max(1, rows.length);
    const maxT = Math.max(...rows.map(r => r.ttft), 1);
    const maxP = Math.max(...rows.map(r => r.tps), 1);
    const barX = Math.max(128, Math.min(210, W * 0.22)), barW = W - barX - 92;

    const medals = ["🥇", "🥈", "🥉"];
    const lanes = rows.map((r, i) => {
      const y = TOP + i * rowH + rowH / 2;
      const w1 = Math.max(2, (r.ttft / maxT) * barW);
      const w2 = Math.max(1, (r.tps / maxP) * barW);
      const slowest = i === rows.length - 1 && rows.length > 3;
      const medal = i < 3 ? `<text x="${barX - 76}" y="${y + 4}" font-size="11">${medals[i]}</text>` : "";
      const snail = slowest ? `<g class="lr-snail"><ellipse cx="${barX + w1 + 10}" cy="${y - 2}" rx="6" ry="4" fill="var(--amber)" opacity=".85"/>
        <path d="M ${barX + w1 + 6} ${y} q 5 4 10 0" stroke="var(--amber)" stroke-width="1.4" fill="none"/>
        <line x1="${barX + w1 + 8}" y1="${y - 8}" x2="${barX + w1 + 8}" y2="${y - 5}" stroke="var(--amber)" stroke-width=".8"/>
        <line x1="${barX + w1 + 13}" y1="${y - 8}" x2="${barX + w1 + 13}" y2="${y - 5}" stroke="var(--amber)" stroke-width=".8"/>
        <circle cx="${barX + w1 + 8}" cy="${y - 8.5}" r="1" fill="var(--amber)"/><circle cx="${barX + w1 + 13}" cy="${y - 8.5}" r="1" fill="var(--amber)"/></g>` : "";
      return `<g class="lr-lane">
        ${medal}
        <text x="${barX - 8}" y="${y + 3}" class="lr-name" text-anchor="end">${esc(r.name.slice(0, 11))}</text>
        <rect x="${barX}" y="${y - 7}" width="${w1.toFixed(1)}" height="8" rx="2" fill="${r.col}"/>
        <rect x="${barX}" y="${y + 3}" width="${w2.toFixed(1)}" height="4" rx="2" fill="${r.col}" opacity=".45"/>
        <text x="${W - 16}" y="${y - 2}" class="lr-ttft" text-anchor="end">${Math.round(r.ttft)}ms</text>
        <text x="${W - 16}" y="${y + 9}" class="lr-tps" text-anchor="end">${r.tps ? r.tps.toFixed(0) + "t/s" : "—"}</text>
        ${snail}
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const fastest = rows[0];

    host.innerHTML = `
      <div class="lr-wrap">
        <div class="lr-head"><b>LATRANK</b><span>粗=TTFT 细=TPS${fastest ? " · 最快 " + esc(fastest.name) : ""}</span></div>
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="var(--card)" rx="10"/>
          <line x1="${barX}" y1="${TOP - 10}" x2="${barX}" y2="${H - BOT + 8}" stroke="var(--line-2)" stroke-width=".6"/>
          ${lanes}
          <text x="${barX}" y="${H - 24}" class="lr-legend">— TTFT</text>
          <text x="${barX + 70}" y="${H - 24}" class="lr-legend" opacity=".5">— TPS</text>
          <text x="${W - 16}" y="${H - 24}" class="lr-k" text-anchor="end">${fmt(k.tokens)}</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "延迟榜", eyebrow: "LATRANK", render };
})();
