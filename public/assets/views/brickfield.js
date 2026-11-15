/* ---------------------------------------------------------------- brickfield
 * Brickfield view — a row of clamps, one per provider.
 * Bricks hacked up to dry = tokens; a setter working the
 * wicket for live sessions; a slumped clamp marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "brickfield";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="bf-empty">暂无砖窑场</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // brickfield ground
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const fire = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c06030" : "#985028";
      const clampW = seg * .44;
      const clampY = floorY - 30;
      const clampH = 26;
      // the clamp — a scoved stack with arched fire-holes
      g += `<path d="M ${x - clampW / 2} ${floorY} L ${x - clampW * .4} ${clampY} L ${x + clampW * .4} ${clampY} L ${x + clampW / 2} ${floorY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // scove casing — a rendered skin line
      g += `<path d="M ${x - clampW * .4} ${clampY} L ${x + clampW * .4} ${clampY}" stroke="${r.col}" stroke-width=".7"/>`;
      // fire-holes along the base — the burn
      for (let f = 0; f < 3; f++) {
        const fx = x - clampW * .26 + f * clampW * .26;
        g += `<path d="M ${fx} ${floorY} v -6 a 3 3 0 0 1 6 0 v 6" fill="${f === 1 && r.err ? "var(--red)" : fire}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // the wicket — a small arched door
      g += `<path d="M ${x + clampW * .18} ${floorY} v -10 a 4 4 0 0 1 8 0 v 10" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      // smoke off the top — faint wisps
      g += `<path d="M ${x - 4} ${clampY - 4} q 3 -6 -1 -10" fill="none" stroke="${r.col}" stroke-width=".8" opacity=".45"/>`;
      g += `<path d="M ${x + 5} ${clampY - 4} q -3 -6 1 -10" fill="none" stroke="${r.col}" stroke-width=".8" opacity=".45"/>`;
      // hacks — green bricks drying in rows beside the clamp, count by tokens
      const hacks = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let k = 0; k < hacks; k++) {
        g += `<rect x="${x - clampW * .62 + k * 7}" y="${floorY - 6 - k}" width="5" height="4" fill="${k === 0 && r.err ? "var(--red)" : "var(--card-3)"}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // setter working the wicket for live sessions — figure with a barrow
      if (r.live) {
        g += `<g class="bf-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + clampW * .42} ${floorY - 16})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="7" x2="14" y2="11" stroke="${r.col}" stroke-width="1.1"/>
          <circle cx="15" cy="13" r="1.8" fill="none" stroke="${r.col}" stroke-width=".9"/>
        </g>`;
      }
      // slumped clamp — a sag in the crown on errors
      if (r.err) g += `<path d="M ${x - clampW * .2} ${clampY} q ${clampW * .2} 6 ${clampW * .4} 0" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="bf-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bf-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "砖窑场", eyebrow: "PROVIDER BRICKFIELD", render };
})();
