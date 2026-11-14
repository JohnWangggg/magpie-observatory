/* ---------------------------------------------------------------- fountain
 * Fountain view — sessions as water jets over a basin:
 *   jet height = tokens, colour = agent, sputter = failed.
 *   Arcs rise from the basin and droplets fall back.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fountain";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 67;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 7);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const basinY = H * 0.82;

    if (!sessions.length) { host.innerHTML = `<div class="ft-empty">暂无会话</div>`; return; }

    seed = 67;
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const n = sessions.length;
    let jets = "", drops = "";

    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#56d4dd";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const x = W * 0.14 + (i / Math.max(1, n - 1)) * W * 0.72;
      const h = 24 + (tok / maxTok) * H * 0.44;
      // parabolic jet: rise then fall
      const peak = basinY - h;
      const spread = 12 + (tok / maxTok) * 22;
      jets += `<path class="ft-jet ${failed ? "sput" : ""}" d="M${x.toFixed(0)},${basinY} C${(x - spread * 0.5).toFixed(0)},${(basinY - h * 0.7).toFixed(0)} ${(x - spread * 0.3).toFixed(0)},${(peak + 4).toFixed(0)} ${x.toFixed(0)},${peak.toFixed(0)} C${(x + spread * 0.5).toFixed(0)},${(basinY - h * 0.7).toFixed(0)} ${(x + spread).toFixed(0)},${(basinY - 4).toFixed(0)} ${(x + spread * 1.1).toFixed(0)},${basinY}"
          fill="none" stroke="${col}" stroke-width="${(2 + (tok / maxTok) * 3).toFixed(1)}" opacity="${failed ? ".4" : ".65"}"
          stroke-linecap="round" style="animation-delay:${i * 160}ms">
          <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
        </path>`;
      // droplets at the peak
      for (let d = 0; d < 4; d++) {
        const dx2 = (rnd() - 0.5) * spread * 1.6;
        drops += `<circle class="ft-drop" cx="${(x + dx2).toFixed(0)}" cy="${peak.toFixed(0)}" r="${(1 + rnd() * 1.4).toFixed(1)}"
            fill="${col}" opacity=".6" style="animation-delay:${i * 160 + d * 90}ms"/>`;
      }
    });

    // basin
    const basin = `<ellipse class="ft-basin" cx="${W * 0.5}" cy="${basinY}" rx="${W * 0.4}" ry="${H * 0.1}"
        fill="rgba(50,80,120,.45)"/>
      <ellipse class="ft-rim" cx="${W * 0.5}" cy="${basinY}" rx="${W * 0.4}" ry="${H * 0.1}"
        fill="none" stroke="rgba(120,160,200,.35)" stroke-width="1.4"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="fi-item ${failed ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="ft-wrap">
        <div class="ft-legend">${legend}<span class="fi-tip">喷=会话 · 高=Token · 溅=失败</span></div>
        <svg class="ft-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${basin}${jets}${drops}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "喷泉",
    eyebrow: "FOUNTAIN",
    render
  };
})();
