/* ---------------------------------------------------------------- mandala
 * Mandala view — the day's sessions bloom as a radial mandala:
 *   petals = sessions (length = tokens, colour = agent, broken = failed),
 *   rings = tries, a bindu core at the centre.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "mandala";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 16);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H / 2;
    const R = Math.min(W, H) * 0.38;

    if (!sessions.length) { host.innerHTML = `<div class="md-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const maxTry = Math.max(...sessions.map(s => Number(s.tries) || 1), 1);
    let petals = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const tries = Number(s.tries) || 1;
      const failed = s.status === "error" || s.status === "failed";
      const ang = (i / sessions.length) * Math.PI * 2 - Math.PI / 2;
      const petalL = 20 + (tok / maxTok) * (R - 40);
      const px = cx + Math.cos(ang) * (petalL + 14), py = cy + Math.sin(ang) * (petalL + 14);
      const deg = (ang * 180 / Math.PI).toFixed(1);
      petals += `<g class="md-petal ${failed ? "broken" : ""}" style="animation-delay:${i * 60}ms"
          transform="rotate(${deg} ${cx} ${cy})">
        <ellipse cx="${cx + 14 + petalL / 2}" cy="${cy}" rx="${(petalL / 2).toFixed(1)}" ry="${(6 + tries / maxTry * 5).toFixed(1)}"
          fill="${col}" opacity="${failed ? ".3" : ".7"}"/>
        <ellipse cx="${cx + 14 + petalL / 2}" cy="${cy}" rx="${(petalL / 3).toFixed(1)}" ry="${(3 + tries / maxTry * 2).toFixed(1)}"
          fill="rgba(255,255,255,.15)" opacity="${failed ? ".2" : ".5"}"/>
        <circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(2 + tries / maxTry * 2).toFixed(1)}" fill="${col}" opacity=".9"/>
        <title>${esc(s.title)} · ${s.agent} · ${s.tries} tries · ${tok} tok</title>
      </g>`;
      // try rings around the tip
      for (let t = 0; t < tries; t++) {
        const tr = 4 + t * 5;
        petals += `<circle class="md-try" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${tr}" fill="none"
          stroke="${col}" stroke-width=".7" opacity="${(0.5 - t * 0.08).toFixed(2)}"/>`;
      }
    });

    // centre bindu + concentric guides
    const bindu = `<circle class="md-bindu" cx="${cx}" cy="${cy}" r="6" fill="rgba(255,255,255,.85)"/>
      <circle class="md-ring" cx="${cx}" cy="${cy}" r="${R * 0.3}" fill="none" stroke="rgba(255,255,255,.08)" stroke-dasharray="2,4"/>
      <circle class="md-ring" cx="${cx}" cy="${cy}" r="${R * 0.6}" fill="none" stroke="rgba(255,255,255,.06)" stroke-dasharray="2,4"/>
      <circle class="md-ring" cx="${cx}" cy="${cy}" r="${R * 0.9}" fill="none" stroke="rgba(255,255,255,.05)" stroke-dasharray="2,4"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="ml-item ${failed ? "bad" : ""}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 10))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="md-wrap">
        <div class="md-legend">${legend}<span class="ml-tip">瓣=会话 · 环=尝试 · 色=Agent</span></div>
        <svg class="md-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${bindu}${petals}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "曼陀罗",
    eyebrow: "MANDALA",
    render
  };
})();
