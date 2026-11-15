/* 延迟 — 热力、分布和排行看的是同一批耗时。 */
(() => {
  const TABS = [["latency", "热力"], ["swarm", "分布"], ["latrank", "排行"]];
  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["delay"] = {
    title: "延迟",
    eyebrow: "LATENCY",
    render: (host, ctx) => window.ObservatoryBoard(host, ctx, TABS)
  };
})();
