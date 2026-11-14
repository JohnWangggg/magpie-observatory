/* ----------------------------------------------------------------- bloom
 * Bloom view — requests grow as a garden:
 *   each completed request unfurls a flower; provider = petal colour,
 *   tokens = petal count/size, time = stem height, failures are buds that
 *   never opened. Vines trail along the ground.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "bloom";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function flower(x, ground, size, petals, color, failed, delay, label) {
    // stem: quadratic curve from ground to flower head
    const stemH = size * (1.6 + Math.random() * 0.9);
    const bend = (Math.random() - 0.5) * size * 0.6;
    const hx = x + bend, hy = ground - stemH;
    const cx = x + bend * 0.3, cy = ground - stemH * 0.55;
    const r = size * 0.5;
    let petalEls = "";
    const petalN = failed ? 0 : Math.max(4, Math.min(12, petals));
    for (let i = 0; i < petalN; i++) {
      const a = (i / petalN) * 360;
      const rad = a * Math.PI / 180;
      const ex = Math.cos(rad) * r * 0.55, ey = Math.sin(rad) * r * 0.55;
      const pr = r * 0.62, pw = r * 0.3;
      petalEls += `<ellipse class="bloom-petal" cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" rx="${pw.toFixed(1)}" ry="${pr.toFixed(1)}" fill="${color}" opacity=".85" transform="rotate(${a.toFixed(0)} ${ex.toFixed(1)} ${ey.toFixed(1)})"/>`;
    }
    const head = failed
      ? `<circle class="bloom-bud" r="${r * 0.42}" fill="none" stroke="${color}" stroke-width="1.6" stroke-dasharray="3,3"/>`
      : `<circle class="bloom-core" r="${r * 0.34}" fill="${color}" opacity=".95"/>` + petalEls;
    const leafY = ground - stemH * (0.35 + Math.random() * 0.3);
    const leaf = `<ellipse class="bloom-leaf" cx="${x + bend * 0.2}" cy="${leafY}" rx="${size * 0.28}" ry="${size * 0.12}" fill="${color}" opacity=".5" transform="rotate(${-20 - Math.random() * 30} ${x + bend * 0.2} ${leafY})"/>`;
    return `<g class="bloom-fl" style="animation-delay:${delay}ms" transform="translate(0,0)">
      <path class="bloom-stem" d="M${x},${ground} Q${cx},${cy} ${hx},${hy}" fill="none" stroke="${color}" stroke-width="1.4" opacity=".6"/>
      ${leaf}
      <g transform="translate(${hx},${hy})"><g class="bloom-head">${head}<title>${esc(label)}</title></g></g>
    </g>`;
  }

  function render(host, ctx) {
    const logs = (ctx.logs || []).slice(-28);
    const meta = ctx.providerMeta || {}; const metaOf = k => (typeof meta === "function" ? meta(k) : (meta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const ground = H - 46;

    if (!logs.length) { host.innerHTML = `<div class="bloom-empty">暂无请求</div>`; return; }

    const maxTok = Math.max(...logs.map(l => l.tokens || 0), 1);
    let flowers = "";
    logs.forEach((l, i) => {
      const x = 60 + (i / Math.max(1, logs.length - 1)) * (W - 120);
      const size = 14 + (l.tokens / maxTok) * 34;
      const col = metaOf(l.provider).color || "#8b7cf6";
      const petals = 4 + Math.round((l.tokens / maxTok) * 8);
      const ok = l.status === "ok" || l.ok === true;
      const cancel = l.status === "cancel" || l.canceled === true;
      const failed = !ok && !cancel;
      flowers += flower(x, ground, size, petals, col, failed, i * 55,
        `${l.label || l.provider} · ${ok ? "✓" : cancel ? "取消" : "✗"} · ${l.tokens} tok`);
    });

    // vine along the ground
    const vineY = ground + 8;
    let vine = `<path class="bloom-vine" d="M0,${vineY} `;
    for (let vx = 0; vx <= W; vx += 30) {
      vine += `Q${vx + 15},${vineY + (vx % 60 === 0 ? -5 : 4)} ${vx + 30},${vineY} `;
    }
    vine += `" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="1.2"/>`;
    // leaves on vine
    for (let vx = 30; vx < W; vx += 60) {
      vine += `<ellipse class="bloom-vleaf" cx="${vx}" cy="${vineY - 3}" rx="5" ry="2" fill="rgba(255,255,255,.15)" transform="rotate(${vx % 120 === 0 ? -30 : 25} ${vx} ${vineY - 3})"/>`;
    }

    const ok = logs.filter(l => l.status === "ok" || l.ok === true).length;
    const failed = logs.length - ok;
    host.innerHTML = `
      <div class="bloom-wrap">
        <div class="bloom-legend">
          <span>近 ${logs.length} 次</span>
          <span class="bl-ok">✓ ${ok} 开</span>
          ${failed ? `<span class="bl-fail">✗ ${failed} 蕾</span>` : ""}
          <span class="bl-tip">大小=Token · 色=Provider · 高=时间序</span>
        </div>
        <svg class="bloom-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet">
          ${vine}${flowers}
          <line x1="0" y1="${ground}" x2="${W}" y2="${ground}" stroke="rgba(255,255,255,.14)" stroke-width="1"/>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "绽放",
    eyebrow: "REQUEST BLOOM",
    render
  };
})();
