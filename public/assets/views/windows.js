/* 额度 — 窗口、配速、预测和账户卡是同一批配额。 */
(() => {
  const TABS = [["budget", "窗口"], ["burn", "配速"], ["forecast", "预测"], ["accounts", "账户"]];
  window.ObservatoryViews = window.ObservatoryViews || {};
  window.ObservatoryViews["windows"] = {
    title: "额度",
    eyebrow: "QUOTA",
    render: (host, ctx) => window.ObservatoryBoard(host, ctx, TABS)
  };
})();
