/* ------------------------------------------------------------------- museum
 * Museum — a long gallery of pedestals: every quota window is
 * a display case (case fill = used%, ≥85% the amber spotlight
 * burns hot); sessions are visitors (head + shoulders) drifting
 * between cases under the frame lights.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "museum";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 48, BOT = 44;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;

    const cases = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#c0a080";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const caseY = TOP + bh - 30;
      const caseW = bw - 16, caseH = 56;
      const fillH = caseH * f;
      // picture frame above
      const frameW = bw - 22, frameH = 26;
      return `<g class="mv-case${hot ? " hot" : ""}">
        <!-- frame -->
        <rect x="${x - frameW / 2}" y="${TOP}" width="${frameW}" height="${frameH}" rx="2" fill="#1a2128" stroke="${col}" stroke-width="${hot ? 1.6 : 1}"/>
        <rect x="${x - frameW / 2 + 3}" y="${TOP + 3}" width="${frameW - 6}" height="${frameH - 6}" fill="#101418"/>
        <rect x="${x - frameW / 2 + 6}" y="${TOP + 6}" width="${frameW - 12}" height="${frameH - 12}" fill="${col}" opacity="${(0.2 + f * 0.5).toFixed(2)}"/>
        <!-- spotlight from frame -->
        <path d="M${x - 4} ${TOP + frameH + 2} L${x - 14} ${caseY} L${x + 14} ${caseY} L${x + 4} ${TOP + frameH + 2} Z" fill="#f0e0a0" opacity="${hot ? .3 : .12}"/>
        <!-- pedestal -->
        <rect x="${x - caseW / 2}" y="${caseY}" width="${caseW}" height="${caseH}" rx="2" fill="#2a3038" stroke="${hot ? "var(--amber)" : "var(--line-2)"}" stroke-width="${hot ? 1.2 : .8}"/>
        <rect x="${x - caseW / 2 + 3}" y="${caseY + caseH - fillH - 3}" width="${caseW - 6}" height="${fillH.toFixed(1)}" fill="${col}" opacity="${(0.5 + f * 0.4).toFixed(2)}"/>
        <rect x="${x - caseW / 2}" y="${caseY}" width="${caseW}" height="4" rx="2" fill="#384048"/>
        <text x="${x}" y="${caseY + caseH + 14}" class="mv-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${caseY + caseH + 23}" class="mv-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
        ${hot ? `<circle cx="${x + caseW / 2 - 4}" cy="${caseY + 8}" r="3.5" fill="var(--amber)">
          <animate attributeName="r" values="3.5;5;3.5" dur="1.5s" repeatCount="indefinite"/></circle>` : ""}
      </g>`;
    }).join("");

    // visitors
    const visitors = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#a0a0b0");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = TOP + bh - 8 - (i % 2) * 4;
      return `<g class="mv-visitor${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-14} ${y.toFixed(1)};${W + 14} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-8" r="3" fill="${col}"/>
        <ellipse cx="0" cy="0" rx="4" ry="6" fill="${col}" opacity=".85"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="mv-wrap">
        <div class="mv-head"><b>MUSEUM</b><span>展柜=配额窗 满度=用量 观众=会话${hotN ? " · " + hotN + " 珍柜" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#141a20" rx="10"/>
          ${cases}${visitors}
          <text x="16" y="${H - 18}" class="mv-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="mv-ksub" text-anchor="end">方框=挂画</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "博物馆", eyebrow: "MUSEUM", render };
})();
