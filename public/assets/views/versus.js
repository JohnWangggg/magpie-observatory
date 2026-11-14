/* ------------------------------------------------------------------ versus
 * Versus — agent head-to-head: two columns face off per agent,
 * left = tokens driven, right = mean session age; the taller
 * column wins that stat and gets a crown tick. A tug-of-war
 * rope across the bottom pulls toward whoever leads overall.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "versus";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const sessions = (ctx.data.sessions || []).concat(ctx.data.recent || []);
    const logs = ctx.data.logs || [];
    const ameta = ctx.agentMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const byAgent = {};
    sessions.forEach(s => {
      const a = s.agent || "?";
      byAgent[a] = byAgent[a] || { tokens: 0, age: [], n: 0 };
      byAgent[a].tokens += s.tokens || 0;
      if (s.startedAt) byAgent[a].age.push((Date.now() - s.startedAt) / 60000);
      byAgent[a].n += 1;
    });
    logs.forEach(r => {
      const a = r.agent || "?";
      byAgent[a] = byAgent[a] || { tokens: 0, age: [], n: 0 };
      byAgent[a].tokens += r.tokens || 0;
    });

    const rows = Object.entries(byAgent).map(([a, v]) => {
      const m = metaOf(ameta, a);
      const meanAge = v.age.length ? v.age.reduce((x, y) => x + y, 0) / v.age.length : 0;
      return { agent: a, name: m.name || a, col: m.color || "#8ab4f8", tokens: v.tokens, age: meanAge, n: v.n };
    }).sort((a, b) => b.tokens - a.tokens).slice(0, 4);

    const W = 400, H = 300, TOP = 42, BOT = 66;
    const arenaH = H - TOP - BOT;
    const maxTok = Math.max(...rows.map(r => r.tokens), 1);
    const maxAge = Math.max(...rows.map(r => r.age), 1);
    const colW = W / Math.max(1, rows.length);

    const tokWin = rows[0];
    const ageWin = rows.reduce((a, b) => (b.age > a.age ? b : a), rows[0] || {});

    const cols = rows.map((r, i) => {
      const cx = colW * i + colW / 2;
      const bw = Math.min(34, colW * .3);
      const hT = (r.tokens / maxTok) * arenaH * .88;
      const hA = (r.age / maxAge) * arenaH * .88;
      const baseY = TOP + arenaH;
      const crownT = r === tokWin ? `<text x="${cx - bw - 6}" y="${baseY - hT - 6}" font-size="10" text-anchor="middle">▲</text>` : "";
      const crownA = r === ageWin ? `<text x="${cx + bw + 6}" y="${baseY - hA - 6}" font-size="10" text-anchor="middle" fill="var(--amber)">▲</text>` : "";
      return `<g class="vs-col">
        <rect x="${cx - bw - 4}" y="${(baseY - hT).toFixed(1)}" width="${bw}" height="${hT.toFixed(1)}" rx="3" fill="${r.col}"/>
        <rect x="${cx + 4}" y="${(baseY - hA).toFixed(1)}" width="${bw * .7}" height="${hA.toFixed(1)}" rx="3" fill="${r.col}" opacity=".45"/>
        ${crownT}${crownA}
        <text x="${cx - bw / 2 - 4}" y="${baseY + 14}" class="vs-tok" text-anchor="middle">${(r.tokens / 1e6).toFixed(1)}M</text>
        <text x="${cx + bw / 2 + 2}" y="${baseY + 14}" class="vs-age" text-anchor="middle">${r.age ? r.age.toFixed(0) + "m" : "—"}</text>
        <text x="${cx}" y="${baseY + 30}" class="vs-name" text-anchor="middle">${esc(r.name.slice(0, 9))}</text>
        <text x="${cx}" y="${baseY + 40}" class="vs-n" text-anchor="middle">${r.n} 会话</text>
      </g>`;
    }).join("");

    // tug-of-war rope — pull toward stronger side (tokens lead)
    const ropeY = TOP + arenaH + 48;
    const left2 = rows.slice(0, Math.ceil(rows.length / 2)).reduce((a, r) => a + r.tokens, 0);
    const right2 = rows.slice(Math.ceil(rows.length / 2)).reduce((a, r) => a + r.tokens, 0);
    const pull = Math.max(-36, Math.min(36, ((left2 - right2) / Math.max(1, left2 + right2)) * 72));
    const rope = `<line x1="${W / 2 - 80}" y1="${ropeY}" x2="${W / 2 + 80}" y2="${ropeY}" stroke="var(--line-2)" stroke-width="2" stroke-dasharray="6 4"/>
      <rect x="${W / 2 + pull - 6}" y="${ropeY - 8}" width="12" height="16" rx="3" fill="var(--amber)"/>
      <text x="${W / 2 - 86}" y="${ropeY + 4}" class="vs-side" text-anchor="end">L</text>
      <text x="${W / 2 + 86}" y="${ropeY + 4}" class="vs-side">R</text>`;

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");

    host.innerHTML = `
      <div class="vs-wrap">
        <div class="vs-head"><b>VERSUS</b><span>粗=tokens 细=时长 · ▲=该项王 · 绳=总体拉扯</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="var(--card)" rx="10"/>
          ${cols}${rope}
          <text x="16" y="${H - 12}" class="vs-k">${fmt(k.tokens)}</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "对决", eyebrow: "VERSUS", render };
})();
