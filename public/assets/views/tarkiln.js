/* ------------------------------------------------------------------- tarkiln
 * Tarkiln view — a row of pitch kettles, one per provider. Tar
 * ladled off the kettle = tokens; a tarboy skimming for live
 * sessions; a boiled-over rim marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tarkiln";
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
    if (!rows.length) { host.innerHTML = `<div class="tk-empty">暂无沥青窑</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // kiln-yard floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const tar = "#201810";
      const kettleW = seg * .5;
      const kettleY = floorY - 16;
      // the kettle — a big iron pot on legs over a fire
      g += `<path d="M ${x - kettleW * .4} ${kettleY} q 0 16 ${kettleW * .4} 16 q ${kettleW * .4} 0 ${kettleW * .4} -16"
            fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      g += `<line x1="${x - kettleW * .35}" y1="${kettleY + 14}" x2="${x - kettleW * .35}" y2="${floorY - 4}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<line x1="${x + kettleW * .35}" y1="${kettleY + 14}" x2="${x + kettleW * .35}" y2="${floorY - 4}" stroke="${r.col}" stroke-width="1.4"/>`;
      // fire under the kettle
      g += `<circle cx="${x}" cy="${floorY - 6}" r="2.4" fill="var(--amber)" opacity=".9"/>`;
      // tar surface — depth of fill by tokens
      const tarH = 2 + (r.tok / maxTok) * 4;
      g += `<ellipse cx="${x}" cy="${kettleY + 1}" rx="${kettleW * .36}" ry="${tarH}" fill="${r.err ? "var(--red)" : tar}" stroke="${r.col}" stroke-width=".7"/>`;
      // ladled tar — pots beside, count by tokens
      const pots = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let p = 0; p < pots; p++) {
        g += `<rect x="${x + kettleW / 2 + 4 + p * 8}" y="${floorY - 8}" width="6" height="8" rx="1" fill="${tar}" stroke="${r.col}" stroke-width=".7"/>`;
      }
      // tarboy skimming for live sessions
      if (r.live) {
        g += `<g class="tk-boy" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - kettleW * .4 - 8} ${kettleY - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="3" x2="15" y2="9" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // boiled over — spill down the side on errors
      if (r.err) g += `<path d="M ${x - kettleW * .2} ${kettleY} q 2 8 -2 14" stroke="var(--red)" stroke-width="2" fill="none" opacity=".8"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="tk-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "沥青窑", eyebrow: "PROVIDER TARKILN", render };
})();
