/* ---------------------------------------------------------------- compass
 * Compass view — each quota window is a dial: needle points by burn rate,
 * rim tint = remaining quota, active sessions orbit as small ticks.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "compass";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function dial(cx, cy, r, w, prov, col) {
    const used = Math.max(0, Math.min(100, w.used || 0));
    const remaining = 100 - used;
    const tint = remaining > 50 ? "#68c078" : remaining > 20 ? "#e8c860" : "#e06048";
    // needle: 0% = north, 100% = south-ish spin
    const deg = (used / 100) * 300 - 150; // -150° … +150°
    const rad = deg * Math.PI / 180;
    const nx = cx + Math.sin(rad) * (r - 14), ny = cy - Math.cos(rad) * (r - 14);
    // rim arc: remaining fraction
    const arcLen = (remaining / 100) * Math.PI * 2 * (r - 5);
    const dash = `${arcLen} ${Math.PI * 2 * (r - 5)}`;
    const sess = (w._sessions || []).slice(0, 6).map((s, i) => {
      const a = (i / 6) * Math.PI * 2;
      return `<circle cx="${(cx + Math.cos(a) * (r + 6)).toFixed(1)}" cy="${(cy + Math.sin(a) * (r + 6)).toFixed(1)}" r="1.6" fill="${col}" opacity=".8"/>`;
    }).join("");
    return `<g class="cm-dial">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--card-2)" stroke="var(--line)"/>
      <circle cx="${cx}" cy="${cy}" r="${r - 5}" fill="none" stroke="${tint}" stroke-width="3"
        stroke-dasharray="${dash}" stroke-dashoffset="${(Math.PI / 2 + (1 - remaining / 100) * Math.PI * 2) * (r - 5) / 2}"
        transform="rotate(-90 ${cx} ${cy})" opacity=".9"/>
      <text x="${cx}" y="${cy - r + 12}" text-anchor="middle" class="cm-dir">N</text>
      <text x="${cx}" y="${cy + r - 4}" text-anchor="middle" class="cm-dir">S</text>
      <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="${col}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="${cx}" cy="${cy}" r="3" fill="${col}"/>
      <text x="${cx}" y="${cy + r + 14}" text-anchor="middle" class="cm-lab">${esc(prov)} · ${esc(w.name || "")}</text>
      <text x="${cx}" y="${cy + r + 25}" text-anchor="middle" class="cm-pct" fill="${tint}">${remaining.toFixed(0)}% 余量</text>
      ${sess}
    </g>`;
  }

  function render(host, ctx) {
    const quotas = Array.isArray(ctx.quotas) ? ctx.quotas : [];
    const sessions = ctx.data.sessions || [];
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    // enrich each window with its provider's live sessions
    const rows = [];
    quotas.forEach(q => {
      const live = sessions.filter(s => (s.provider || "").toLowerCase() === String(q.provider || "").toLowerCase());
      (q.windows || []).forEach(w => rows.push({ prov: q.name || q.provider, col: metaOf(q.provider).color || "#8b7cf6", w, live }));
    });
    const top = rows.slice(0, 8);
    const W = host.clientWidth || 800, H = host.clientHeight || 300;
    const cols = Math.min(4, Math.max(1, top.length));
    const rowsN = Math.ceil(top.length / cols);
    const r = Math.min(W / cols / 2 - 24, H / rowsN / 2 - 30, 60);

    let g = "";
    top.forEach((row, i) => {
      const cx = (W / cols) * (i % cols + 0.5);
      const cy = (H / rowsN) * (Math.floor(i / cols) + 0.5) - 8;
      g += dial(cx, cy, r, { ...row.w, _sessions: row.live }, row.prov, row.col);
    });

    if (!top.length) { host.innerHTML = `<div class="cm-empty">暂无配额窗</div>`; return; }
    host.innerHTML = `<svg class="cm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${g}</svg>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "罗盘", eyebrow: "QUOTA COMPASS", render };
})();
