/* ------------------------------------------------------------------ tileworks
 * Tileworks view — a row of tile kilns, one per provider.
 * Fired tiles stacked = tokens; a moulder pressing clay
 * for live sessions; a cracked kiln marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tileworks";
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
    if (!rows.length) { host.innerHTML = `<div class="tw-empty">暂无瓦作场</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // works floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const clay = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c07848" : "#985838";
      const kilnW = seg * .38;
      const kilnY = floorY - 36;
      const kilnH = 32;
      // the kiln — a domed beehive kiln with a fire mouth
      g += `<path d="M ${x - kilnW / 2} ${floorY} L ${x - kilnW * .44} ${kilnY + 8} A ${kilnW * .44} ${kilnH * .5} 0 0 1 ${x + kilnW * .44} ${kilnY + 8} L ${x + kilnW / 2} ${floorY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      // the fire mouth — an arched opening
      g += `<path d="M ${x - 4} ${floorY} v -10 a 4 4 0 0 1 8 0 v 10" fill="${r.err ? "var(--red)" : "var(--card-2)"}" stroke="${r.col}" stroke-width="1"/>`;
      // smoke — a wisp off the crown
      g += `<path d="M ${x} ${kilnY - 2} q 3 -6 -1 -10" fill="none" stroke="${r.col}" stroke-width=".8" opacity=".4"/>`;
      // the mould — a tile press beside the kiln
      g += `<rect x="${x + kilnW * .48}" y="${floorY - 14}" width="12" height="8" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + kilnW * .48}" y1="${floorY - 18}" x2="${x + kilnW * .6}" y2="${floorY - 18}" stroke="${r.col}" stroke-width="1.4"/>`;
      // fired tiles — curved tiles leaning in a stack, count by tokens
      const tiles = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let t = 0; t < tiles; t++) {
        const tx = x - kilnW * .5 - 8 + (t % 2) * 5;
        const ty = floorY - 6 - Math.floor(t / 2) * 6;
        g += `<path d="M ${tx} ${ty} a 4 4 0 0 1 8 0" fill="${t === 0 && r.err ? "var(--red)" : clay}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // clay heap — a mound of raw clay
      g += `<path d="M ${x - kilnW * .58} ${floorY} q 6 -6 12 0" fill="var(--card-3)" stroke="${r.col}" stroke-width=".8"/>`;
      // moulder pressing for live sessions — figure at the mould
      if (r.live) {
        g += `<g class="tw-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + kilnW * .34} ${floorY - 22})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="8" x2="12" y2="6" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // cracked kiln — a split in the dome on errors
      if (r.err) g += `<path d="M ${x - kilnW * .15} ${kilnY + 4} l 6 12" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="tw-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "瓦作场", eyebrow: "PROVIDER TILEWORKS", render };
})();
