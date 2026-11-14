/* ------------------------------------------------------------------ monotype
 * Monotype — a glass plate & roller: every quota window is a
 * rolled impression (ink density + ghost halo = used%, ≥85%
 * the ghost layer burns amber); sessions are printers (a
 * brayer + rag) pulling the single proof.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "monotype";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  function render(host, ctx) {
    const quotas = (ctx.data.quotas || []).flatMap(q => (q.windows || []).map(w => ({
      prov: q.provider, name: w.name || q.name || "窗口", used: w.used || 0
    }))).sort((a, b) => b.used - a.used).slice(0, 6);
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 4);
    const pmeta = ctx.providerMeta || {};
    const metaOf = (m, k) => (typeof m === "function" ? m(k) : (m[k] || {}));

    const W = 400, H = 300, TOP = 54, BOT = 42;
    const cols = Math.min(quotas.length, 6);
    const bw = (W - 24) / cols;
    const bh = H - TOP - BOT;
    const floorY = TOP + bh;

    const prints = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#5060a0";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const printY = floorY - 14;
      const printW = bw - 16, printH = 26;
      // ink density = f (gradient of ghost to solid)
      const density = `<rect x="${x - printW / 2}" y="${printY - printH}" width="${printW}" height="${printH * f}" fill="${col}" opacity="${(0.35 + f * 0.45).toFixed(2)}"/>`;
      // ghost halo above when hot
      const ghost = hot ? `<rect x="${x - printW / 2 - 2}" y="${printY - printH - 4}" width="${printW + 4}" height="${printH + 4}" fill="none" stroke="var(--amber)" stroke-width="1" opacity=".5">
          <animate attributeName="opacity" values=".5;.15;.5" dur="1.6s" repeatCount="indefinite"/></rect>` : "";
      // brayer streaks
      const streaks = Array.from({ length: 2 }, (_, si) => {
        const sy = printY - printH + 6 + si * 8;
        return `<line x1="${x - printW / 2 + 3}" y1="${sy}" x2="${x + printW / 2 - 3 - si * 4}" y2="${sy}" stroke="#f0f4f8" stroke-width=".8" opacity="${(0.3 + f * 0.4).toFixed(2)}"/>`;
      }).join("");
      // paper edge
      const paper = `<rect x="${x - printW / 2 - 3}" y="${printY - 2}" width="${printW + 6}" height="4" fill="#e8e4dc"/>`;
      return `<g class="my-print${hot ? " hot" : ""}">
        ${ghost}${paper}
        <rect x="${x - printW / 2}" y="${printY - printH}" width="${printW}" height="${printH}" rx="1" fill="#1c2030" stroke="${hot ? "var(--amber)" : "#384058"}" stroke-width="${hot ? 1.4 : .8}"/>
        ${density}${streaks}
        <text x="${x}" y="${printY + 14}" class="my-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${printY + 23}" class="my-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // printers — brayer + rag
    const printers = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#7080b0");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="my-printer${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <rect x="4" y="-8" width="10" height="5" rx="2" fill="#384058"/>
        <circle cx="4" cy="-5" r="1.5" fill="${col}"/>
        <path d="M10 -3 L14 -1" stroke="#e8e4dc" stroke-width="1.5"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="my-wrap">
        <div class="my-head"><b>MONOTYPE</b><span>单版=配额窗 墨厚=用量 鬼影=过热 印工=会话${hotN ? " · " + hotN + " 拓" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#10141c" rx="10"/>
          ${prints}${printers}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1a1e28"/>
          <text x="16" y="${H - 18}" class="my-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="my-ksub" text-anchor="end">白边=纸沿</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "单版印", eyebrow: "MONOTYPE", render };
})();
