/* --------------------------------------------------------- charcoalmeiler
 * Charcoal meiler view — a row of earth-covered clamps, one per
 * provider. Vent holes smoking = tokens; a collier with a rake
 * for live sessions; a blowout marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "charcoalmeiler";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="cm-empty">暂无炭堆</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // clearing
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const meilW = seg * .7;
      const meilH = 40;
      const meilY = groundY - meilH;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#a08060" : "#786048";
      // meiler mound — half-ellipse of earth
      g += `<ellipse cx="${x}" cy="${groundY}" rx="${meilW / 2}" ry="${meilH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // vent holes around top — count by tokens
      const vents = Math.min(5, Math.ceil(r.tok / maxTok * 5));
      for (let v = 0; v < vents; v++) {
        const a = -Math.PI / 2 + (v - (vents - 1) / 2) * .4;
        const vx = x + Math.cos(a) * meilW * .35;
        const vy = meilY + Math.sin(a) * meilH * .3;
        g += `<circle cx="${vx.toFixed(0)}" cy="${vy.toFixed(0)}" r="2.5" fill="var(--bg)" stroke="${r.col}" stroke-width="1"/>`;
        if (r.live) g += `<circle class="cm-smoke" cx="${vx.toFixed(0)}" cy="${vy.toFixed(0)}" r="1.5" fill="${r.col}" opacity=".5" style="animation-delay: ${(i * .3 + v * .15).toFixed(1)}s"/>`;
      }
      // central chimney post
      g += `<rect x="${x - 3}" y="${meilY - 12}" width="6" height="14" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // collier with rake for live sessions
      if (r.live) {
        g += `<g class="cm-collier" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + meilW / 2 + 12} ${groundY - 8})">
          <circle r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="4" width="8" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="2" x2="10" y2="-4" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // blowout on errors — flame at side
      if (r.err) g += `<path d="M ${x + meilW * .3} ${groundY - 6} q 4 -8 0 -14 q -4 6 0 14" fill="var(--red)" opacity=".5"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="cm-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "炭堆", eyebrow: "PROVIDER CHARCOAL MEILER", render };
})();
