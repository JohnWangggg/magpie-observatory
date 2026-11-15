/* ------------------------------------------------------------- clocktower
 * Clocktower view — the town-square clock. Each quota window is a dial
 * face; its hand swings to the reset countdown. Bells chime (bigger
 * swing) as the window nears reset.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "clocktower";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;

    const rows = [];
    quotas.forEach(q => {
      (q.windows || []).forEach(w => {
        const prov = q.provider || q.name || "?";
        const live = sessions.filter(s => (s.provider || "").toLowerCase().includes(String(prov).split(" ")[0].toLowerCase())).length;
        rows.push({ prov, name: w.name, used: w.used || 0, left: Math.max(0, 100 - (w.used || 0)), resetsIn: w.resetsIn, live, col: metaOf(prov).color || "#8b7cf6" });
      });
    });
    const top = rows.slice(0, 6);
    if (!top.length) { host.innerHTML = `<div class="ct2-empty">暂无配额窗</div>`; return; }

    const cols = Math.min(3, top.length);
    const rowsN = Math.ceil(top.length / cols);
    const dialR = Math.min(W / cols / 2 - 18, H / rowsN / 2 - 26, 58);

    let g = "";
    top.forEach((r, i) => {
      const cx = (W / cols) * (i % cols + 0.5);
      const cy = (H / rowsN) * (Math.floor(i / cols) + 0.5) - 8;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";

      // clock face
      g += `<g class="ct2-dial">
        <circle cx="${cx}" cy="${cy}" r="${dialR}" fill="var(--card-2)" stroke="${tint}" stroke-width="2.2"/>
        <circle cx="${cx}" cy="${cy}" r="${dialR * .86}" fill="none" stroke="var(--faint)" stroke-width=".5" stroke-dasharray="1 3"/>`;
      // tick marks
      for (let m = 0; m < 12; m++) {
        const a = m * 30 * Math.PI / 180;
        const x1 = cx + Math.sin(a) * (dialR * .78), y1 = cy - Math.cos(a) * (dialR * .78);
        const x2 = cx + Math.sin(a) * (dialR * .88), y2 = cy - Math.cos(a) * (dialR * .88);
        g += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--faint)" stroke-width="${m % 3 ? .6 : 1.2}"/>`;
      }
      // hand — angle maps used% to 0..360°
      const ang = (r.used / 100) * Math.PI * 2 - Math.PI / 2;
      const hx = cx + Math.cos(ang) * (dialR * .72), hy = cy + Math.sin(ang) * (dialR * .72);
      g += `<line x1="${cx}" y1="${cy}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="${tint}" stroke-width="2.6" stroke-linecap="round"/>`;
      g += `<circle cx="${cx}" cy="${cy}" r="4" fill="${tint}"/>`;
      // bell above — chime harder when resetsIn small
      const bellScale = r.resetsIn != null && r.resetsIn < 3600 ? 1.4 : 1;
      g += `<g class="ct2-bell" transform="translate(${cx},${cy - dialR - 10}) scale(${bellScale})">
        <path d="M -6 0 Q -7 -8 0 -9 Q 7 -8 6 0 Z" fill="${tint}"/>
        <circle cy="3" r="2" fill="${tint}"/>
      </g>`;
      // label
      g += `<text x="${cx}" y="${cy + dialR + 16}" text-anchor="middle" class="ct2-lab">${esc(r.prov)} · ${esc(r.name)}${r.live ? "·" + r.live : ""}</text>`;
      g += `</g>`;
    });

    host.innerHTML = `<svg class="ct2-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "钟楼", eyebrow: "QUOTA CLOCKTOWER", render };
})();
