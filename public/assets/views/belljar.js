/* ----------------------------------------------------------------- belljar
 * Bell-jar view — a glass cloche per provider on a workbench. Plant
 * height inside = tokens; condensation beads on the glass for live
 * sessions; a crack in the dome marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "belljar";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const benchY = H * 0.84;

    const provTok = new Map();
    logs.forEach(l => provTok.set(l.provider, (provTok.get(l.provider) || 0) + (l.tokens || 0)));
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);

    if (!rows.length) { host.innerHTML = `<div class="bj-empty">暂无罩瓶</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // bench top
    g += `<rect y="${benchY}" width="${W}" height="${H - benchY}" fill="var(--card-2)"/>`;
    g += `<line y="${benchY}" x2="${W}" y2="${benchY}" stroke="var(--line)" stroke-width="1.8"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const domeR = 22 + (r.tok / maxTok) * 26;
      const domeY = benchY;
      const topY = domeY - domeR * 1.35;
      const tint = "#68c078";
      // wooden base
      g += `<ellipse cx="${x}" cy="${benchY + 4}" rx="${(domeR + 6).toFixed(0)}" ry="5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1.2"/>`;
      // glass dome — bell shape
      const domePath = `M ${x - domeR} ${domeY} L ${x - domeR} ${topY + 10} Q ${x - domeR} ${topY - 4} ${x} ${topY - 4} Q ${x + domeR} ${topY - 4} ${x + domeR} ${topY + 10} L ${x + domeR} ${domeY} Z`;
      g += `<path d="${domePath}" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.4" opacity=".85"/>`;
      // glass shine
      g += `<path d="M ${x - domeR * .5} ${topY + 6} Q ${x - domeR * .6} ${domeY * .6} ${x - domeR * .3} ${domeY - 4}" stroke="#fff" stroke-width="1.2" fill="none" opacity=".2"/>`;
      // plant inside — fern fronds
      const fronds = 3 + Math.floor(r.tok / maxTok * 3);
      for (let f = 0; f < fronds; f++) {
        const fa = (f / fronds) * Math.PI * .9 - Math.PI * .45;
        const fx = x + Math.cos(fa) * domeR * .5;
        const fy = domeY - domeR * (.3 + (f % 3) * .2);
        g += `<path d="M ${x} ${domeY - 4} Q ${x + (fx - x) * .5} ${(domeY + fy) / 2} ${fx.toFixed(0)} ${fy.toFixed(0)}" stroke="${tint}" stroke-width="1.4" fill="none" opacity=".8"/>`;
        // leaflets
        for (let l = 0; l < 3; l++) {
          const ly = domeY - 4 - (domeY - fy) * (l + 1) / 4;
          g += `<ellipse cx="${(x + (fx - x) * (l + 1) / 4).toFixed(0)}" cy="${ly.toFixed(0)}" rx="3" ry="1.4" fill="${tint}" opacity=".6"/>`;
        }
      }
      // condensation beads for live sessions
      for (let s = 0; s < Math.min(3, r.live); s++) {
        const bx = x - domeR * .4 + s * (domeR * .4), by = topY + 8 + s * 10;
        g += `<circle cx="${bx.toFixed(0)}" cy="${by.toFixed(0)}" r="1.6" fill="#fff" opacity=".5"/>`;
      }
      // crack on errors
      if (r.err) g += `<path d="M ${x - domeR * .3} ${topY + 4} l 4 ${domeR * .2} l -3 ${domeR * .15} l 4 ${domeR * .2}" stroke="var(--red)" stroke-width="1.2" fill="none" opacity=".8"/>`;
      g += `<text x="${x}" y="${benchY + 20}" text-anchor="middle" class="bj-lab">${esc(r.name.split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="bj-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "钟形罩", eyebrow: "PROVIDER BELLJAR", render };
})();
