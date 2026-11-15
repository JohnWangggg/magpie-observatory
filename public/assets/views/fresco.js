/* ------------------------------------------------------------------ fresco
 * Fresco view — a wall of lime-plaster panels, one per quota window.
 * The painted surface scales with tokens consumed; wet lime sheens on
 * recently-active windows; a hairline crack marks windows with errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fresco";
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
    const top = rows.slice(0, 5);
    if (!top.length) { host.innerHTML = `<div class="fr-empty">暂无壁板</div>`; return; }

    const pad = 24, pw = (W - pad * (top.length + 1)) / top.length;
    const py = 30, ph = H - 70;

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // plaster wall strip
    g += `<rect x="${pad}" y="${py - 8}" width="${W - pad * 2}" height="${ph + 26}" rx="4" fill="var(--card-2)" stroke="var(--line)" stroke-width="1.4"/>`;

    top.forEach((r, i) => {
      const px = pad * (i + 1) + i * pw;
      const paintH = ph * (r.used / 100);
      // unpainted plaster bottom
      g += `<rect x="${px}" y="${py + ph - paintH}" width="${pw}" height="${ph - paintH}" fill="var(--card-3)" opacity=".8"/>`;
      // fresco — drips of colour
      const col = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      g += `<rect x="${px}" y="${py}" width="${pw}" height="${paintH.toFixed(0)}" fill="${col}" opacity=".5"/>`;
      // brush strokes — horizontal lines
      for (let s = 0; s < 4; s++) {
        const sy = py + paintH * (s + .5) / 4;
        if (sy < py + paintH) g += `<line x1="${px + 3}" y1="${sy.toFixed(0)}" x2="${px + pw - 3}" y2="${sy.toFixed(0)}" stroke="${col}" stroke-width="1.2" opacity=".6"/>`;
      }
      // wet sheen on live windows
      if (r.live) g += `<rect x="${px}" y="${py}" width="${pw}" height="6" fill="#fff" opacity=".35"><animate attributeName="y" values="${py};${(py + paintH).toFixed(0)};${py}" dur="2s" repeatCount="indefinite"/></rect>`;
      // hairline crack on errors — jagged line down one side
      if (r.used > 85) g += `<path d="M ${px + pw - 4} ${py} l -3 ${ph * .3} l 3 ${ph * .2} l -2 ${ph * .3} l 2 ${ph * .2}" stroke="var(--red)" stroke-width="1" fill="none" opacity=".8"/>`;
      g += `<text x="${(px + pw / 2).toFixed(0)}" y="${py + ph + 14}" text-anchor="middle" class="fr-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}</text>`;
    });

    host.innerHTML = `<svg class="fr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "湿壁画", eyebrow: "QUOTA FRESCO", render };
})();
