/* ----------------------------------------------------------------- beacon
 * Beacon view — signal fires on a ridge line. Each provider is a
 * bonfire: flame size scales with live sessions, smoke height with
 * recent volume, and a faint ember trail down the hill for errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "beacon";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const ridge = H * 0.78;

    const provs = [...new Set([...sessions.map(s => s.provider), ...logs.slice(-80).map(l => l.provider)])].filter(Boolean);
    const rows = provs.map(p => {
      const live = sessions.filter(s => s.provider === p).length;
      const tok = logs.filter(l => l.provider === p).slice(-40).reduce((a, l) => a + (l.tokens || 0), 0);
      const err = logs.slice(-30).some(l => l.provider === p && l.status === "err");
      return { name: p, live, tok, err, col: metaOf(p).color || "#8b7cf6" };
    }).sort((a, b) => b.live - a.live || b.tok - a.tok).slice(0, 7);

    if (!rows.length) { host.innerHTML = `<div class="bn-empty">暂无信号火</div>`; return; }

    let g = `<rect width="${W}" height="${H}" fill="var(--card-2)"/>`;
    // night sky gradient via overlaid rect
    g += `<rect width="${W}" height="${ridge}" fill="var(--bg)"/>`;
    // stars
    for (let i = 0; i < 22; i++) {
      const sx = (i * 101.7 + 23) % W, sy = 10 + (i * 43.1) % (ridge - 30);
      g += `<circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="${.6 + (i % 3) * .4}" fill="var(--faint)" opacity="${.3 + (i % 4) * .15}"/>`;
    }
    // ridge
    g += `<path d="M 0 ${ridge} Q ${W * .2} ${ridge - 26} ${W * .42} ${ridge - 10} T ${W * .8} ${ridge - 18} T ${W} ${ridge} L ${W} ${H} L 0 ${H} Z" fill="var(--line)" opacity=".35"/>`;

    const pad = 40;
    rows.forEach((r, i) => {
      const x = pad + i * ((W - 2 * pad) / Math.max(1, rows.length - 1 || 1));
      const y = ridge - 18 - (i % 2) * 8;
      const fireH = 12 + Math.min(28, r.live * 9);
      const smokeH = Math.min(64, r.tok / 8000);
      const col = r.err ? "#e06048" : r.col;

      // smoke column
      if (r.live || r.err) {
        g += `<g class="bn-smoke">
          <rect x="${(x - 2).toFixed(0)}" y="${(y - fireH - smokeH).toFixed(0)}" width="4" height="${smokeH.toFixed(0)}" fill="var(--faint)" opacity=".3"/>
        </g>`;
      }
      // logs/pyramid base
      g += `<path d="M ${(x - 10).toFixed(0)} ${y} L ${(x + 10).toFixed(0)} ${y} L ${x.toFixed(0)} ${(y - 8).toFixed(0)} Z" fill="var(--line)"/>`;
      // flames — three layered triangles, taller when live
      const fh = r.live ? fireH : 8;
      g += `<g class="bn-fire" style="transform-origin: ${x}px ${y}px;">
        <path d="M ${x} ${(y - fh - 2).toFixed(0)} Q ${(x - 6).toFixed(0)} ${(y - fh * .45).toFixed(0)} ${(x - 4).toFixed(0)} ${(y - 2).toFixed(0)} L ${(x + 4).toFixed(0)} ${(y - 2).toFixed(0)} Q ${(x + 6).toFixed(0)} ${(y - fh * .45).toFixed(0)} ${x} ${(y - fh - 2).toFixed(0)} Z" fill="${col}" opacity=".95"/>
        <path d="M ${x} ${(y - fh * .6).toFixed(0)} Q ${(x - 3).toFixed(0)} ${(y - fh * .3).toFixed(0)} ${(x - 2).toFixed(0)} ${(y - 1).toFixed(0)} L ${(x + 2).toFixed(0)} ${(y - 1).toFixed(0)} Q ${(x + 3).toFixed(0)} ${(y - fh * .3).toFixed(0)} ${x} ${(y - fh * .6).toFixed(0)} Z" fill="#fff" opacity=".8"/>
      </g>`;
      // ember trail for errors
      if (r.err) {
        for (let e = 0; e < 3; e++) {
          g += `<circle cx="${(x + 4 - e * 5).toFixed(0)}" cy="${(y + 6 + e * 5).toFixed(0)}" r="${1.5 - e * .3}" fill="var(--red)" opacity="${.8 - e * .22}"/>`;
        }
      }
      g += `<text x="${x.toFixed(0)}" y="${(y + 18).toFixed(0)}" text-anchor="middle" class="bn-lab">${esc(r.name.split("/").pop().slice(0, 9))}${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "烽火台", eyebrow: "SIGNAL BEACONS", render };
})();
