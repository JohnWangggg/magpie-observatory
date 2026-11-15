/* ----------------------------------------------------------------- sounder
 * Sounder view — a line of plumb bobs over a sounding board, one
 * per provider. Line length = tokens burned; the sinker splashes for
 * live sessions; a snapped line marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sounder";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const beamY = 30, seaY = H * 0.8;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="so-empty">暂无测深</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // beam overhead
    g += `<line y="${beamY}" x2="${W}" y2="${beamY}" stroke="var(--line)" stroke-width="1.8"/>`;
    g += `<rect x="0" y="${beamY - 6}" width="${W}" height="4" fill="var(--card-3)" opacity=".6"/>`;
    // sea
    g += `<rect y="${seaY}" width="${W}" height="${H - seaY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 26) g += `<path d="M ${x} ${seaY + 4} q 7 -5 14 0" stroke="var(--line)" stroke-width="1" fill="none" opacity=".5"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const drop = (r.tok / maxTok) * (seaY - beamY - 30);
      const sinkY = beamY + 14 + drop;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#68c078" : "#e8c860";
      // line — snapped if error
      g += `<line x1="${x}" y1="${beamY}" x2="${x}" y2="${sinkY.toFixed(0)}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" ${r.err ? 'stroke-dasharray="3 3"' : ""}/>`;
      // sinker — lead weight
      g += `<path d="M ${x} ${sinkY.toFixed(0)} L ${x - 5} ${(sinkY + 10).toFixed(0)} L ${x + 5} ${(sinkY + 10).toFixed(0)} Z" fill="${r.col}"/>`;
      g += `<circle cx="${x}" cy="${(sinkY + 4).toFixed(0)}" r="2.5" fill="var(--card-3)"/>`;
      // splash rings when live
      if (r.live) {
        for (let s = 0; s < 2; s++) {
          g += `<ellipse cx="${x}" cy="${seaY + 2}" rx="${4 + s * 6}" ry="${1.5 + s}" fill="none" stroke="${tint}" stroke-width="1" opacity=".6">
            <animate attributeName="rx" values="${3 + s * 4};${14 + s * 8}" dur="${1.2 + s * .3}s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values=".6;0" dur="${1.2 + s * .3}s" repeatCount="indefinite"/>
          </ellipse>`;
        }
      }
      // scale ticks on line
      for (let t = 1; t <= 4; t++) {
        const ty = beamY + (drop * t) / 5;
        g += `<line x1="${x - 5}" y1="${ty.toFixed(0)}" x2="${x + 5}" y2="${ty.toFixed(0)}" stroke="${r.col}" stroke-width=".8" opacity=".5"/>`;
      }
      g += `<text x="${x}" y="${seaY + 26}" text-anchor="middle" class="so-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="so-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "测深锤", eyebrow: "PROVIDER SOUNDER", render };
})();
