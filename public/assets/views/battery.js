/* ----------------------------------------------------------------- battery
 * Battery view — an earthwork gun battery, one embrasure per
 * provider. Smoke drift above the barrel = tokens; a gun captain
 * stands by for live sessions; a burst barrel marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "battery";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const rampY = H * .72;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="bt-empty">暂无炮垒</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // earthwork parapet
    g += `<path d="M 0 ${rampY} Q ${W / 2} ${rampY - 24} ${W} ${rampY} L ${W} ${H} L 0 ${H} Z" fill="var(--card-3)"/>`;
    g += `<path d="M 0 ${rampY} Q ${W / 2} ${rampY - 24} ${W} ${rampY}" fill="none" stroke="var(--line)" stroke-width="1.4"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const embrY = rampY - 14 + Math.sin((i / rows.length) * Math.PI) * -8;
      const tint = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e8c860" : "#68c078";
      // embrasure notch
      g += `<path d="M ${x - seg * .3} ${embrY} L ${x - seg * .3} ${rampY + 10} L ${x + seg * .3} ${rampY + 10} L ${x + seg * .3} ${embrY} Z" fill="var(--bg)" stroke="${r.col}" stroke-width="1.4"/>`;
      // barrel protruding
      const barrelL = seg * .28;
      g += `<rect x="${x - barrelL / 2}" y="${embrY - 3}" width="${barrelL}" height="6" rx="3" fill="var(--card-2)" stroke="${r.err ? "var(--red)" : r.col}" stroke-width="1.2"/>`;
      g += `<circle cx="${x + barrelL / 2}" cy="${embrY}" r="3.5" fill="var(--card-2)" stroke="${r.col}" stroke-width="1"/>`;
      if (r.err) g += `<path d="M ${x - barrelL * .2} ${embrY - 5} L ${x + barrelL * .1} ${embrY + 5} L ${x - barrelL * .05} ${embrY - 5}" stroke="var(--red)" stroke-width="1.4" fill="none"/>`;
      // smoke puffs — count by tokens
      const puffs = Math.min(6, Math.ceil(r.tok / maxTok * 6));
      for (let s = 0; s < puffs; s++) {
        const sx = x + barrelL / 2 + 4 + s * 7;
        const sy = embrY - 6 - s * 5;
        g += `<circle class="bt-smoke" style="animation-delay: ${(i * .3 + s * .15).toFixed(1)}s" cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="${(5 - s * .7).toFixed(1)}" fill="${tint}" opacity="${(.9 - s * .12).toFixed(1)}"/>`;
      }
      // gun captain for live sessions
      if (r.live) {
        g += `<g class="bt-captain" style="animation-delay: ${(i * .3).toFixed(1)}s">
          <rect x="${x - barrelL / 2 - 12}" y="${rampY - 2}" width="8" height="14" rx="2" fill="${r.col}" opacity=".8"/>
          <circle cx="${x - barrelL / 2 - 8}" cy="${rampY - 8}" r="4" fill="${r.col}" opacity=".8"/>
        </g>`;
      }
      g += `<text x="${x}" y="${H - 10}" text-anchor="middle" class="bt-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "炮垒", eyebrow: "PROVIDER BATTERY", render };
})();
