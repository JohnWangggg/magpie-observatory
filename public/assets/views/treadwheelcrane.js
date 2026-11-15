/* -------------------------------------------------------- treadwheelcrane
 * Treadwheel crane view — a row of harbor cranes, one per
 * provider. Bales hanging off the jib = tokens; a walker inside
 * the drum wheel for live sessions; a frayed sling marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "treadwheelcrane";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const quayY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="tc-empty">暂无轮吊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // quay edge
    g += `<rect y="${quayY}" width="${W}" height="${H - quayY}" fill="var(--card-2)"/>`;
    for (let x = 0; x < W; x += 26) g += `<rect x="${x}" y="${quayY}" width="20" height="3" fill="var(--line)" opacity=".4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const wheelR = 18;
      const wheelY = quayY - wheelR - 2;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#c8a060" : "#987048";
      // A-frame mast
      g += `<path d="M ${x - 14} ${quayY} L ${x} ${quayY - 52} L ${x + 14} ${quayY}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.8" fill="none"/>`;
      // treadwheel drum beside the mast
      g += `<circle cx="${x - 22}" cy="${wheelY}" r="${wheelR}" fill="none" stroke="${r.col}" stroke-width="1.8" ${r.err ? 'stroke-dasharray="5 3"' : ""}/>`;
      g += `<circle cx="${x - 22}" cy="${wheelY}" r="3" fill="${r.col}"/>`;
      for (let s = 0; s < 8; s++) {
        const a = (s / 8) * Math.PI * 2;
        g += `<line x1="${x - 22}" y1="${wheelY}" x2="${(x - 22 + Math.cos(a) * wheelR).toFixed(1)}" y2="${(wheelY + Math.sin(a) * wheelR).toFixed(1)}" stroke="${r.col}" stroke-width=".8" opacity=".6"/>`;
      }
      // walker inside the drum for live sessions
      if (r.live) g += `<circle class="tc-walker" cx="${x - 22}" cy="${wheelY + wheelR - 6}" r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1" style="animation-delay: ${(i * .3).toFixed(1)}s"/>`;
      // jib from mast head
      const jibX = x + 30, jibY = quayY - 58;
      g += `<line x1="${x}" y1="${quayY - 52}" x2="${jibX}" y2="${jibY}" stroke="${r.col}" stroke-width="2"/>`;
      g += `<line x1="${x}" y1="${quayY - 52}" x2="${x + 14}" y2="${quayY - 40}" stroke="${r.col}" stroke-width="1.2"/>`;
      // hoist rope + bale stack — size by tokens
      const bales = Math.min(3, Math.ceil(r.tok / maxTok * 3));
      const baleY = quayY - 30;
      g += `<line x1="${jibX}" y1="${jibY}" x2="${jibX}" y2="${baleY}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      g += `<rect x="${jibX - 9}" y="${baleY}" width="18" height="${bales * 6}" rx="1.5" fill="${tint}" stroke="${r.col}" stroke-width="1" opacity=".85"/>`;
      for (let b = 1; b < bales; b++) g += `<line x1="${jibX - 9}" y1="${baleY + b * 6}" x2="${jibX + 9}" y2="${baleY + b * 6}" stroke="${r.col}" stroke-width=".7" opacity=".7"/>`;
      // frayed sling on errors
      if (r.err) g += `<path d="M ${jibX + 4} ${baleY - 6} l 3 -5 m -3 1 l -3 -5" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      g += `<text x="${x}" y="${quayY + 18}" text-anchor="middle" class="tc-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="tc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "踏轮吊", eyebrow: "PROVIDER TREADWHEEL CRANE", render };
})();
