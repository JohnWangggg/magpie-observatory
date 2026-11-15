/* ------------------------------------------------------------------ warren
 * Warren view — a hillside of rabbit holes, one per quota window.
 * The mound size scales with tokens burned; live sessions sit at the
 * entrances as small rabbits, and a fox-paw print marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "warren";
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
    const top = rows.slice(0, 5);
    if (!top.length) { host.innerHTML = `<div class="wr-empty">暂无地穴</div>`; return; }

    const grassY = H * 0.82;
    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // grass strip
    g += `<rect y="${grassY}" width="${W}" height="${H - grassY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 14) g += `<path d="M ${x} ${grassY + 4} q 3 -8 6 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".5"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const moundR = 22 + (r.used / 100) * 26;
      const moundY = grassY;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // mound
      g += `<ellipse cx="${x}" cy="${moundY}" rx="${moundR.toFixed(0)}" ry="${(moundR * .5).toFixed(0)}" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      // entrance — dark arch
      const holeY = moundY - moundR * .3;
      g += `<ellipse cx="${x}" cy="${holeY}" rx="${(moundR * .35).toFixed(0)}" ry="${(moundR * .22).toFixed(0)}" fill="#1a1410" stroke="${tint}" stroke-width="1.2"/>`;
      // rabbits — small ovals with ears
      for (let s = 0; s < Math.min(3, r.live); s++) {
        const rx = x + (s - 1) * (moundR * .4), ry = moundY - moundR * .55;
        g += `<g class="wr-bun" style="animation-delay: ${(s * .4).toFixed(1)}s">
          <ellipse cx="${rx.toFixed(0)}" cy="${ry.toFixed(0)}" rx="7" ry="5" fill="${r.col}" opacity=".9"/>
          <ellipse cx="${rx.toFixed(0)}" cy="${(ry - 7).toFixed(0)}" rx="2.5" ry="5" fill="${r.col}" opacity=".8"/>
        </g>`;
      }
      // fox paw print on errors
      if (r.err) {
        const px = x + moundR * .5, py = moundY - 4;
        g += `<g fill="var(--red)" opacity=".8">
          <ellipse cx="${px.toFixed(0)}" cy="${py.toFixed(0)}" rx="3" ry="4"/>
          <ellipse cx="${(px - 4).toFixed(0)}" cy="${(py - 5).toFixed(0)}" rx="1.5" ry="2"/>
          <ellipse cx="${(px + 4).toFixed(0)}" cy="${(py - 5).toFixed(0)}" rx="1.5" ry="2"/>
          <ellipse cx="${px.toFixed(0)}" cy="${(py - 7).toFixed(0)}" rx="1.5" ry="2"/>
        </g>`;
      }
      g += `<text x="${x}" y="${grassY + 24}" text-anchor="middle" class="wr-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="wr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "兔穴", eyebrow: "QUOTA WARREN", render };
})();
