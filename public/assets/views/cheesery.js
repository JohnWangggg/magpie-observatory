/* ---------------------------------------------------------------- cheesery
 * Cheesery view — a row of cheese presses, one per provider. Curd
 * height under the screw = remaining quota; whey drips for live
 * sessions; a cracked hoop marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cheesery";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const benchY = H * .8;

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
    if (!top.length) { host.innerHTML = `<div class="ch-empty">暂无奶酪机</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // bench
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 26) g += `<line x1="${x}" y1="${benchY}" x2="${x}" y2="${H}" stroke="var(--line)" stroke-width=".7" opacity=".4"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const hoopW = seg * .5;
      const hoopH = 40;
      const hoopY = benchY - hoopH;
      const curdH = hoopH * .6 * (r.left / 100);
      const curdY = hoopY + hoopH - curdH;
      const tint = r.left > 50 ? "#e8d8a0" : r.left > 20 ? "#d0b868" : "#a08848";
      // frame — two posts + top beam with screw
      g += `<line x1="${x - hoopW / 2}" y1="${benchY}" x2="${x - hoopW / 2}" y2="${hoopY - 20}" stroke="${r.col}" stroke-width="2.4"/>`;
      g += `<line x1="${x + hoopW / 2}" y1="${benchY}" x2="${x + hoopW / 2}" y2="${hoopY - 20}" stroke="${r.col}" stroke-width="2.4"/>`;
      g += `<rect x="${x - hoopW / 2 - 4}" y="${hoopY - 24}" width="${hoopW + 8}" height="8" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // screw
      g += `<line x1="${x}" y1="${hoopY - 24}" x2="${x}" y2="${curdY - 6}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<rect x="${x - 4}" y="${hoopY - 28}" width="8" height="4" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      // hoop
      g += `<rect x="${x - hoopW / 2 + 6}" y="${hoopY}" width="${hoopW - 12}" height="${hoopH}" rx="2" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4"/>`;
      // curd inside
      g += `<rect x="${x - hoopW / 2 + 8}" y="${curdY.toFixed(0)}" width="${hoopW - 16}" height="${curdH.toFixed(0)}" fill="${tint}" opacity=".8"/>`;
      // whey drips for live sessions
      if (r.live) {
        g += `<g class="ch-drip" style="animation-delay: ${(i * .4).toFixed(1)}s">
          <line x1="${x - hoopW / 2 - 6}" y1="${hoopY + hoopH * .6}" x2="${x - hoopW / 2 - 6}" y2="${hoopY + hoopH * .8}" stroke="#d0c890" stroke-width="1"/>
          <circle cx="${x - hoopW / 2 - 6}" cy="${hoopY + hoopH * .85}" r="1.5" fill="#d0c890"/>
        </g>`;
      }
      // cracked hoop on errors
      if (r.err) g += `<path d="M ${x - hoopW * .2} ${hoopY} L ${x + hoopW * .1} ${hoopY + hoopH * .4} L ${x - hoopW * .05} ${hoopY + hoopH * .7}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${benchY + 18}" text-anchor="middle" class="ch-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="ch-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "奶酪坊", eyebrow: "QUOTA CHEESERY", render };
})();
