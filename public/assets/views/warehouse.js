/* -------------------------------------------------------------- warehouse
 * Warehouse view — providers are shelving racks. Boxes stack by token
 * volume; a forklift dot cruises the aisle while a provider is live.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "warehouse";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function rack(x, y, w, h, col, tok, live, name) {
    const shelfH = 12, shelves = Math.max(1, Math.floor(h / (shelfH + 6)));
    let boxes = "";
    for (let s = 0; s < shelves; s++) {
      const sy = y + h - 4 - (s + 1) * (shelfH + 4);
      const bx = 4 + (s * 37) % Math.max(1, w - 24);
      const fill = Math.min(1, tok / 5e5);
      const bw = 14 + fill * (w - 30);
      boxes += `<rect x="${(x + bx).toFixed(1)}" y="${sy.toFixed(1)}" width="${bw.toFixed(1)}" height="${shelfH}" rx="1.5"
        fill="${col}" opacity="${.35 + fill * .55}"/>`;
      // shelf plank
      boxes += `<line x1="${x + 2}" y1="${(sy + shelfH + 1).toFixed(1)}" x2="${(x + w - 2).toFixed(1)}" y2="${(sy + shelfH + 1).toFixed(1)}" stroke="var(--line)" stroke-width="1"/>`;
    }
    const lamp = live > 0 ? `<circle cx="${x + w / 2}" cy="${y - 8}" r="4" fill="${col}">
      <animate attributeName="opacity" values="1;.35;1" dur="1.2s" repeatCount="indefinite"/>
    </circle>` : "";
    return `<g class="wh-rack" data-prov="${esc(name)}" data-tok="${tok}">
      ${lamp}
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="none" stroke="${col}" stroke-width="1.4"/>
      ${boxes}
      <text x="${(x + w / 2).toFixed(1)}" y="${(y + h + 14).toFixed(1)}" text-anchor="middle" class="wh-lab">${esc(name.split("/").pop().slice(0, 10))}·${(tok / 1000).toFixed(0)}k</text>
    </g>`;
  }

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floor = H * 0.78;

    const provTok = new Map();
    logs.forEach(l => {
      const p = l.provider || "?";
      provTok.set(p, (provTok.get(p) || 0) + (l.tok_in || l.tok_out || 0));
    });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length, col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 6);

    if (!rows.length) { host.innerHTML = `<div class="wh-empty">暂无仓库数据</div>`; return; }

    const pad = 30, rw = (W - pad * (rows.length + 1)) / rows.length, rh = floor * 0.72;
    let g = `<rect x="0" y="${floor}" width="${W}" height="${H - floor}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floor}" x2="${W}" y2="${floor}" stroke="var(--line)" stroke-width="2"/>`;

    // aisle forklift dots
    rows.forEach((r, i) => {
      if (!r.live) return;
      const fx = pad + i * (rw + pad) + rw / 2;
      g += `<circle class="wh-fork" cx="${fx}" cy="${floor + 12}" r="4" fill="${r.col}">
        <animate attributeName="cx" values="${fx - 20};${fx + 20};${fx - 20}" dur="${1.6 + i * .25}s" repeatCount="indefinite"/>
      </circle>`;
    });

    rows.forEach((r, i) => {
      const x = pad + i * (rw + pad), y = floor - rh;
      g += rack(x, y, rw, rh, r.col, r.tok, r.live, r.name);
    });

    host.innerHTML = `<svg class="wh-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "仓库", eyebrow: "TOKEN WAREHOUSE", render };
})();
