/* ----------------------------------------------------------------- ledger
 * Ledger view — an accountant's bound book. Each provider is a column
 * ruled like ledger paper; requests are entries, errors red-inked, and
 * the running total at the bottom balances to zero (in==out).
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "ledger";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const logs = ctx.data.logs || [];
    const sessions = ctx.data.sessions || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const W = host.clientWidth || 800, H = host.clientHeight || 300;

    const provs = [...new Set(logs.slice(-120).map(l => l.provider))].filter(Boolean).slice(0, 5);
    if (!provs.length) { host.innerHTML = `<div class="lg-empty">暂无账目</div>`; return; }

    const colW = Math.min(150, (W - 60) / provs.length);
    const padX = (W - colW * provs.length) / 2;
    const top = 34, bot = H - 34;

    let g = `<rect width="${W}" height="${H}" fill="var(--card-2)"/>`;
    // ruled lines like ledger paper
    for (let y = top + 20; y < bot; y += 18) g += `<line x1="${padX - 14}" y1="${y}" x2="${padX + colW * provs.length + 14}" y2="${y}" stroke="var(--line)" stroke-width=".4" opacity=".4"/>`;

    provs.forEach((p, i) => {
      const x = padX + i * colW;
      const col = metaOf(p).color || "#8b7cf6";
      const entries = logs.filter(l => l.provider === p).slice(-7);
      const live = sessions.filter(s => s.provider === p).length;
      let tok = 0, req = 0, err = 0;
      entries.forEach(l => { tok += (l.tok_in || 0) + (l.tok_out || 0); req++; if (l.status === "err" || l.status === "fail") err++; });

      // column header
      g += `<text x="${(x + colW / 2).toFixed(0)}" y="${top - 4}" text-anchor="middle" class="lg-hd" fill="${col}">${esc(p.split("/").pop().slice(0, 12))}</text>`;
      g += `<line x1="${x + 6}" y1="${top + 4}" x2="${x + colW - 6}" y2="${top + 4}" stroke="${col}" stroke-width="1.4"/>`;
      // double rule under header
      g += `<line x1="${x + 6}" y1="${top + 8}" x2="${x + colW - 6}" y2="${top + 8}" stroke="${col}" stroke-width=".5" opacity=".6"/>`;

      // entries — newest at top of the column's page
      entries.slice().reverse().forEach((l, j) => {
        const y = top + 26 + j * 16;
        const isErr = l.status === "err" || l.status === "fail";
        const amt = ((l.tok_in || 0) + (l.tok_out || 0)) / 1000;
        g += `<text x="${x + 10}" y="${y.toFixed(0)}" class="lg-en" fill="${isErr ? "var(--red)" : "var(--fg-2)"}" font-weight="${isErr ? 700 : 500}">${isErr ? "‡ " : ""}${amt.toFixed(1)}k</text>`;
        g += `<text x="${x + colW - 10}" y="${y.toFixed(0)}" text-anchor="end" class="lg-en2" fill="var(--faint)">${(l.model || "?").split("/").pop().slice(0, 6)}</text>`;
      });

      // running total box
      const ty = bot;
      g += `<rect x="${x + 4}" y="${ty - 16}" width="${colW - 8}" height="22" rx="3" fill="none" stroke="${col}" stroke-width="1.2"/>`;
      g += `<text x="${(x + colW / 2).toFixed(0)}" y="${ty - 1}" text-anchor="middle" class="lg-tot" fill="${col}">Σ ${(tok / 1000).toFixed(0)}k${live ? ` · ${live}◆` : ""}${err ? ` · ${err}‡` : ""}</text>`;
    });

    host.innerHTML = `<svg class="lg-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "账本", eyebrow: "PROVIDER LEDGER", render };
})();
