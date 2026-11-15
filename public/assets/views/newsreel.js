/* --------------------------------------------------------------- newsreel
 * Newsreel view — recent requests play like frames on old film stock:
 * sepia vignette, dust, hair-line scratches, and a vertical sprocket
 * strip on each side. Every log is a stamped frame: provider | model.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "newsreel";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;

    const frames = logs.slice(-12).map((l, i) => ({
      prov: (l.provider || "?").split("/").pop().slice(0, 12),
      model: (l.model || "?").split("/").pop().slice(0, 20),
      err: l.status === "err" || l.status === "fail",
      tok: (l.tok_in || 0) + (l.tok_out || 0),
      col: metaOf(l.provider).color || "#8b7cf6",
      t: l.t || l.ts || Date.now(),
    }));

    let g = `<rect width="${W}" height="${H}" fill="#0d0a08"/>`;

    // vignette
    g += `<rect width="${W}" height="${H}" fill="url(#nr-vig)"/>`;

    // sprocket holes
    for (let y = 8; y < H - 8; y += 18) {
      g += `<rect x="10" y="${y}" width="8" height="11" rx="1.5" fill="none" stroke="#4a3a28" stroke-width="1.2" opacity=".8"/>`;
      g += `<rect x="${W - 18}" y="${y}" width="8" height="11" rx="1.5" fill="none" stroke="#4a3a28" stroke-width="1.2" opacity=".8"/>`;
    }

    // scratch lines (random-ish)
    const scratches = [W * .14, W * .42, W * .63, W * .81, W * .93];
    scratches.forEach((sx, i) => {
      g += `<line x1="${sx.toFixed(0)}" y1="0" x2="${(sx + (i % 2 ? 6 : -4)).toFixed(0)}" y2="${H}" stroke="#5a4526" stroke-width="${.4 + (i % 3) * .2}" opacity="${.25 + (i % 3) * .1}"/>`;
    });

    // dust specks
    for (let i = 0; i < 24; i++) {
      const dx = (i * 97.7 + 31) % W, dy = (i * 61.3 + 47) % H;
      g += `<circle cx="${dx.toFixed(0)}" cy="${dy.toFixed(0)}" r="${.5 + (i % 4) * .4}" fill="#7a5a30" opacity="${.15 + (i % 5) * .1}"/>`;
    }

    // frames — newest at the bottom, scrolling up like real film
    const frameH = 48, frameW = Math.min(W - 90, 640);
    const frameX = (W - frameW) / 2;
    const baseY = H - 40;
    frames.forEach((f, i) => {
      const y = baseY - (frames.length - 1 - i) * (frameH + 8);
      if (y < -frameH) return;
      const age = (frames.length - 1 - i) / Math.max(1, frames.length);
      const sep = .3 + age * .6;
      const flash = f.err ? `<rect x="${frameX + 6}" y="${y + 6}" width="${frameW - 12}" height="${frameH - 12}" rx="4" fill="var(--red)" opacity=".18"/>` : "";
      g += `<g class="nr-frame" style="animation-delay: ${(i * .12).toFixed(2)}s">
        <rect x="${frameX + 6}" y="${y + 6}" width="${frameW - 12}" height="${frameH - 12}" rx="4"
              fill="#1a1208" stroke="${f.err ? "var(--red)" : "#5a4526"}" stroke-width="${f.err ? 1.6 : 1}" opacity="${sep}"/>
        ${flash}
        <text x="${frameX + 18}" y="${y + 22}" class="nr-prov" fill="${f.err ? "var(--red)" : "#d8c8a0"}">${esc(f.prov)}</text>
        <text x="${frameX + frameW - 18}" y="${y + 22}" text-anchor="end" class="nr-model" fill="#b09a70">${esc(f.model)}</text>
        <text x="${frameX + 18}" y="${y + 38}" class="nr-sub" fill="#8a6f48">${(f.tok / 1000).toFixed(1)}k tok · ${new Date(f.t).toTimeString().slice(0, 8)}</text>
        <rect x="${frameX + frameW - 60}" y="${y + 30}" width="44" height="12" rx="2" fill="${f.col}" opacity=".7"/>
      </g>`;
    });

    host.innerHTML = `<svg class="nr-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="nr-vig" cx="50%" cy="50%" r="70%">
          <stop offset="55%" stop-color="#000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000" stop-opacity=".75"/>
        </radialGradient>
      </defs>
      ${g}
    </svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "新闻片", eyebrow: "LOG NEWSREEL", render };
})();
