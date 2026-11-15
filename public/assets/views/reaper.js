/* ------------------------------------------------------------------- reaper
 * Reaper view — a row of corn fields, one per provider.
 * Sheaves stood in stooks = tokens; a reaper swinging
 * the sickle for live sessions; a spilled sheaf marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "reaper";
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
    if (!rows.length) { host.innerHTML = `<div class="rpr-empty">暂无麦田</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;
    g += `<line x1="0" y1="${floorY}" x2="${W}" y2="${floorY}" stroke="var(--line)" stroke-width="1"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const bW = seg * .5;
      const wheat = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#d8b050" : "#987838";

      // standing corn — uncut stalks on the right
      for (let s = 0; s < 6; s++) {
        const sx = x + bW * .16 + s * bW * .05;
        const sh = 14 + (s % 3) * 3;
        g += `<line x1="${sx}" y1="${floorY}" x2="${sx}" y2="${floorY - sh}" stroke="${wheat}" stroke-width="1"/>`;
        g += `<ellipse cx="${sx}" cy="${floorY - sh - 2}" rx="1.4" ry="3" fill="${wheat}" stroke="${r.col}" stroke-width=".3"/>`;
      }
      // stooks — sheaves leaned together, count by tokens
      const stooks = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let s = 0; s < stooks; s++) {
        const sx = x - bW * .36 + s * bW * .16;
        const sy = floorY;
        // a stook — two sheaves crossed
        g += `<path d="M ${sx} ${sy} l -5 -16 q 5 -4 10 0 z" fill="${s === stooks - 1 && r.err ? "var(--red)" : wheat}" stroke="${r.col}" stroke-width=".6"/>`;
        g += `<path d="M ${sx - 2} ${sy - 8} l -2 -8 M ${sx + 2} ${sy - 8} l 2 -8" stroke="${r.col}" stroke-width=".5" fill="none"/>`;
        g += `<path d="M ${sx - 4} ${sy - 16} l 8 0" stroke="${r.col}" stroke-width=".4" fill="none"/>`;
      }
      // a cut swath — the cleared strip
      g += `<path d="M ${x - bW * .05} ${floorY} l ${bW * .2} 0 l -3 -4 h -${bW * .14} z" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5" opacity=".6"/>`;
      for (let s = 0; s < 4; s++) {
        g += `<line x1="${x - bW * .03 + s * 4}" y1="${floorY - 1}" x2="${x - bW * .03 + s * 4}" y2="${floorY - 5}" stroke="${wheat}" stroke-width=".5"/>`;
      }
      // a sickle — on the ground
      g += `<path d="M ${x + bW * .38} ${floorY - 2} a 6 6 0 0 1 8 -6" fill="none" stroke="${r.col}" stroke-width="1.2"/>`;
      g += `<line x1="${x + bW * .44}" y1="${floorY - 8}" x2="${x + bW * .47}" y2="${floorY - 5}" stroke="${r.col}" stroke-width="1.4"/>`;
      // a whetstone — by the swath
      g += `<rect x="${x - bW * .02}" y="${floorY - 3}" width="6" height="3" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width=".5"/>`;

      // reaper swinging for live sessions — figure at the corn edge
      if (r.live) {
        g += `<g class="rpr-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + bW * .1} ${floorY - 26})">
          <circle r="3.4" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <path d="M 4 6 a 7 7 0 0 1 10 -8" fill="none" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // spilled sheaf — fallen grain on errors
      if (r.err) g += `<path d="M ${x - bW * .36 + (stooks - 1) * bW * .16} ${floorY} q -4 -6 -2 -12" fill="none" stroke="var(--red)" stroke-width="1.4"/>`;

      g += `<text x="${x}" y="${H - 8}" text-anchor="middle" class="rpr-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="rpr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "收割", eyebrow: "PROVIDER REAPER", render };
})();
