/* --------------------------------------------------------------- steelyard
 * Steelyard view — a row of balance beams, one per provider. The
 * counterweight slides to balance the token load; the hook hangs
 * for live sessions; a broken chain marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "steelyard";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const pivotY = 40, groundY = H * .86;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="sy-empty">暂无秤杆</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // stand posts
    g += `<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const beamLen = seg * .7;
      const tip = (r.tok / maxTok) * 24;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#68c078";
      // stand
      g += `<line x1="${x}" y1="${groundY}" x2="${x}" y2="${pivotY + 14}" stroke="var(--line)" stroke-width="2.4"/>`;
      g += `<path d="M ${x - 8} ${pivotY + 14} L ${x} ${pivotY} L ${x + 8} ${pivotY + 14} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // beam — tips with load
      const beamAngle = Math.atan2(tip, beamLen / 2) * .5;
      const y1 = pivotY - Math.sin(beamAngle) * beamLen / 2, y2 = pivotY + Math.sin(beamAngle) * beamLen / 2;
      g += `<line x1="${x - beamLen / 2}" y1="${y2.toFixed(0)}" x2="${x + beamLen / 2}" y2="${y1.toFixed(0)}" stroke="${r.col}" stroke-width="2.4"/>`;
      // load pan on left — hangs lower with more tokens
      const panX = x - beamLen / 2, panY = y2;
      const panDrop = 14 + (r.tok / maxTok) * 22;
      g += `<line x1="${panX.toFixed(0)}" y1="${panY.toFixed(0)}" x2="${panX.toFixed(0)}" y2="${(panY + panDrop).toFixed(0)}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<path d="M ${panX - 8} ${(panY + panDrop).toFixed(0)} L ${panX + 8} ${(panY + panDrop).toFixed(0)} L ${panX} ${(panY + panDrop + 8).toFixed(0)} Z" fill="${tint}" opacity=".7"/>`;
      // counterweight on right — slides to balance
      const cwX = x + beamLen * .2 + (r.tok / maxTok) * beamLen * .28;
      const cwY = pivotY - Math.sin(beamAngle) * (cwX - x) + 4;
      g += `<rect x="${(cwX - 4).toFixed(0)}" y="${cwY.toFixed(0)}" width="8" height="10" rx="1.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // hook for live sessions
      if (r.live) {
        g += `<g class="sy-hook" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <path d="M ${panX} ${(panY + panDrop + 8).toFixed(0)} q 4 6 0 10 q -4 4 -8 0" stroke="${r.col}" stroke-width="1.6" fill="none"/>
        </g>`;
      }
      g += `<text x="${x}" y="${groundY + 18}" text-anchor="middle" class="sy-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="sy-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "杆秤", eyebrow: "PROVIDER STEELYARD", render };
})();
