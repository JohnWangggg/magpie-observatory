/* ------------------------------------------------------------------ burnrate
 * Burnrate — daily spend this month with end-of-month projection:
 * bars = actual daily cost, dotted extension = projected spend
 * at current run-rate; the month-end marker glows amber if the
 * projection exceeds the soft budget line.
 * ----------------------------------------------------------------- */

(() => {
  const VIEW = "burnrate";
  const esc = x => String(x ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const COST_PER_M = 1.32; // same estimate used by computeView

  function render(host, ctx) {
    const days = ctx.data.heatmap || [];
    const now = new Date();
    const y = now.getFullYear(), mo = now.getMonth();
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const today = now.getDate();

    // this month so far
    const monthDays = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const rec = days.find(x => x.date === iso);
      monthDays.push({ d, tokens: rec ? rec.tokens || 0 : 0, calls: rec ? rec.calls || 0 : 0, future: d > today });
    }
    const spent = monthDays.filter(x => !x.future).reduce((a, x) => a + x.tokens / 1e6 * COST_PER_M, 0);
    const avgDaily = today > 0 ? spent / today : 0;
    const projected = avgDaily * daysInMonth;
    const softBudget = Math.max(5, spent * 1.35); // soft cap at 135% of pace-0
    const over = projected > softBudget;

    const W = 400, H = 300, PAD = 16, TOP = 40, BOT = 46;
    const chartW = W - PAD * 2 - 30;
    const chartH = H - TOP - BOT;
    const barW = chartW / daysInMonth;
    const maxC = Math.max(...monthDays.map(x => x.tokens / 1e6 * COST_PER_M), projected / daysInMonth * 1.2, softBudget / daysInMonth) * 1.15;

    // grid + budget line
    const budgetY = TOP + chartH - (softBudget / daysInMonth / maxC) * chartH;
    const grid = [0.25, 0.5, 0.75, 1].map(f =>
      `<line x1="${PAD}" y1="${TOP + chartH * (1 - f)}" x2="${W - PAD - 14}" y2="${TOP + chartH * (1 - f)}" stroke="var(--line-2)" stroke-width=".5" opacity=".6"/>`).join("");
    const budget = `<line x1="${PAD}" y1="${budgetY}" x2="${W - PAD - 14}" y2="${budgetY}" stroke="var(--amber)" stroke-width="1" stroke-dasharray="4 3" opacity=".8"/>
      <text x="${W - PAD - 14}" y="${budgetY - 3}" class="br-budget" text-anchor="end">日均软预算 $${(softBudget / daysInMonth).toFixed(2)}</text>`;

    // bars
    const bars = monthDays.map(x => {
      const cx = PAD + (x.d - 1) * barW;
      const h = (x.tokens / 1e6 * COST_PER_M / maxC) * chartH;
      const isToday = x.d === today;
      const col = x.future ? "var(--line-2)" : isToday ? "var(--accent)" : "color-mix(in srgb, var(--accent) 55%, var(--card-2))";
      const rect = x.future
        ? `<rect x="${cx + .5}" y="${TOP + chartH - 3}" width="${barW - 1}" height="3" fill="${col}" opacity=".3"/>`
        : `<rect x="${cx + .5}" y="${(TOP + chartH - h).toFixed(1)}" width="${barW - 1}" height="${h.toFixed(1)}" fill="${col}" rx="1"/>`;
      return `<g class="br-bar${isToday ? " today" : ""}${x.future ? " fut" : ""}">${rect}
        ${isToday ? `<line x1="${cx + barW / 2}" y1="${TOP - 6}" x2="${cx + barW / 2}" y2="${TOP + chartH}" stroke="var(--fg)" stroke-width=".6" stroke-dasharray="2 3" opacity=".5"/>` : ""}
      </g>`;
    }).join("");

    // projection line — today's cumulative to month end
    const cumX = PAD + today * barW;
    const cumY = TOP + chartH - (spent / (softBudget * 2.2) * chartH) * .9;
    const endX = W - PAD - 14;
    const endY = TOP + chartH - (projected / (softBudget * 2.2) * chartH) * .9;
    const proj = `<line x1="${cumX}" y1="${cumY}" x2="${endX}" y2="${endY}" stroke="${over ? "var(--amber)" : "var(--accent)"}" stroke-width="1.6" stroke-dasharray="4 3"/>
      <circle cx="${endX}" cy="${endY}" r="4" fill="${over ? "var(--amber)" : "var(--accent)"}"/>
      <circle cx="${endX}" cy="${endY}" r="8" fill="${over ? "var(--amber)" : "var(--accent)"}" opacity=".2">
        <animate attributeName="r" values="8;13;8" dur="2s" repeatCount="indefinite"/></circle>`;

    const k = (ctx.view && ctx.view.kpis) || ctx.data.kpis || {};
    const fmt = ctx.fmtTokens || (v => (v / 1e6).toFixed(1) + "M");

    host.innerHTML = `
      <div class="b2-wrap">
        <div class="b2-head"><b>BURNRATE</b><span>本月已花 $${spent.toFixed(2)} · 预测 $${projected.toFixed(2)}${over ? " · ⚠ 超软预算" : ""}</span></div>
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
          <rect x="0" y="0" width="400" height="300" fill="var(--card)" rx="10"/>
          ${grid}${budget}${bars}${proj}
          <text x="${PAD}" y="${TOP - 12}" class="b2-axis">${y}-${String(mo + 1).padStart(2, "0")} 每日成本</text>
          <text x="${W - PAD}" y="${TOP - 12}" class="b2-axis" text-anchor="end">→ 月末</text>
          <g class="b2-stats">
            <text x="${PAD}" y="${H - 20}" class="b2-k">$${spent.toFixed(2)}<tspan class="b2-ksub"> 已花</tspan></text>
            <text x="${PAD + 90}" y="${H - 20}" class="b2-k">$${avgDaily.toFixed(2)}<tspan class="b2-ksub"> /天</tspan></text>
            <text x="${PAD + 185}" y="${H - 20}" class="b2-k" ${over ? 'fill="var(--amber)"' : ""}>$${projected.toFixed(2)}<tspan class="b2-ksub"> 月末预测</tspan></text>
          </g>
        </svg>
      </div>`;
  }

  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews[VIEW] = { title: "燃尽", eyebrow: "BURNRATE", render };
})();
