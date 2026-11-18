// A panel in Magpie's own Usage page: today against the 7-day average.
// It runs in the same sandbox as a page and reads only usage:summary.
(async () => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const TEXT = {
    zh: {
      title: "今日一眼", sub: "对比近 7 天日均", tokens: "Token", cost: "费用",
      calls: "调用", errors: "错误", cache: "缓存", avg: "7 日均",
      top: "最多", failed: "读取失败", updated: "更新"
    },
    en: {
      title: "Today", sub: "against the 7-day average", tokens: "Tokens", cost: "Cost",
      calls: "Calls", errors: "Errors", cache: "cache", avg: "7-day avg",
      top: "Top", failed: "Couldn't read", updated: "Updated"
    }
  };
  let lang = "en";
  try {
    const theme = await magpie.ready;
    lang = String(theme.lang || "en").toLowerCase().startsWith("zh") ? "zh" : "en";
    document.documentElement.lang = lang;
  } catch (_) { /* an older window: English */ }
  const t = TEXT[lang];
  document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = t[el.dataset.t] || el.textContent; });

  const nf = new Intl.NumberFormat("en-US");
  const count = (n) => {
    n = Number(n) || 0;
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 1 : 2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K";
    return nf.format(Math.round(n));
  };
  const money = (n) => {
    n = Number(n) || 0;
    if (!n) return "$0";
    if (n < 0.01) return "<$0.01";
    return "$" + n.toFixed(n < 10 ? 2 : 1);
  };
  const pct = (n) => Math.round(Number(n) || 0) + "%";
  const tokensOf = (s) => (Number(s && s.input) || 0) + (Number(s && s.output) || 0);
  const cacheOf = (s) => Number(s && s.cacheRead) || 0;
  const delta = (cur, avg) => {
    if (!avg) return "—";
    const p = (cur - avg) / avg * 100;
    if (!Number.isFinite(p)) return "—";
    return `${lang === "zh" ? "较 " : "vs "}${t.avg} ${p > 0 ? "+" : ""}${Math.round(p)}%`;
  };

  function topModel(s) {
    const rows = new Map();
    let total = 0;
    for (const m of (Array.isArray(s && s.models) ? s.models : [])) {
      const raw = String(m.model || m.name || "—");
      const name = raw.includes("/") ? raw.split("/").pop() : raw;
      const tokens = (Number(m.input) || 0) + (Number(m.output) || 0);
      if (!tokens) continue;
      rows.set(name, (rows.get(name) || 0) + tokens);
      total += tokens;
    }
    if (!rows.size || !total) return null;
    const [name, tokens] = [...rows.entries()].sort((a, b) => b[1] - a[1])[0];
    return { name, share: Math.round(tokens / total * 100) };
  }

  let busy = false;
  async function refresh() {
    if (busy) return;
    busy = true;
    const status = $("status");
    try {
      const [today, week] = await Promise.all([
        magpie.read("usage:summary", { period: "today" }),
        magpie.read("usage:summary", { period: "7d" })
      ]);
      const tokens = tokensOf(today);
      const avgTokens = tokensOf(week) / 7;
      const cost = Number(today.cost) || 0;
      const avgCost = (Number(week.cost) || 0) / 7;
      const calls = Number(today.calls) || 0;
      const avgCalls = (Number(week.calls) || 0) / 7;
      const errors = Number(today.errors) || 0;
      const cache = cacheOf(today);
      const cachePct = tokens + cache ? cache / (tokens + cache) * 100 : 0;

      $("tokens").textContent = count(tokens);
      $("tokens-d").textContent = delta(tokens, avgTokens);
      $("cost").textContent = money(cost);
      $("cost-d").textContent = delta(cost, avgCost);
      $("calls").textContent = nf.format(calls);
      $("calls-d").textContent = delta(calls, avgCalls);
      $("errors").textContent = nf.format(errors);
      $("errors").className = errors ? "bad" : "";
      $("errors-d").textContent = calls ? `${(errors / calls * 100).toFixed(1)}%` : "—";
      $("errors-d").className = errors ? "bad" : "";
      $("tokens-d").title = `${t.cache} ${pct(cachePct)}`;

      const top = topModel(today);
      $("top").innerHTML = top
        ? `${t.top} <b>${esc(top.name)}</b> · ${top.share}%`
        : "";
      status.className = "status";
      status.textContent = `${t.updated} ${new Date().toLocaleTimeString(lang === "zh" ? "zh-CN" : "en", { hour: "2-digit", minute: "2-digit" })}`;
    } catch (err) {
      status.className = "status bad";
      status.textContent = `${t.failed}: ${err && err.message ? err.message : err}`;
    } finally {
      busy = false;
    }
  }

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  try {
    if (magpie.onVisibility) magpie.onVisibility((visible) => { if (visible) refresh(); });
  } catch (_) { /* no visibility hook */ }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  await refresh();
  setInterval(refresh, 60000);
})();
