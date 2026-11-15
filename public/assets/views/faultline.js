/* --------------------------------------------------------------- faultline
 * Faultline view — a cross-section of strata, one fault trace per
 * provider. Trace offset = recent tokens; a red band on the hanging
 * wall marks errors; small tremor marks pulse for live sessions.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "faultline";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const top = 6, bot = H * .9;
    const surfY = 36;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, top);
    if (!rows.length) { host.innerHTML = `<div class="fa-empty">暂无剖面</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // surface
    g += `<line y="${surfY}" x2="${W}" y2="${surfY}" stroke="var(--line)" stroke-width="1.6"/>`;
    // strata bands
    const stratN = 5;
    for (let s = 0; s < stratN; s++) {
      const y1 = surfY + (s * (bot - surfY)) / stratN, y2 = surfY + ((s + 1) * (bot - surfY)) / stratN;
      g += `<rect y="${y1.toFixed(0)}" width="${W}" height="${(y2 - y1).toFixed(0)}" fill="${s % 2 ? "var(--card-2)" : "var(--card-3)"}" opacity=".6"/>`;
    }

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const offset = (r.tok / maxTok) * (bot - surfY) * .4;
      const dip = 18 + (r.tok / maxTok) * 26;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#68c078";
      // fault trace — diagonal break
      const x1 = x - dip, y1 = surfY;
      const x2 = x + dip, y2 = bot;
      g += `<line x1="${x1.toFixed(0)}" y1="${y1}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="${r.col}" stroke-width="2.2"/>`;
      // hanging wall offset — shade one side
      g += `<path d="M ${x1.toFixed(0)} ${y1} L ${x2.toFixed(0)} ${y2} L ${(x2 + 14).toFixed(0)} ${y2} L ${(x1 + 14).toFixed(0)} ${y1} Z" fill="${r.col}" opacity=".12"/>`;
      // slickenlines — small marks on trace
      for (let s = 0; s < 4; s++) {
        const t = s / 4;
        const sx = x1 + (x2 - x1) * t, sy = y1 + (y2 - y1) * t;
        g += `<line x1="${sx.toFixed(0)}" y1="${sy.toFixed(0)}" x2="${(sx + 3).toFixed(0)}" y2="${(sy + 5).toFixed(0)}" stroke="${tint}" stroke-width=".8" opacity=".6"/>`;
      }
      // tremor rings for live sessions
      for (let s = 0; s < Math.min(3, r.live); s++) {
        const tx = x + (s - 1) * 10, ty = surfY + 12;
        g += `<circle cx="${tx.toFixed(0)}" cy="${ty.toFixed(0)}" r="${3 + s * 2}" fill="none" stroke="${r.col}" stroke-width=".8" opacity=".6">
          <animate attributeName="r" values="${2 + s * 2};${8 + s * 3}" dur="${1 + s * .3}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".6;0" dur="${1 + s * .3}s" repeatCount="indefinite"/>
        </circle>`;
      }
      // error band on hanging wall
      if (r.err) g += `<rect x="${(x1 + 4).toFixed(0)}" y="${y1}" width="8" height="${(y2 - y1).toFixed(0)}" fill="var(--red)" opacity=".18"/>`;
      g += `<text x="${x}" y="${bot + 16}" text-anchor="middle" class="fa-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fa-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "断层", eyebrow: "PROVIDER FAULTLINE", render };
})();
