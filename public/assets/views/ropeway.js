/* ------------------------------------------------------------------ ropeway
 * Ropeway view — a row of bi-cable aerial ropeways, one per
 * provider. Buckets riding the track rope = tokens; an operator
 * at the loading station for live sessions; a spilled carrier
 * marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "ropeway";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const groundY = H * .84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="rw-empty">暂无索道</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // ground
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const span = seg * .7;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a858" : "#987838";
      const topY = groundY - 52;
      // two support towers — slightly inward-leaning
      g += `<line x1="${x - span / 2}" y1="${groundY}" x2="${x - span / 2 + 4}" y2="${topY}" stroke="${r.col}" stroke-width="2"/>`;
      g += `<line x1="${x + span / 2}" y1="${groundY}" x2="${x + span / 2 - 4}" y2="${topY}" stroke="${r.col}" stroke-width="2"/>`;
      // catenary track rope between tower heads
      const ropeY = topY + 4;
      g += `<path d="M ${x - span / 2 + 4} ${ropeY} Q ${x} ${ropeY + 14} ${x + span / 2 - 4} ${ropeY}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.6" fill="none" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // buckets hanging at intervals — count by tokens
      const buckets = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      for (let b = 0; b < buckets; b++) {
        const t = (b + .6) / (buckets + .4);
        const bx = (x - span / 2 + 4) + (span - 8) * t;
        const by = ropeY + 14 * 4 * t * (1 - t) + 2; // catenary
        g += `<line x1="${bx.toFixed(0)}" y1="${by.toFixed(0)}" x2="${bx.toFixed(0)}" y2="${(by + 6).toFixed(0)}" stroke="${r.col}" stroke-width="1"/>`;
        g += `<rect x="${(bx - 3).toFixed(0)}" y="${(by + 6).toFixed(0)}" width="6" height="5" rx="1" fill="${tint}" stroke="${r.col}" stroke-width=".8" opacity=".9"/>`;
      }
      // loading station at the foot of the left tower
      g += `<rect x="${x - span / 2 - 14}" y="${groundY - 12}" width="18" height="12" rx="1.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>`;
      // operator at the station for live sessions
      if (r.live) {
        g += `<g class="rw-operator" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - span / 2 - 6} ${groundY - 6})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="7" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // spilled carrier on the ground on errors
      if (r.err) g += `<rect x="${x + span / 2 - 8}" y="${groundY - 5}" width="6" height="4" rx="1" fill="var(--red)" opacity=".5" transform="rotate(20 ${x + span / 2 - 5} ${groundY - 3})"/>`;
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="rw-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="rw-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "索道", eyebrow: "PROVIDER ROPEWAY", render };
})();
