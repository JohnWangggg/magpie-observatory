/* -------------------------------------------------------------- fireescape
 * Fire-escape view — a building facade of zig-zag stairs, one per
 * quota window. The stair depth scales with tokens burned; small
 * figures climb for live sessions; a red window marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fireescape";
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
    if (!top.length) { host.innerHTML = `<div class="fe-empty">暂无立面</div>`; return; }

    const pad = 24, seg = (W - pad * 2) / top.length;
    const roofY = 24;
    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // parapet line
    g += `<line y="${roofY}" x2="${W}" y2="${roofY}" stroke="var(--line)" stroke-width="1.6"/>`;

    top.forEach((r, i) => {
      const x = pad + i * seg + seg / 2;
      const fh = H * .66;
      const baseY = roofY + fh;
      const tint = r.left > 50 ? "#68c078" : r.left > 20 ? "#e8c860" : "#e06048";
      // facade
      g += `<rect x="${(x - seg * .32).toFixed(0)}" y="${roofY + 8}" width="${(seg * .64).toFixed(0)}" height="${(baseY - roofY - 8).toFixed(0)}" fill="var(--card-2)" stroke="${r.col}" stroke-width="1.4"/>`;
      // zig-zag stairs — number of runs = usage depth
      const runs = 3 + Math.floor(r.used / 34);
      const runH = (baseY - roofY - 12) / runs;
      for (let s = 0; s < runs; s++) {
        const y1 = roofY + 12 + s * runH, y2 = roofY + 12 + (s + 1) * runH;
        const x1 = x - seg * .24 + (s % 2) * seg * .12, x2 = x + seg * .24 - (s % 2) * seg * .12;
        g += `<line x1="${x1.toFixed(0)}" y1="${y1.toFixed(0)}" x2="${x2.toFixed(0)}" y2="${y2.toFixed(0)}" stroke="${tint}" stroke-width="1.8"/>`;
        // tread marks
        for (let t = 0; t < 4; t++) {
          const tx = x1 + (x2 - x1) * t / 3, ty = y1 + (y2 - y1) * t / 3;
          g += `<line x1="${tx.toFixed(0)}" y1="${ty.toFixed(0)}" x2="${tx.toFixed(0)}" y2="${(ty - 4).toFixed(0)}" stroke="${tint}" stroke-width=".7" opacity=".5"/>`;
        }
      }
      // landing platforms at top and mid
      g += `<rect x="${(x - seg * .28).toFixed(0)}" y="${roofY + 8}" width="${(seg * .56).toFixed(0)}" height="4" fill="${r.col}" opacity=".3"/>`;
      g += `<rect x="${(x - seg * .28).toFixed(0)}" y="${(roofY + baseY) / 2}" width="${(seg * .56).toFixed(0)}" height="4" fill="${r.col}" opacity=".3"/>`;
      // figures on stairs for live sessions
      for (let s = 0; s < Math.min(3, r.live); s++) {
        const fy = roofY + 14 + (s * (baseY - roofY - 20)) / 3;
        const fx = x - seg * .2 + s * seg * .18;
        g += `<g class="fe-fig" style="animation-delay: ${(s * .4).toFixed(1)}s">
          <circle cx="${fx.toFixed(0)}" cy="${fy.toFixed(0)}" r="3" fill="${r.col}"/>
          <line x1="${fx.toFixed(0)}" y1="${fy + 3}" x2="${fx.toFixed(0)}" y2="${fy + 9}" stroke="${r.col}" stroke-width="1.4"/>
          <line x1="${fx.toFixed(0)}" y1="${fy + 6}" x2="${(fx - 4).toFixed(0)}" y2="${fy + 10}" stroke="${r.col}" stroke-width="1"/>
          <line x1="${fx.toFixed(0)}" y1="${fy + 6}" x2="${(fx + 4).toFixed(0)}" y2="${fy + 10}" stroke="${r.col}" stroke-width="1"/>
        </g>`;
      }
      // red window for errors — upper pane glows
      if (r.err) {
        g += `<rect x="${(x - seg * .12).toFixed(0)}" y="${roofY + 14}" width="${(seg * .24).toFixed(0)}" height="${(seg * .24).toFixed(0)}" fill="var(--red)" opacity=".7"/>`;
        g += `<line x1="${x - seg * .12}" y1="${roofY + 14}" x2="${x + seg * .12}" y2="${roofY + 14 + seg * .24}" stroke="var(--red)" stroke-width="1"/>`;
      }
      g += `<text x="${x}" y="${baseY + 20}" text-anchor="middle" class="fe-lab">${esc(r.prov.split("/").pop().slice(0, 8))} ${r.used}%${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="fe-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "消防梯", eyebrow: "QUOTA FIREESCAPE", render };
})();
