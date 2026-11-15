/* --------------------------------------------------------------- dockyard
 * Dockyard view — a ship in port per agent. Hull length scales with
 * session token volume, cargo boxes stack by tries, and a red flare
 * fires from the masthead while the agent has errors.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "dockyard";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = ctx.data.sessions || [];
    const logs = ctx.data.logs || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const water = H * 0.82;

    const rows = sessions.map(s => {
      const tries = s.tries || [];
      const tok = s.tokens || 0;
      const err = logs.slice(-30).some(l => l.provider === s.provider && l.status === "err");
      return { s, tries, tok, err, col: metaOf(s.provider).color || "#8b7cf6" };
    }).sort((a, b) => b.tok - a.tok).slice(0, 5);

    if (!rows.length) { host.innerHTML = `<div class="dy-empty">暂无船</div>`; return; }

    let g = `<rect width="${W}" height="${water}" fill="var(--bg)"/>`;
    // water line
    g += `<line x1="0" y1="${water}" x2="${W}" y2="${water}" stroke="var(--line)" stroke-width="1.8"/>`;
    for (let x = 0; x < W; x += 46) {
      g += `<line x1="${x}" y1="${water + 4}" x2="${x + 20}" y2="${water + 4}" stroke="var(--faint)" stroke-width=".4" opacity=".4"/>`;
    }
    // sky gulls
    for (let i = 0; i < 6; i++) {
      const gx = (i * 137 + 40) % W, gy = 16 + (i * 53) % 60;
      g += `<path d="M ${gx} ${gy} q 4 -4 8 0 q 4 -4 8 0" fill="none" stroke="var(--faint)" stroke-width="1"/>`;
    }

    const pad = 40, shipW = (W - pad * (rows.length + 1)) / rows.length;
    rows.forEach((r, i) => {
      const x = pad + i * (shipW + pad), hullY = water - 8;
      const hullL = shipW * 0.8;
      const hullH = 14 + Math.min(26, r.tok / 6000);
      const col = r.col;

      // hull — a curved boat
      g += `<path d="M ${x} ${hullY} Q ${x + hullL * .1} ${hullY + hullH} ${x + hullL * .5} ${hullY + hullH} Q ${x + hullL * .9} ${hullY + hullH} ${x + hullL} ${hullY} L ${x + hullL - 6} ${hullY + 2} L ${x + 6} ${hullY + 2} Z" fill="var(--card-2)" stroke="${col}" stroke-width="1.6"/>`;
      // mast + cargo stack
      const mastX = x + hullL / 2;
      g += `<line x1="${mastX}" y1="${hullY}" x2="${mastX}" y2="${hullY - 46}" stroke="${col}" stroke-width="2"/>`;
      r.tries.slice(0, 3).forEach((t, j) => {
        const bx = mastX + 4 + j * 11;
        const by = hullY - 8 - (j % 2) * 11;
        const c2 = t.state === "ok" ? col : t.state === "fail" ? "var(--red)" : "var(--amber)";
        g += `<rect x="${bx.toFixed(0)}" y="${by.toFixed(0)}" width="9" height="9" rx="1" fill="${c2}" opacity=".85"/>`;
      });
      // masthead flare for errors
      if (r.err) {
        g += `<circle cx="${mastX}" cy="${hullY - 50}" r="5" fill="var(--red)" opacity=".9">
          <animate attributeName="r" values="4;8;4" dur="1.4s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values=".9;.3;.9" dur="1.4s" repeatCount="indefinite"/>
        </circle>`;
      }
      // flag at masthead — provider colour
      g += `<path d="M ${mastX} ${hullY - 46} L ${mastX + 14} ${hullY - 42} L ${mastX} ${hullY - 38} Z" fill="${col}"/>`;
      // name + tokens
      g += `<text x="${x + hullL / 2}" y="${water + 20}" text-anchor="middle" class="dy-lab">${esc((r.s.agent || r.s.provider || "?").split("/").pop().slice(0, 10))} · ${(r.tok / 1000).toFixed(0)}k</text>`;
    });

    host.innerHTML = `<svg class="dy-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "船坞", eyebrow: "AGENT DOCKYARD", render };
})();
