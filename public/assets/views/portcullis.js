/* -------------------------------------------------------------- portcullis
 * Portcullis view — each quota window is a castle gate. The iron
 * lattice lowers as the window fills; live sessions walk the drawbridge
 * below as small figures. Errors splash a torch flare over the arch.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "portcullis";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const rows = [];
    quotas.forEach(q => {
      const prov = q.provider || q.name || "?";
      const live = sessions.filter(s => (s.provider || "").toLowerCase().includes(String(prov).split(" ")[0].toLowerCase())).length;
      const err = logs.slice(-30).some(l => l.provider === prov && l.status === "err");
      (q.windows || []).forEach(w => {
        rows.push({ prov, name: w.name, used: w.used || 0, left: Math.max(0, 100 - (w.used || 0)), live, err, col: metaOf(prov).color || "#8b7cf6" });
      });
    });
    const top = rows.slice(0, 4);
    if (!top.length) { host.innerHTML = `<div class="pc-empty">暂无城门</div>`; return; }

    let g = "";
    const pad = 26, colW = (W - pad * (top.length + 1)) / top.length;
    const ground = H * 0.8;

    top.forEach((r, i) => {
      const x = pad + i * (colW + pad);
      const archY = ground - 80;
      const archH = 80, archW = colW * .82;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      const gateH = (r.used / 100) * archH * .88; // how far the portcullis drops

      // stone arch
      g += `<path d="M ${x + colW * .1} ${ground} L ${x + colW * .1} ${archY + archH * .3} Q ${x + colW / 2} ${archY - archH * .1} ${x + colW * .9} ${archY + archH * .3} L ${x + colW * .9} ${ground} Z"
            fill="var(--card-2)" stroke="${tint}" stroke-width="1.8"/>`;
      // archway opening (inner hole)
      const inW = archW * .6, inH = archH * .78, inX = x + colW / 2 - inW / 2, inY = archY + archH * .1;
      g += `<path d="M ${inX} ${ground} L ${inX} ${inY + inH * .4} Q ${x + colW / 2} ${inY - inH * .12} ${inX + inW} ${inY + inH * .4} L ${inX + inW} ${ground} Z"
            fill="var(--bg)"/>`;
      // portcullis lattice — dropped by burn%
      if (gateH > 2) {
        const bars = 5;
        for (let b = 0; b < bars; b++) {
          const bx = inX + (inW / bars) * (b + 0.5);
          g += `<line x1="${bx.toFixed(0)}" y1="${inY.toFixed(0)}" x2="${bx.toFixed(0)}" y2="${(inY + gateH).toFixed(0)}" stroke="${tint}" stroke-width="1.8" opacity=".9"/>`;
          // pointed tips
          g += `<path d="M ${bx - 2} ${(inY + gateH).toFixed(0)} L ${bx} ${(inY + gateH + 6).toFixed(0)} L ${bx + 2} ${(inY + gateH).toFixed(0)} Z" fill="${tint}"/>`;
        }
        // horizontal band
        g += `<line x1="${inX.toFixed(0)}" y1="${(inY + gateH * .4).toFixed(0)}" x2="${(inX + inW).toFixed(0)}" y2="${(inY + gateH * .4).toFixed(0)}" stroke="${tint}" stroke-width="1.2" opacity=".7"/>`;
      }
      // drawbridge figures (sessions)
      for (let f = 0; f < Math.min(3, r.live); f++) {
        const fx = x + colW * (.2 + f * .3), fy = ground + 6 + (f % 2) * 8;
        g += `<g class="pc-fig">
          <circle cx="${fx.toFixed(0)}" cy="${fy.toFixed(0)}" r="3" fill="${r.col}"/>
          <rect x="${(fx - 1).toFixed(0)}" y="${(fy + 3).toFixed(0)}" width="2" height="5" fill="${r.col}"/>
        </g>`;
      }
      // torch flare for errors
      if (r.err) {
        g += `<circle cx="${x + colW * .2}" cy="${archY + 14}" r="5" fill="var(--red)" opacity=".9">
          <animate attributeName="r" values="4;8;4" dur="1.4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".9;.3;.9" dur="1.4s" repeatCount="indefinite"/>
        </circle>`;
      }
      g += `<text x="${x + colW / 2}" y="${ground + 22}" text-anchor="middle" class="pc-lab">${esc(r.prov.split("/").pop().slice(0, 9))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="pc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "闸门", eyebrow: "PORTCULLIS", render };
})();
