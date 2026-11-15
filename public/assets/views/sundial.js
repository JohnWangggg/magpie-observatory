/* ---------------------------------------------------------------- sundial
 * Sundial view — the last-12h rhythm drawn as a real sundial: gnomon
 * shadow sweeps with the hour hand, minute ticks etched, each active
 * session plants a pebble at its hour marker.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sundial";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H / 2 + 20, R = Math.min(W, H) / 2 - 28;
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    // hour hand angle: 0=up (noon), ±90°=horizon
    const hourAng = ((hours - 12) / 12) * Math.PI;
    const sx = cx + Math.sin(hourAng) * R * 0.72, sy = cy - Math.cos(hourAng) * R * 0.72;

    let g = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="var(--card-2)" stroke="var(--line)" stroke-width="2"/>`;
    // face texture: inner ring + hour marks (24h on half-circle → 12 marks)
    for (let h = 0; h < 24; h++) {
      const a = ((h - 12) / 12) * Math.PI;
      const major = h % 6 === 0;
      const x1 = cx + Math.sin(a) * (R - 10), y1 = cy - Math.cos(a) * (R - 10);
      const x2 = cx + Math.sin(a) * (R - (major ? 22 : 16)), y2 = cy - Math.cos(a) * (R - (major ? 22 : 16));
      g += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--faint)" stroke-width="${major ? 1.6 : .7}"/>`;
      if (major) {
        const lx = cx + Math.sin(a) * (R - 34), ly = cy - Math.cos(a) * (R - 34);
        g += `<text x="${lx.toFixed(0)}" y="${(ly + 3).toFixed(0)}" text-anchor="middle" class="sd-h">${["0", "6", "12", "18", "24"][h / 6] ?? ""}</text>`;
      }
    }
    // horizon: a base plate where shadow lands
    g += `<line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="var(--line)" stroke-width="2.4"/>`;

    // pebbles per active session at its hour mark
    sessions.forEach((s, i) => {
      const t = new Date(s.since || s.started || Date.now());
      const hh = t.getHours() + t.getMinutes() / 60;
      const a = ((hh - 12) / 12) * Math.PI;
      const r = R * (0.3 + 0.5 * (i % 4) / 3);
      const x = cx + Math.sin(a) * r, y = cy - Math.cos(a) * r;
      const col = metaOf(s.provider).color || "#8b7cf6";
      g += `<g class="sd-pebble">
        <circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="4" fill="${col}" opacity=".9"/>
        <circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="7" fill="none" stroke="${col}" stroke-width=".5" opacity=".4">
          <animate attributeName="r" values="7;11" dur="1.6s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".4;0" dur="1.6s" repeatCount="indefinite"/>
        </circle>
      </g>`;
    });

    // gnomon: center pin + shadow line to the horizon
    g += `<g class="sd-gnomon">
      <line x1="${cx}" y1="${cy}" x2="${sx.toFixed(0)}" y2="${sy.toFixed(0)}" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="6" fill="var(--accent)"/>
      <path d="M ${cx} ${cy} L ${cx - 6} ${cy - 26} L ${cx + 6} ${cy - 26} Z" fill="var(--accent)" opacity=".8"/>
    </g>`;
    // shadow cast on the base plate
    g += `<line x1="${cx}" y1="${cy}" x2="${cx + (sx - cx) * 1.4}" y2="${cy}" stroke="var(--faint)" stroke-width="5" opacity=".35" stroke-linecap="round"/>`;

    host.innerHTML = `<svg class="sd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "日晷", eyebrow: "HOUR SUNDIAL", render };
})();
