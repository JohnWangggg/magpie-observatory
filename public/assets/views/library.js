/* ------------------------------------------------------------------- library
 * Library — the reading room: each provider window is a shelf, the
 * books left on it = remaining quota %; every session is a reading
 * table with a lamp (colour = agent, height = tokens, a tipped book
 * for errors).
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "library";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 5);
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 5);
    const ameta = ctx.agentMeta || {}, pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, SHELF = 116, FLOOR = 262;

    // shelves — one per quota window; book count = remaining %
    const shelves = quotas.map((w, i) => {
      const m = metaOf(pmeta, w.prov);
      const rem = Math.max(0, 100 - w.used);
      const x = 34 + i * ((W - 68) / Math.max(1, quotas.length - 1));
      const sw = 52;
      const books = Math.ceil(rem / 10);
      const spines = Array.from({ length: books }, (_, j) => {
        const bw = 6 + (j % 2);
        const bx = x - sw / 2 + 4 + j * (sw - 8) / Math.max(1, books - 1);
        const bh = 16 + (j % 3) * 4;
        return `<rect x="${bx.toFixed(1)}" y="${(SHELF - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh}" rx="1"
          fill="${m.color || "#8b7cf6"}" opacity="${w.used >= 85 ? .45 : .8}"/>`;
      }).join("");
      return `<g class="lb-shelf${w.used >= 85 ? " hot" : ""}">
        <rect x="${x - sw / 2}" y="${SHELF - 2}" width="${sw}" height="4" rx="1" fill="var(--line-2)"/>
        ${spines}
        <text x="${x}" y="${SHELF + 14}" class="lb-pct" text-anchor="middle">${Math.round(rem)}% 余</text>
        <text x="${x}" y="${SHELF + 24}" class="lb-name" text-anchor="middle">${esc((m.name || w.prov).slice(0, 5))}</text>
      </g>`;
    }).join("");

    // reading tables — one per session
    const tables = sessions.map((s, i) => {
      const x = 36 + (i + 0.5) * ((W - 72) / Math.max(1, sessions.length));
      const m = metaOf(ameta, s.agent);
      const pm = metaOf(pmeta, s.provider);
      const dead = s.status === "err";
      const lampH = 24 + Math.min(22, (s.tokens || 0) / 5e5);
      return `<g class="lb-table${dead ? " dead" : ""}">
        <rect x="${x - 20}" y="${FLOOR - 8}" width="40" height="8" rx="2" fill="var(--card-3)" stroke="var(--line-2)"/>
        <line x1="${x - 16}" y1="${FLOOR - 8}" x2="${x - 20}" y2="${FLOOR + 20}" stroke="var(--line-2)" stroke-width="1.6"/>
        <line x1="${x + 16}" y1="${FLOOR - 8}" x2="${x + 20}" y2="${FLOOR + 20}" stroke="var(--line-2)" stroke-width="1.6"/>
        <rect x="${x - 8}" y="${FLOOR - 8 - lampH}" width="4" height="${lampH}" fill="var(--line-2)" rx="2"/>
        <ellipse cx="${x - 6}" cy="${FLOOR - 8 - lampH}" rx="6" ry="4" fill="${m.color || "#fbbf24"}" opacity="${dead ? .35 : .95}"/>
        ${dead ? `<rect x="${x + 4}" y="${FLOOR - 14}" width="10" height="6" rx="1" fill="var(--red)" transform="rotate(-18 ${x + 9} ${FLOOR - 11})"/>` :
          `<rect x="${x + 4}" y="${FLOOR - 12}" width="10" height="5" rx="1" fill="${pm.color || "#8b7cf6"}" opacity=".9"/>`}
        <text x="${x.toFixed(1)}" y="${FLOOR + 36}" class="lb-tname" text-anchor="middle">${esc((m.name || s.agent).slice(0, 6))}</text>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="lb-wrap">
        <div class="lb-head"><b>LIBRARY</b><span>架=配额窗 书=余量 桌=会话${hotN ? " · " + hotN + " 架空" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="${W}" height="${H}" fill="color-mix(in srgb, var(--card-2) 14%, transparent)" rx="10"/>
          <line x1="0" y1="${SHELF}" x2="${W}" y2="${SHELF}" stroke="var(--line-2)" stroke-width="1.4" opacity=".6"/>
          <line x1="0" y1="${FLOOR}" x2="${W}" y2="${FLOOR}" stroke="var(--line-2)" stroke-width="1.6"/>
          ${shelves}${tables}
          <g class="lb-card">
            <rect x="${W - 136}" y="14" width="122" height="40" rx="6" fill="var(--card-2)" stroke="var(--line-2)"/>
            <text x="${W - 126}" y="32" class="lb-k">${fmt(k.tokens)} · ${sessions.length} 桌</text>
            <text x="${W - 126}" y="45" class="lb-ksub">今日 tokens</text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "图书馆", eyebrow: "LIBRARY", render };
})();
