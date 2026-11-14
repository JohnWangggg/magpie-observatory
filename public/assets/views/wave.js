/* ------------------------------------------------------------------- wave
 * Wave view — the request stream as two layered waveforms:
 *   the upper wave = tokens (height = value, colour = agent blend),
 *   the lower wave = a ghost echo of the previous session set.
 *   A cursor scans left→right; failed requests spike the wave.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "wave";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 20);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const mid = H * 0.52;

    if (!sessions.length) { host.innerHTML = `<div class="wv-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const n = sessions.length;
    const dx = (W - 40) / Math.max(1, n - 1);
    const amp = H * 0.32;

    // upper wave: each session is a peak
    let top = `M20,${mid} `;
    sessions.forEach((s, i) => {
      const x = 20 + i * dx;
      const y = mid - 4 - (s.tokens / maxTok) * amp;
      const px = i === 0 ? 20 : 20 + (i - 0.5) * dx;
      top += `C ${(px + dx * 0.3).toFixed(1)},${mid} ${(x - dx * 0.3).toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)} `;
    });
    top += `L ${W - 20},${mid} L ${W - 20},${mid + 6} L 20,${mid + 6} Z`;
    // lower echo: flipped, half amplitude, offset
    let bot = `M20,${mid + 12} `;
    sessions.forEach((s, i) => {
      const x = 20 + i * dx;
      const y = mid + 12 + (s.tokens / maxTok) * amp * 0.45;
      const px = i === 0 ? 20 : 20 + (i - 0.5) * dx;
      bot += `C ${(px + dx * 0.3).toFixed(1)},${mid + 12} ${(x - dx * 0.3).toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)} `;
    });
    bot += `L ${W - 20},${mid + 12} L ${W - 20},${mid + 6} L 20,${mid + 6} Z`;

    // per-session peak dots + failed spikes
    let dots = "";
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const x = 20 + i * dx;
      const y = mid - 4 - (tok / maxTok) * amp;
      dots += `<circle class="wv-dot ${failed ? "bad" : ""}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${failed ? 3.5 : 2.5}" fill="${col}" style="animation-delay:${i * 60}ms">
        <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
      </circle>`;
      if (failed) dots += `<line class="wv-spike" x1="${x.toFixed(1)}" y1="${y - 8}" x2="${x.toFixed(1)}" y2="${y - 2}" stroke="#f26d7f" stroke-width="1.4" stroke-linecap="round"/>`;
    });

    // scan cursor
    const cursor = `<line class="wv-cursor" x1="20" y1="${mid - amp - 10}" x2="20" y2="${mid + amp + 10}"
      stroke="rgba(255,255,255,.2)" stroke-width="1" stroke-dasharray="2,4"/>`;

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="wl-item ${failed ? "bad" : ""}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="wv-wrap">
        <div class="wv-legend">${legend}<span class="wl-tip">峰=会话 · 高=Token · 刺=失败</span></div>
        <svg class="wv-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="wv-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#8b7cf6" stop-opacity=".5"/>
              <stop offset="1" stop-color="#56d4dd" stop-opacity=".15"/>
            </linearGradient>
            <linearGradient id="wv-grad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#56d4dd" stop-opacity=".15"/>
              <stop offset="1" stop-color="#4ade80" stop-opacity=".05"/>
            </linearGradient>
          </defs>
          <path class="wv-bot" d="${bot}" fill="url(#wv-grad2)"/>
          <path class="wv-top" d="${top}" fill="url(#wv-grad)"/>
          ${cursor}${dots}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "波浪线",
    eyebrow: "WAVE",
    render
  };
})();
