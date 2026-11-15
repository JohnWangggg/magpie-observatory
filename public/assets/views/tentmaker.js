/* ------------------------------------------------------------------ tentmaker
 * Tentmaker view — a row of stretching frames, one per provider.
 * Panels laced to the frame = tokens; a tentmaker seaming for
 * live sessions; a torn gusset marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tentmaker";
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
    if (!rows.length) { host.innerHTML = `<div class="tm-empty">暂无帐幕坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // sail-loft floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const canvas = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8d0b8" : "#a89878";
      const frameW = seg * .5;
      const frameY = floorY - 34;
      const frameH = 26;
      // the stretching frame — a rectangle on posts
      g += `<rect x="${x - frameW / 2}" y="${frameY}" width="${frameW}" height="${frameH}" fill="none" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - frameW / 2 + 4}" y1="${frameY + frameH}" x2="${x - frameW / 2 - 4}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + frameW / 2 - 4}" y1="${frameY + frameH}" x2="${x + frameW / 2 + 4}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      // canvas panels — rectangles laced inside, count by tokens
      const panels = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let p = 0; p < panels; p++) {
        const pw = frameW * .8 / panels;
        const px = x - frameW * .4 + p * pw;
        g += `<rect x="${px}" y="${frameY + 3}" width="${pw - 2}" height="${frameH - 6}" fill="${p === 0 && r.err ? "var(--red)" : canvas}" stroke="${r.col}" stroke-width=".7" opacity=".85"/>`;
      }
      // lacing — stitches along the panel edges
      for (let s = 0; s < 4; s++) {
        g += `<line x1="${x - frameW / 2 + 2 + s * frameW * .25}" y1="${frameY + 1}" x2="${x - frameW / 2 + 4 + s * frameW * .25}" y2="${frameY + 4}" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // grommets — brass rings on the near edge
      for (let s = 0; s < 3; s++) {
        g += `<circle cx="${x - frameW * .3 + s * frameW * .3}" cy="${frameY + frameH - 2}" r="1.5" fill="none" stroke="${r.col}" stroke-width=".8"/>`;
      }
      // rolled canvas — bolts stacked beside
      const bolts = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let b = 0; b < bolts; b++) {
        g += `<ellipse cx="${x + frameW / 2 + 6}" cy="${floorY - 5 - b * 4}" rx="4" ry="2" fill="${canvas}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // tentmaker seaming for live sessions — figure with a palm
      if (r.live) {
        g += `<g class="tm-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - frameW * .44} ${frameY - 8})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="15" y2="8" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // torn gusset — a rip in a panel corner on errors
      if (r.err) g += `<path d="M ${x + frameW * .2} ${frameY + 4} l 6 6" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="tm-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "帐幕坊", eyebrow: "PROVIDER TENTMAKER", render };
})();
