/* -------------------------------------------------------------------- tinker
 * Tinker view — a row of mending pitches, one per provider.
 * Patched pots hung on the rail = tokens; a tinker soldering
 * a kettle for live sessions; a holed pan marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tinker";
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
    if (!rows.length) { host.innerHTML = `<div class="tnk-empty">暂无白铁匠</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tin = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#b8c0c8" : "#788088";
      const pW = seg * .38;
      // the mending pitch — a small brazier fire
      g += `<ellipse cx="${x}" cy="${floorY - 3}" rx="9" ry="4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      for (let f = 0; f < 3; f++) {
        g += `<path d="M ${x - 4 + f * 4} ${floorY - 5} q 1 -5 0 -8" fill="none" stroke="#e08030" stroke-width=".9"/>`;
      }
      // the kettle being mended — held over the fire on a tripod
      g += `<line x1="${x - pW * .22}" y1="${floorY}" x2="${x - 4}" y2="${floorY - 24}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<line x1="${x + pW * .22}" y1="${floorY}" x2="${x + 4}" y2="${floorY - 24}" stroke="${r.col}" stroke-width="1"/>`;
      g += `<path d="M ${x - 8} ${floorY - 26} a 8 7 0 0 1 16 0 l -2 4 h -12 z" fill="${tin}" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<path d="M ${x - 8} ${floorY - 26} q 8 -6 16 0" fill="none" stroke="${r.col}" stroke-width=".8"/>`;
      // a bright solder patch on the kettle
      g += `<rect x="${x - 3}" y="${floorY - 24}" width="6" height="4" rx="1" fill="${r.err ? "var(--red)" : "#e8d070"}" stroke="${r.col}" stroke-width=".5"/>`;
      // the hanging rail — patched pots, count by tokens
      g += `<line x1="${x + pW * .5}" y1="${floorY}" x2="${x + pW * .5}" y2="${floorY - 30}" stroke="${r.col}" stroke-width="1.1"/>`;
      g += `<line x1="${x + pW * .38}" y1="${floorY - 26}" x2="${x + pW * .66}" y2="${floorY - 26}" stroke="${r.col}" stroke-width="1"/>`;
      const pots = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let p = 0; p < pots; p++) {
        const px = x + pW * .42 + p * pW * .09;
        g += `<line x1="${px}" y1="${floorY - 26}" x2="${px}" y2="${floorY - 21}" stroke="${r.col}" stroke-width=".7"/>`;
        g += `<path d="M ${px - 3} ${floorY - 21} a 3.4 3.4 0 0 1 6.8 0 l -1 5 h -4.8 z" fill="${p === 0 && r.err ? "var(--red)" : tin}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // the tinker's pack — a bundle of ware on the ground
      g += `<path d="M ${x - pW * .62} ${floorY - 2} q -5 -12 1 -15 q 6 3 3 15 z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<line x1="${x - pW * .63}" y1="${floorY - 12}" x2="${x - pW * .58}" y2="${floorY - 15}" stroke="${r.col}" stroke-width=".7"/>`;
      // a soldering iron and flux pot
      g += `<line x1="${x + pW * .2}" y1="${floorY - 2}" x2="${x + pW * .28}" y2="${floorY - 10}" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<circle cx="${x + pW * .29}" cy="${floorY - 11}" r="1.6" fill="#f0a040"/>`;
      // tinker soldering for live sessions
      if (r.live) {
        g += `<g class="tnk-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - pW * .52} ${floorY - 30})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="4" y1="7" x2="12" y2="11" stroke="${r.col}" stroke-width="1.1"/>
          <circle cx="13" cy="12" r=".9" fill="#f0a040"/>
        </g>`;
      }
      // holed pan — a leaking vessel on errors
      if (r.err) {
        g += `<path d="M ${x - pW * .35} ${floorY - 6} a 5 4 0 0 1 10 0 l -1 4 h -8 z" fill="${tin}" stroke="var(--red)" stroke-width="1"/>`;
        g += `<circle cx="${x - pW * .35 + 4}" cy="${floorY - 4}" r="1.1" fill="var(--red)"/>`;
      }
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="tnk-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tnk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "白铁匠", eyebrow: "PROVIDER TINKER", render };
})();
