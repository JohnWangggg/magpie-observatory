/* ----------------------------------------------------------------- steambend
 * Steambend view — a row of steam boxes, one per provider.
 * Bent strips clamped to formers = tokens; a bender working a
 * spring pole for live sessions; a sprung bend marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "steambend";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="sb-empty">暂无蒸弯坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // bending-floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wood = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d0a868" : "#a88248";
      const boxW = seg * .45;
      const boxY = floorY - 30;
      // the steam box — a long pipe with end caps, sagging slightly
      g += `<rect x="${x - boxW / 2}" y="${boxY}" width="${boxW}" height="12" rx="6" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<ellipse cx="${x - boxW / 2}" cy="${boxY + 6}" rx="3" ry="5" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<ellipse cx="${x + boxW / 2}" cy="${boxY + 6}" rx="3" ry="5" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      // steam wisps off the box
      g += `<path d="M ${x - boxW * .3} ${boxY - 4} q 3 -8 6 -12" stroke="var(--muted)" stroke-width="1" fill="none" stroke-dasharray="3 3" opacity=".7"/>`;
      g += `<path d="M ${x + boxW * .1} ${boxY - 6} q -3 -8 -6 -12" stroke="var(--muted)" stroke-width="1" fill="none" stroke-dasharray="3 3" opacity=".6"/>`;
      // former — a curved block beside the box
      g += `<path d="M ${x + boxW * .3} ${floorY - 4} q ${boxW * .15} -18 ${boxW * .3} 0" fill="none" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.8"/>`;
      // bent strips against the former — count by tokens
      const strips = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < strips; s++) {
        g += `<path d="M ${x + boxW * .32} ${floorY - 6 - s * 3} q ${boxW * .14} -14 ${boxW * .28} 0" fill="none" stroke="${wood}" stroke-width="1.4" opacity="${.95 - s * .1}"/>`;
      }
      // clamps on the former
      for (let s = 0; s < strips; s++) {
        g += `<line x1="${x + boxW * .32 + s * 4}" y1="${floorY - 14}" x2="${x + boxW * .36 + s * 4}" y2="${floorY - 6}" stroke="${r.col}" stroke-width="1.2"/>`;
      }
      // bender at a spring pole for live sessions — leaning on a strap
      if (r.live) {
        g += `<g class="sb-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - boxW * .42} ${boxY - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="16" y2="4" stroke="${r.col}" stroke-width="1.4"/>
        </g>`;
      }
      // sprung bend — a snapped strip on errors
      if (r.err) g += `<line x1="${x + boxW * .4}" y1="${floorY - 10}" x2="${x + boxW * .44}" y2="${floorY - 2}" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="sb-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "蒸弯坊", eyebrow: "PROVIDER STEAMBEND", render };
})();
