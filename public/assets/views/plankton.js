/* --------------------------------------------------------------- plankton
 * Plankton view — a slow drifting soup of request dots. Each recent log
 * is a drifting particle coloured by provider; errors pulse red and
 * sessions glow on top. Hover reveals the model + provider.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "plankton";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const logs = ctx.data.logs || [];
    const sessions = ctx.data.sessions || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const dots = logs.slice(-160).map((l, i) => {
      const col = l.status === "err" ? "#e06048" : (metaOf(l.provider).color || "#8b7cf6");
      const x = (i * 89.7 + 13) % W, y = (i * 61.3 + 29) % H;
      const sz = 1.2 + Math.min(4, (l.tokens || 0) / 12000);
      return { x, y, sz, col, l };
    });

    let g = "";
    dots.forEach(d => {
      g += `<circle class="pk-dot" cx="${d.x.toFixed(1)}" cy="${d.y.toFixed(1)}" r="${d.sz.toFixed(1)}" fill="${d.col}" opacity=".7" data-model="${esc(d.l.model || "?")}" data-prov="${esc(d.l.provider || "?")}"/>`;
    });

    // sessions as larger haloed dots
    sessions.forEach((s, i) => {
      const x = (i * 137.9 + 50) % W, y = (i * 91.1 + 60) % H;
      const col = metaOf(s.provider).color || "#8b7cf6";
      g += `<g class="pk-live">
        <circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${4 + i % 3}" fill="none" stroke="${col}" stroke-width="1.4" opacity=".85">
          <animate attributeName="r" values="${4 + i % 3};${9 + i % 3}" dur="${1.8 + i * .3}s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".85;0" dur="${1.8 + i * .3}s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="3" fill="${col}"/>
      </g>`;
    });

    // slow drift on the whole layer
    host.innerHTML = `<svg class="pk-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <g class="pk-drift">${g}</g>
    </svg>`;

    host.querySelectorAll(".pk-dot").forEach(el => {
      el.addEventListener("mouseenter", () => {
        el.setAttribute("r", parseFloat(el.getAttribute("r")) + 3);
        el.setAttribute("opacity", "1");
      });
      el.addEventListener("mouseleave", () => {
        el.setAttribute("r", parseFloat(el.getAttribute("r")) - 3);
        el.setAttribute("opacity", ".7");
      });
    });
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "浮游群", eyebrow: "LOG PLANKTON", render };
})();
