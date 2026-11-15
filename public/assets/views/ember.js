/* ------------------------------------------------------------------ ember
 * Ember view — the fireplace grate. Each quota window is a coal bed;
 * the glow pulses faster when burn is high, grey ash settles on spent
 * quota, and a tiny spark pops off for each live session.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "ember";
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
    if (!top.length) { host.innerHTML = `<div class="eb-empty">暂无炉火</div>`; return; }

    const pad = 26, colW = (W - pad * (top.length + 1)) / top.length;
    const hearthY = H * 0.82;

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // hearth line
    g += `<rect y="${hearthY}" width="${W}" height="${H - hearthY}" fill="var(--line)"/>`;

    top.forEach((r, i) => {
      const x = pad + i * (colW + pad) + colW / 2;
      const tint = r.left > 50 ? "#e8c860" : r.left > 20 ? "#e06048" : "#c04028";
      const coalR = colW * .38;
      const glowDur = Math.max(.5, 2.2 - r.used * .02);

      // coal bed — 3 lumps
      for (let c = 0; c < 3; c++) {
        const cx = x + (c - 1) * (coalR * .55);
        const cy = hearthY - 4 - (c % 2) * 4;
        const rr = coalR * (0.7 + (c % 2) * .25);
        g += `<ellipse cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" rx="${rr.toFixed(0)}" ry="${(rr * .55).toFixed(0)}" fill="#1a1410" stroke="${tint}" stroke-width="1.2" opacity=".9"/>`;
      }
      // glow inside the bed
      const glowR = coalR * (0.3 + r.used * .005);
      g += `<ellipse class="eb-glow" cx="${x.toFixed(0)}" cy="${hearthY - 2}" rx="${glowR.toFixed(0)}" ry="${(glowR * .6).toFixed(0)}" fill="${tint}" opacity=".55" style="animation-duration: ${glowDur.toFixed(2)}s"/>`;
      // sparks per live session
      for (let s = 0; s < Math.min(3, r.live); s++) {
        const sx = x + (s - 1) * 12, sy = hearthY - coalR - 6;
        g += `<circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="2" fill="${r.col}" opacity=".9">
          <animate attributeName="cy" values="${sy.toFixed(0)};${(sy - 22).toFixed(0)}" dur="${1 + s * .3}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".9;0" dur="${1 + s * .3}s" repeatCount="indefinite"/>
        </circle>`;
      }
      // ash settling on spent quota
      const ashW = coalR * 2 * (r.used / 100);
      g += `<rect x="${(x - ashW / 2).toFixed(0)}" y="${hearthY - 2}" width="${ashW.toFixed(0)}" height="4" fill="#555" opacity=".7"/>`;
      g += `<text x="${x.toFixed(0)}" y="${hearthY + 22}" text-anchor="middle" class="eb-lab">${esc(r.prov.split("/").pop().slice(0, 9))} ${r.used}%${r.live ? "·" + r.live : ""}</text>`;
    });

    host.innerHTML = `<svg class="eb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "余烬", eyebrow: "QUOTA EMBERS", render };
})();
