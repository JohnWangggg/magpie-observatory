/* ---------------------------------------------------------------- spectrum
 * Spectrum view — the token stream as a frequency spectrum:
 *   each session is a peak band (height = tokens, colour = agent,
 *   bandwidth = tries); a mirror below the baseline for the "bass"
 *   echo. Bars bounce to a beat.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "spectrum";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 24);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const base = H * 0.55;
    const maxBar = H * 0.42;

    if (!sessions.length) { host.innerHTML = `<div class="sp-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const n = sessions.length;
    const bw = Math.min(20, (W - 40) / n - 4);

    let bars = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const tries = Number(s.tries) || 1;
      const failed = s.status === "error" || s.status === "failed";
      const x = 20 + i * ((W - 40) / n) + 2;
      const h = 4 + (tok / maxTok) * maxBar;
      const bw2 = Math.max(3, bw * (0.5 + tries / 6));
      const beat = 0.8 + (i % 5) * 0.12;
      bars += `<g class="sp-bar ${failed ? "bad" : ""}" style="animation-delay:${i * 40}ms">
        <rect class="sp-top" x="${x.toFixed(1)}" y="${base - h}" width="${bw2.toFixed(1)}" height="${h.toFixed(1)}"
          fill="${col}" opacity="${failed ? ".35" : ".8"}" rx="1.5" style="animation-duration:${beat.toFixed(1)}s"/>
        <rect class="sp-mirror" x="${x.toFixed(1)}" y="${base + 2}" width="${bw2.toFixed(1)}" height="${(h * 0.35).toFixed(1)}"
          fill="${col}" opacity="${failed ? ".12" : ".25"}" rx="1.5" style="animation-duration:${beat.toFixed(1)}s"/>
        <title>${esc(s.title)} · ${s.agent} · ${s.tries} tries · ${tok} tok</title>
      </g>`;
    });

    // baseline + a beat line
    const baseline = `<line class="sp-base" x1="10" y1="${base}" x2="${W - 10}" y2="${base}"
      stroke="rgba(255,255,255,.15)" stroke-width="1.5" stroke-linecap="round"/>`;
    const beatline = `<line class="sp-beat" x1="10" y1="${base - maxBar * 0.6}" x2="${W - 10}" y2="${base - maxBar * 0.6}"
      stroke="rgba(255,255,255,.05)" stroke-width="1" stroke-dasharray="2,6"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="sl-item ${failed ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="sp-wrap">
        <div class="sp-legend">${legend}<span class="sl-tip">峰=会话 · 高=Token · 宽=尝试</span></div>
        <svg class="sp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${beatline}${baseline}${bars}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "频谱",
    eyebrow: "SPECTRUM",
    render
  };
})();
