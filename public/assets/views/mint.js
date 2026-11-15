/* ---------------------------------------------------------------------- mint
 * Mint view — a row of screw presses, one per provider.
 * Struck coins stacked by the dies = tokens; a minter swinging
 * the arm for live sessions; a split planchet marks errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "mint";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const floorY = H * .84;

    const provTok = new Map();
    logs.forEach(l => { const p = l.provider || "?"; provTok.set(p, (provTok.get(p) || 0) + (l.tokens || 0)); });
    const rows = [...provTok.entries()].map(([name, tok]) => ({
      name, tok, live: sessions.filter(s => s.provider === name).length,
      err: logs.slice(-30).some(l => l.provider === name && l.status === "err"),
      col: metaOf(name).color || "#8b7cf6",
    })).sort((a, b) => b.tok - a.tok).slice(0, 5);
    if (!rows.length) { host.innerHTML = `<div class="mt-empty">暂无铸币坊</div>`; return; }
    const maxTok = Math.max(1, ...rows.map(r => r.tok));

    let g = `<rect width="${W}" height="${H}" fill="var(--bg)"/>`;
    // mint floor
    g += `<rect y="${floorY}" width="${W}" height="${H - floorY}" fill="var(--card-2)"/>`;

    const seg = W / (rows.length + 1);
    rows.forEach((r, i) => {
      const x = seg * (i + 1);
      const metal = r.err ? "#e06048" : r.tok > maxTok * .5 ? "#e0c878" : "#b09858";
      const pressW = seg * .45;
      const pressY = floorY - 34;
      // the screw press — two cheeks with a crossbeam and a screw down the middle
      g += `<line x1="${x - pressW * .28}" y1="${floorY}" x2="${x - pressW * .28}" y2="${pressY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x + pressW * .28}" y1="${floorY}" x2="${x + pressW * .28}" y2="${pressY}" stroke="${r.col}" stroke-width="1.8"/>`;
      g += `<line x1="${x - pressW * .32}" y1="${pressY}" x2="${x + pressW * .32}" y2="${pressY}" stroke="${r.col}" stroke-width="1.8"/>`;
      // screw + swing arm
      g += `<line x1="${x}" y1="${pressY - 8}" x2="${x}" y2="${pressY + 14}" stroke="${r.col}" stroke-width="2.2"/>`;
      g += `<line x1="${x - pressW * .2}" y1="${pressY - 4}" x2="${x + pressW * .2}" y2="${pressY - 4}" stroke="${r.col}" stroke-width="1.4"/>`;
      g += `<circle cx="${x - pressW * .2}" cy="${pressY - 4}" r="2" fill="${r.col}"/>`;
      g += `<circle cx="${x + pressW * .2}" cy="${pressY - 4}" r="2" fill="${r.col}"/>`;
      // the dies — upper and lower blocks on the bed
      g += `<rect x="${x - pressW * .12}" y="${pressY + 14}" width="${pressW * .24}" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      g += `<rect x="${x - pressW * .12}" y="${floorY - 10}" width="${pressW * .24}" height="5" fill="var(--card-3)" stroke="${r.col}" stroke-width=".9"/>`;
      // the planchet between the dies
      g += `<ellipse cx="${x}" cy="${floorY - 8}" rx="${pressW * .1}" ry="3" fill="${metal}" stroke="${r.col}" stroke-width=".8"/>`;
      // struck coins — a stack beside the press, count by tokens
      const coins = Math.min(4, 1 + Math.ceil(r.tok / maxTok * 3));
      for (let c = 0; c < coins; c++) {
        g += `<ellipse cx="${x + pressW * .38}" cy="${floorY - 5 - c * 4}" rx="5" ry="2" fill="${c === 0 && r.err ? "var(--red)" : metal}" stroke="${r.col}" stroke-width=".6"/>`;
      }
      // minter swinging the arm for live sessions — figure at the beam end
      if (r.live) {
        g += `<g class="mt-man" style="animation-delay: ${(i * .3).toFixed(1)}s" transform="translate(${x - pressW * .42} ${pressY - 10})">
          <circle r="3.5" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <rect x="-3" y="3" width="7" height="9" rx="1" fill="var(--card-3)" stroke="${r.col}" stroke-width="1"/>
          <line x1="3" y1="5" x2="15" y2="3" stroke="${r.col}" stroke-width="1.3"/>
        </g>`;
      }
      // split planchet — a cracked blank on the bed on errors
      if (r.err) g += `<line x1="${x - 4}" y1="${floorY - 8}" x2="${x + 4}" y2="${floorY - 8}" stroke="var(--red)" stroke-width="1.4"/>`;
      g += `<text x="${x}" y="${floorY + 18}" text-anchor="middle" class="mt-lab">${esc(String(r.name).split("/").pop().slice(0, 8))} ${(r.tok / 1000).toFixed(0)}k${r.live ? "·" + r.live : ""}${r.err ? " ‡" : ""}</text>`;
    });

    host.innerHTML = `<svg class="mt-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "铸币坊", eyebrow: "PROVIDER MINT", render };
})();
