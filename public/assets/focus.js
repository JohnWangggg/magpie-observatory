/* Magpie Observatory — focus view.
   One screen, three questions:
     1. What is in flight now?
     2. What did today cost?
     3. Will an allowance run out before it resets?
   Everything is read from the same read-only snapshot the full page uses. */
(function () {
  "use strict";

  const D = window.MagpieData;
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const PREVIEW = location.port === "8777";
  const FORCE_DEMO = new URLSearchParams(location.search).get("demo") === "1";

  const token = (() => {
    try {
      const el = document.querySelector('meta[name="magpie-api-token"]');
      return el && el.content ? el.content : "";
    } catch (_) { return ""; }
  })();
  const headers = () => token ? { "x-magpie-api-token": token } : {};

  const PERIOD_KEY = "magpie.focusPeriod";
  const PERIODS = ["today", "7d", "30d"];
  const state = {
    period: (() => {
      try { const p = localStorage.getItem(PERIOD_KEY); return PERIODS.includes(p) ? p : "today"; }
      catch (_) { return "today"; }
    })(),
    data: null,
    base: null,
    mix: (() => {
      try { return localStorage.getItem("magpie.focusMix") === "model" ? "model" : "account"; }
      catch (_) { return "account"; }
    })(),
    demo: false,
    error: "",
    lastAt: 0,
    busy: false,
    again: false
  };

  const LANG = (() => {
    const q = new URLSearchParams(location.search).get("lang");
    if (q) return q.toLowerCase().startsWith("zh") ? "zh" : "en";
    return String(navigator.language || "zh").toLowerCase().startsWith("zh") ? "zh" : "en";
  })();
  const ZH = {
    docTitle: "观测台 · 专注", brand: "观测台",
    now: "现在", today: "今日", quota: "额度", mix: "构成", account: "账号", model: "模型",
    pToday: "今天", p7: "7 天", p30: "30 天",
    period: { today: "今日", "7d": "近 7 天", "30d": "近 30 天" },
    conn: { live: "实时", demo: "演示数据", stale: "连接中断", down: "未连接", connecting: "连接中" },
    status: { streaming: "运行中", queued: "排队", done: "完成", error: "失败" },
    readonly: "只读 · 本机", quotaSub: "跨账号排序 · 最近窗口",
    big: "TOKENS", input: "输入", output: "输出",
    cost: "费用", calls: "调用", errors: "错误", cache: "缓存命中",
    yesterday: "昨日全天", daily: "日均",
    errorRate: (x) => `错误率 ${x}%`, retry: (n) => `重试 ${n}`, cacheSub: "缓存读 / 输入+缓存",
    nowLive: (n, t) => `${n} 个在飞${t ? ` · ${t} tok/s` : ""}`,
    nowIdle: (p, n) => `当前空闲 · ${p} ${n} 次调用`,
    nowEmpty: "空闲",
    noRequests: "现在没有请求在飞", recentBelow: "下面是最近完成的会话", waitCall: "等一次调用落进来",
    liveN: (n) => `${n} 个在飞`, moreN: (n) => `（另有 ${n} 个）`,
    recentN: (n) => `最近完成 ${n} 条`, sessionN: (n) => `会话 ${n} 条`,
    idleFoot: (n, s) => `当前空闲 · 最近完成 ${n} 条 · 会话 ${s} 条`,
    runTokenTitle: "本回合 输入+输出",
    emptyMix: "这段时间没有模型用量",
    balance: "余额", resetIn: (d) => `${d} 后重置`, left: (n) => `剩 ${n}%`,
    runOut: (d) => `约 ${d} 后耗尽`, justReset: "刚好撑到重置", lasts: "撑得到重置",
    low: "余量偏低", unknown: "数据不足", steady: "消耗平稳",
    scrollAll: " · 滚动看全部",
    quotaFoot: (n, b, a, u) => `${n} 个窗口 · 按风险排序${b ? ` · ${b} 个会在重置前耗尽` : ""}${a ? ` · ${a} 个需要留意` : ""}${u ? ` · ${u} 个数据不足` : ""}${!b && !a ? " · 没有明确风险" : ""}`,
    quotaEmpty: "网关没有返回额度窗口", quotaSource: "额度来自 /v1/magpie/quotas 与额度历史",
    notConnected: "还没有连上 Magpie", confirmGateway: "确认网关在运行，然后点重试",
    quotaMethod: "按最近 90 分钟或本窗口平均；数据不足时不给预测",
    mixByCost: "按费用", mixByShare: "按占比", mixByToken: "按 token",
    accountN: (n) => `${n} 个账号`, modelN: (n) => `${n} 个模型`, providerN: (n) => `${n} 个供应商`,
    riskBad: "有额度会在重置前耗尽", riskWarn: "额度偏紧",
    banner: "读不到 Magpie", retryBtn: "重试",
    modeLive: "数据来自 Magpie 只读接口", modeDemo: "演示数据 · 不是你的真实用量",
    modeError: (e) => `读取失败 · ${e}`,
    errsN: (n) => `${n} 个错误`, noErrors: "无错误",
    updated: (t, r) => `更新 ${t} · ${r}`,
    durMin: (n) => `${n} 分钟`, durLess: "不到 1 分钟",
    durH: (h, m) => `${h} 小时${m ? ` ${m} 分` : ""}`,
    durD: (d, h) => `${d} 天${h ? ` ${h} 小时` : ""}`,
    justNow: "刚刚", secAgo: (n) => `${n} 秒前`, minAgo: (n) => `${n} 分钟前`, hourAgo: (n) => `${n} 小时前`,
    asOf: "截至", sparkN: (n) => `近 ${n} 天`, sparkAvg: (v) => `日均 ${v}`,
    failReroute: "改道"
  };
  const EN = {
    docTitle: "Observatory · Focus", brand: "Observatory",
    now: "Now", today: "Today", quota: "Allowances", mix: "Mix", account: "Account", model: "Model",
    pToday: "Today", p7: "7 days", p30: "30 days",
    period: { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days" },
    conn: { live: "Live", demo: "Demo data", stale: "Disconnected", down: "Offline", connecting: "Connecting" },
    status: { streaming: "Running", queued: "Queued", done: "Done", error: "Failed" },
    readonly: "Read-only · local", quotaSub: "All accounts · recent window",
    big: "TOKENS", input: "input", output: "output",
    cost: "Cost", calls: "Calls", errors: "Errors", cache: "Cache hit",
    yesterday: "Yesterday", daily: "daily avg",
    errorRate: (x) => `error rate ${x}%`, retry: (n) => `${n} ${n === 1 ? "retry" : "retries"}`, cacheSub: "cache / input+cache",
    nowLive: (n, t) => `${n} live${t ? ` · ${t} tok/s` : ""}`,
    nowIdle: (p, n) => `Idle · ${p} ${n} calls`,
    nowEmpty: "Idle",
    noRequests: "No requests in flight", recentBelow: "Recent completions below", waitCall: "Waiting for a call",
    liveN: (n) => `${n} live`, moreN: (n) => ` (${n} more)`,
    recentN: (n) => `${n} recent`, sessionN: (n) => `${n} session${n === 1 ? "" : "s"}`,
    idleFoot: (n, s) => `Idle · ${n} recent · ${s} session${s === 1 ? "" : "s"}`,
    runTokenTitle: "this turn in+out",
    emptyMix: "No usage in this period",
    balance: "Balance", resetIn: (d) => `${d} to reset`, left: (n) => `${n}% left`,
    runOut: (d) => `runs out in ${d}`, justReset: "just lasts to reset", lasts: "lasts to reset",
    low: "low", unknown: "not enough data", steady: "steady",
    scrollAll: " · scroll for all",
    quotaFoot: (n, b, a, u) => `${n} window${n === 1 ? "" : "s"} · by risk${b ? ` · ${b} before reset` : ""}${a ? ` · ${a} to watch` : ""}${u ? ` · ${u} without data` : ""}${!b && !a ? " · no clear risk" : ""}`,
    quotaEmpty: "The gateway returned no allowance windows", quotaSource: "Allowances from /v1/magpie/quotas and history",
    notConnected: "Not connected to Magpie", confirmGateway: "Check the gateway and retry",
    quotaMethod: "Last 90 minutes or the current-window average; no forecast when data is insufficient",
    mixByCost: "by cost", mixByShare: "by share", mixByToken: "by tokens",
    accountN: (n) => `${n} account${n === 1 ? "" : "s"}`, modelN: (n) => `${n} model${n === 1 ? "" : "s"}`, providerN: (n) => `${n} provider${n === 1 ? "" : "s"}`,
    riskBad: "An allowance runs out before reset", riskWarn: "An allowance is tight",
    banner: "Cannot read Magpie", retryBtn: "Retry",
    modeLive: "Data from Magpie read-only APIs", modeDemo: "Demo data · not your usage",
    modeError: (e) => `Read failed · ${e}`,
    errsN: (n) => `${n} error${n === 1 ? "" : "s"}`, noErrors: "No errors",
    updated: (t, r) => `Updated ${t} · ${r}`,
    durMin: (n) => `${n} min`, durLess: "<1 min",
    durH: (h, m) => `${h}h${m ? ` ${m}m` : ""}`,
    durD: (d, h) => `${d}d${h ? ` ${h}h` : ""}`,
    justNow: "just now", secAgo: (n) => `${n}s ago`, minAgo: (n) => `${n}m ago`, hourAgo: (n) => `${n}h ago`,
    asOf: "as of", sparkN: (n) => `Last ${n} days`, sparkAvg: (v) => `avg ${v}`,
    failReroute: "rerouted"
  };
  const L = LANG === "zh" ? ZH : EN;
  document.documentElement.lang = LANG === "zh" ? "zh-CN" : "en";
  document.title = L.docTitle;
  // Static labels carry data-l; dynamic ones are set in render/paintStatus.
  document.querySelectorAll("[data-l]").forEach((el) => {
    const v = L[el.dataset.l];
    if (typeof v === "string") el.textContent = v;
  });
  $("#conn").textContent = L.conn.connecting;
  $("#today-title").textContent = L.period[state.period];
  $("#mix-sub").textContent = L.period[state.period];
  $("#spark-title").textContent = L.sparkN(state.period === "7d" ? 7 : state.period === "30d" ? 30 : 14);
  const STATUS_CLASS = { streaming: "run", queued: "queue", done: "done", error: "err" };
  const PERIOD_ARG = { today: "today", "7d": "7d", "30d": "30d" };

  /* theme: Magpie hands over ?hostTheme=…; otherwise follow the system. */
  (() => {
    const q = new URLSearchParams(location.search).get("hostTheme");
    if (q === "light" || q === "dark") {
      document.documentElement.dataset.theme = q;
      return;
    }
    try {
      const mq = matchMedia("(prefers-color-scheme: light)");
      const apply = () => { document.documentElement.dataset.theme = mq.matches ? "light" : "dark"; };
      apply();
      if (mq.addEventListener) mq.addEventListener("change", apply);
    } catch (_) {}
  })();

  function providerOf(p) {
    try { return D.providerMeta(p); } catch (_) { return { name: p || "—", icon: "magpie.svg", color: "var(--muted)" }; }
  }
  function agentOf(a) {
    try { return D.agentMeta(a); } catch (_) { return { name: a || "Agent", icon: "magpie.svg" }; }
  }
  function icon(file, alt) {
    return `<img src="${esc(D.iconUrl(file))}" alt="${esc(alt || "")}" loading="lazy">`;
  }
  function demoState(period) {
    const d = D.mockState();
    // A believable "yesterday" for the demo: the heatmap's second-to-last day,
    // with cost taken from the same token ratio.
    const prev = d.heatmap[d.heatmap.length - 2];
    if (prev) {
      d.kpis.yTokens = Number(prev.tokens) || 0;
      d.kpis.yCalls = Number(prev.calls) || 0;
      d.kpis.yCost = +((Number(d.kpis.cost) || 0) * (d.kpis.yTokens / Math.max(1, Number(d.kpis.tokens) || 1))).toFixed(2);
    }
    if (period === "today") return d;
    const days = period === "30d" ? 30 : 7;
    const heat = (d.heatmap || []).slice(-days);
    if (!heat.length) return d;
    const tokens = heat.reduce((a, x) => a + (Number(x.tokens) || 0), 0);
    const calls = heat.reduce((a, x) => a + (Number(x.calls) || 0), 0);
    const ratio = tokens / (Number(d.kpis.tokens) || 1);
    d.kpis.tokens = tokens;
    d.kpis.calls = calls;
    d.kpis.requests = calls;
    d.kpis.cost = +(Number(d.kpis.cost) * ratio).toFixed(2);
    d.kpis.errors = Math.round(Number(d.kpis.errors) * ratio);
    d.kpis.tokensDelta = 0;
    d.kpis.requestsDelta = 0;
    d.kpis.costDelta = 0;
    // Scale the demo breakdowns with the period, otherwise a 30-day view
    // would show today's account spend beside a 30-day total.
    d.accounts = (d.accounts || []).map((a) => ({
      ...a,
      calls: Math.round((Number(a.calls) || 0) * ratio),
      cost: +((Number(a.cost) || 0) * ratio).toFixed(2),
      tokens: Math.round((Number(a.tokens) || 0) * ratio),
      credits: +((Number(a.credits) || 0) * ratio).toFixed(2)
    }));
    d.models = (d.models || []).map((m) => ({
      ...m,
      tokens: Math.round((Number(m.tokens) || 0) * ratio)
    }));
    return d;
  }

  function money(n) { return D.fmtMoney(Number(n) || 0); }
  function tokens(n) { return D.fmtTokens(Number(n) || 0); }

  function dur(min) {
    if (min == null || !Number.isFinite(min)) return "—";
    min = Math.max(0, min);
    if (min < 1) return L.durLess;
    if (min < 60) return L.durMin(Math.round(min));
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    if (h < 24) return L.durH(h, m);
    const d = Math.floor(h / 24);
    return L.durD(d, h % 24);
  }
  function ms(v) {
    const n = Number(v) || 0;
    return n >= 1000 ? (n / 1000).toFixed(1) + "s" : Math.round(n) + "ms";
  }
  function mask(v) {
    let s = String(v == null ? "" : v).trim();
    if (!s) return "";
    if (s.includes("****")) return s;
    if (s.includes("@")) {
      const [user, domain] = s.split("@");
      return (user.length <= 2 ? user.slice(0, 1) + "***" : user.slice(0, 2) + "***") + "@" + domain;
    }
    if (/^\d{5,}$/.test(s)) return s.slice(0, 3) + "****" + s.slice(-4);
    if (s.length > 24) return s.slice(0, 8) + "…";
    return s;
  }
  function clock(ts) {
    try {
      return new Date(ts).toLocaleTimeString(LANG === "zh" ? "zh-CN" : "en", { hour12: false, hour: "2-digit", minute: "2-digit" });
    } catch (_) { return "—"; }
  }
  function since(ts) {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 5) return L.justNow;
    if (s < 60) return L.secAgo(s);
    if (s < 3600) return L.minAgo(Math.round(s / 60));
    return L.hourAgo(Math.round(s / 3600));
  }

  /* ---------------------------------------------------------------- load --- */
  async function load() {
    if (FORCE_DEMO) return;
    if (state.busy) { state.again = true; return; }
    if (document.hidden) return;
    state.busy = true;
    const period = state.period;
    try {
      const data = await D.fetchLive(PERIOD_ARG[period] || "today");
      // A period switch during the fetch must not paint the old period.
      if (period === state.period) {
        state.data = data;
        state.demo = false;
        state.error = "";
        state.lastAt = Date.now();
      }
    } catch (err) {
      // A sandboxed page keeps the token from the HTML it was served. If the
      // local service restarted with a different token, reload once to take
      // the new one; the persisted token now makes this rare.
      const msg = err && err.message ? String(err.message) : String(err);
      if (msg === "snapshot 403" && !new URLSearchParams(location.search).has("tokenReload")) {
        try {
          const u = new URL(location.href);
          u.searchParams.set("tokenReload", "1");
          location.replace(u);
          return;
        } catch (_) { /* fall through to the banner */ }
      }
      if (period === state.period) {
        if (!state.data && PREVIEW) {
          state.data = demoState(period);
          state.demo = true;
          state.error = "";
          state.lastAt = Date.now();
        } else {
          state.error = err && err.message ? err.message : String(err);
        }
      }
    } finally {
      state.busy = false;
      if (state.again) { state.again = false; load(); }
    }
    render();
  }

  async function loadBase() {
    if (document.hidden) return;
    if (state.period !== "today") { state.base = null; return; }
    try {
      const res = await fetch("api/usage?period=7d", { cache: "no-store", headers: headers() });
      if (!res.ok) return;
      const body = await res.json();
      state.base = body && body.usage ? body.usage : body;
    } catch (_) { /* the baseline is a nicety; the page works without it */ }
  }

  /* --------------------------------------------------------------- quota --- */
  function quotaRows(data) {
    // The forecast lives in assets/quota.js so it can be tested without a DOM.
    const q = window.ObservatoryQuota;
    return q ? q.rows(data.quotas || [], data.quotaHistory || [], Date.now()) : [];
  }

  function quotaLine(r) {
    const p = providerOf(r.q.provider);
    const balanceText = (r.w.display && r.w.display !== "余额" && r.w.display !== "Balance")
      ? r.w.display
      : L.balance;
    const reset = r.reset == null ? "" : L.resetIn(dur(r.reset));
    let verdict = "";
    if (r.eta != null && r.reset != null && r.eta < r.reset) verdict = L.runOut(dur(r.eta));
    else if (r.eta != null && r.reset != null && r.eta < r.reset * 1.2) verdict = L.justReset;
    else if (r.eta != null && r.reset != null) verdict = L.lasts;
    else if (r.eta != null && r.eta < 3 * 24 * 60) verdict = L.runOut(dur(r.eta));
    else if (r.used >= 90) verdict = L.low;
    else if (r.used >= 80) verdict = L.low;
    else if (r.reset == null) verdict = balanceText;
    else if (!r.sampled) verdict = L.unknown;
    else if (r.eta == null) verdict = L.steady;
    else verdict = L.lasts;
    const who = r.q.user ? ` · ${mask(r.q.user)}` : "";
    // "额度" is the generic fallback for a balance with no window name;
    // any real name (Credits, Total credits, 5 hours) tells two windows apart.
    const win = /^(额度|Balance|余额)$/i.test(r.w.name) ? "" : r.w.name;
    const title = r.q.name && r.q.name !== p.name ? r.q.name : p.name;
    const label = `${title}${who}`;
    return `<div class="qrow ${r.sev}">
      <div class="qtop">${icon(p.icon, p.name)}<b title="${esc(label)}">${esc(label)}</b>${win ? `<span class="qwin">${esc(win)}</span>` : ""}<em>${Math.round(r.used)}%</em></div>
      <div class="qbar"><i style="width:${clamp(r.used, 0, 100).toFixed(1)}%"></i></div>
      <div class="qfoot"><span>${L.left(Math.round(r.left))}</span>${reset ? `<span>${esc(reset)}</span>` : ""}<b title="${L.quotaMethod}">${esc(verdict)}</b></div>
    </div>`;
  }

  function failWhy(s) {
    const fail = (s.tries || []).find((t) => t.state === "fail");
    if (!fail) return L.failReroute;
    const why = String(fail.why || "").split("·")[0].trim();
    return why || L.failReroute;
  }
  function chainTitle(s) {
    return (s.tries || []).map((t) => `${t.model || "—"} ${t.why || t.state || ""}`.trim()).join(" → ");
  }

  function mixAccounts(list, quotaRows) {
    const by = new Map();
    for (const a of list) {
      const key = `${a.provider || "unknown"}|${a.host || ""}`;
      const rec = by.get(key) || { provider: a.provider || "unknown", host: a.host || "", tokens: 0, cost: 0, calls: 0 };
      rec.tokens += Number(a.tokens) || 0;
      rec.cost += Number(a.cost) || 0;
      rec.calls += Number(a.calls) || 0;
      by.set(key, rec);
    }
    const rows = [...by.values()];
    const totalCost = rows.reduce((x, r) => x + r.cost, 0);
    const totalTokens = rows.reduce((x, r) => x + r.tokens, 0);
    const byCost = totalCost > 0;
    const shareOf = (r) => byCost ? r.cost / totalCost * 100 : totalTokens ? r.tokens / totalTokens * 100 : 0;
    const riskOf = (r) => {
      const hits = (quotaRows || []).filter((x) =>
        x.q.provider === r.provider && String(x.q.user || "") === String(r.host || "")
      );
      if (hits.some((x) => x.sev === "bad")) return "bad";
      if (hits.some((x) => x.sev === "warn")) return "warn";
      return "";
    };
    return {
      rows: rows.map((r) => ({ ...r, metric: byCost ? "cost" : "tokens", share: shareOf(r), risk: riskOf(r) }))
        .filter((r) => r.share > 0)
        .sort((a, b) => byCost ? b.cost - a.cost : b.tokens - a.tokens),
      byCost,
      count: rows.length
    };
  }

  function mixModels(list) {
    const byName = new Map();
    for (const m of list) {
      const raw = String(m.name || "—");
      // OpenRouter-style ids ("vendor/model") and the bare served name are
      // the same model; aggregate them instead of showing two rows.
      const name = raw.includes("/") ? raw.split("/").pop() : raw;
      const rec = byName.get(name) || { name, tokens: 0, providers: new Set(), provider: m.provider };
      rec.tokens += Number(m.tokens) || 0;
      rec.providers.add(m.provider);
      byName.set(name, rec);
    }
    const all = [...byName.values()];
    const total = all.reduce((a, m) => a + m.tokens, 0) || 1;
    const rows = all.map((m) => ({
      name: m.name,
      tokens: m.tokens,
      share: Math.round(m.tokens / total * 100),
      provider: m.providers.size === 1 ? m.provider : "unknown"
    })).filter((m) => m.tokens > 0 && m.share > 0).sort((a, b) => b.tokens - a.tokens);
    return {
      rows,
      names: rows.length,
      providers: new Set(list.map((m) => m.provider)).size
    };
  }

  /* ---------------------------------------------------------------- render --- */
  function render() {
    const data = state.data;
    if (!data) {
      $("#now-list").innerHTML = `<div class="empty-run"><b>${L.notConnected}</b><span>${L.confirmGateway}</span></div>`;
      $("#kpis").innerHTML = "";
      $("#quota-list").innerHTML = `<div class="qempty">—</div>`;
      $("#mix-list").innerHTML = "";
      paintStatus();
      return;
    }

    const k = data.kpis || {};
    const sessions = data.sessions || [];
    const live = sessions.filter((s) => s.status === "streaming" || s.status === "queued");
    // One row per session: the live ones first, then recent completions,
    // newest first.
    const done = (sessions || [])
      .filter((s) => s.status === "done" || s.status === "error")
      .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
    const nowList = (live.length ? live.concat(done) : done).slice(0, 4);

    $("#gw").textContent = data.gateway || "127.0.0.1:3425";
    // Header: the live rate when something is running, else the last few
    // minutes' throughput, so an idle screen still says how busy it was.
    const locale = LANG === "zh" ? "zh-CN" : "en";
    const num = (n) => Number(n || 0).toLocaleString(locale);
    const liveTps = Math.round(live.reduce((a, s) => a + (Number(s.tps) || 0), 0));
    $("#now-meta").textContent = live.length
      ? L.nowLive(live.length, liveTps)
      : (k.calls ? L.nowIdle(L.period[state.period], num(k.calls)) : L.nowEmpty);
    $("#now-list").innerHTML = nowList.length
      ? nowList.map((s) => {
          const a = agentOf(s.agent);
          const p = providerOf(s.provider);
          const st = [L.status[s.status] || s.status || "—", STATUS_CLASS[s.status] || ""];
          const age = s.startedAt ? since(s.startedAt) : "";
          const tps = Math.round(Number(s.tps) || 0) || null;
          const ttft = s.ttft ? Math.round(Number(s.ttft)) : null;
          return `<article class="run" data-state="${esc(s.status)}">
            <span class="run-ic">${icon(a.icon, a.name)}</span>
            <div class="run-main">
              <div class="run-top"><b>${esc(a.name)}</b><span class="st ${esc(st[1])}">${esc(st[0])}</span>${s.fallbacks ? `<span class="st err" title="${esc(chainTitle(s))}">${esc(failWhy(s))}</span>` : ""}<span class="run-age">${esc(age)}</span></div>
              <div class="run-title" title="${esc(s.title || "")}">${esc(s.title || s.model || "—")}</div>
              <div class="run-route">${icon(p.icon, p.name)}<span title="${esc([s.group, p.name, s.account, s.model].filter(Boolean).join(" · "))}">${s.group ? `${esc(s.group)} · ` : ""}${esc(p.name)}${s.account ? ` · ${esc(mask(s.account))}` : ""} · ${esc(s.model || "—")}</span></div>
            </div>
            <div class="run-nums">
              <span title="${L.runTokenTitle}"><b>${(s.turn || s.tokens) ? tokens(s.turn || s.tokens) : "—"}</b><em>tok</em></span>
              <span><b>${tps == null ? "—" : tps}</b><em>tok/s</em></span>
              <span><b>${ttft == null ? "—" : ms(ttft)}</b><em>TTFT</em></span>
            </div>
          </article>`;
        }).join("")
      : `<div class="empty-run"><b>${L.noRequests}</b><span>${done.length ? L.recentBelow : L.waitCall}</span></div>`;

    $("#now-foot").textContent = live.length
      ? `${L.liveN(live.length)}${live.length > 4 ? L.moreN(live.length - 4) : ""}${done.length ? ` · ${L.recentN(Math.min(done.length, Math.max(0, 4 - live.length)))}` : ""}`
      : L.idleFoot(nowList.length, sessions.length);

    /* today */
    const totalTokens = Number(k.tokens) || 0;
    $("#big-tokens").textContent = tokens(totalTokens);
    $("#big-label").textContent = k.input || k.output
      ? `${L.big} · ${L.input} ${tokens(k.input)} · ${L.output} ${tokens(k.output)}`
      : L.big;
    $("#today-title").textContent = L.period[state.period];
    $("#today-sub").textContent = state.period === "today"
      ? new Date().toLocaleDateString(locale, { month: "numeric", day: "numeric", weekday: "short" })
      : `${L.asOf} ${new Date().toLocaleDateString(locale, { month: "numeric", day: "numeric" })}`;
    const y = state.demo
      ? { tokens: k.yTokens || 0, calls: k.yCalls || 0, cost: k.yCost || 0 }
      : yesterday();
    const days = state.period === "7d" ? 7 : state.period === "30d" ? 30 : 0;
    const calls = Number(k.calls || k.requests) || 0;
    const errs = Number(k.errors) || 0;
    const retried = Number(k.retried) || 0;
    const cost = Number(k.cost) || 0;
    // A partial day against a full yesterday is not a like-for-like percent;
    // show yesterday's actual totals instead of a misleading -80%.
    const subs = days
      ? [`${L.daily} ${money(cost / days)}`, `${L.daily} ${num(Math.round(calls / days))}`]
      : [`${L.yesterday} ${y ? money(y.cost) : "—"}`, `${L.yesterday} ${y ? num(y.calls) : "—"}`];
    $("#kpis").innerHTML = [
      [L.cost, money(cost), subs[0], "cost"],
      [L.calls, num(calls), subs[1], "calls"],
      [L.errors, String(errs), `${L.errorRate(calls ? (errs / calls * 100).toFixed(1) : "0.0")}${retried ? ` · ${L.retry(retried)}` : ""}`, "errors"],
      [L.cache, `${Math.round(Number(k.cache) || 0)}%`, L.cacheSub, "cache"]
    ].map(([label, value, sub, key]) =>
      `<div class="kpi"><span>${label}</span><b class="${key === "errors" && errs ? "bad" : ""}">${esc(value)}</b><small>${esc(sub)}</small></div>`
    ).join("");

    const sparkDays = state.period === "7d" ? 7 : state.period === "30d" ? 30 : 14;
    const recentDays = (data.heatmap || []).slice(-sparkDays);
    $("#spark-title").textContent = L.sparkN(sparkDays);
    const max = Math.max(1, ...recentDays.map((d) => Number(d.tokens) || 0));
    $("#spark").innerHTML = recentDays.map((d) =>
      `<i style="height:${Math.max(2, Math.round((Number(d.tokens) || 0) / max * 100))}%" title="${esc(d.date)} · ${tokens(d.tokens)}"></i>`
    ).join("");
    $("#spark-note").textContent = recentDays.length ? L.sparkAvg(tokens(recentDays.reduce((a, d) => a + (Number(d.tokens) || 0), 0) / recentDays.length)) : "";

    /* quota */
    const qrows = quotaRows(data);
    $("#quota-list").innerHTML = qrows.length
      ? qrows.map(quotaLine).join("")
      : `<div class="qempty">${L.quotaEmpty}</div>`;
    const risky = qrows.filter((r) => r.sev === "bad" || r.sev === "warn").length;
    const burning = qrows.filter((r) => r.eta != null && r.reset != null && r.eta < r.reset).length;
    const unknown = qrows.filter((r) => r.sev === "unknown").length;
    $("#quota-foot").textContent = qrows.length
      ? `${L.quotaFoot(qrows.length, burning, Math.max(0, risky - burning), unknown)}${qrows.length > 4 ? L.scrollAll : ""}`
      : L.quotaSource;

    /* mix */
    document.querySelectorAll("#mix-seg button").forEach((b) => b.classList.toggle("on", b.dataset.mix === state.mix));
    const accountMix = mixAccounts(data.accounts || [], qrows);
    const useAccounts = state.mix === "account" && accountMix.rows.length > 0;
    if (useAccounts) {
      const rows = accountMix.rows.slice(0, 6);
      $("#mix-sub").textContent = `${L.period[state.period]} · ${accountMix.byCost ? L.mixByCost : L.mixByToken}`;
      $("#mix-list").innerHTML = rows.map((a) => {
        const p = providerOf(a.provider);
        const label = `${a.plan || p.name}${a.host ? ` · ${mask(a.host)}` : ""}`;
        const share = clamp(Number(a.share) || 0, 0, 100);
        const risk = a.risk ? `<i class="mrisk ${a.risk}" title="${a.risk === "bad" ? L.riskBad : L.riskWarn}"></i>` : "";
        return `<div class="mrow">${icon(p.icon, p.name)}<div class="mname"><b title="${esc(label)}">${risk}${esc(label)}</b><span><i style="width:${share}%"></i></span></div><em>${accountMix.byCost ? money(a.cost) : share + "%"}</em></div>`;
      }).join("");
      $("#mix-foot").textContent = `${L.accountN(accountMix.count)} · ${accountMix.byCost ? L.mixByCost : L.mixByToken}`;
    } else {
      const mix = mixModels(data.models || []);
      const models = mix.rows.slice(0, 6);
      $("#mix-sub").textContent = L.period[state.period];
      $("#mix-list").innerHTML = models.length
        ? models.map((m) => {
            const p = providerOf(m.provider);
            const share = clamp(Number(m.share) || 0, 0, 100);
            return `<div class="mrow">${icon(p.icon, p.name)}<div class="mname"><b title="${esc(m.name)}">${esc(m.name)}</b><span><i style="width:${share}%"></i></span></div><em>${share}%</em></div>`;
          }).join("")
        : `<div class="qempty">${L.emptyMix}</div>`;
      $("#mix-foot").textContent = models.length
        ? `${L.modelN(mix.names)} · ${L.providerN(mix.providers)}`
        : "";
    }

    paintStatus();
  }

  function yesterday() {
    const s = state.base && Array.isArray(state.base.series) ? state.base.series : [];
    if (!s.length) return null;
    // The 7-day series ends on today; the one before it is yesterday.
    const item = s.length >= 2 ? s[s.length - 2] : null;
    if (!item) return null;
    return {
      tokens: (Number(item.input) || 0) + (Number(item.output) || 0) + (Number(item.cache_read) || 0),
      cost: Number(item.cost) || 0,
      calls: Number(item.calls) || 0
    };
  }
  function paintStatus() {
    const dot = $("#dot");
    dot.className = "dot " + (state.demo ? "stale" : state.error ? (state.data ? "stale" : "down") : state.data ? "live" : "down");
    $("#conn").textContent = state.demo ? L.conn.demo : state.error ? (state.data ? L.conn.stale : L.conn.down) : state.data ? L.conn.live : L.conn.connecting;
    $("#updated").textContent = state.lastAt ? L.updated(clock(state.lastAt), since(state.lastAt)) : "—";
    $("#mode").textContent = state.demo ? L.modeDemo : state.error ? L.modeError(state.error) : L.modeLive;
    const errs = Number(state.data && state.data.kpis && state.data.kpis.errors) || 0;
    $("#errs").textContent = state.data ? (errs ? L.errsN(errs) : L.noErrors) : "";
    const banner = $("#banner");
    if (state.error) {
      banner.hidden = false;
      banner.innerHTML = `<b>${L.banner}</b><span>${esc(state.error)}</span><button type="button" id="retry">${L.retryBtn}</button>`;
      const retry = $("#retry");
      if (retry) retry.onclick = () => { state.error = ""; load(); };
    } else {
      banner.hidden = true;
    }
  }

  /* ------------------------------------------------------------------ wire --- */
  const seg = $("#periods");
  if (seg) {
    seg.querySelectorAll("button[data-period]").forEach((b) => {
      b.classList.toggle("on", b.dataset.period === state.period);
      b.setAttribute("aria-pressed", String(b.dataset.period === state.period));
      b.addEventListener("click", () => {
        const p = b.dataset.period;
        if (!PERIODS.includes(p) || p === state.period) return;
        state.period = p;
        seg.querySelectorAll("button").forEach((x) => {
          x.classList.toggle("on", x === b);
          x.setAttribute("aria-pressed", String(x === b));
        });
        try { localStorage.setItem(PERIOD_KEY, p); } catch (_) {}
        if (FORCE_DEMO) {
          state.data = demoState(p);
          state.demo = true;
          state.lastAt = Date.now();
          render();
          return;
        }
        loadBase();
        load();
      });
    });
  }
  const mixSeg = $("#mix-seg");
  if (mixSeg) {
    mixSeg.querySelectorAll("button[data-mix]").forEach((b) => {
      b.classList.toggle("on", b.dataset.mix === state.mix);
      b.setAttribute("aria-pressed", String(b.dataset.mix === state.mix));
      b.addEventListener("click", () => {
        const m = b.dataset.mix;
        if ((m !== "account" && m !== "model") || m === state.mix) return;
        state.mix = m;
        try { localStorage.setItem("magpie.focusMix", m); } catch (_) {}
        mixSeg.querySelectorAll("button").forEach((x) => {
          x.classList.toggle("on", x === b);
          x.setAttribute("aria-pressed", String(x === b));
        });
        render();
      });
    });
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { loadBase(); load(); } });
  setInterval(() => {
    paintStatus();
    if (!document.hidden) load();
  }, 3000);
  setInterval(loadBase, 60000);
  // the relative clock stays honest even between snapshots
  setInterval(() => {
    if (state.lastAt) $("#updated").textContent = L.updated(clock(state.lastAt), since(state.lastAt));
  }, 1000);

  if (FORCE_DEMO) {
    state.data = demoState(state.period);
    state.demo = true;
    state.lastAt = Date.now();
    render();
  } else {
    loadBase();
    load();
  }
})();
