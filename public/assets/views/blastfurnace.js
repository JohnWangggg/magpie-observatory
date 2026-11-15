/* ----------------------------------------------------------- blastfurnace
 * Blast furnace view — a row of stack furnaces, one per provider.
 * Tuyere fire intensity at the hearth = tokens; a tender at the
 * tapping runner for live sessions; a frozen bosh marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "blastfurnace";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const castY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="bf-empty">暂无高炉</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // casting floor
    g += `<rect y="${castY}" width="${W}" height="${H - castY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const stackW = seg * .42;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e07840" : "#a85830";
      const throatY = H * .16;
      const hearthY = castY - 26;
      // stack — wide bosh tapering to the throat
      g += `<path d="M ${x - stackW * .28} ${throatY} L ${x - stackW * .5} ${hearthY} L ${x + stackW * .5} ${hearthY} L ${x + stackW * .28} ${throatY} Z" fill="var(--card-3)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // charging bell at the throat
      g += `<path d="M ${x - stackW * .22} ${throatY + 4} L ${x} ${throatY - 4} L ${x + stackW * .22} ${throatY + 4} Z" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      // inner glow band — height by tokens
      const glowH = 8 + (r.tok / maxTok) * (hearthY - throatY - 22);
      g += `<rect x="${x - stackW * .32}" y="${(hearthY - 6 - glowH).toFixed(0)}" width="${stackW * .64}" height="${glowH.toFixed(0)}" fill="${tint}" opacity=".45"/>`;
      // tuyere ports around the hearth
      for (let t = -1; t <= 1; t++) {
        g += `<circle cx="${x + t * stackW * .3}" cy="${hearthY + 4}" r="2.5" fill="${r.live ? tint : "var(--card-2)"}" stroke="${r.col}" stroke-width=".9"/>`;
      }
      // hearth drum
      g += `<rect x="${x - stackW * .5}" y="${hearthY}" width="${stackW}" height="20" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.4"/>`;
      // tapping runner on the floor
      g += `<path d="M ${x - 6} ${hearthY + 20} q 2 8 -10 10" stroke="${tint}" stroke-width="1.8" fill="none" opacity=".85"/>`;
      // tender at the runner for live sessions
      if (r.live) {
        g += `<g class="bf-tender" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x + stackW * .62} ${castY - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="8" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="-3" y1="0" x2="-12" y2="4" stroke="${r.col}" stroke-width="1.2"/>
        </g>`;
      }
      // frozen bosh — white ice streak on errors
      if (r.err) g += `<path d="M ${x + stackW * .25} ${throatY + 10} q 4 12 -2 22" stroke="#a0d0f8" stroke-width="2" fill="none" opacity=".8"/>`;
      g += `<text x="${x}" y="${castY + 18}" text-anchor="middle" class="bf-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bf-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "高炉", eyebrow: "PROVIDER BLAST FURNACE", render };
})();
