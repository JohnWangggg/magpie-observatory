/* --------------------------------------------------------------- cartwright
 * Cartwright view — a row of cartwrights' yards, one per provider.
 * Wheels leaning by the frame = tokens; a cartwright fitting
 * a fellow for live sessions; a sprung spoke marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "cartwright";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .86;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="cwr-empty">暂无车坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // the ground — a beaten yard
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .48;
      const wood = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b08048" : "#785838";

      // the cart frame — a body on its axle, tilted on a trestle
      g += `<line x1="${x - bW * .34}" y1="${floorY - 10}" x2="${x - bW * .04}" y2="${floorY - 6}" stroke="${r.col}" stroke-width="1.6"/>`;
      // bed planks
      for (let p = 0; p < 3; p++) {
        g += `<line x1="${x - bW * .36 + p * 2}" y1="${floorY - 12 - p}" x2="${x - bW * .02 + p * 2}" y2="${floorY - 8 - p}" stroke="${wood}" stroke-width="2.4"/>`;
      }
      // side boards
      g += `<line x1="${x - bW * .34}" y1="${floorY - 16}" x2="${x - bW * .04}" y2="${floorY - 12}" stroke="${wood}" stroke-width="1.4"/>`;
      for (let s = 0; s < 3; s++) {
        g += `<line x1="${x - bW * .32 + s * bW * .1}" y1="${floorY - 16 - s * .3}" x2="${x - bW * .32 + s * bW * .1}" y2="${floorY - 11 - s * .3}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // shafts — the pull-poles
      g += `<line x1="${x - bW * .36}" y1="${floorY - 12}" x2="${x - bW * .48}" y2="${floorY - 18}" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x - bW * .34}" y1="${floorY - 9}" x2="${x - bW * .46}" y2="${floorY - 14}" stroke="${r.col}" stroke-width="1.2"/>`;
      // a trestle — under the front
      g += `<path d="M ${x - bW * .02} ${floorY} l 4 -9 4 9 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".6"/>`;
      // the axle — with one wheel mounted
      g += `<circle cx="${x - bW * .16}" cy="${floorY - 4}" r="7" fill="none" stroke="${wood}" stroke-width="2"/>`;
      g += `<circle cx="${x - bW * .16}" cy="${floorY - 4}" r="2" fill="${wood}" stroke="${r.col}" stroke-width=".5"/>`;
      for (let s = 0; s < 6; s++) {
        const a = s * Math.PI / 3;
        g += `<line x1="${x - bW * .16}" y1="${floorY - 4}" x2="${x - bW * .16 + Math.cos(a) * 7}" y2="${floorY - 4 + Math.sin(a) * 7}" stroke="${r.col}" stroke-width=".7"/>`;
      }

      // leaning wheels — against the frame, count by tokens
      const wheels = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let w = 0; w < wheels; w++) {
        const wx = x + bW * .1 + w * bW * .15;
        const wy = floorY - 8;
        g += `<circle cx="${wx}" cy="${wy}" r="7.5" fill="none" stroke="${w === wheels - 1 && r.err ? "var(--red)" : wood}" stroke-width="1.8" transform="rotate(-8 ${wx} ${wy})"/>`;
        g += `<circle cx="${wx}" cy="${wy}" r="1.8" fill="${wood}" stroke="${r.col}" stroke-width=".5"/>`;
        for (let s = 0; s < 6; s++) {
          const a = s * Math.PI / 3 + .3;
          g += `<line x1="${wx}" y1="${wy}" x2="${wx + Math.cos(a) * 7.5}" y2="${wy + Math.sin(a) * 7.5}" stroke="${r.col}" stroke-width=".6"/>`;
        }
      }

      // a tyring platform — a low ring stand for shrinking on tyres
      g += `<ellipse cx="${x + bW * .4}" cy="${floorY - 2}" rx="${bW * .1}" ry="2.5" fill="none" stroke="${r.col}" stroke-width=".7"/>`;
      g += `<circle cx="${x + bW * .4}" cy="${floorY - 6}" r="6" fill="none" stroke="#8a8a9a" stroke-width="1.6"/>`;
      // a hammer — beside the platform
      g += `<line x1="${x + bW * .46}" y1="${floorY - 8}" x2="${x + bW * .5}" y2="${floorY - 12}" stroke="${r.col}" stroke-width=".8"/>`;
      g += `<rect x="${x + bW * .48}" y="${floorY - 15}" width="5" height="3" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;

      // cartwright fitting for live sessions — figure at the wheel
      if (r.live) {
        g += `<g class="cwr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .28} ${floorY - 26})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="5" x2="10" y2="10" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // sprung spoke — a bent spoke on errors
      if (r.err) g += `<path d="M ${x + bW * .1 + (wheels - 1) * bW * .15} ${floorY - 8} q 4 2 7 5" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="cwr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="cwr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "车坊", eyebrow: "PROVIDER CARTWRIGHT", render };
})();
