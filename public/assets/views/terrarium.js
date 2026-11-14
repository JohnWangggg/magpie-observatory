/* -------------------------------------------------------------- terrarium
 * Terrarium view — sessions as a sealed glass ecosystem:
 *   each session is a plant (height = tokens, colour = agent), soil at the
 *   base, moss tufts, a mushroom per failed request, and droplets running
 *   down the glass. A lid + cork finish the jar.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "terrarium";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 19;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function plant(x, ground, h, color, label, delay, failed) {
    // stem + 3-5 leaves + bud
    let el = `<line class="terr-stem" x1="${x}" y1="${ground}" x2="${x}" y2="${ground - h}" stroke="${color}" stroke-width="2" opacity=".8"/>`;
    const leafN = failed ? 2 : 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < leafN; i++) {
      const ly = ground - h * (0.25 + i * 0.2);
      const lx = x + (rnd() - 0.5) * 12;
      const la = -25 + rnd() * 50;
      el += `<ellipse class="terr-leaf" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="${(5 + rnd() * 4).toFixed(1)}" ry="${(2.2 + rnd() * 1.4).toFixed(1)}" fill="${color}" opacity="${failed ? ".35" : ".65"}" transform="rotate(${la.toFixed(0)} ${lx.toFixed(1)} ${ly.toFixed(1)})"/>`;
    }
    el += `<circle class="terr-bud" cx="${x}" cy="${ground - h}" r="${failed ? 2.5 : 3.5}" fill="${failed ? "rgba(255,255,255,.3)" : color}" stroke="${color}" stroke-width="1.4" style="animation-delay:${delay}ms"/>`;
    return `<g class="terr-plant ${failed ? "wilted" : ""}" style="animation-delay:${delay}ms">${el}<title>${esc(label)}</title></g>`;
  }

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []).slice(0, 14);
    const ameta = ctx.agentMeta || {};
    const ametaOf = k => (typeof ameta === "function" ? ameta(k) : (ameta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const soil = H - 46;
    const jarW = Math.min(W * 0.85, 700), jarH = H - 60;
    const jx = (W - jarW) / 2, jy = 20;

    if (!sessions.length) { host.innerHTML = `<div class="terr-empty">暂无会话</div>`; return; }

    seed = 19;
    const maxTok = Math.max(...sessions.map(s => s.tokens || 0), 1);
    let plants = "";
    sessions.forEach((s, i) => {
      const failed = s.status === "error" || s.status === "failed";
      const x = jx + 40 + (i / Math.max(1, sessions.length - 1)) * (jarW - 80);
      const h = 20 + (s.tokens / maxTok) * (soil - jy - 40);
      const col = ametaOf(s.agent).color || "#5ad4a6";
      plants += plant(x, soil, h, col, `${s.title} · ${s.agent} · ${s.status} · ${s.tokens} tok`, i * 70, failed);
    });

    // moss tufts along the soil
    let moss = "";
    for (let i = 0; i < 14; i++) {
      const mx = jx + 20 + rnd() * (jarW - 40);
      const my = soil + rnd() * 10;
      moss += `<circle class="terr-moss" cx="${mx.toFixed(0)}" cy="${my.toFixed(1)}" r="${(2.5 + rnd() * 3.5).toFixed(1)}" fill="#5ad4a6" opacity="${(0.15 + rnd() * 0.25).toFixed(2)}"/>`;
    }
    // mushrooms for failed sessions
    const fails = sessions.filter(s => s.status === "error" || s.status === "failed");
    let shrooms = "";
    fails.forEach((s, i) => {
      const mx = jx + 30 + rnd() * (jarW - 60), my = soil + 2;
      shrooms += `<g class="terr-shroom" style="animation-delay:${i * 100}ms">
        <line x1="${mx}" y1="${my}" x2="${mx}" y2="${my - 6}" stroke="rgba(255,255,255,.5)" stroke-width="1.6"/>
        <path d="M${mx - 5},${my - 6} Q${mx},${my - 14} ${mx + 5},${my - 6} Z" fill="#f26d7f" opacity=".8"/>
        <circle cx="${mx - 1}" cy="${my - 9}" r=".8" fill="#fff" opacity=".7"/>
      </g>`;
    });
    // droplets on the glass
    let drops = "";
    for (let i = 0; i < 10; i++) {
      const dx = jx + 15 + rnd() * (jarW - 30);
      const dy = jy + 20 + rnd() * (jarH - 60);
      drops += `<circle class="terr-drop" cx="${dx.toFixed(0)}" cy="${dy.toFixed(1)}" r="${(1.2 + rnd() * 1.8).toFixed(1)}" fill="rgba(255,255,255,.25)" style="animation-delay:${(i * 400) % 3000}ms"/>`;
    }

    const ok = sessions.filter(s => s.status === "done" || s.status === "ok").length;
    host.innerHTML = `
      <div class="terr-wrap">
        <div class="terr-legend">
          <span>${sessions.length} 棵 · ${ok} ✓ · ${fails.length} ✗</span>
          <span class="tl-tip">高=Token · 色=Agent · 蕈=失败</span>
        </div>
        <svg class="terr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet">
          <!-- jar -->
          <rect class="terr-jar" x="${jx}" y="${jy}" width="${jarW}" height="${jarH}" rx="14" fill="rgba(255,255,255,.02)" stroke="rgba(255,255,255,.18)" stroke-width="1.5"/>
          <path class="terr-lid" d="M${jx + jarW / 2 - 30},${jy} L${jx + jarW / 2},${jy - 16} L${jx + jarW / 2 + 30},${jy} Z" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.2)"/>
          <rect x="${jx + jarW / 2 - 3}" y="${jy - 22}" width="6" height="8" rx="2" fill="rgba(255,255,255,.3)"/>
          ${drops}
          <rect x="${jx + 6}" y="${soil}" width="${jarW - 12}" height="${H - soil - 24}" fill="rgba(90,60,30,.18)" rx="3"/>
          ${moss}${plants}${shrooms}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "玻璃缸",
    eyebrow: "TERRARIUM",
    render
  };
})();
