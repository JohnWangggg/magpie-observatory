/* --------------------------------------------------------------- caskhouse
 * Caskhouse view — a cellar rack of casks, one per provider. Hoop
 * count = remaining quota; a drip from the bung for live sessions;
 * a sprung stave marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "caskhouse";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .82;

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
    if (!top.length) { host.innerHTML = `<div class="ck-empty">暂无酒桶</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // cellar floor + rack rails
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 26) g += `<line x1="${x}" y1="${floorY}" x2="${x}" y2="${H}" stroke="var(--line)" stroke-width=".7" opacity=".4"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const caskW = seg * .44;
      const caskH = 44;
      const caskY = floorY - caskH;
      const tint = r.left > 50 ? "#a07848" : r.left > 20 ? "#885838" : "#683828";
      // cask body — bulged profile
      g += `<path d="M ${x - caskW / 2} ${caskY} Q ${x - caskW / 2 - 6} ${caskY + caskH / 2} ${x - caskW / 2} ${caskY + caskH} L ${x + caskW / 2} ${caskY + caskH} Q ${x + caskW / 2 + 6} ${caskY + caskH / 2} ${x + caskW / 2} ${caskY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6"/>`;
      // staves
      for (let s = 0; s < 6; s++) {
        const sx = x - caskW * .4 + (s / 5) * caskW * .8;
        g += `<line x1="${sx.toFixed(0)}" y1="${caskY + 2}" x2="${sx.toFixed(0)}" y2="${caskY + caskH - 2}" stroke="${r.col}" stroke-width=".7" opacity=".4"/>`;
      }
      // hoops — count by remaining quota
      const hoops = Math.min(4, Math.ceil(r.left / 25));
      for (let h = 0; h < hoops; h++) {
        const hy = caskY + (h / (hoops - 1 || 1)) * (caskH - 8) + 4;
        g += `<ellipse cx="${x}" cy="${hy.toFixed(0)}" rx="${caskW / 2 + 4}" ry="3" fill="none" stroke="${tint}" stroke-width="1.6" opacity=".8"/>`;
      }
      // bung on top with drip for live sessions
      if (r.live) {
        g += `<g class="ck-drip" style="animation-delay: ${(i * .4).toFixed(1)}s">
          <circle cx="${x}" cy="${caskY - 4}" r="3" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>
          <line x1="${x}" y1="${caskY - 4}" x2="${x}" y2="${caskY + 4}" stroke="${tint}" stroke-width="1" opacity=".7"/>
        </g>`;
      }
      // sprung stave on errors
      if (r.err) g += `<path d="M ${x + caskW * .2} ${caskY + 4} L ${x + caskW * .25} ${caskY + caskH * .5} L ${x + caskW * .15} ${caskY + caskH - 4}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="ck-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ck-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "酒桶", eyebrow: "QUOTA CASKHOUSE", render };
})();
