/* --------------------------------------------------------------- driftline
 * Driftline view — wind-sculpted snow ridges, one per provider.
 * Ridge height = remaining quota; snow grains stream off the crest
 * for live sessions; a crevasse shadow marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "driftline";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const horizonY = H * 0.82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="dl-empty">暂无雪脊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // snow field
    g += `<rect y="${horizonY}" width="${W}" height="${H - horizonY}" fill="var(--card-2)"/>`;
    g += `<line y="${horizonY}" x2="${W}" y2="${horizonY}" stroke="var(--line)" stroke-width="1.4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const driftH = 14 + (r.tok / maxTok) * (horizonY - 60);
      const crestY = horizonY - driftH;
      const driftW = seg * .8;
      const tint = r.tok > maxTok * .5 ? "#8b7cf6" : r.tok > maxTok * .2 ? "#e8c860" : "#e06048";
      // drift silhouette — asymmetric wind-sculpted ridge
      g += `<path d="M ${(x - driftW / 2).toFixed(0)} ${horizonY} Q ${(x - driftW * .15).toFixed(0)} ${(horizonY - driftH * .5).toFixed(0)} ${x} ${crestY.toFixed(0)} Q ${(x + driftW * .2).toFixed(0)} ${(horizonY - driftH * .3).toFixed(0)} ${(x + driftW / 2).toFixed(0)} ${horizonY}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      // wind streaks — grains blowing off crest
      for (let s = 0; s < Math.min(3, r.live); s++) {
        const sx = x + (s - 1) * 8, sy = crestY + 4 + s * 6;
        g += `<line x1="${sx.toFixed(0)}" y1="${sy.toFixed(0)}" x2="${(sx + 14 + s * 4).toFixed(0)}" y2="${(sy - 2).toFixed(0)}" stroke="${r.col}" stroke-width="1" opacity=".7">
          <animate attributeName="x2" values="${(sx + 8).toFixed(0)};${(sx + 22).toFixed(0)}" dur="${.8 + s * .2}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".7;0" dur="${.8 + s * .2}s" repeatCount="indefinite"/>
        </line>`;
      }
      // crevasse shadow on errors — dark wedge under crest
      if (r.err) {
        g += `<path d="M ${(x - 6).toFixed(0)} ${crestY + 4} L ${x} ${horizonY - 2} L ${(x + 6).toFixed(0)} ${crestY + 4} Z" fill="var(--red)" opacity=".6"/>`;
      }
      g += `<text x="${x}" y="${horizonY + 22}" text-anchor="middle" class="dl-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="dl-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "雪脊", eyebrow: "PROVIDER DRIFTLINE", render };
})();
