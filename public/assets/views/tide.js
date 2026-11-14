/* ----------------------------------------------------------------- tide
 * Tide view — provider throughput as rolling waves:
 *   each provider is a sine-wave band; amplitude = its token share,
 *   phase drifts over time. Waves lap onto a shore line; a moon pulls
 *   the biggest wave's crest.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "tide";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 17;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function wavePath(W, base, amp, freq, phase, dir) {
    let d = `M0,${base}`;
    for (let x = 0; x <= W; x += 8) {
      const y = base + Math.sin((x / W) * freq * Math.PI * 2 + phase) * amp * dir;
      d += ` L${x},${y.toFixed(1)}`;
    }
    return d;
  }

  function render(host, ctx) {
    const series = (ctx.data.series || []).slice(-24);
    const sessions = ctx.data.sessions || [];
    const meta = ctx.providerMeta || {}; const metaOf = k => (typeof meta === "function" ? meta(k) : (meta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const shore = H - 50;

    // provider → tokens share from sessions
    const provTok = {};
    sessions.forEach(s => { provTok[s.provider] = (provTok[s.provider] || 0) + (s.tokens || 0); });
    const total = Object.values(provTok).reduce((a, b) => a + b, 0) || 1;
    const provs = Object.entries(provTok).sort((a, b) => b[1] - a[1]).slice(0, 6);

    seed = 17;
    let waves = "", crestX = 0, crestY = 0, crestCol = "#8b7cf6", crestShare = 0;
    provs.forEach(([prov, tok], i) => {
      const share = tok / total;
      const col = metaOf(prov).color || "#8b7cf6";
      const amp = 14 + share * 90;
      const freq = 1.2 + i * 0.4;
      const phase = i * 0.9;
      const base = shore - i * 4;
      // fill under wave
      const path = wavePath(W, base, amp, freq, phase, 1);
      const fill = `${path} L${W},${shore} L0,${shore} Z`;
      waves += `<path class="tide-fill" d="${fill}" fill="${col}" opacity="${0.12 + share * 0.18}" style="animation-delay:${i * 90}ms"/>`;
      waves += `<path class="tide-line" d="${path}" fill="none" stroke="${col}" stroke-width="1.6" opacity=".85" style="animation-delay:${i * 90}ms"/>`;
      // foam dots on crest
      const crestI = Math.floor(rnd() * W / 8) * 8;
      const crestXl = crestI;
      const crestYl = base - amp * 0.95;
      for (let f = 0; f < 3; f++) {
        waves += `<circle class="tide-foam" cx="${crestXl + f * 6}" cy="${crestYl - f * 3}" r="${1.5 - f * 0.4}" fill="${col}" opacity=".7" style="animation-delay:${i * 90 + f * 120}ms"/>`;
      }
      if (share > crestShare) { crestShare = share; crestX = crestXl; crestY = crestYl; crestCol = col; }
    });

    // moon over the biggest wave
    const moonY = crestY - 60;
    const moon = `
      <circle class="tide-moon-glow" cx="${crestX}" cy="${moonY}" r="30" fill="${crestCol}" opacity=".08"/>
      <circle class="tide-moon" cx="${crestX}" cy="${moonY}" r="14" fill="${crestCol}" opacity=".85"/>
      <circle cx="${crestX - 4}" cy="${moonY - 3}" r="2.5" fill="rgba(0,0,0,.2)"/>
      <circle cx="${crestX + 4}" cy="${moonY + 3}" r="1.8" fill="rgba(0,0,0,.15)"/>`;

    // legend
    const legend = provs.map(([prov, tok]) => {
      const col = metaOf(prov).color || "#8b7cf6";
      const pct = Math.round((tok / total) * 100);
      return `<span class="tl-item"><i style="background:${col}"></i>${esc(metaOf(prov).name || prov)} ${pct}%</span>`;
    }).join("");

    host.innerHTML = `
      <div class="tide-wrap">
        <div class="tide-legend">${legend}<span class="tl-tip">幅=Token份额 · 位=时间序</span></div>
        <svg class="tide-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice">
          ${moon}${waves}
          <line x1="0" y1="${shore}" x2="${W}" y2="${shore}" stroke="rgba(255,255,255,.18)" stroke-width="1"/>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "潮汐",
    eyebrow: "TIDE",
    render
  };
})();
