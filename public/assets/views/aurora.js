/* ----------------------------------------------------------------- aurora
 * Aurora view — requests as light-curtains in the sky:
 *   each request is a vertical ribbon; height = tokens, colour = provider,
 *   width = tps. The sky shimmers; failures are thin grey streaks.
 *   A horizon line + a few stars finish the scene.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "aurora";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function ribbon(x, base, h, w, color, delay, label, failed) {
    // vertical ribbon: left/right edges as wobbling curves, gradient fill
    const wob = () => (rnd() - 0.5) * w * 0.35;
    const top = base - h;
    const path = `M${x - w / 2},${base}
      C${x - w / 2 + wob()},${base - h * 0.33} ${x - w / 2 + wob()},${base - h * 0.66} ${x - w / 2 + wob()},${top}
      L${x + w / 2 + wob()},${top}
      C${x + w / 2 + wob()},${base - h * 0.66} ${x + w / 2 + wob()},${base - h * 0.33} ${x + w / 2},${base} Z`;
    const gradId = `au-g-${delay}`;
    return `<defs>
        <linearGradient id="${gradId}" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stop-color="${color}" stop-opacity="${failed ? ".06" : ".5"}"/>
          <stop offset=".55" stop-color="${color}" stop-opacity="${failed ? ".1" : ".75"}"/>
          <stop offset="1" stop-color="${color}" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path class="au-ribbon" d="${path}" fill="url(#${gradId})" style="animation-delay:${delay}ms">
        <title>${esc(label)}</title>
      </path>`;
  }

  function render(host, ctx) {
    const logs = (ctx.logs || []).slice(-26);
    const meta = ctx.providerMeta || {}; const metaOf = k => (typeof meta === "function" ? meta(k) : (meta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const horizon = H - 40;

    if (!logs.length) { host.innerHTML = `<div class="au-empty">暂无请求</div>`; return; }

    seed = 11;
    const maxTok = Math.max(...logs.map(l => l.tokens || 0), 1);
    const maxTps = Math.max(...logs.map(l => l.tps || 0), 1);
    let ribbons = "";
    logs.forEach((l, i) => {
      const ok = l.status === "ok" || l.ok === true;
      const cancel = l.status === "cancel" || l.canceled === true;
      const failed = !ok && !cancel;
      const x = 40 + (i / Math.max(1, logs.length - 1)) * (W - 80);
      const h = failed ? 20 + rnd() * 30 : 40 + (l.tokens / maxTok) * (horizon - 60);
      const w = 6 + (l.tps / maxTps) * 26;
      const col = failed ? "rgba(255,255,255,.4)" : (metaOf(l.provider).color || "#8b7cf6");
      ribbons += ribbon(x, horizon, h, w, col, i * 45,
        `${l.label || l.provider} · ${ok ? "✓" : cancel ? "取消" : "✗"} · ${l.tokens} tok`, failed);
    });

    // stars
    let stars = "";
    for (let i = 0; i < 40; i++) {
      const sx = rnd() * W, sy = rnd() * (horizon - 60);
      const r = rnd() * 1.1 + 0.3;
      stars += `<circle class="au-star" cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="${r.toFixed(1)}" fill="rgba(255,255,255,${(0.15 + rnd() * 0.5).toFixed(2)})" style="animation-delay:${(i * 137 % 2000)}ms"/>`;
    }

    const ok = logs.filter(l => l.status === "ok" || l.ok === true).length;
    host.innerHTML = `
      <div class="au-wrap">
        <div class="au-legend">
          <span>近 ${logs.length} 次</span>
          <span class="al-ok">✓ ${ok}</span>
          <span class="al-tip">高=Token · 宽=TPS · 色=Provider · 闪=失败</span>
        </div>
        <svg class="au-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">
          <rect width="${W}" height="${H}" fill="url(#au-sky)"/>
          <defs>
            <linearGradient id="au-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="rgba(10,14,32,.9)"/>
              <stop offset="1" stop-color="rgba(20,26,48,.4)"/>
            </linearGradient>
          </defs>
          ${stars}${ribbons}
          <line x1="0" y1="${horizon}" x2="${W}" y2="${horizon}" stroke="rgba(255,255,255,.16)" stroke-width="1"/>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "极光",
    eyebrow: "AURORA",
    render
  };
})();
