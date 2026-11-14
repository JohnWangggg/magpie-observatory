/* ----------------------------------------------------------------- locksmith
 * Locksmith — a board of warded locks: every quota window is
 * a padlock body (shackle arc + keyhole glow = used%, ≥85%
 * the keyhole burns amber); sessions are locksmiths (a visor
 * + pick) working the wards.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "locksmith";
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

    const locks = quotas.map((w, i) => {
      const x = 12 + i * bw + bw / 2;
      const m = metaOf(pmeta, w.prov);
      const col = m.color || "#a0a8b8";
      const hot = w.used >= 85;
      const f = Math.min(1, w.used / 100);
      const lockY = floorY - 14;
      const lockW = bw - 22, lockH = 22;
      const shackleR = lockW / 2 - 4;
      const shackleH = 8 + f * 8;
      // ward pattern inside body
      const wards = Array.from({ length: 3 }, (_, wi) => {
        const wy = lockY - 14 + wi * 5;
        return `<line x1="${x - lockW / 2 + 4}" y1="${wy}" x2="${x + lockW / 2 - 4}" y2="${wy}" stroke="#384048" stroke-width="1" opacity=".6"/>`;
      }).join("");
      return `<g class="lo-lock${hot ? " hot" : ""}">
        <!-- board -->
        <line x1="${x - lockW / 2 - 6}" y1="${lockY - lockH - shackleH}" x2="${x + lockW / 2 + 6}" y2="${lockY - lockH - shackleH}" stroke="#3a3028" stroke-width="2"/>
        <!-- shackle -->
        <path d="M${x - shackleR} ${lockY - lockH} A ${shackleR} ${shackleH / 2 + 4} 0 0 1 ${x + shackleR} ${lockY - lockH}" fill="none" stroke="${col}" stroke-width="3.5"/>
        <circle cx="${x - shackleR}" cy="${lockY - lockH}" r="2.5" fill="#384048"/>
        <circle cx="${x + shackleR}" cy="${lockY - lockH}" r="2.5" fill="#384048"/>
        <!-- body -->
        <rect x="${x - lockW / 2}" y="${lockY - lockH}" width="${lockW}" height="${lockH}" rx="3" fill="#5a6470" stroke="${hot ? "var(--amber)" : "#384048"}" stroke-width="${hot ? 1.4 : .8}"/>
        ${wards}
        <!-- keyhole -->
        <circle cx="${x}" cy="${lockY - lockH / 2}" r="4" fill="#181f28"/>
        <path d="M${x - 1.5} ${lockY - lockH / 2 + 3} L${x - 2.5} ${lockY - lockH / 2 + 9} L${x + 2.5} ${lockY - lockH / 2 + 9} L${x + 1.5} ${lockY - lockH / 2 + 3} Z" fill="#181f28"/>
        <circle cx="${x}" cy="${lockY - lockH / 2}" r="2" fill="${col}" opacity="${(0.3 + f * 0.5).toFixed(2)}">
          ${hot ? `<animate attributeName="opacity" values="${(0.3 + f * 0.5).toFixed(2)};.6;${(0.3 + f * 0.5).toFixed(2)}" dur="1.3s" repeatCount="indefinite"/>` : ""}
        </circle>
        <text x="${x}" y="${lockY + 12}" class="lo-num" text-anchor="middle">${Math.round(w.used)}%</text>
        <text x="${x}" y="${lockY + 21}" class="lo-name" text-anchor="middle">${esc(w.name.slice(0, 5))}</text>
      </g>`;
    }).join("");

    // locksmiths — visor + pick
    const smiths = sessions.map((s, i) => {
      const m = metaOf(ctx.agentMeta || {}, s.agent);
      const col = s.status === "err" ? "var(--red)" : (m.color || "#b0b8c8");
      const dur = Math.max(12, 24 - (s.tps || 0) / 10);
      const y = floorY - 6 - (i % 2) * 3;
      return `<g class="lo-smith${s.status === "err" ? " dead" : ""}">
        <animateTransform attributeName="transform" type="translate" values="${-16} ${y.toFixed(1)};${W + 16} ${y.toFixed(1)}" dur="${dur}s" begin="${(-i * dur / sessions.length).toFixed(1)}s" repeatCount="indefinite"/>
        <circle cx="0" cy="-9" r="3.5" fill="${col}"/>
        <rect x="-4" y="-5" width="8" height="9" rx="2" fill="${col}" opacity=".9"/>
        <line x1="4" y1="-4" x2="10" y2="-9" stroke="${col}" stroke-width="1.2"/>
        <line x1="10" y1="-9" x2="13" y2="-7" stroke="${col}" stroke-width="1"/>
      </g>`;
    }).join("");

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");
    const hotN = quotas.filter(w => w.used >= 85).length;

    host.innerHTML = `
      <div class="lo-wrap">
        <div class="lo-head"><b>LOCKSMITH</b><span>挂锁=配额窗 拱梁=用量 匙孔=过热 锁匠=会话${hotN ? " · " + hotN + " 开" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="#14161a" rx="10"/>
          ${locks}${smiths}
          <rect x="0" y="${floorY + 2}" width="${W}" height="${BOT - 2}" fill="#1c2028"/>
          <text x="16" y="${H - 18}" class="lo-k">${fmt(k.tokens)}</text>
          <text x="${W - 16}" y="${H - 18}" class="lo-ksub" text-anchor="end">挡板=排障</text>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "锁匠坊", eyebrow: "LOCKSMITH", render };
})();
