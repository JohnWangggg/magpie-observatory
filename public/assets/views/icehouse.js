/* ---------------------------------------------------------------- icehouse
 * Icehouse view — a row of domed ice pits, one per provider. Ice
 * blocks packed in straw = quota left; an iceman lowering a block
 * for live sessions; a thawed drain marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "icehouse";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * .80;

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
    if (!top.length) { host.innerHTML = `<div class="ih-empty">暂无冰窖</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ground with hatch marks
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;
    for (let x = 6; x < W; x += 18) g += `<path d="M ${x} ${groundY} l 2 -4 l 2 4" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const domeR = seg * .3;
      const domeY = groundY;
      const tint = r.left > 50 ? "#88c8e8" : r.left > 20 ? "#a8b0c0" : "#e06048";
      // dome — half-circle icehouse mound
      g += `<path d="M ${x - domeR} ${domeY} A ${domeR} ${domeR * .9} 0 0 1 ${x + domeR} ${domeY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      // entrance tunnel on the side
      g += `<rect x="${x + domeR - 4}" y="${domeY - 14}" width="14" height="14" rx="2" fill="var(--bg)" stroke="${r.col}" stroke-width="1"/>`;
      // ice blocks inside — visible through a cutaway, count by quota
      const blocks = Math.min(4, Math.ceil(r.left / 25));
      for (let b = 0; b < blocks; b++) {
        g += `<rect x="${x - domeR * .5}" y="${(domeY - 8 - b * 9).toFixed(0)}" width="${domeR * .7}" height="7" fill="${tint}" stroke="${r.col}" stroke-width=".8" opacity=".8"/>`;
      }
      // straw packing line
      g += `<path d="M ${x - domeR * .5} ${domeY - 8 - blocks * 9} h ${domeR * .7}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="2 2" opacity=".6"/>`;
      // iceman lowering a block for live sessions
      if (r.live) {
        g += `<g class="ih-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - domeR - 12} ${groundY - 10})">
          <circle r="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-4" y="4" width="8" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="5" y="-2" width="7" height="6" fill="${tint}" stroke="${r.col}" stroke-width=".8"/>
        </g>`;
      }
      // thawed drain on errors — melt pool
      if (r.err) g += `<ellipse cx="${x - domeR * .4}" cy="${domeY + 4}" rx="10" ry="3" fill="var(--red)" opacity=".4"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="ih-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ih-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "冰窖", eyebrow: "QUOTA ICEHOUSE", render };
})();
