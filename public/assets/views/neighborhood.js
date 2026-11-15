/* ------------------------------------------------------------ neighborhood
 * Neighborhood view — every provider is a house on a street. Windows
 * glow brighter with live sessions; a puff of smoke from the chimney
 * when that provider has recent errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "neighborhood";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function house(x, y, w, h, col, live, err, name) {
    const win = 8, rows = Math.max(1, Math.floor(h / (win + 8))), cols = Math.max(1, Math.floor(w / (win + 10)));
    let wins = "";
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const lit = (r + c) % Math.max(1, Math.ceil(live)) === 0 && live > 0;
      wins += `<rect x="${(x + 6 + c * (w - 12) / Math.max(1, cols)).toFixed(1)}" y="${(y + 10 + r * (h - 18) / Math.max(1, rows)).toFixed(1)}" width="${win}" height="${win}" rx="1"
        fill="${lit ? col : "var(--line)"}" opacity="${lit ? 0.95 : 0.35}"/>`;
    }
    const chimney = err ? `<g class="nb-smoke">
      <circle cx="${(x + w * .78).toFixed(1)}" cy="${(y - 20).toFixed(1)}" r="3" fill="var(--red)" opacity=".7">
        <animate attributeName="cy" values="${y - 18};${y - 36}" dur="2.4s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".7;0" dur="2.4s" repeatCount="indefinite"/>
      </circle>
    </g>` : "";
    return `<g class="nb-house" data-prov="${esc(name)}" data-live="${live}">
      ${chimney}
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="var(--card-2)" stroke="${col}" stroke-width="1.4"/>
      <path d="M ${x - 4} ${y + 4} L ${x + w / 2} ${y - 14} L ${x + w + 4} ${y + 4} Z" fill="var(--card-2)" stroke="${col}" stroke-width="1.4"/>
      ${wins}
      <text x="${(x + w / 2).toFixed(1)}" y="${(y + h + 14).toFixed(1)}" text-anchor="middle" class="nb-lab">${esc(name.split("/").pop().slice(0, 10))}${live ? "·" + live : ""}</text>
    </g>`;
  }

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const provs = [...new Set([...sessions.map(s => s.provider), ...logs.slice(-80).map(l => l.provider)])].filter(Boolean);
    const errProvs = new Set(logs.slice(-30).filter(l => l.status === "err").map(l => l.provider));

    const rows = provs.map(p => ({
      name: p, live: sessions.filter(s => s.provider === p).length, err: errProvs.has(p),
      col: metaOf(p).color || "#8b7cf6",
    })).sort((a, b) => b.live - a.live).slice(0, 6);

    if (!rows.length) { host.innerHTML = `<div class="nb-empty">暂无 provider</div>`; return; }

    const pad = 26, hw = (W - pad * (rows.length + 1)) / rows.length, hh = Math.min(H * .45, 88);
    const ground = H * 0.72;

    let g = `<line x1="0" y1="${ground}" x2="${W}" y2="${ground}" stroke="var(--line)" stroke-width="1.4"/>`;
    // sky stars
    for (let i = 0; i < 20; i++) {
      const sx = (i * 97.3) % W, sy = 12 + (i * 31.7) % (ground - 60);
      g += `<circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="${(i % 3 ? .8 : 1.2)}" fill="var(--faint)" opacity="${.3 + (i % 4) * .15}"/>`;
    }

    rows.forEach((r, i) => {
      const x = pad + i * (hw + pad), y = ground - hh;
      g += house(x, y, hw, hh, r.col, r.live, r.err, r.name);
      // path to door
      g += `<rect x="${(x + hw / 2 - 3).toFixed(0)}" y="${ground}" width="6" height="${H - ground}" fill="var(--line)" opacity=".5"/>`;
    });

    host.innerHTML = `<svg class="nb-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "街坊", eyebrow: "PROVIDER BLOCK", render };
})();
