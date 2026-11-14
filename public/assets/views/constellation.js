/* ------------------------------------------------------------ constellation
 * Constellation view — sessions as named constellations:
 *   each session's tries become a small star-pattern (one star per try,
 *   brighter on success, dim on failure); sessions link into a larger
 *   constellation map. Agent = star colour, provider = constellation hue.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "constellation";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 13;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function sessionConstellation(sx, sy, scale, tries, color, label, delay) {
    // spread tries as a little star pattern; link them in order
    const pts = tries.map((t, i) => {
      const a = (i / Math.max(1, tries.length - 1)) * Math.PI * 1.4 - Math.PI * 0.7;
      const r = scale * (0.4 + rnd() * 0.6);
      return [sx + Math.cos(a) * r, sy + Math.sin(a) * r, t];
    });
    let links = "";
    for (let i = 1; i < pts.length; i++) {
      links += `<line class="ck-link" x1="${pts[i - 1][0]}" y1="${pts[i - 1][1]}" x2="${pts[i][0]}" y2="${pts[i][1]}" stroke="${color}" stroke-width="1" opacity=".5" stroke-dasharray="4,3"/>`;
    }
    let stars = "";
    pts.forEach(([px, py, t], i) => {
      const ok = t.state === "ok" || t.state === "done";
      const r = (ok ? 4.8 : 3.4) * (t.aux ? 0.72 : 1);
      stars += `<circle class="ck-star ${ok ? "" : "fail"} ${t.aux ? "aux" : ""}" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r}" fill="${ok ? color : "rgba(255,255,255,.5)"}" opacity="${ok ? "1" : ".7"}"/>`;
      if (ok && !t.aux) stars += `<circle class="ck-halo" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r * 2.4}" fill="${color}" opacity=".2"/>`;
    });
    return `<g class="ck-const" style="animation-delay:${delay}ms">${links}${stars}<title>${esc(label)}</title></g>`;
  }

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 10);
    const meta = ctx.providerMeta || {}; const metaOf = k => (typeof meta === "function" ? meta(k) : (meta[k] || {}));
    const ameta = ctx.agentMeta || {}; const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H / 2;

    if (!sessions.length) { host.innerHTML = `<div class="ck-empty">暂无会话</div>`; return; }

    seed = 13;
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    const pts = [];
    let consts = "";
    sessions.forEach((s, i) => {
      let tries = (s.tries && s.tries.length) ? s.tries : [{ state: s.status === "done" ? "ok" : "pending" }];
      // pad to ≥3 stars so single-try sessions still form a shape
      while (tries.length < 3) tries = tries.concat([{ state: tries[0].state, aux: true }]);
      const ang = (i / sessions.length) * Math.PI * 2;
      const dist = Math.min(W, H) * 0.3 * (0.5 + rnd() * 0.6);
      const x = cx + Math.cos(ang) * dist * 1.4;
      const y = cy + Math.sin(ang) * dist * 0.7;
      const scale = 20 + (s.tokens / maxTok) * 40;
      const col = (ametaOf(s.agent).color || metaOf(s.provider).color) || "#8b7cf6";
      pts.push([x, y]);
      consts += sessionConstellation(x, y, scale, tries, col,
        `${s.title} · ${s.agent} · ${s.status} · ${s.tokens} tok`, i * 80);
    });

    // big links between constellations
    let big = "";
    for (let i = 1; i < pts.length; i++) {
      big += `<line class="ck-big" x1="${pts[i - 1][0].toFixed(0)}" y1="${pts[i - 1][1].toFixed(0)}" x2="${pts[i][0].toFixed(0)}" y2="${pts[i][1].toFixed(0)}" stroke="rgba(255,255,255,.2)" stroke-width="1" stroke-dasharray="6,6"/>`;
    }
    // background stars
    let bg = "";
    for (let i = 0; i < 70; i++) {
      bg += `<circle class="ck-bg" cx="${(rnd() * W).toFixed(0)}" cy="${(rnd() * H).toFixed(0)}" r="${(rnd() * 1 + .4).toFixed(1)}" fill="rgba(255,255,255,${(0.08 + rnd() * 0.3).toFixed(2)})" style="animation-delay:${(i * 89 % 2400)}ms"/>`;
    }

    host.innerHTML = `
      <div class="ck-wrap">
        <div class="ck-legend">
          <span>${sessions.length} 会话星座</span>
          <span class="ck-tip">星=尝试 · 亮=成 · 暗=败 · 大=Token · 色=Agent</span>
        </div>
        <svg class="ck-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${bg}${big}${consts}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "星座",
    eyebrow: "CONSTELLATION",
    render
  };
})();
