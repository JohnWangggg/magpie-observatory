/* --------------------------------------------------------------- menagerie
 * Menagerie view — a travelling show of animal cages, one per
 * provider. Bars = quota window; beast silhouette count = tokens;
 * a keeper at the door for live sessions; a sprung bar marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "menagerie";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .8;

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
    if (!top.length) { host.innerHTML = `<div class="mg-empty">暂无兽笼</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // sawdust floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 22) g += `<ellipse cx="${x + 8}" cy="${floorY + 10}" rx="3" ry="1.5" fill="var(--line)" opacity=".3"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const cageW = seg * .74;
      const cageH = 60 + (r.used / 100) * 40;
      const cageY = floorY - cageH;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // cage frame
      g += `<rect x="${x - cageW / 2}" y="${cageY}" width="${cageW}" height="${cageH}" rx="3" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.8"/>`;
      // bars — sprung (bent) on errors
      const bars = 6;
      for (let b = 0; b <= bars; b++) {
        const bx = x - cageW / 2 + (b / bars) * cageW;
        const bend = r.err && b === Math.floor(bars / 2) ? 4 : 0;
        g += `<line x1="${bx.toFixed(0)}" y1="${cageY}" x2="${(bx + bend).toFixed(0)}" y2="${floorY}" stroke="${r.err && b === Math.floor(bars / 2) ? "var(--red)" : r.col}" stroke-width="1.6" opacity=".8"/>`;
      }
      // top cage rail
      g += `<rect x="${x - cageW / 2}" y="${cageY - 4}" width="${cageW}" height="6" rx="2" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      // beast silhouette inside — size by tokens
      const beastS = 8 + (r.used / 100) * 8;
      g += `<ellipse cx="${x}" cy="${floorY - cageH * .35}" rx="${beastS}" ry="${beastS * .8}" fill="${tint}" opacity=".8"/>`;
      g += `<circle cx="${x + beastS * .6}" cy="${floorY - cageH * .35 - beastS * .5}" r="${beastS * .35}" fill="${tint}" opacity=".8"/>`;
      // keeper at door for live sessions
      if (r.live) {
        g += `<g class="mg-keeper" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <rect x="${x + cageW / 2 + 4}" y="${floorY - 18}" width="8" height="18" rx="2" fill="${r.col}" opacity=".8"/>
          <circle cx="${x + cageW / 2 + 8}" cy="${floorY - 24}" r="4" fill="${r.col}" opacity=".8"/>
        </g>`;
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="mg-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="mg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "兽苑", eyebrow: "QUOTA MENAGERIE", render };
})();
