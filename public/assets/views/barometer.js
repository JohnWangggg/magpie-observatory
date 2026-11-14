/* ------------------------------------------------------------- barometer
 * Barometer view — a ship's weather glass per quota window:
 * needle angle = burn rate, dial tint = remaining, a storm glyph when the
 * provider's error share crosses 15%.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "barometer";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  const P_MAX = 1040, P_MIN = 960;

  function pressureFor(w, live) {
    // burn 0–100 → 960–1040 hPa; live sessions push it up a little
    const burn = Math.max(0, Math.min(100, w.used || 0));
    const bump = Math.min(12, (live || 0) * 4);
    return P_MIN + (burn / 100) * (P_MAX - P_MIN) + bump;
  }

  function gauge(cx, cy, r, row) {
    const p = row.p;
    const frac = (p - P_MIN) / (P_MAX - P_MIN);
    const deg = -120 + frac * 240; // -120°…+120°
    const rad = deg * Math.PI / 180;
    const nx = cx + Math.sin(rad) * (r - 16), ny = cy - Math.cos(rad) * (r - 16);
    const tint = row.remaining > 50 ? "#68c078" : row.remaining > 20 ? "#e8c860" : "#e06048";
    // tick ring
    let ticks = "";
    for (let i = 0; i <= 10; i++) {
      const a = (-120 + i * 24) * Math.PI / 180;
      const x1 = cx + Math.sin(a) * (r - 6), y1 = cy - Math.cos(a) * (r - 6);
      const x2 = cx + Math.sin(a) * (r - (i % 5 === 0 ? 12 : 9)), y2 = cy - Math.cos(a) * (r - (i % 5 === 0 ? 12 : 9));
      ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--faint)" stroke-width="${i % 5 === 0 ? 1.4 : .7}"/>`;
    }
    const storm = row.errRate > .15 ? `<g class="ba-storm" transform="translate(${cx + r * .58},${cy - r * .55})">
      <path d="M -4 -6 q 2 -4 6 -2 q 4 -2 5 2 q 3 1 1 4 h -10 q -3 -1 -2 -4 z" fill="var(--red)" opacity=".85"/>
      <path d="M -1 0 l -3 6 h 3 l -3 6" stroke="var(--amber)" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    </g>` : "";
    return `<g class="ba-dial">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--card-2)" stroke="${tint}" stroke-width="2.5"/>
      ${ticks}
      <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="${tint}" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="3.4" fill="${tint}"/>
      <text x="${cx}" y="${cy + r * .55}" text-anchor="middle" class="ba-hpa">${p.toFixed(0)}</text>
      <text x="${cx}" y="${cy + r + 16}" text-anchor="middle" class="ba-lab">${esc(row.prov)} · ${esc(row.name)}</text>
      ${storm}
    </g>`;
  }

  function render(host, ctx) {
    const quotas = Array.isArray(ctx.quotas) ? ctx.quotas : [];
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const rows = [];
    quotas.forEach(q => {
      const prov = q.provider || "";
      const live = sessions.filter(s => (s.provider || "").toLowerCase() === prov.toLowerCase()).length;
      const provLogs = logs.filter(l => (l.provider || "").toLowerCase() === prov.toLowerCase());
      const errRate = provLogs.length ? provLogs.filter(l => l.status === "err" || l.status === "fail").length / provLogs.length : 0;
      (q.windows || []).forEach(w => {
        rows.push({ prov: q.name || prov, name: w.name, used: w.used, remaining: Math.max(0, 100 - (w.used || 0)), errRate, col: metaOf(prov).color || "#8b7cf6" });
      });
    });
    const top = rows.slice(0, 6).map(r => ({ ...r, p: pressureFor({ used: r.used }, liveCount(sessions, r.prov)) }));
    function liveCount(sessions, name) {
      return sessions.filter(s => (s.provider || "").toLowerCase().includes(String(name || "").split(" ")[0].toLowerCase())).length;
    }

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cols = Math.min(3, Math.max(1, top.length));
    const rowsN = Math.ceil(top.length / cols);
    const r = Math.min(W / cols / 2 - 16, H / rowsN / 2 - 30, 62);

    let g = "";
    top.forEach((row, i) => {
      const cx = (W / cols) * (i % cols + 0.5);
      const cy = (H / rowsN) * (Math.floor(i / cols) + 0.5) - 10;
      g += gauge(cx, cy, r, row);
    });

    if (!top.length) { host.innerHTML = `<div class="ba-empty">暂无配额窗</div>`; return; }
    host.innerHTML = `<svg class="ba-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "气压计", eyebrow: "BURN BAROMETER", render };
})();
