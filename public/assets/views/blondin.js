/* ----------------------------------------------------------------- blondin
 * Blondin view — a row of cableway spans over quarry pits, one per
 * provider. Slates lifted on the carriage = tokens; a travelling
 * crab in motion for live sessions; a snapped rope marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "blondin";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const pitY = H * .82;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="bd-empty">暂无采场</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // pit floor
    g += `<rect y="${pitY}" width="${W}" height="${H - pitY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const spanW = seg * .7;
      const cableY = H * .28;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#98a8b8" : "#687888";
      // towers at each end
      g += `<path d="M ${x - spanW / 2} ${pitY} L ${x - spanW / 2 + 6} ${cableY} L ${x - spanW / 2 + 12} ${pitY}" stroke="${r.col}" stroke-width="1.6" fill="none"/>`;
      g += `<path d="M ${x + spanW / 2} ${pitY} L ${x + spanW / 2 - 6} ${cableY} L ${x + spanW / 2 - 12} ${pitY}" stroke="${r.col}" stroke-width="1.6" fill="none"/>`;
      // sagging cable
      g += `<path d="M ${x - spanW / 2 + 6} ${cableY} Q ${x} ${cableY + 18} ${x + spanW / 2 - 6} ${cableY}" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.4" fill="none" ${r.err ? 'stroke-dasharray="4 3"' : ""}/>`;
      // carriage at mid-cable
      const carryY = cableY + 9;
      g += `<rect x="${x - 6}" y="${carryY - 3}" width="12" height="6" rx="2" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // hoist rope + slate stack — size by tokens
      const slates = Math.min(4, Math.ceil(r.tok / maxTok * 4));
      const dropY = carryY + 22;
      g += `<line x1="${x}" y1="${carryY + 3}" x2="${x}" y2="${dropY}" stroke="${r.col}" stroke-width="1" ${r.err ? 'stroke-dasharray="3 2"' : ""}/>`;
      for (let s = 0; s < slates; s++) {
        g += `<rect x="${x - 10}" y="${(dropY + s * 4).toFixed(0)}" width="20" height="3.5" fill="${tint}" stroke="${r.col}" stroke-width=".6" opacity=".85"/>`;
      }
      // travelling crab for live sessions
      if (r.live) {
        g += `<g class="bd-crab" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <circle cx="${x - 12}" cy="${carryY}" r="2.5" fill="${r.col}"/>
          <circle cx="${x + 12}" cy="${carryY}" r="2.5" fill="${r.col}"/>
        </g>`;
      }
      // snapped rope on errors
      if (r.err) g += `<path d="M ${x + 6} ${dropY - 8} l 4 -6 m -4 0 l -4 -6" stroke="var(--red)" stroke-width="1.6" fill="none"/>`;
      // pit outline
      g += `<path d="M ${x - spanW / 2 - 8} ${pitY} L ${x - spanW / 3} ${pitY - 14} L ${x + spanW / 3} ${pitY - 14} L ${x + spanW / 2 + 8} ${pitY}" stroke="var(--line)" stroke-width="1" fill="none" opacity=".5"/>`;
      g += `<text x="${x}" y="${pitY + 18}" text-anchor="middle" class="bd-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "缆索采场", eyebrow: "PROVIDER BLONDIN", render };
})();
