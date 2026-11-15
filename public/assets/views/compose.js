/* 构成 — 面积、马赛克、流向、和弦、模型榜是同一批份额。 */
(() => {
  const TABS = [["treemap", "面积"], ["marimekko", "马赛克"], ["sankey", "流向"], ["chord", "和弦"], ["league", "模型"]];
  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["compose"] = {
    title: "构成",
    eyebrow: "MIX",
    render: (host, ctx) => window.ObservatoryBoard(host, ctx, TABS)
  };
})();
