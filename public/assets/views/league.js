/* ------------------------------------------------------------------ league
 * League — model standings: horizontal bars = token share,
 * the number on the right = swap rate (requests that asked
 * for this model but were served by another). Crown on the
 * leader; a turnover arrow on the most-swapped lane.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "league";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const models = (ctx.data.models || []).slice(0, 7);
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []);
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    // swap rate per model: requested model X, served model Y ≠ X
    const asked = {}, served = {}, swapped = {};
    sessions.forEach(s => {
      const req = s.requested || s.model;
      const got = s.served || s.model;
      if (!req) return;
      asked[req] = (asked[req] || 0) + 1;
      if (got && got !== req) swapped[req] = (swapped[req] || 0) + 1;
      if (got) served[got] = (served[got] || 0) + 1;
    });
    // fall back to logs when sessions lack requested/served
    if (!Object.keys(asked).length) {
      logs.forEach(r => { if (r.model) asked[r.model] = (asked[r.model] || 0) + 1; });
    }

    const W = Math.max(640, host.clientWidth || 760), H = Math.max(280, (host.clientHeight || 360) - 32), TOP = 24, BOT = 36;
    const rowH = (H - TOP - BOT) / Math.max(1, models.length);
    const barX = Math.max(150, Math.min(240, W * 0.26)), barW = W - barX - 88;
    const maxShare = Math.max(...models.map(m => m.share || 0), 1);

    const rows = models.map((m, i) => {
      const y = TOP + i * rowH + rowH / 2;
      const m2 = metaOf(pmeta, m.provider);
      const col = m2.color || "#8ab4f8";
      const share = m.share || 0;
      const w = (share / maxShare) * barW;
      const aN = asked[m.name] || 0;
      const swapN = swapped[m.name] || 0;
      const swapPct = aN ? Math.round(swapN / aN * 100) : 0;
      const crown = i === 0 ? `<text x="${barX - 14}" y="${y - 9}" font-size="11" text-anchor="middle">👑</text>` : "";
      const swapIcon = swapPct >= 40 ? `<g class="lj-swap">
          <path d="M ${barX + w + 8} ${y - 6} q 7 -4 12 0 l -2 -3 M ${barX + w + 20} ${y - 6} q -7 4 -12 0 l 2 3" stroke="var(--amber)" stroke-width="1.4" fill="none"/>
          <text x="${barX + w + 26}" y="${y - 3}" class="lj-swapp">${swapPct}%</text></g>` : "";
      // served-by chip: who covers for this model
      const cover = swapN > 0 ? `<text x="${barX + 4}" y="${y + 3.5}" class="lj-cover">→${esc((Object.entries(served).sort((a, b) => b[1] - a[1])[0] || ["?"])[0].slice(0, 14))}</text>` : "";
      return `<g class="lj-lane">
        ${crown}
        <text x="${barX - 8}" y="${y - 4}" class="lj-name" text-anchor="end">${esc(m.name.slice(0, 16))}</text>
        <text x="${barX - 8}" y="${y + 7}" class="lj-prov" text-anchor="end">${esc((m2.name || m.provider).slice(0, 10))}</text>
        <rect x="${barX}" y="${y - 7}" width="${w.toFixed(1)}" height="13" rx="2.5" fill="${col}"/>
        <rect x="${barX}" y="${y - 7}" width="${w.toFixed(1)}" height="13" rx="2.5" fill="url(#lj-shine)" opacity=".25"/>
        <text x="${barX + w + 4}" y="${y + 4}" class="lj-share">${share}%</text>
        ${cover}${swapIcon}
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const totalSwap = Object.values(swapped).reduce((a, b) => a + b, 0);

    host.innerHTML = `
      <div class="lj-wrap">
        <div class="lj-head"><b>LEAGUE</b><span>模型份额榜${totalSwap ? " · " + totalSwap + " 次掉包" : " · 0 掉包"}</span></div>
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          <defs><linearGradient id="lj-shine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fff" stop-opacity=".8"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/>
          </linearGradient></defs>
          <rect x="0" y="0" width="${W}" height="${H}" fill="var(--card)" rx="10"/>
          ${rows}
          <text x="16" y="${H - 20}" class="lj-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 20}" class="lj-ksub" text-anchor="end">% = token 份额 · ↺% = 被替代率</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "联赛", eyebrow: "LEAGUE", render };
})();
