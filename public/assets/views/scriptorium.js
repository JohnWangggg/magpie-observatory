/* ---------------------------------------------------------------- scriptorium
 * Scriptorium view — a row of writing desks, one per provider.
 * Finished folios on the pile = tokens; a scribe copying for
 * live sessions; a blotted line marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "scriptorium";
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
    if (!rows.length) { host.innerHTML = `<div class="sq-empty">暂无抄写坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // scriptorium floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const ink = r.err ? "#e06048" : "#303048";
      const deskW = seg * .5;
      const deskY = floorY - 24;
      // the desk — a slanted surface on legs
      g += `<path d="M ${x - deskW / 2} ${deskY + 8} L ${x - deskW * .35} ${deskY - 6} L ${x + deskW / 2} ${deskY - 6} L ${x + deskW * .42} ${deskY + 8} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.3"/>`;
      g += `<line x1="${x - deskW * .3}" y1="${deskY + 8}" x2="${x - deskW * .3}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      g += `<line x1="${x + deskW * .3}" y1="${deskY + 8}" x2="${x + deskW * .3}" y2="${floorY}" stroke="${r.col}" stroke-width="1.6"/>`;
      // the folio — a sheet on the desk with ruled lines
      g += `<rect x="${x - deskW * .2}" y="${deskY - 4}" width="${deskW * .4}" height="10" fill="#e8e4d8" stroke="${r.col}" stroke-width=".7"/>`;
      // written lines — strokes on the folio, count by tokens
      const lines = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let l = 0; l < lines; l++) {
        g += `<line x1="${x - deskW * .16}" y1="${deskY - 1 + l * 2}" x2="${x - deskW * .16 + deskW * .3}" y2="${deskY - 1 + l * 2}" stroke="${l === 0 && r.err ? "var(--red)" : ink}" stroke-width=".8"/>`;
      }
      // ink horn — a small pot at the desk edge
      g += `<ellipse cx="${x + deskW * .34}" cy="${deskY + 4}" rx="3" ry="2" fill="var(--card-2)" stroke="${r.col}" stroke-width=".8"/>`;
      // quill — a feather resting in the horn
      g += `<path d="M ${x + deskW * .34} ${deskY + 3} q 3 -8 7 -9" stroke="${r.col}" stroke-width="1" fill="none"/>`;
      // finished folios — a pile beside the desk
      const folios = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      for (let f = 0; f < folios; f++) {
        g += `<rect x="${x + deskW * .36}" y="${floorY - 4 - f * 3}" width="12" height="2.5" fill="#e8e4d8" stroke="${r.col}" stroke-width=".5" transform="rotate(3 ${x + deskW * .4} ${floorY})"/>`;
      }
      // scribe copying for live sessions — figure bent over the desk
      if (r.live) {
        g += `<g class="sq-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - deskW * .42} ${deskY - 14})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="6" x2="14" y2="9" stroke="${r.col}" stroke-width="1.1"/>
        </g>`;
      }
      // blotted line — an ink spill on errors
      if (r.err) g += `<ellipse cx="${x - deskW * .05}" cy="${deskY}" rx="4" ry="2" fill="var(--red)" opacity=".7"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="sq-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sq-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "抄写坊", eyebrow: "PROVIDER SCRIPTORIUM", render };
})();
