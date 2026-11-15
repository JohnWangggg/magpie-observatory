/* ------------------------------------------------------------------ trophies
 * Trophies — a glass shelf of achievement badges: each badge
 * unlocks when its metric crosses the bar. Locked badges sit
 * as silhouettes with a progress ring; unlocked ones glow in
 * their metal (gold / silver / bronze / jade / amber).
 * Sessions are polishing cloths buffing the latest trophy.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "trophies";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  const BADGES = [
    { id: "t1m",    icon: "◆", name: "百万词元",  desc: "累计 ≥1M tokens",        metal: "gold",   check: c => ({ v: c.totalEver / 1e6, max: 1 }) },
    { id: "t10m",   icon: "❖", name: "千万俱乐部", desc: "累计 ≥10M tokens",       metal: "jade",   check: c => ({ v: c.totalEver / 1e7, max: 1 }) },
    { id: "r1k",    icon: "⚡", name: "千次请求",  desc: "单日 ≥1k 请求",           metal: "silver", check: c => ({ v: c.peakCalls / 1000, max: 1 }) },
    { id: "day5m",  icon: "☀", name: "单日 5M",   desc: "单日 ≥5M tokens",         metal: "gold",   check: c => ({ v: c.peakTokens / 5e6, max: 1 }) },
    { id: "st7",    icon: "🔥", name: "七日连燃",  desc: "连续活跃 ≥7 天",          metal: "amber",  check: c => ({ v: c.streak / 7, max: 1 }) },
    { id: "st30",   icon: "🏆", name: "月度铁人",  desc: "连续活跃 ≥30 天",         metal: "jade",   check: c => ({ v: c.streak / 30, max: 1 }) },
    { id: "poly3",  icon: "☷", name: "三路分洪",  desc: "同日 ≥3 服务商",           metal: "silver", check: c => ({ v: c.provToday / 3, max: 1 }) },
    { id: "poly6",  icon: "✦", name: "六方会谈",  desc: "同日 ≥6 服务商",           metal: "gold",   check: c => ({ v: c.provToday / 6, max: 1 }) },
    { id: "cache90",icon: "◎", name: "缓存大师",  desc: "缓存命中 ≥90%",            metal: "silver", check: c => ({ v: (c.cache || 0) / 90, max: 1 }) },
    { id: "quiet",  icon: "☾", name: "绿窗满营",  desc: "全部配额窗 <85%",          metal: "jade",   check: c => ({ v: c.hotWindows === 0 ? 1 : 0, max: 1 }) },
    { id: "swarm8", icon: "❋", name: "八仙过海",  desc: "同时在线 ≥8 会话",         metal: "amber",  check: c => ({ v: c.activeNow / 8, max: 1 }) },
    { id: "year",   icon: "◐", name: "周年纪",    desc: "热力历史 ≥300 天",         metal: "gold",   check: c => ({ v: (c.days || 0) / 300, max: 1 }) },
    { id: "dex50",  icon: "▣", name: "半百图鉴",  desc: "图鉴 ≥50 视图",            metal: "silver", check: c => ({ v: c.seenN / 50, max: 1 }) },
    { id: "dexall", icon: "❂", name: "全图鉴",    desc: "看完全部视图",             metal: "jade",   check: c => ({ v: c.seenN / Math.max(1, c.viewTotal), max: 1 }) },
    { id: "night",  icon: "☽", name: "夜航人",    desc: "凌晨 0-6 点有事件",        metal: "amber",  check: c => ({ v: c.nightHits ? 1 : 0, max: 1 }) },
    { id: "clean",  icon: "✓", name: "零错日",    desc: "今日日志无错误",           metal: "silver", check: c => ({ v: c.errToday === 0 && c.logsToday > 0 ? 1 : 0, max: 1 }) },
    { id: "favs8",  icon: "★", name: "收藏家",    desc: "收藏 ≥8 视图",             metal: "amber",  check: c => ({ v: c.favN / 8, max: 1 }) },
    { id: "cinema", icon: "◈", name: "影院常客",  desc: "影院累计 ≥1 小时",         metal: "silver", check: c => ({ v: c.cinemaMs / 3600000, max: 1 }) },
    { id: "magpie", icon: "❦", name: "鹊缘人",    desc: "点台鹊 ≥50 次",            metal: "bronze", check: c => ({ v: c.clicks / 50, max: 1 }) },
    { id: "qwatch", icon: "⚠", name: "临界守望",  desc: "单配额窗 ≥95% 出现过",     metal: "amber",  check: c => ({ v: c.hot95 ? 1 : 0, max: 1 }) },
    { id: "owl3",   icon: "☽", name: "长夜同航",  desc: "凌晨 0-6 点观测 ≥3 天",    metal: "jade",   check: c => ({ v: c.nightDays / 3, max: 1 }) }
  ];

  const METAL = {
    gold:   { face: "#e8c860", edge: "#a88030", text: "#503810" },
    silver: { face: "#c8d0d8", edge: "#8898a8", text: "#384048" },
    bronze: { face: "#c08858", edge: "#885838", text: "#483018" },
    jade:   { face: "#78b888", edge: "#487850", text: "#203828" },
    amber:  { face: "#e0a040", edge: "#a06820", text: "#482800" }
  };

  function render(host, ctx) {
    const days = ctx.data.heatmap || [];
    const k = ctx.data.kpis || {};
    const quotas = ctx.data.quotas || [];

    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) { if ((days[i].tokens || 0) > 0) streak++; else break; }
    const totalEver = days.reduce((a, d) => a + (d.tokens || 0), 0);
    const peakDay = days.reduce((a, d) => (d.tokens > (a.tokens || 0) ? d : a), {});
    const provToday = new Set((ctx.data.logs || []).map(r => r.provider)).size;
    const hotWindows = quotas.reduce((a, q) => a + (q.windows || []).filter(w => (w.used || 0) >= 85).length, 0);
    const activeNow = (ctx.data.sessions || []).filter(s => s.status !== "done").length;

    const logs = ctx.data.logs || [];
    const today = new Date().toISOString().slice(0, 10);
    const logsToday = logs.filter(r => String(r.at || "").slice(0, 10) === today).length;
    const errToday = logs.filter(r => String(r.at || "").slice(0, 10) === today && r.status === "err").length;
    const nightHits = logs.filter(r => { const h = new Date(r.at).getHours(); return h >= 0 && h < 6; }).length;
    let seenN = 0, favN = 0, cinemaMs = 0, clicks = 0, nightDays = 0;
    try { seenN = (JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]")).length; } catch (_) {}
    try { favN = (JSON.parse(localStorage.getItem("magpie.favorites") || "[]")).length; } catch (_) {}
    try { cinemaMs = parseFloat(localStorage.getItem("magpie.cinemaMs") || "0") || 0; } catch (_) {}
    try { clicks = parseInt(localStorage.getItem("magpie.clicks") || "0", 10) || 0; } catch (_) {}
    try { nightDays = (JSON.parse(localStorage.getItem("magpie.nightDays") || "[]")).length; } catch (_) {}
    const hot95 = quotas.some(q => (q.windows || []).some(w => (w.used || 0) >= 95));

    const c = {
      totalEver, peakCalls: peakDay.calls || 0, peakTokens: peakDay.tokens || 0,
      streak, provToday, cache: k.cache, hotWindows, activeNow, days: days.length,
      seenN, viewTotal: (window.Obs && Obs.api && Obs.api.VIEW_META || []).length || 700,
      nightHits, errToday, logsToday, favN, cinemaMs, clicks, nightDays, hot95
    };

    const badges = BADGES.map(b => {
      const { v, max } = b.check(c);
      const pct = Math.max(0, Math.min(1, v / max));
      return { ...b, pct, unlocked: pct >= 1 };
    });
    const unlockedN = badges.filter(b => b.unlocked).length;

    const W = 400, H = 300, COLS = 5;
    const ROWS = Math.ceil(badges.length / COLS);
    const cw = W / COLS, ch = (H - 40) / ROWS;

    const shelf = badges.map((b, i) => {
      const cx = cw * (i % COLS) + cw / 2;
      const cy = 24 + ch * Math.floor(i / COLS) + ch / 2 - 8;
      const met = METAL[b.metal] || METAL.silver;
      const R = 17;
      // progress ring (unlocked → full)
      const ringP = b.unlocked ? 1 : b.pct;
      const circ = 2 * Math.PI * R;
      const ring = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${b.unlocked ? met.face : "var(--line-2)"}" stroke-width="${b.unlocked ? 2.4 : 2}"
        ${b.unlocked ? "" : `stroke-dasharray="${(circ * ringP).toFixed(1)} ${circ.toFixed(1)}" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})"`}/>`;
      const disc = `<circle cx="${cx}" cy="${cy}" r="${R - 3}" fill="${b.unlocked ? met.face : "var(--card-2)"}" ${b.unlocked ? `stroke="${met.edge}"` : 'stroke="var(--line-2)"'} stroke-width="1"/>`;
      const icon = `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="14" fill="${b.unlocked ? met.text : "var(--muted)"}" opacity="${b.unlocked ? 1 : .55}">${b.icon}</text>`;
      const glow = b.unlocked ? `<circle cx="${cx}" cy="${cy}" r="${R + 3}" fill="none" stroke="${met.face}" stroke-width="1" opacity=".35">
        <animate attributeName="r" values="${R + 2};${R + 5};${R + 2}" dur="${(2.4 + i * .2).toFixed(1)}s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".35;.08;.35" dur="${(2.4 + i * .2).toFixed(1)}s" repeatCount="indefinite"/></circle>` : "";
      const lockPct = b.unlocked ? "" : `<text x="${cx}" y="${cy + R + 9}" text-anchor="middle" class="tr-pct">${Math.round(b.pct * 100)}%</text>`;
      return `<g class="tr-badge${b.unlocked ? " on" : ""}" title="${esc(b.name)} · ${esc(b.desc)}">
        ${glow}${disc}${ring}${icon}
        <text x="${cx}" y="${cy + R + (b.unlocked ? 10 : 20)}" text-anchor="middle" class="tr-name" ${b.unlocked ? "" : 'opacity=".6"'}>${esc(b.name)}</text>
        ${lockPct}
      </g>`;
    }).join("");

    // shelf rails
    const rails = Array.from({ length: ROWS - 1 }, (_, r) =>
      `<line x1="10" y1="${24 + ch * (r + 1) - 4}" x2="${W - 10}" y2="${24 + ch * (r + 1) - 4}" stroke="var(--line-2)" stroke-width="1" opacity=".5"/>`).join("");

    // polishing cloths — sessions buffing
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done").slice(0, 3);
    const cloths = sessions.map((s, i) => {
      const col = (ctx.agentMeta && ctx.agentMeta[s.agent] && ctx.agentMeta[s.agent].color) || "#a8c8f8";
      const bx = cw * (i % COLS) + cw / 2;
      return `<g class="tr-cloth">
        <animateMotion dur="${(3 + i).toFixed(0)}s" repeatCount="indefinite"
          path="M ${bx - 14} ${H - 30} L ${bx + 14} ${H - 30} L ${bx - 14} ${H - 30}"/>
        <rect x="-5" y="-3" width="10" height="6" rx="2" fill="${col}" opacity=".8"/>
      </g>`;
    }).join("");

    host.innerHTML = `
      <div class="tr-wrap">
        <div class="tr-head"><b>TROPHIES</b><span>${unlockedN}/${badges.length} 已解锁 · 连燃 ${c.streak} 天 · ${(c.provToday)} 路商</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="var(--card)" rx="10"/>
          ${rails}${shelf}${cloths}
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "成就", eyebrow: "TROPHIES", render };
})();
