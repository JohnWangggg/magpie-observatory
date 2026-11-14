/* -------------------------------------------------------------------- dna
 * DNA view — the request stream as a double helix:
 *   each session is a base pair linking the two strands (width = tokens,
 *   colour = agent, broken = failed). The strands run as sine waves,
 *   and a scan pulse slides along them.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "dna";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 16);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const mid = H / 2;
    const amp = H * 0.28;
    const n = Math.max(1, sessions.length - 1);
    const dx = (W - 60) / n;

    if (!sessions.length) { host.innerHTML = `<div class="dn-empty">暂无会话</div>`; return; }

    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);

    // strand A: y = mid + amp*sin(x*k); strand B: y = mid - amp*sin(x*k)
    const k = Math.PI * 2 / (W - 60) * 1.6;
    let sa = `M30,${mid}`, sb = `M30,${mid}`, rungs = "";
    for (let i = 0; i < sessions.length; i++) {
      const x = 30 + i * dx;
      const ph = x * k;
      const ya = mid + amp * Math.sin(ph);
      const yb = mid - amp * Math.sin(ph);
      sa += ` L${x.toFixed(1)},${ya.toFixed(1)}`;
      sb += ` L${x.toFixed(1)},${yb.toFixed(1)}`;

      const s = sessions[i];
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const w = 1 + (tok / maxTok) * 4;
      rungs += `<line class="dn-rung ${failed ? "bad" : ""}" x1="${x.toFixed(1)}" y1="${ya.toFixed(1)}" x2="${x.toFixed(1)}" y2="${yb.toFixed(1)}"
          stroke="${col}" stroke-width="${w.toFixed(1)}" stroke-linecap="round" opacity="${failed ? ".5" : ".75"}"
          style="animation-delay:${i * 60}ms">
          <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
        </line>`;
      if (failed) {
        const my = (ya + yb) / 2;
        rungs += `<line class="dn-break" x1="${x.toFixed(1)}" y1="${my - 4}" x2="${x.toFixed(1)}" y2="${my + 4}"
            stroke="#f26d7f" stroke-width="1.6" stroke-dasharray="2,3" stroke-linecap="round"/>`;
      }
    }

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="dn-item ${failed ? "bad" : ""}" data-agent="${s.agent}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="dn-wrap">
        <div class="dn-legend">${legend}<span class="dn-tip">对=会话 · 宽=Token · 断=失败</span></div>
        <svg class="dn-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          <path class="dn-sa" d="${sa}" fill="none" stroke="#8b7cf6" stroke-width="1.8" opacity=".7"/>
          <path class="dn-sb" d="${sb}" fill="none" stroke="#56d4dd" stroke-width="1.8" opacity=".7"/>
          ${rungs}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "DNA",
    eyebrow: "DNA",
    render
  };
})();
