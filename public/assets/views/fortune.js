/* ------------------------------------------------------------------ fortune
 * Fortune — a daily slip from the observatory's oracle: the stick is
 * seeded by the date and read against live data — the busiest provider
 * becomes 宜, a quota window over 85% becomes 忌, today's lucky color
 * is the provider burning brightest. One draw per day.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "fortune";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));

  const LUCKY = ["大吉", "中吉", "小吉", "平", "需沉淀"];
  const YI = ["长上下文", "深夜重构", "批量并行", "换新模型", "冷启动", "多开会话", "缓存复用", "大胆试错"];
  const JI = ["裸奔无备份", "重复请求", "盯着报错", "超时重试风暴", "上下文塞满", "跨号混用", "凌晨硬冲"];
  const ODES = [
    "喜鹊东飞，token 西归",
    "窗口未满，尚可再战",
    "路由千条，稳字当头",
    "缓存一响，黄金万两",
    "改道非退，柳暗花明",
  ];

  function daySeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(daySeed());

  function render(host, ctx) {
    const quotas = ctx.data.quotas || [];
    const providers = ctx.data.providers || [];
    const sessions = (ctx.data.sessions || []).filter(s => s.status !== "done");
    const pmeta = ctx.providerMeta || {};
    const metaOf = k => (typeof pmeta === "function" ? pmeta(k) : (pmeta[k] || {}));

    const hotWin = quotas.flatMap(q => (q.windows || []).map(w => ({ prov: q.provider, used: w.used || 0 }))).sort((a, b) => b.used - a.used)[0];
    const busy = providers.slice().sort((a, b) => (b.tokens || 0) - (a.tokens || 0))[0];
    const luckyP = busy && metaOf(busy.key);
    const luckyColor = (luckyP && luckyP.color) || "#f2a541";
    const luckyName = (luckyP && luckyP.name) || (hotWin && metaOf(hotWin.prov).name) || "—";

    const grade = sessions.length === 0 ? 4 : Math.min(3, Math.floor(rnd() * 4));
    const yi = hotWin && hotWin.used >= 85 ? "换个号" : YI[Math.floor(rnd() * YI.length)];
    const ji = JI[Math.floor(rnd() * JI.length)];
    const ode = ODES[Math.floor(rnd() * ODES.length)];
    const gradeTxt = LUCKY[grade];

    const kpis = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");

    host.innerHTML = `
      <div class="fo-wrap">
        <div class="fo-head"><b>FORTUNE</b><span>每日一签 · 种子=${daySeed()}</span></div>
        <div class="fo-slip">
          <div class="fo-paper">
            <div class="fo-grade g${grade}">${gradeTxt}</div>
            <div class="fo-ode">${ode}</div>
            <div class="fo-rows">
              <div class="fo-row"><b>宜</b><span>${esc(yi)}${busy ? ` · 走 ${esc(luckyName)}` : ""}</span></div>
              <div class="fo-row"><b>忌</b><span>${esc(ji)}${hotWin && hotWin.used >= 85 ? ` · ${esc(metaOf(hotWin.prov).name || hotWin.prov)} 已 ${Math.round(hotWin.used)}%` : ""}</span></div>
              <div class="fo-row"><b>运</b><span><i class="fo-dot" style="background:${luckyColor}"></i>幸运色 · ${esc(luckyName)} 之彩</span></div>
              <div class="fo-row"><b>数</b><span>今日 ${fmt(kpis.tokens)} tokens · ${sessions.length} 会话在飞</span></div>
            </div>
            <div class="fo-seal">鹊</div>
          </div>
          <div class="fo-tube"><div class="fo-sticks">${"<i></i>".repeat(6)}</div></div>
        </div>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "每日签", eyebrow: "FORTUNE", render };
})();
