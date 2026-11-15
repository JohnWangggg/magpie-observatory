/* ------------------------------------------------------------------ clough
 * Clough view — a row of sluice gates in a leat, one per provider.
 * Water backed up behind the board = remaining quota; a paddle
 * lifting for live sessions; a warped board marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "clough";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const leatY = H * .78;

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
    if (!top.length) { host.innerHTML = `<div class="co-empty">暂无闸板</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // leat bed
    g += `<rect y="${leatY}" width="${W}" height="${H - leatY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 24) g += `<path d="M ${x} ${leatY + 8} q 12 -4 24 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".4"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const gateW = seg * .6;
      const gateH = 46;
      const gateY = leatY - gateH;
      const waterH = gateH * .6 * (r.left / 100);
      const waterY = leatY - waterH;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // gate posts
      g += `<rect x="${x - gateW / 2}" y="${gateY}" width="8" height="${gateH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      g += `<rect x="${x + gateW / 2 - 8}" y="${gateY}" width="8" height="${gateH}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      // top beam
      g += `<rect x="${x - gateW / 2}" y="${gateY - 4}" width="${gateW}" height="6" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // water backed up behind gate — left side
      g += `<rect x="${x - gateW / 2 + 8}" y="${waterY.toFixed(0)}" width="${gateW * .3}" height="${waterH.toFixed(0)}" fill="${tint}" opacity=".4"/>`;
      g += `<path d="M ${x - gateW / 2 + 8} ${waterY.toFixed(0)} q ${gateW * .1} -3 ${gateW * .2} 0 t ${gateW * .2} 0" stroke="${tint}" stroke-width="1.2" fill="none" opacity=".7"/>`;
      // gate boards — vertical planks, count by burn
      const boards = Math.min(4, Math.ceil(r.used / 25));
      for (let b = 0; b < boards; b++) {
        const bx = x - gateW * .2 + b * (gateW * .4 / 3);
        g += `<rect x="${bx.toFixed(0)}" y="${gateY + 4}" width="${gateW * .12}" height="${gateH - 8}" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1" ${r.err && b === 1 ? 'stroke-dasharray="3 2"' : ""}/>`;
      }
      // paddle lifting for live sessions — rack and pinion
      if (r.live) {
        g += `<g class="co-paddle" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <rect x="${x + gateW / 4}" y="${gateY - 12}" width="6" height="10" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="${x + gateW / 4 + 3}" y1="${gateY - 12}" x2="${x + gateW / 4 + 3}" y2="${gateY - 20}" stroke="${r.col}" stroke-width="1.2"/>
          <circle cx="${x + gateW / 4 + 3}" cy="${gateY - 22}" r="3" fill="${r.col}" opacity=".8"/>
        </g>`;
      }
      // warped board on errors
      if (r.err) g += `<path d="M ${x - gateW * .15} ${gateY + 10} L ${x + gateW * .05} ${gateY + 24} L ${x - gateW * .1} ${gateY + 38}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${leatY + 18}" text-anchor="middle" class="co-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="co-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "闸阀", eyebrow: "QUOTA CLOUGH", render };
})();
