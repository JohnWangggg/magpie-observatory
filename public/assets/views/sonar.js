/* ----------------------------------------------------------------- sonar
 * Sonar view — a rotating sweep paints provider contacts on a phosphor
 * display. Active sessions ping; errors flare red on the last pass.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "sonar";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 24;

    const provs = [...new Set([...sessions.map(s => s.provider), ...logs.slice(-60).map(l => l.provider)])].filter(Boolean);
    const errProvs = new Set(logs.slice(-30).filter(l => l.status === "err" || l.status === "fail").map(l => l.provider));

    let contacts = "";
    provs.forEach((p, i) => {
      const ang = (i / Math.max(1, provs.length)) * Math.PI * 2 - Math.PI / 2 + 0.4 * i;
      const r = R * (0.25 + 0.7 * (0.3 + 0.7 * (i % 4) / 3));
      const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r;
      const live = sessions.filter(s => s.provider === p).length;
      const err = errProvs.has(p);
      const col = err ? "#e06048" : (metaOf(p).color || "#8b7cf6");
      contacts += `<g class="sn-contact ${err ? "sn-err" : ""}" data-prov="${esc(p)}" data-live="${live}">
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${3 + Math.min(8, live * 2.5)}" fill="${col}" opacity=".9">
          <animate attributeName="opacity" values=".9;.4;.9" dur="${1.4 + i * .2}s" repeatCount="indefinite"/>
        </circle>
        ${live > 0 ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${5 + live * 3}" fill="none" stroke="${col}" stroke-width=".7" opacity=".5">
          <animate attributeName="r" values="${5 + live * 3};${12 + live * 3}" dur="1.8s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".5;0" dur="1.8s" repeatCount="indefinite"/>
        </circle>` : ""}
        <text x="${x.toFixed(1)}" y="${(y - 10).toFixed(1)}" text-anchor="middle" class="sn-lab">${esc(p.split("/").pop().slice(0, 9))}${live ? "·" + live : ""}</text>
      </g>`;
    });

    host.innerHTML = `<svg class="sn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="sn-sweep" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#7df" stop-opacity="0"/>
          <stop offset="100%" stop-color="#7df" stop-opacity=".9"/>
        </linearGradient>
      </defs>
      <circle cx="${cx}" cy="${cy}" r="${R}" fill="var(--card-2)" stroke="var(--line)" stroke-width="1.5"/>
      ${[0.25, 0.5, 0.75, 1].map(f => `<circle cx="${cx}" cy="${cy}" r="${(R * f).toFixed(1)}" fill="none" stroke="var(--line)" stroke-width=".5" stroke-dasharray="2 4"/>`).join("")}
      <line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="var(--line)" stroke-width=".4"/>
      <line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="var(--line)" stroke-width=".4"/>
      <g class="sn-sweep" transform="rotate(0 ${cx} ${cy})" style="transform-origin: ${cx}px ${cy}px; animation: snspin 4s linear infinite;">
        <line x1="${cx}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="url(#sn-sweep)" stroke-width="2" stroke-linecap="round"/>
      </g>
      ${contacts}
    </svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "声呐", eyebrow: "PROVIDER SONAR", render };
})();
