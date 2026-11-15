/* ------------------------------------------------------------------ manor
 * Manor view — a stately home per provider. Each quota window is a wing
 * of the house: window panes light with live sessions, the lawn ahead
 * fills by remaining quota, and smoke trails from the chimney on errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "manor";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const provGroups = new Map();
    quotas.forEach(q => {
      const prov = q.provider || q.name || "?";
      if (!provGroups.has(prov)) provGroups.set(prov, { prov, wins: [], col: metaOf(prov).color || "#8b7cf6" });
      (q.windows || []).forEach(w => provGroups.get(prov).wins.push({ name: w.name, used: w.used || 0, left: Math.max(0, 100 - (w.used || 0)) }));
    });
    const rows = [...provGroups.values()].slice(0, 3);
    if (!rows.length) { host.innerHTML = `<div class="mn-empty">暂无庄园</div>`; return; }

    let g = "";
    const pad = 22, colW = (W - pad * (rows.length + 1)) / rows.length;
    const ground = H * 0.8;

    rows.forEach((r, i) => {
      const x = pad + i * (colW + pad);
      const wings = r.wins.slice(0, 4);
      const wingW = colW / Math.max(1, wings.length);
      const err = logs.slice(-30).some(l => l.provider === r.prov && l.status === "err");
      const live = sessions.filter(s => s.provider === r.prov).length;

      // lawn strip
      const lawn = Math.min(...r.wins.map(w => w.left)) / 100;
      g += `<rect x="${x}" y="${ground}" width="${colW * lawn}" height="16" rx="3" fill="var(--accent)" opacity=".5"/>`;
      // path
      g += `<rect x="${x + colW * .45}" y="${ground}" width="${colW * .1}" height="${H - ground}" fill="var(--line)" opacity=".5"/>`;

      wings.forEach((w, j) => {
        const wx = x + j * wingW;
        const wingH = 48 + w.left * .3;
        const wy = ground - wingH;
        const tint = w.left > 50 ? "#68c078" : w.left > 20 ? "#e8c860" : "#e06048";

        // roofline
        g += `<path d="M ${wx - 4} ${wy + 6} L ${wx + wingW / 2} ${wy - 14} L ${wx + wingW + 4} ${wy + 6} Z" fill="var(--card-2)" stroke="${tint}" stroke-width="1.4"/>`;
        // body
        g += `<rect x="${wx}" y="${wy}" width="${wingW}" height="${wingH}" rx="2" fill="var(--card-2)" stroke="${tint}" stroke-width="1.4"/>`;
        // panes — lit per session share
        const panes = 2 + Math.min(4, live);
        for (let p = 0; p < panes; p++) {
          const px = wx + 6 + (p % 2) * (wingW - 14);
          const py = wy + 8 + Math.floor(p / 2) * 16;
          const lit = live > p;
          g += `<rect x="${px.toFixed(0)}" y="${py.toFixed(0)}" width="${(wingW - 18).toFixed(0)}" height="10" rx="1.5" fill="${lit ? r.col : "var(--line)"}" opacity="${lit ? .85 : .4}"/>`;
        }
        // chimney smoke if provider errs
        if (err && j === wings.length - 1) {
          for (let s = 0; s < 3; s++) {
            g += `<circle cx="${(wx + wingW * .78).toFixed(0)}" cy="${(wy - 12 - s * 10).toFixed(0)}" r="${2.6 - s * .5}" fill="var(--red)" opacity="${.7 - s * .2}">
              <animate attributeName="cy" values="${(wy - 12 - s * 10).toFixed(0)};${(wy - 34 - s * 10).toFixed(0)}" dur="2.2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="${.7 - s * .2};0" dur="2.2s" repeatCount="indefinite"/>
            </circle>`;
          }
        }
      });
      g += `<text x="${x + colW / 2}" y="${ground + 30}" text-anchor="middle" class="mn-lab">${esc(r.prov.split("/").pop().slice(0, 11))}${live ? "·" + live : ""}${err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="mn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "庄园", eyebrow: "PROVIDER MANOR", render };
})();
