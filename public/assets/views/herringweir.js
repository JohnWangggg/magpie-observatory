/* ------------------------------------------------------------- herringweir
 * Herringweir view — a tidal flat of stake weirs, one per provider.
 * Net bunt sag = burn%; a fish in the pocket for live sessions; a
 * snapped stake marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "herringweir";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const flatY = H * .78;

    const rows = [];
    quotas.forEach(q => {
      const prov = q.provider || q.name || "?";
      const live = sessions.filter(s => (s.provider || "").toLowerCase().includes(String(prov).split(" ")[0].toLowerCase())).length;
      const err = logs.slice(-30).some(l => l.provider === prov && l.status === "err");
      (q.windows || []).forEach(w => {
        rows.push({ prov, name: w.name, used: w.used || 0, left: Math.max(0, 100 - (w.used || 0)), live, err, col: metaOf(prov).color || "#8b7cf6" });
      });
    });
    const top = rows.slice(0, 5);
    if (!top.length) { host.innerHTML = `<div class="hw-empty">暂无鱼堰</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // tidal flat — wet sand
    g += `<rect y="${flatY}" width="${W}" height="${H - flatY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 26) g += `<ellipse cx="${x + 10}" cy="${flatY + 12}" rx="6" ry="2" fill="var(--line)" opacity=".3"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const weirW = seg * .7;
      const weirH = 44 + (r.used / 100) * 30;
      const weirY = flatY - weirH;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // stakes
      const stakes = 5;
      for (let s = 0; s < stakes; s++) {
        const sx = x - weirW / 2 + (s / (stakes - 1)) * weirW;
        const bend = r.err && s === Math.floor(stakes / 2) ? 5 : 0;
        g += `<line x1="${sx.toFixed(0)}" y1="${flatY}" x2="${(sx + bend).toFixed(0)}" y2="${weirY}" stroke="${r.err && s === Math.floor(stakes / 2) ? "var(--red)" : r.col}" stroke-width="2"/>`;
      }
      // net hung between stakes — sags with burn%
      const sag = 6 + (r.used / 100) * 14;
      g += `<path d="M ${x - weirW / 2} ${weirY} Q ${x} ${weirY + sag} ${x + weirW / 2} ${weirY}" fill="none" stroke="${tint}" stroke-width="1.4" opacity=".7"/>`;
      g += `<path d="M ${x - weirW / 2} ${weirY + 6} Q ${x} ${weirY + sag + 6} ${x + weirW / 2} ${weirY + 6}" fill="none" stroke="${tint}" stroke-width=".8" opacity=".5"/>`;
      // pocket at centre
      g += `<ellipse cx="${x}" cy="${weirY + sag}" rx="10" ry="5" fill="${tint}" opacity=".5"/>`;
      // fish in pocket for live sessions
      if (r.live) {
        g += `<g class="hw-fish" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <ellipse cx="${x - 2}" cy="${weirY + sag}" rx="6" ry="3" fill="${r.col}"/>
          <path d="M ${x + 4} ${weirY + sag} L ${x + 9} ${weirY + sag - 4} L ${x + 9} ${weirY + sag + 4} Z" fill="${r.col}"/>
        </g>`;
      }
      g += `<text x="${x}" y="${flatY + 18}" text-anchor="middle" class="hw-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="hw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "鱼堰", eyebrow: "QUOTA HERRINGWEIR", render };
})();
