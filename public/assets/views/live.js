/* 会话 — 时间轴和关系是同一批会话的两种切法。 */
(() => {
  const TABS = [["waterfall", "时间轴"], ["network", "关系"]];
  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["live"] = {
    title: "会话",
    eyebrow: "SESSIONS",
    render: (host, ctx) => window.ObservatoryBoard(host, ctx, TABS)
  };
})();
