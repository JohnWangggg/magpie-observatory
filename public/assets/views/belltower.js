/* -------------------------------------------------------------- belltower
 * Belltower view — a belfry of quota windows. Each window hangs a bell:
 * clapper swing speed tracks burn%, bell body flashes red when the
 * window is nearly spent.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "belltower";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;

    const rows = [];
    quotas.forEach(q => {
      const prov = q.provider || q.name || "?";
      const live = sessions.filter(s => (s.provider || "").toLowerCase().includes(String(prov).split(" ")[0].toLowerCase())).length;
      (q.windows || []).forEach(w => {
        rows.push({ prov, name: w.name, used: w.used || 0, left: Math.max(0, 100 - (w.used || 0)), live, col: metaOf(prov).color || "#8b7cf6" });
      });
    });
    const top = rows.slice(0, 6);
    if (!top.length) { host.innerHTML = `<div class="bt-empty">暂无铃</div>`; return; }

    // bell frame: an arch beam across the top
    let g = `<line x1="0" y1="40" x2="${W}" y2="40" stroke="var(--line)" stroke-width="2.4"/>`;
    g += `<rect x="0" y="34" width="${W}" height="4" fill="var(--card-2)" stroke="var(--line)" stroke-width=".8"/>`;

    top.forEach((r, i) => {
      const cx = (W / (top.length + 1)) * (i + 1);
      const hang = 46, bodyH = 42 + r.used * .3, bw = 36 + r.used * .12;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";

      // rope + yoke
      g += `<line x1="${cx}" y1="40" x2="${cx}" y2="${hang}" stroke="var(--faint)" stroke-width="1.4"/>`;
      g += `<rect x="${cx - 14}" y="${hang - 6}" width="28" height="8" rx="2" fill="var(--card-2)" stroke="${tint}" stroke-width="1.2"/>`;

      // bell body — flared skirt shape
      const fl = bw / 2;
      g += `<g class="bt-bell" data-prov="${esc(r.prov)}" style="transform-origin: ${cx}px ${hang}px; animation-duration: ${(0.7 + (100 - r.used) / 100 * 1.8).toFixed(2)}s;">
        <path d="M ${cx - fl * .4} ${hang} Q ${cx - fl} ${hang + bodyH * .5} ${cx - fl} ${hang + bodyH} L ${cx + fl} ${hang + bodyH} Q ${cx + fl} ${hang + bodyH * .5} ${cx + fl * .4} ${hang} Z"
              fill="${tint}" opacity=".9"/>
        <circle cx="${cx}" cy="${hang + bodyH + 6}" r="5" fill="${tint}"/>
      </g>`;

      // name + burn%
      g += `<text x="${cx}" y="${hang + bodyH + 24}" text-anchor="middle" class="bt-lab">${esc(r.prov.split("/").pop().slice(0, 9))} ${r.used}%${r.live ? "·" + r.live : ""}</text>`;
      g += `<text x="${cx}" y="${hang + bodyH + 36}" text-anchor="middle" class="bt-sub">${esc(r.name)}</text>`;
    });

    host.innerHTML = `<svg class="bt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "钟楼铃", eyebrow: "QUOTA BELLS", render };
})();
