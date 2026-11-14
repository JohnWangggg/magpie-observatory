/* ----------------------------------------------------------------- petri
 * Petri view — requests as cells in a dish:
 *   each request is a cell with provider-coloured cytoplasm; the nucleus
 *   pulses at tokens/s, live cells drift, finished ones settle and split,
 *   failures fade to ghosts. A colony ring marks the newest cluster.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "petri";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

  function cell(x, y, r, color, label, live, failed, delay, i) {
    // wobbly membrane: a path of 8 slightly-noisy arcs
    const pts = [];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const rr = r * (0.92 + rnd() * 0.18);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let k = 0; k < 8; k++) {
      const p1 = pts[k], p2 = pts[(k + 1) % 8];
      const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
      d += ` Q${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${mx.toFixed(1)},${my.toFixed(1)}`;
    }
    d += " Z";

    const nucleus = `<circle class="petri-nuc" cx="${x}" cy="${y}" r="${(r * 0.32).toFixed(1)}" fill="${color}" opacity=".9" style="animation-delay:${delay}ms"/>`;
    const organelles = failed ? "" :
      `<circle class="petri-org" cx="${x - r * 0.4}" cy="${y - r * 0.25}" r="${r * 0.09}" fill="${color}" opacity=".5"/>
       <circle class="petri-org" cx="${x + r * 0.42}" cy="${y + r * 0.3}" r="${r * 0.07}" fill="${color}" opacity=".4"/>
       <circle class="petri-org" cx="${x + r * 0.15}" cy="${y - r * 0.45}" r="${r * 0.06}" fill="${color}" opacity=".35"/>`;
    return `<g class="petri-cell ${live ? "live" : ""} ${failed ? "failed" : ""}" style="animation-delay:${delay}ms">
      <path class="petri-mem" d="${d}" fill="${color}" fill-opacity="${failed ? ".06" : ".14"}" stroke="${color}" stroke-width="1.3" opacity="${failed ? ".3" : ".8"}"/>
      ${organelles}${nucleus}
      <title>${esc(label)}</title>
    </g>`;
  }

  function render(host, ctx) {
    const logs = (ctx.logs || []).slice(-20);
    const meta = ctx.providerMeta || {}; const metaOf = k => (typeof meta === "function" ? meta(k) : (meta[k] || {}));
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cx = W / 2, cy = H / 2;
    const dishR = Math.min(W, H) * 0.42;

    if (!logs.length) { host.innerHTML = `<div class="petri-empty">暂无请求</div>`; return; }

    seed = 7;
    const maxTok = Math.max(...logs.map(l => l.tokens || 0), 1);
    let cells = "";
    logs.forEach((l, i) => {
      const ok = l.status === "ok" || l.ok === true;
      const cancel = l.status === "cancel" || l.canceled === true;
      const failed = !ok && !cancel;
      const live = l.status === "run" || l.status === "streaming";
      const r = 12 + (l.tokens / maxTok) * 30;
      // scatter inside dish, newest near centre
      const ang = (i / logs.length) * Math.PI * 2 + rnd() * 0.8;
      const dist = dishR * (0.2 + rnd() * 0.65);
      const x = cx + Math.cos(ang) * dist;
      const y = cy + Math.sin(ang) * dist;
      const col = metaOf(l.provider).color || "#8b7cf6";
      cells += cell(x, y, r, col, `${l.label || l.provider} · ${ok ? "✓" : cancel ? "取消" : "✗"} · ${l.tokens} tok`, live, failed, i * 60, i);
    });

    // dish rim + inner halo
    const dish = `
      <circle class="petri-rim" cx="${cx}" cy="${cy}" r="${dishR}" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.18)" stroke-width="2"/>
      <circle class="petri-rim in" cx="${cx}" cy="${cy}" r="${dishR * 0.86}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1" stroke-dasharray="4,5"/>
      <ellipse class="petri-shadow" cx="${cx}" cy="${cy + dishR + 14}" rx="${dishR * 0.9}" ry="10" fill="rgba(0,0,0,.3)"/>`;

    const ok = logs.filter(l => l.status === "ok" || l.ok === true).length;
    const failed = logs.length - ok;
    const liveN = logs.filter(l => l.status === "run" || l.status === "streaming").length;
    host.innerHTML = `
      <div class="petri-wrap">
        <div class="petri-legend">
          <span>近 ${logs.length} 次</span>
          <span class="pl-ok">✓ ${ok}</span>
          ${failed ? `<span class="pl-fail">✗ ${failed}</span>` : ""}
          ${liveN ? `<span class="pl-live">● ${liveN} 活</span>` : ""}
          <span class="pl-tip">大小=Token · 色=Provider · 核搏=活</span>
        </div>
        <svg class="petri-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
          ${dish}${cells}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = {
    title: "培养皿",
    eyebrow: "PETRI DISH",
    render
  };
})();
