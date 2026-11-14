/* -------------------------------------------------------------------- maze
 * Maze view — the request stream as a snaking maze corridor:
 *   each session is a path segment (length = tokens, colour = agent,
 *   dead end = failed); the path snakes row by row with vertical
 *   connectors, over a faint maze grid. A magpie dot walks it.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "maze";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 31;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 12);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const pad = 30;
    const n = sessions.length;

    if (!n) { host.innerHTML = `<div class="mz-empty">暂无会话</div>`; return; }

    seed = 31;
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const usableW = W - pad * 2;
    const rowH = (H - pad * 2) / 4;

    // maze background: grid + random short walls
    let walls = "";
    for (let r = 0; r <= 4; r++) {
      const gy = pad + r * rowH;
      walls += `<line x1="${pad}" y1="${gy}" x2="${W - pad}" y2="${gy}" stroke="rgba(255,255,255,.05)" stroke-dasharray="3,9"/>`;
    }
    for (let i = 0; i < 14; i++) {
      const wx = pad + rnd() * usableW, wy = pad + Math.floor(rnd() * 5) * rowH;
      walls += `<line class="mz-wall" x1="${wx.toFixed(0)}" y1="${wy.toFixed(0)}" x2="${wx.toFixed(0)}" y2="${(wy + rowH).toFixed(0)}"
          stroke="rgba(255,255,255,.07)"/>`;
    }

    // snake path: each session = horizontal run; edge → vertical drop → flip dir
    let segs = "", dots = "", deads = "";
    let x = pad, y = pad, dir = 1, row = 0;
    sessions.forEach((s, i) => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const tok = s.tokens || 0;
      const failed = s.status === "error" || s.status === "failed";
      const len = 40 + (tok / maxTok) * usableW * 0.55;
      let nx = x + dir * len;
      let drop = false;
      if (dir === 1 && nx > W - pad) { nx = W - pad; drop = true; }
      else if (dir === -1 && nx < pad) { nx = pad; drop = true; }
      else if (i === n - 1) drop = false;
      else if (row < 4 && (i % 2 === 1)) drop = true; // force drops mid-way for shape
      segs += `<path class="mz-seg" d="M${x.toFixed(1)},${y.toFixed(1)} L${nx.toFixed(1)},${y.toFixed(1)}"
          stroke="${col}" stroke-width="${(2.2 + (tok / maxTok) * 4).toFixed(1)}" stroke-linecap="round" opacity="${failed ? ".4" : ".75"}"
          style="animation-delay:${i * 100}ms">
          <title>${esc(s.title)} · ${s.agent} · ${tok} tok</title>
        </path>`;
      if (failed) deads += `<circle class="mz-dead" cx="${nx.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="#f26d7f"/>`;
      else dots += `<circle class="mz-dot" cx="${nx.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${col}"/>`;
      x = nx;
      if (drop && row < 4) {
        const ny = y + rowH;
        segs += `<path class="mz-turn" d="M${x.toFixed(1)},${y.toFixed(1)} L${x.toFixed(1)},${ny.toFixed(1)}"
            stroke="${col}" stroke-width="1.6" opacity=".35"/>`;
        y = ny; dir = -dir; row++;
      }
    });

    const legend = sessions.map(s => {
      const col = ametaOf(s.agent).color || "#8b7cf6";
      const failed = s.status === "error" || s.status === "failed";
      return `<span class="ml-item ${failed ? "bad" : ""}"><i style="background:${col}"></i>${esc((s.title || "").slice(0, 9))}</span>`;
    }).join("");

    host.innerHTML = `
      <div class="mz-wrap">
        <div class="mz-legend">${legend}<span class="ml-tip">段=会话 · 长=Token · 死=失败</span></div>
        <svg class="mz-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${walls}${segs}${dots}${deads}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "迷宫",
    eyebrow: "MAZE",
    render
  };
})();
