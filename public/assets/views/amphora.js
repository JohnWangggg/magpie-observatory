/* ----------------------------------------------------------------- amphora
 * Amphora view — a row of two-handled jars, one per provider. Wine
 * level inside = remaining quota; the painted band = tokens burned;
 * a tilted amphora marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "amphora";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const rows = [];
    quotas.forEach(q => {
      const prov = q.provider || q.name || "?";
      const live = sessions.filter(s => (s.provider || "").toLowerCase().includes(String(prov).split(" ")[0].toLowerCase())).length;
      const err = logs.slice(-30).some(l => l.provider === prov && l.status === "err");
      (q.windows || []).forEach(w => {
        rows.push({ prov, name: w.name, used: w.used || 0, left: Math.max(0, 100 - (w.used || 0)), live, err, col: metaOf(prov).color || "#8b7cf6" });
      });
    });
    const top = rows.slice(0, 5);
    if (!top.length) { host.innerHTML = `<div class="am-empty">暂无酒瓮</div>`; return; }

    const shelfY = H * 0.86;
    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // shelf line
    g += `<line y="${shelfY}" x2="${W}" y2="${shelfY}" stroke="var(--line)" stroke-width="1.8"/>`;
    g += `<line y="${shelfY + 6}" x2="${W}" y2="${shelfY + 6}" stroke="var(--faint)" stroke-width=".8" opacity=".5"/>`;

    const seg = W / (top.length + 1);
    top.forEach((r, i) => {
      const x = seg * (i + 1);
      const bodyH = 54 + (r.used / 100) * 44;
      const bodyW = 30 + (r.used / 100) * 14;
      const baseY = shelfY;
      const shoulderY = baseY - bodyH;
      const neckY = shoulderY - 14;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      const tilt = r.err ? -14 : 0;

      g += `<g transform="rotate(${tilt} ${x} ${baseY})">
        <!-- handles -->
        <path d="M ${x - bodyW * .45} ${neckY} C ${x - bodyW * .8} ${shoulderY - 6} ${x - bodyW * .8} ${baseY - 10} ${x - bodyW * .5} ${baseY - 14}" stroke="${r.col}" stroke-width="2" fill="none"/>
        <path d="M ${x + bodyW * .45} ${neckY} C ${x + bodyW * .8} ${shoulderY - 6} ${x + bodyW * .8} ${baseY - 10} ${x + bodyW * .5} ${baseY - 14}" stroke="${r.col}" stroke-width="2" fill="none"/>
        <!-- foot -->
        <path d="M ${x - bodyW * .3} ${baseY} L ${x - bodyW * .38} ${baseY + 6} L ${x + bodyW * .38} ${baseY + 6} L ${x + bodyW * .3} ${baseY} Z" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>
        <!-- body -->
        <path d="M ${x - bodyW * .3} ${baseY} C ${x - bodyW * .5} ${shoulderY + 10} ${x - bodyW * .45} ${shoulderY} ${x - bodyW * .18} ${neckY} L ${x + bodyW * .18} ${neckY} C ${x + bodyW * .45} ${shoulderY} ${x + bodyW * .5} ${shoulderY + 10} ${x + bodyW * .3} ${baseY} Z" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.6"/>
        <!-- neck + rim -->
        <rect x="${x - bodyW * .16}" y="${neckY - 10}" width="${bodyW * .32}" height="10" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>
        <ellipse cx="${x}" cy="${neckY - 10}" rx="${bodyW * .2}" ry="4" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.2"/>
        <!-- wine surface inside body -->
        <clipPath id="amclip${i}"><path d="M ${x - bodyW * .3} ${baseY} C ${x - bodyW * .5} ${shoulderY + 10} ${x - bodyW * .45} ${shoulderY} ${x - bodyW * .18} ${neckY} L ${x + bodyW * .18} ${neckY} C ${x + bodyW * .45} ${shoulderY} ${x + bodyW * .5} ${shoulderY + 10} ${x + bodyW * .3} ${baseY} Z"/></clipPath>
        <rect x="${x - bodyW}" y="${(baseY - bodyH * (r.left / 100)).toFixed(0)}" width="${bodyW * 2}" height="${(bodyH * (r.left / 100)).toFixed(0)}" fill="${tint}" opacity=".45" clip-path="url(#amclip${i})"/>
        <!-- painted band — burns -->
        <rect x="${x - bodyW * .4}" y="${shoulderY + 6}" width="${bodyW * .8}" height="8" fill="${r.col}" opacity=".35"/>
        <!-- figure dots for live sessions -->
        ${Array.from({ length: Math.min(3, r.live) }, (_, s) => `<circle cx="${(x + (s - 1) * 7).toFixed(0)}" cy="${shoulderY + 10}" r="2" fill="${r.col}" opacity=".9"/>`).join("")}
      </g>`;
      g += `<text x="${x}" y="${shelfY + 24}" text-anchor="middle" class="am-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.left}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="am-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "双耳瓶", eyebrow: "PROVIDER AMPHORA", render };
})();
