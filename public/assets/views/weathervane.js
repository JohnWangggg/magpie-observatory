/* ------------------------------------------------------------- weathervane
 * Weathervane view — a rooftop arrow that swings to the provider with
 * the hottest last-minute traffic. Wind streaks blow in the direction
 * of the load; a rooster sits on top like the classic barn ornament.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "weathervane";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H / 2 - 20, arm = Math.min(W, H) / 2 - 34;

    const provN = new Map();
    sessions.forEach(s => provN.set(s.provider, (provN.get(s.provider) || 0) + 1));
    const hot = [...provN.entries()].sort((a, b) => b[1] - a[1]);

    let g = `<line x1="0" y1="${cy + arm + 24}" x2="${W}" y2="${cy + arm + 24}" stroke="var(--line)" stroke-width="2"/>`;
    // rooftop base
    g += `<path d="M ${cx - 44} ${cy + arm + 24} L ${cx} ${cy + arm - 4} L ${cx + 44} ${cy + arm + 24} Z" fill="var(--card-2)" stroke="var(--line)" stroke-width="1.4"/>`;
    // N/S/E/W letters
    ["N","S","E","W"].forEach((d, i) => {
      const ang = [0, 180, 90, 270][i] * Math.PI / 180;
      const x = cx + Math.sin(ang) * (arm + 12), y = cy - Math.cos(ang) * (arm + 12);
      g += `<text x="${x.toFixed(0)}" y="${(y + 3).toFixed(0)}" text-anchor="middle" class="wv-dir">${d}</text>`;
    });
    // wind streaks — drifting lines behind the arrow
    for (let i = 0; i < 14; i++) {
      const sy = cy - arm * 0.8 + (i * 53.7) % (arm * 1.6);
      const sx = (i * 71.3) % W;
      const len = 20 + (i % 4) * 10;
      g += `<line x1="${sx.toFixed(0)}" y1="${sy.toFixed(0)}" x2="${(sx + len).toFixed(0)}" y2="${sy.toFixed(0)}" stroke="var(--faint)" stroke-width=".5" opacity=".4" class="wv-wind" style="animation-delay: ${(i * .3).toFixed(1)}s"/>`;
    }
    // the arrow — swings to the top provider
    const topP = hot[0];
    if (topP) {
      const col = metaOf(topP[0]).color || "#8b7cf6";
      g += `<g class="wv-arrow" style="transform-origin: ${cx}px ${cy}px;">
        <line x1="${cx}" y1="${cy}" x2="${cx + arm}" y2="${cy}" stroke="${col}" stroke-width="3" stroke-linecap="round"/>
        <path d="M ${cx + arm} ${cy} L ${cx + arm - 16} ${cy - 8} L ${cx + arm - 16} ${cy + 8} Z" fill="${col}"/>
        <circle cx="${cx}" cy="${cy}" r="6" fill="var(--card-2)" stroke="${col}" stroke-width="2"/>
      </g>`;
      // rooster on top (crude but recognizable)
      g += `<g class="wv-bird" transform="translate(${cx},${cy - 38})">
        <circle r="6" fill="var(--accent)"/>
        <path d="M -4 -4 L 0 -14 L 4 -4 Z" fill="var(--accent)" opacity=".9"/>
        <circle cx="3" cy="-4" r="1.2" fill="var(--bg)"/>
        <path d="M 6 2 L 12 6 M 6 4 L 10 10" stroke="var(--accent)" stroke-width="1.4" stroke-linecap="round"/>
      </g>`;
      g += `<text x="${cx}" y="${cy + arm + 44}" text-anchor="middle" class="wv-hd">${esc(topP[0].split("/").pop().slice(0, 12))} · ${topP[1]} live</text>`;
    }
    // second arrow for runner-up
    if (hot[1]) {
      const col2 = metaOf(hot[1][0]).color || "#8b7cf6";
      g += `<g class="wv-arrow2" style="transform-origin: ${cx}px ${cy}px; transform: rotate(40deg);">
        <line x1="${cx}" y1="${cy}" x2="${cx + arm * .72}" y2="${cy}" stroke="${col2}" stroke-width="1.6" opacity=".55"/>
        <path d="M ${cx + arm * .72} ${cy} L ${cx + arm * .72 - 12} ${cy - 6} L ${cx + arm * .72 - 12} ${cy + 6} Z" fill="${col2}" opacity=".55"/>
      </g>`;
    }

    host.innerHTML = `<svg class="wv-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
    // swing the arrow to face the winner's "direction" — we just rotate it
    // a bit each render for the motion cue; data decides the label below.
    const arrow = host.querySelector(".wv-arrow");
    if (arrow) arrow.style.animation = "wvswing 3.4s ease-in-out infinite";
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "风向标", eyebrow: "PROVIDER VANE", render };
})();
