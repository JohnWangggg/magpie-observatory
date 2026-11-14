/* ------------------------------------------------------------------ galton
 * Galton board — the request stream as a bean machine:
 *   sessions drop as balls through a staggered pin field and settle into
 *   per-provider bins; bin height = tokens routed through that provider.
 *   Ball colour = agent, dimmed when the session failed.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "galton";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 12);
    const quotas = ctx.data.quotas || [];
    const ameta = ctx.agentMeta || {};
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const n = sessions.length;

    // one bin per provider that actually showed up in the quota list or
    // in a session's tries — pad to at least 4 so the board still reads.
    const provs = new Set();
    quotas.forEach(q => provs.add(q.provider));
    sessions.forEach(s => (s.tries || []).forEach(t => provs.add(t.provider)));
    const bins = Math.max(4, Math.min(8, provs.size || 4));
    const binW = W / bins;

    // token share per bin
    const tok = new Array(bins).fill(0);
    sessions.forEach((s, i) => {
      const prov = (s.tries && s.tries[0] && s.tries[0].provider) || s.provider || "";
      const idx = [...provs].indexOf(prov);
      tok[idx < 0 ? i % bins : idx % bins] += s.tokens || 0;
    });
    const maxTok = Math.max(...tok, 1);

    // pin field: 4 staggered rows between the drop slot and the bins
    const pinY0 = H * 0.22, pinRows = 4, pinGap = (H * 0.5) / pinRows;
    let pins = "";
    for (let r = 0; r < pinRows; r++) {
      const rowN = bins + (r % 2);
      const off = (r % 2) ? binW / 2 : 0;
      for (let c = 0; c < rowN + 1; c++) {
        const x = c * binW - off + (off ? 0 : binW / 2) + binW / 4;
        const y = pinY0 + r * pinGap;
        if (x < 6 || x > W - 6) continue;
        pins += `<circle class="gt-pin" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="2.4" fill="var(--line-2)"/>`;
      }
    }

    // balls: one per session, pseudo-random drop path that ends in a bin
    // weighted by that session's provider bucket; r = sqrt(tokens).
    const maxBall = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const balls = sessions.map((s, i) => {
      const prov = (s.tries && s.tries[0] && s.tries[0].provider) || s.provider || "";
      let idx = [...provs].indexOf(prov);
      if (idx < 0) idx = i % bins;
      const jitter = (i * 37 % 17) / 17 - 0.5;          // deterministic jitter
      const endX = idx * binW + binW / 2 + jitter * binW * 0.55;
      const stackH = Math.min(6, Math.round(tok[idx % bins] / maxTok * 5));
      const endY = H - 14 - stackH * 7 - (i % 3) * 3;
      const r = 3 + Math.sqrt((s.tokens || 1) / maxBall) * 4;
      const col = metaOf(ameta, s.agent).color || "#8b7cf6";
      const dim = s.status === "done" || s.status === "error";
      const mid1x = W / 2 + jitter * 60, mid1y = pinY0 - 8;
      const mid2x = endX - jitter * 40, mid2y = pinY0 + pinGap * (pinRows - 0.4);
      const d = `M${(W / 2).toFixed(0)},16 Q${mid1x.toFixed(0)},${mid1y.toFixed(0)} ${(W / 2 + jitter * 20).toFixed(0)},${pinY0.toFixed(0)} L${mid2x.toFixed(0)},${mid2y.toFixed(0)} L${endX.toFixed(0)},${endY.toFixed(0)}`;
      return `<path class="gt-drop" d="${d}" fill="none" stroke="${col}" stroke-opacity=".14" stroke-width="1" stroke-dasharray="3 4"/>
        <circle class="gt-ball${dim ? " dim" : ""}" cx="${endX.toFixed(0)}" cy="${endY.toFixed(0)}" r="${r.toFixed(1)}" fill="${col}" opacity="${dim ? ".38" : ".92"}">
          <title>${esc(s.title)} · ${esc(metaOf(ameta, s.agent).name || s.agent)} · ${s.tokens ? (s.tokens / 1e6).toFixed(1) + "M" : "—"}</title>
        </circle>`;
    }).join("");

    // bins
    const binRects = Array.from({ length: bins }, (_, i) => {
      const pct = Math.round(tok[i] / maxTok * 100);
      const h = Math.max(6, pct / 100 * (H * 0.16));
      const prov = [...provs][i] || "";
      const m = metaOf(pmeta, prov);
      const name = m.name || prov || `bin ${i + 1}`;
      return `<g>
        <rect class="gt-bin" x="${(i * binW + 3).toFixed(0)}" y="${(H - h - 4).toFixed(0)}" width="${(binW - 6).toFixed(0)}" height="${h.toFixed(0)}" rx="3" fill="var(--card-3)" stroke="var(--line-2)"/>
        <text class="gt-bin-label" x="${(i * binW + binW / 2).toFixed(0)}" y="${H - 16}" text-anchor="middle">${esc(name)}</text>
        <text class="gt-bin-pct" x="${(i * binW + binW / 2).toFixed(0)}" y="${H - 4}" text-anchor="middle">${pct}%</text>
      </g>`;
    }).join("");

    // hopper mouth
    const hopper = `<path d="M${W / 2 - 16},4 L${W / 2 - 5},14 M${W / 2 + 16},4 L${W / 2 + 5},14" stroke="var(--line-2)" stroke-width="2" stroke-linecap="round" fill="none"/>
      <circle cx="${W / 2}" cy="16" r="3" fill="var(--accent)">
        <animate attributeName="cy" values="16;${pinY0.toFixed(0)}" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0" dur="1.6s" repeatCount="indefinite"/>
      </circle>`;

    host.innerHTML = `
      <div class="gt-wrap">
        <div class="gt-head"><b>GALTON</b><span>豆袋机 · 每球=会话 · 落位=Provider份额</span></div>
        <svg class="gt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${hopper}${pins}${balls}${binRects}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "豆袋机", eyebrow: "GALTON", render };
})();
