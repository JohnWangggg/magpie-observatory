/* 用量 — 河流、K线和月花费是同一批吞吐。 */
(() => {
  const TABS = [["stream", "河流"], ["candle", "K线"], ["burnrate", "月花费"]];
  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["usage"] = {
    title: "用量",
    eyebrow: "USAGE",
    render: (host, ctx) => window.ObservatoryBoard(host, ctx, TABS)
  };
})();
