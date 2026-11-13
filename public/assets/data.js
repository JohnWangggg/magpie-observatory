/* ==========================================================================
   Magpie Observatory — data layer
   - Mock mode: a believable local snapshot + a tiny simulation driver.
   - Live mode: api/snapshot served by server.mjs (proxying Magpie's read APIs).
   The shape below is deliberately UI-first; adapters keep Magpie's fields out
   of the rendering code.
   ========================================================================== */
(function () {
  "use strict";

  const ICON_BASE = "assets/icons/";

  const PROVIDERS = {
    anthropic:  { name: "Anthropic",  icon: "claude-color.svg",     color: "#d97757" },
    openai:     { name: "OpenAI",     icon: "openai.svg",           color: "#10a37f" },
    google:     { name: "Google",     icon: "gemini-color.svg",     color: "#4285f4" },
    deepseek:   { name: "DeepSeek",   icon: "deepseek-color.svg",   color: "#4d6bfe" },
    moonshot:   { name: "Moonshot",   icon: "kimi.svg",             color: "#8b7cf6" },
    zhipu:      { name: "Zhipu GLM",  icon: "zhipu-color.svg",      color: "#3b82f6" },
    openrouter: { name: "OpenRouter", icon: "openrouter.svg",       color: "#a78bfa" },
    minimax:    { name: "MiniMax",    icon: "minimax-color.svg",    color: "#fb7185" },
    xai:        { name: "xAI",        icon: "grok.svg",             color: "#e5e7eb" },
    grok:       { name: "Grok",       icon: "grok.svg",             color: "#e5e7eb" },
    ollama:     { name: "Ollama",     icon: "ollama.svg",           color: "#f97316" },
    qwen:       { name: "Qwen",       icon: "qwen-color.svg",       color: "#8b5cf6" },
    cursor:     { name: "Cursor",     icon: "cursor.svg",           color: "#cbd5e1" },
    copilot:    { name: "Copilot",    icon: "copilot-color.svg",    color: "#22d3ee" },
    "opencode-go":     { name: "OpenCode Go",  icon: "opencode.svg",      color: "#8b7cf6" },
    workbuddy:         { name: "WorkBuddy",    icon: "magpie.svg",        color: "#22d3ee" },
    "workbuddy-ai":    { name: "WorkBuddy AI", icon: "magpie.svg",        color: "#22d3ee" },
    zcode:             { name: "ZCode",        icon: "zhipu-color.svg",   color: "#3b82f6" },
    "commandcode-plan":{ name: "Command Code", icon: "magpie.svg",        color: "#f59e0b" },
    "mimo-app":        { name: "Xiaomi MiMo",  icon: "magpie.svg",        color: "#f97316" },
    raccoon:           { name: "Raccoon",      icon: "magpie.svg",        color: "#22d3ee" },
    "muse-web":        { name: "Muse Web",     icon: "magpie.svg",        color: "#e2549a" },
    "agy-cli":         { name: "agy-cli",      icon: "magpie.svg",        color: "#8b7cf6" },
    unknown:    { name: "Magpie",     icon: "magpie.svg",           color: "#8b7cf6" }
  };

  const AGENTS = {
    "claude":        { name: "Claude Code",  icon: "claudecode-color.svg", color: "#d97757" },
    "claude-code":   { name: "Claude Code",  icon: "claudecode-color.svg", color: "#d97757" },
    "claude-desktop":{ name: "Claude Desktop", icon: "claude-color.svg",  color: "#d97757" },
    "codex":         { name: "Codex",        icon: "codex-color.svg",      color: "#10a37f" },
    "gemini":        { name: "Gemini CLI",   icon: "geminicli-color.svg",  color: "#4285f4" },
    "gemini-cli":    { name: "Gemini CLI",   icon: "geminicli-color.svg",  color: "#4285f4" },
    "opencode":      { name: "OpenCode",     icon: "opencode.svg",         color: "#8b7cf6" },
    "opencode-go":   { name: "OpenCode Go",  icon: "opencode.svg",         color: "#8b7cf6" },
    "cursor":        { name: "Cursor",       icon: "cursor.svg",           color: "#cbd5e1" },
    "copilot":       { name: "Copilot",      icon: "copilot-color.svg",    color: "#22d3ee" },
    "alma":          { name: "Alma",         icon: "magpie.svg",           color: "#d97757" },
    "omp":           { name: "OMP",          icon: "magpie.svg",           color: "#8b7cf6" },
    "workbuddy":     { name: "WorkBuddy",    icon: "magpie.svg",           color: "#22d3ee" },
    "unknown":       { name: "Agent",        icon: "magpie.svg",           color: "#8b7cf6" }
  };

  const MODEL_COLORS = ["#8b7cf6", "#56d4dd", "#4ade80", "#fbbf24", "#f472b6", "#60a5fa", "#c084fc", "#94a3b8"];

  function prettyName(key) {
    return String(key || "").trim().replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  function providerMeta(key) {
    const k = String(key || "").toLowerCase();
    if (PROVIDERS[k]) return PROVIDERS[k];
    if (k.includes("anthropic") || k.includes("claude")) return PROVIDERS.anthropic;
    if (k.includes("openai") || k.includes("gpt")) return PROVIDERS.openai;
    if (k.includes("google") || k.includes("gemini")) return PROVIDERS.google;
    if (k.includes("deepseek")) return PROVIDERS.deepseek;
    if (k.includes("moonshot") || k.includes("kimi")) return PROVIDERS.moonshot;
    if (k.includes("zhipu") || k.includes("glm") || k.includes("bigmodel")) return PROVIDERS.zhipu;
    if (k.includes("openrouter")) return PROVIDERS.openrouter;
    if (k.includes("minimax")) return PROVIDERS.minimax;
    if (k.includes("xai") || k.includes("grok")) return PROVIDERS.xai;
    if (k.includes("ollama")) return PROVIDERS.ollama;
    if (k.includes("qwen") || k.includes("alibaba")) return PROVIDERS.qwen;
    if (k.includes("cursor")) return PROVIDERS.cursor;
    if (k.includes("copilot")) return PROVIDERS.copilot;
    const name = prettyName(key);
    return name ? { name, icon: "magpie.svg", color: "#8b7cf6" } : PROVIDERS.unknown;
  }

  function agentMeta(key) {
    const k = String(key || "").toLowerCase().replace(/\s+/g, "-");
    if (AGENTS[k]) return AGENTS[k];
    if (k.includes("claude")) return AGENTS.claude;
    if (k.includes("codex")) return AGENTS.codex;
    if (k.includes("gemini")) return AGENTS.gemini;
    if (k.includes("opencode")) return AGENTS.opencode;
    if (k.includes("cursor")) return AGENTS.cursor;
    if (k.includes("copilot")) return AGENTS.copilot;
    const name = prettyName(key);
    return name ? { name, icon: "magpie.svg", color: "#8b7cf6" } : AGENTS.unknown;
  }

  function iconUrl(file) { return ICON_BASE + file; }
  function trimZeros(s) {
    // Only decimals lose trailing zeros: "500" stays 500, "1.20" becomes 1.2.
    return s.indexOf(".") >= 0 ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
  }
  function fmtTokens(n) {
    n = Number(n) || 0;
    if (n >= 1e9) return trimZeros((n / 1e9).toFixed(2)) + "B";
    if (n >= 999.5e6) return trimZeros((n / 1e9).toFixed(2)) + "B";
    if (n >= 1e6) return trimZeros((n / 1e6).toFixed(n >= 1e7 ? 1 : 2)) + "M";
    if (n >= 999.5e3) return trimZeros((n / 1e6).toFixed(2)) + "M";
    if (n >= 1e3) return trimZeros((n / 1e3).toFixed(n >= 1e4 ? 0 : 1)) + "K";
    return String(Math.round(n));
  }
  function fmtMoney(n, digits) {
    n = Number(n) || 0;
    if (n === 0) return "$0";
    if (digits != null) return "$" + n.toFixed(digits);
    if (n < 1) return "$" + n.toFixed(2);
    if (n < 10) return "$" + n.toFixed(2);
    if (n < 100) return "$" + n.toFixed(1);
    return "$" + Math.round(n);
  }
  function fmtPct(n, d) { return (Number(n) || 0).toFixed(d == null ? 1 : d) + "%"; }

  // Deterministic PRNG so the first paint looks the same on every reload.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const NOW = Date.now();
  const MIN = 60000;

  const SESSION_SEEDS = [
    {
      id: "s-7f3a", title: "重构计费模块的边界条件", agent: "claude", provider: "openrouter",
      requested: "claude-opus-4-5", model: "google/gemini-3.1-pro", served: "google/gemini-3.1-pro", group: "daily-coding", mode: "smart",
      rule: "hard-to-strong", intent: "refactor-hard", confidence: 0.94, effort: "high",
      status: "streaming", tokens: 128400, tps: 62.4, startedAgo: 412000, ttft: 680,
      tries: [
        { provider: "anthropic", model: "claude-opus-4-5", state: "fail", ms: 1840, why: "429 · rate limited" },
        { provider: "openrouter", model: "google/gemini-3.1-pro", state: "ok", ms: 680, why: "streaming" }
      ],
      fallbacks: 1, routeId: 9812
    },
    {
      id: "s-2c91", title: "修复 HUD 路由连线在窄窗下的溢出", agent: "codex", provider: "openai",
      model: "gpt-5.2-codex", served: "gpt-5.2-codex", group: "daily-coding", mode: "smart",
      rule: "normal", intent: "code-fix", confidence: 0.88, effort: "medium",
      status: "streaming", tokens: 89200, tps: 118.6, startedAgo: 216000, ttft: 410,
      tries: [{ provider: "openai", model: "gpt-5.2-codex", state: "ok", ms: 410, why: "streaming" }],
      fallbacks: 0, routeId: 9813
    },
    {
      id: "s-b470", title: "分析 30 天 token 账单", agent: "gemini", provider: "google",
      model: "gemini-3-pro", served: "gemini-3-pro", group: "long-context", mode: "smart",
      rule: "long-context", intent: "analysis", confidence: 0.91, effort: "high",
      status: "streaming", tokens: 241000, tps: 88.2, startedAgo: 188000, ttft: 920,
      tries: [{ provider: "google", model: "gemini-3-pro", state: "ok", ms: 920, why: "streaming" }],
      fallbacks: 0, routeId: 9814
    },
    {
      id: "s-5e28", title: "批量重命名测试快照", agent: "opencode", provider: "deepseek",
      model: "deepseek-v4", served: "deepseek-v4", group: "cheap-and-fast", mode: "order",
      rule: "cheap", intent: "mechanical", confidence: 0.97, effort: "low",
      status: "queued", tokens: 12400, tps: 0, startedAgo: 42000, ttft: 0,
      tries: [{ provider: "deepseek", model: "deepseek-v4", state: "pending", ms: 0, why: "waiting · account concurrency" }],
      fallbacks: 1, routeId: 9815
    }
  ];

  const RECENT_SEEDS = [
    {
      id: "s-91dd", title: "实现 SSE 增量同步", agent: "claude", provider: "openrouter",
      model: "anthropic/claude-sonnet-4-5", served: "claude-sonnet-4-5", group: "daily-coding", mode: "smart",
      rule: "normal", intent: "code", confidence: 0.9, effort: "medium",
      status: "done", tokens: 204800, tps: 74.1, startedAgo: 1260000, ttft: 540,
      tries: [{ provider: "openrouter", model: "anthropic/claude-sonnet-4-5", state: "ok", ms: 540, why: "200 OK" }],
      fallbacks: 0, routeId: 9808
    },
    {
      id: "s-3aa0", title: "review PR #482：quota 缓存竞态", agent: "codex", provider: "openai",
      model: "gpt-5.1", served: "gpt-5.1", group: "plan-first", mode: "order",
      rule: "plan", intent: "review", confidence: 0.86, effort: "medium",
      status: "done", tokens: 156200, tps: 96.5, startedAgo: 1880000, ttft: 390,
      tries: [{ provider: "openai", model: "gpt-5.1", state: "ok", ms: 390, why: "200 OK" }],
      fallbacks: 0, routeId: 9802,
      subagents: [{ id: "sub-1", name: "扫描依赖", agent: "codex", model: "gpt-5.1-mini", status: "done", tps: 140.2 }]
    },
    {
      id: "s-0f12", title: "写一版 release note", agent: "gemini", provider: "zhipu",
      model: "glm-5", served: "glm-5", group: "cheap-and-fast", mode: "order",
      rule: "cheap", intent: "writing", confidence: 0.82, effort: "low",
      status: "done", tokens: 48600, tps: 52.8, startedAgo: 2420000, ttft: 610,
      tries: [{ provider: "zhipu", model: "glm-5", state: "ok", ms: 610, why: "200 OK" }],
      fallbacks: 0, routeId: 9798
    },
    {
      id: "s-c833", title: "检查 MCP 工具调用失败原因", agent: "claude", provider: "minimax",
      model: "MiniMax-M3", served: "MiniMax-M3", group: "long-context", mode: "smart",
      rule: "hard-to-strong", intent: "debug", confidence: 0.77, effort: "high",
      status: "error", tokens: 67200, tps: 41.9, startedAgo: 3100000, ttft: 780,
      tries: [
        { provider: "minimax", model: "MiniMax-M3", state: "fail", ms: 900, why: "529 · overloaded" },
        { provider: "moonshot", model: "kimi-k2.5", state: "fail", ms: 1200, why: "timeout" }
      ],
      fallbacks: 2, routeId: 9791
    }
  ];

  const QUOTA_SEEDS = [
    { provider: "anthropic", name: "Claude Max", user: "demo-claude@example.com", plan: "Max 20x", windows: [{ name: "5h", used: 62, resetsIn: 133 }, { name: "7d", used: 41, resetsIn: 4380 }] },
    { provider: "openai", name: "ChatGPT Pro", user: "demo-openai@example.com", plan: "Pro", windows: [{ name: "5h", used: 18, resetsIn: 214 }, { name: "7d", used: 73, resetsIn: 6300 }] },
    { provider: "google", name: "Google AI Pro", user: "demo-google@example.com", plan: "AI Pro", windows: [{ name: "5h", used: 35, resetsIn: 88 }, { name: "7d", used: 12, resetsIn: 5000 }] },
    { provider: "moonshot", name: "Kimi 会员", user: "demo-moonshot@example.com", plan: "Andante", windows: [{ name: "5h", used: 80, resetsIn: 42 }, { name: "7d", used: 55, resetsIn: 3900 }] },
    { provider: "openrouter", name: "OpenRouter", user: "demo-credits", plan: "Credits", balance: "$23.75", windows: [{ name: "额度", used: 64, resetsIn: null }] },
    { provider: "deepseek", name: "DeepSeek", user: "demo-balance", plan: "Balance", balance: "¥86.40", windows: [{ name: "额度", used: 22, resetsIn: null }] }
  ];

  // A window's length in minutes, read off its label ("5h", "7d", "30m").
  function quotaWindowMinutes(name) {
    const m = /(\d+(?:\.\d+)?)\s*([hdm])/i.exec(String(name || ""));
    if (!m) return 300;
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    return unit === "d" ? n * 1440 : unit === "h" ? n * 60 : n;
  }

  // Demo quota history: a deterministic seven-day sawtooth per window, the
  // shape a real /v1/magpie/quotas/history returns. Every window falls from
  // 100 to its floor and jumps back to 100 at the reset; the window in flight
  // ends on the same `left` the quota list shows, so both views agree.
  function mockQuotaHistory() {
    const WEEK = 7 * 1440; // minutes
    const iso = (ms) => new Date(Math.round(ms)).toISOString();
    const rand = rng(20261114);

    // `steps` hourly marks from `wsMs` over `spanMin`, ending on the floor.
    // `opts.periodMin` is the window's full length, so the reset can sit past
    // the last generated point while a window is still in flight.
    function linePoints(wsMs, spanMin, steps, floorLeft, opts) {
      const span = spanMin * MIN;
      const start = iso(wsMs);
      const resetsAt = opts.resets ? iso(wsMs + (opts.periodMin || spanMin) * MIN) : null;
      const burns = [];
      for (let i = 0; i < steps; i++) burns.push(0.45 + rand());
      const total = burns.reduce((a, b) => a + b, 0);
      const points = [{ at: start, left: 100, start, resetsAt }];
      let spent = 0;
      for (let i = 1; i <= steps; i++) {
        spent += burns[i - 1];
        const left = Math.max(floorLeft, 100 - (100 - floorLeft) * spent / total);
        const at = opts.atNow && i === steps ? NOW : wsMs + span * i / steps;
        points.push({ at: iso(at), left: +left.toFixed(2), start, resetsAt });
      }
      return points;
    }

    return QUOTA_SEEDS.map(seed => {
      const lines = seed.windows.map(w => {
        const balance = w.resetsIn == null;
        const periodMin = balance ? WEEK : quotaWindowMinutes(w.name);
        const elapsedMin = balance ? WEEK : Math.max(60, periodMin - (Number(w.resetsIn) || 0));
        const endLeft = Math.max(0, Math.min(100, 100 - (Number(w.used) || 0)));
        // The window in flight ends on "now"; older windows tile the week
        // before it so the burn-down keeps its resets.
        const points = linePoints(NOW - elapsedMin * MIN, elapsedMin, Math.max(2, Math.round(elapsedMin / 60)), endLeft, { atNow: true, resets: !balance, periodMin });
        let ws = NOW - elapsedMin * MIN;
        for (let guard = 0; !balance && ws - periodMin * MIN > NOW - WEEK * MIN && guard < 60; guard++) {
          ws -= periodMin * MIN;
          points.unshift(...linePoints(ws, periodMin, Math.max(2, Math.round(periodMin / 60)), +(8 + rand() * 42).toFixed(1), { resets: true }));
        }
        return { name: w.name || "额度", points: points.slice(-200) };
      }).filter(l => l.points.length >= 2);
      return { provider: providerOfModel("", seed.provider), name: seed.name, user: seed.user || "", lines };
    }).filter(x => x.lines.length);
  }

  function mockState() {
    const rand = rng(20261113);
    const series = [];
    const baseTokens = [0.9, 0.7, 0.45, 0.3, 0.25, 0.3, 0.55, 0.9, 1.4, 2.2, 3.1, 3.6, 2.9, 2.4, 2.6, 3.4, 4.1, 4.6, 4.2, 3.5, 2.8, 2.2, 1.7, 1.2];
    for (let h = 0; h < 24; h++) {
      const jitter = 0.82 + rand() * 0.36;
      const tokens = Math.round(baseTokens[h] * 1e6 * jitter * 0.455);
      const cost = tokens / 1e6 * (1.1 + rand() * 0.55);
      series.push({ hour: h, label: `${String(h).padStart(2, "0")}:00`, tokens, cost: +cost.toFixed(3) });
    }
    const totalTokens = series.reduce((a, b) => a + b.tokens, 0);
    const totalCost = series.reduce((a, b) => a + b.cost, 0);

    const heatmap = [];
    // 53 weeks, the same span as Magpie's own Usage heatmap.
    const heatStart = new Date(NOW - 370 * 86400000);
    heatStart.setHours(0, 0, 0, 0);
    for (let i = 0; i < 371; i++) {
      const date = new Date(heatStart.getTime() + i * 86400000);
      const weekday = date.getDay();
      const weekend = weekday === 0 || weekday === 6;
      const wave = 0.55 + 0.45 * Math.sin(i / 5.3);
      const tokens = Math.round((weekend ? 0.35 : 1) * wave * (0.35 + rand() * 0.9) * 8.5e6);
      heatmap.push({ date: date.toISOString().slice(0, 10), tokens, calls: Math.round(tokens / 22000) });
    }
    // Today is busy, and its total matches the KPI / 24h chart.
    heatmap[heatmap.length - 1].tokens = totalTokens;
    heatmap[heatmap.length - 1].calls = 1284;

    const models = [
      { name: "claude-opus-4-5", provider: "anthropic", tokens: 8.9e6, share: 38 },
      { name: "gpt-5.2-codex", provider: "openai", tokens: 5.6e6, share: 24 },
      { name: "deepseek-v4", provider: "deepseek", tokens: 3.7e6, share: 16 },
      { name: "gemini-3-pro", provider: "google", tokens: 2.8e6, share: 12 },
      { name: "kimi-k2.5", provider: "moonshot", tokens: 1.4e6, share: 6 },
      { name: "glm-5", provider: "zhipu", tokens: 0.94e6, share: 4 }
    ];

    const logs = [];
    const logTemplates = [
      ["claude", "重构计费模块的边界条件", "anthropic", "claude-opus-4-5", "ok", 18400, 680, 62.4, 0.21],
      ["codex", "修复 HUD 路由连线在窄窗下的溢出", "openai", "gpt-5.2-codex", "run", 12800, 410, 118.6, 0.11],
      ["gemini", "分析 30 天 token 账单", "google", "gemini-3-pro", "run", 24600, 920, 88.2, 0.17],
      ["opencode", "批量重命名测试快照", "deepseek", "deepseek-v4", "retry", 5200, 0, 0, 0.01],
      ["claude", "重构计费模块的边界条件", "openrouter", "claude-sonnet-4-5", "ok", 20400, 540, 74.1, 0.16],
      ["codex", "修复 HUD 路由连线在窄窗下的溢出", "openai", "gpt-5.1", "ok", 15600, 390, 96.5, 0.13],
      ["gemini", "分析 30 天 token 账单", "zhipu", "glm-5", "ok", 4800, 610, 52.8, 0.01],
      ["claude", "重构计费模块的边界条件", "minimax", "MiniMax-M3", "err", 6700, 780, 41.9, 0.05],
      ["cursor", "补全 provider 图标映射", "moonshot", "kimi-k2.5", "ok", 9100, 520, 81.3, 0.04],
      ["codex", "修复 HUD 路由连线在窄窗下的溢出", "openai", "gpt-5.2-codex", "ok", 11200, 360, 121.7, 0.10],
      ["claude", "重构计费模块的边界条件", "anthropic", "claude-sonnet-4-5", "ok", 7300, 610, 69.2, 0.03],
      ["gemini", "分析 30 天 token 账单", "google", "gemini-3-pro", "ok", 8800, 840, 85.4, 0.04],
      ["opencode", "批量重命名测试快照", "deepseek", "deepseek-v4", "ok", 6400, 470, 102.3, 0.02],
      ["codex", "修复 HUD 路由连线在窄窗下的溢出", "openai", "gpt-5.1", "ok", 10200, 410, 91.8, 0.06],
      ["claude", "重构计费模块的边界条件", "openrouter", "claude-opus-4-5", "ok", 14600, 720, 58.7, 0.12],
      ["claude", null, "openai", "gpt-5.1", "ok", 900, 210, 140, 0.01]
    ];
    logTemplates.forEach((t, i) => {
      const at = new Date(NOW - i * 46000 - (i % 3) * 8000);
      logs.push({
        id: "r-" + i, at: at.toISOString(), agent: t[0], session: t[1], provider: t[2],
        model: t[3], status: t[4], tokens: t[5], ttft: t[6], tps: t[7], cost: t[8]
      });
    });

    return {
      mode: "demo",
      fetchedAt: NOW,
      gateway: "127.0.0.1:3425",
      kpis: {
        requests: 1284, requestsDelta: 12.4,
        calls: 1284, canceled: 7, errors: 3, retried: 12, timed: 1200,
        tokens: totalTokens, tokensDelta: 8.1,
        cost: +totalCost.toFixed(2), costDelta: -3.2,
        cache: 88.6, cacheDelta: 2.2,
        tps: 71.3, tpsDelta: 4.6,
        active: 4, activeDelta: 1
      },
      quotas: QUOTA_SEEDS.map(q => ({ ...q })),
      quotaHistory: mockQuotaHistory(),
      sessions: SESSION_SEEDS.map(s => ({ ...s, startedAt: NOW - s.startedAgo })),
      recent: RECENT_SEEDS.map(s => ({ ...s, startedAt: NOW - s.startedAgo })),
      series,
      heatmap,
      models,
      logs,
      decision: {
        session: SESSION_SEEDS[0],
        title: "重构计费模块的边界条件",
        group: "group/daily-coding",
        rule: "规则 2 · hard-to-strong",
        intent: "refactor-hard",
        confidence: 0.94,
        classifierMs: 182,
        effort: "high",
        tries: SESSION_SEEDS[0].tries,
        narrative: "意图分类命中 hard-to-strong → 首推 Anthropic claude-opus-4-5；429 后 1.8s 改道 OpenRouter gemini-3.1-pro，Agent 无感。"
      }
    };
  }

  /* --------------------------------------------------------------- live --- */
  // The snapshot endpoint can answer with a trace delta: it keeps the same
  // 60-route window and sends only the routes appended since `liveTrace.seq`.
  // Merge here so normalizeLive keeps seeing one complete window.
  let liveTrace = { seq: 0, routes: [] };
  let liveQuota = { token: "", body: null };
  let liveRequests = { cursor: "", rows: [] };
  let livePeriod = "";

  function mergeTrace(rawTrace) {
    if (!rawTrace || typeof rawTrace !== "object") return;
    const incoming = Array.isArray(rawTrace.routes) ? rawTrace.routes : [];
    if (rawTrace.delta && liveTrace.seq) {
      const seen = new Set(liveTrace.routes.map(r => r && r.id));
      for (const r of incoming) {
        if (r && !seen.has(r.id)) { liveTrace.routes.push(r); seen.add(r.id); }
      }
      liveTrace.routes = liveTrace.routes.slice(-60);
    } else {
      liveTrace.routes = incoming.slice(-60);
    }
    liveTrace.seq = Number(rawTrace.seq) || liveTrace.seq;
  }

  // `qh` carries the quota-history hash; a match means the server answers
  // `{delta:true}` and the previous series stays in place.
  function mergeQuotaHistory(raw) {
    if (!raw || typeof raw !== "object") return;
    if (raw.delta) return;
    liveQuota = { token: String(raw.token || ""), body: raw };
  }

  // The ledger is newest-first: a delta is the rows above the cursor the
  // client names, and the tail is trimmed so the window keeps its 60 rows.
  function requestKey(r) { return String((r && (r.route_id || r.t)) || ""); }

  function mergeRequests(raw) {
    if (!raw || typeof raw !== "object") return;
    if (raw.delta) {
      if (Array.isArray(raw.head) && raw.head.length && liveRequests.rows.length) {
        liveRequests.rows = raw.head.concat(liveRequests.rows).slice(0, 60);
      }
      if (raw.cursor) liveRequests.cursor = raw.cursor;
      return;
    }
    liveRequests = { cursor: String(raw.cursor || ""), rows: (raw.rows || []).slice(0, 60) };
  }

  async function fetchLive(period) {
    if (period && period !== livePeriod) {
      livePeriod = period;
      liveRequests = { cursor: "", rows: [] };
      liveQuota = { token: "", body: null };
    }
    const params = new URLSearchParams();
    if (period) params.set("period", period);
    if (liveTrace.seq) params.set("since", String(liveTrace.seq));
    if (liveQuota.token) params.set("qh", liveQuota.token);
    if (liveRequests.cursor) params.set("rq", liveRequests.cursor);
    const qs = params.toString();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch("api/snapshot" + (qs ? "?" + qs : ""), { cache: "no-store", signal: ctrl.signal });
      if (!res.ok) throw new Error("snapshot " + res.status);
      const body = await res.json();
      if (!body || body.ok === false) throw new Error((body && body.error) || "magpie unavailable");
      const data = body.data || body;
      data.gateway = body.gateway || data.gateway;
      data.period = body.period || data.period;
      mergeTrace(data.trace);
      data.trace = { routes: liveTrace.routes, seq: liveTrace.seq };
      mergeQuotaHistory(data.quotaHistory);
      data.quotaHistory = liveQuota.body;
      const reqTotal = data.requests && data.requests.total;
      mergeRequests(data.requests);
      data.requests = { rows: liveRequests.rows, cursor: liveRequests.cursor, total: reqTotal };
      return normalizeLive(data);
    } finally {
      clearTimeout(timer);
    }
  }

  function normalizeLive(raw) {
    const trace = raw.trace || {};
    const usage = raw.usage || {};
    const quotas = (raw.quotas && (raw.quotas.data || raw.quotas)) || [];
    const active = (raw.concurrency && raw.concurrency.active) || [];
    const routes = trace.routes || [];
    const now = Date.now();

    const sessions = routes.map(r => {
      const agentKey = r.agent || "unknown";
      const tries = (r.tries || []).map(t => {
        // A try's id names the seat it ran on: `provider#key` for a key,
        // `provider@account` for an account. The route's provider is only
        // the final seat, so do not use it for every attempt.
        const seat = String(t.id || "");
        const tryProvider = t.provider || seat.split("#")[0].split("@")[0] || r.provider || "";
        return {
          provider: providerOfModel(t.model, tryProvider),
          model: t.model || r.served || "—",
          state: t.done ? (t.status >= 200 && t.status < 300 ? "ok" : "fail") : "pending",
          ms: t.ttft || t.firstText || t.ms || 0,
          why: t.status ? String(t.status) : (t.done ? "done" : "in flight")
        };
      });
      const firstTry = tries[0] || {};
      const last = tries[tries.length - 1] || {};
      const finalTry = tries.slice().reverse().find(t => t.state === "ok") || last;
      return {
        id: String(r.session || r.id),
        routeId: r.id,
        title: (r.group && (r.group.name || r.group.ref)) || r.folder || ("会话 " + String(r.session || r.id).slice(0, 8)),
        agent: agentKey,
        provider: finalTry.provider || (r.provider ? providerOfModel("", r.provider) : "unknown"),
        requested: firstTry.model || "",
        model: finalTry.model || r.served || firstTry.model || "—",
        served: r.served || "",
        group: r.group ? (r.group.ref || r.group.id || r.group.name || "—") : "直接路由",
        mode: r.group && r.group.routing ? r.group.routing : "smart",
        rule: r.rule ? ("规则 " + (r.rule.n == null ? "?" : r.rule.n) + (r.rule.use ? " · " + r.rule.use : "")) : "—",
        intent: r.rule && r.rule.classified ? (r.rule.classified.intent || "—") : "—",
        confidence: r.rule && r.rule.classified && r.rule.classified.sure != null ? r.rule.classified.sure : null,
        effort: last.effort || "",
        status: r.done ? (r.status >= 200 && r.status < 300 ? "done" : "error") : (active.some(a => a.session === r.session) ? "streaming" : "queued"),
        tokens: 0,
        tps: 0,
        startedAt: r.time ? Date.parse(r.time) : now,
        ttft: tries[0] ? tries[0].ms : 0,
        tries,
        fallbacks: Math.max(0, tries.filter(t => t.state === "fail").length),
        subagents: []
      };
    });

    const totals = usage.totals || usage.Totals || usage;
    let series = (usage.series || []).map(p => {
      const labelHour = p.label && /^\d{1,2}:/.test(p.label) ? Number(String(p.label).slice(0, 2)) : null;
      return {
        hour: p.time ? new Date(p.time).getHours() : (labelHour != null ? labelHour : 0),
        label: p.label || "",
        tokens: (p.input || 0) + (p.output || 0) + (p.cache_read || 0),
        cost: p.cost || 0
      };
    });
    // The gateway may return only the hours that had calls. A 24-hour chart
    // reads better with the empty hours kept, so fill them for "today".
    if ((raw.period || usage.period || "today") === "today" && series.length && series.length < 24) {
      const byHour = new Map(series.map(p => [p.hour, p]));
      series = Array.from({ length: 24 }, (_, h) => byHour.get(h) || { hour: h, label: String(h).padStart(2, "0") + ":00", tokens: 0, cost: 0 });
    }
    const modelList = (usage.models || []).map(m => {
      const tokens = m.tokens != null
        ? m.tokens
        : (m.input || 0) + (m.output || 0) + (m.cache_read || 0);
      return {
        name: m.name || m.model || "—",
        provider: m.provider || m.providerName || m.sub || "unknown",
        tokens,
        share: 0
      };
    });
    const modelTokens = modelList.reduce((a, m) => a + m.tokens, 0);
    modelList.forEach(m => { m.share = modelTokens ? Math.round(m.tokens / modelTokens * 100) : 0; });
    const models = modelList.sort((a, b) => b.tokens - a.tokens).slice(0, 6);
    const totalTokens = (totals.input || 0) + (totals.output || 0) + (totals.cache_read || 0);
    const cacheRate = totals.cache_read && (totals.input + totals.cache_read) ? totals.cache_read / (totals.input + totals.cache_read) * 100 : 0;

    const rows = (raw.requests && raw.requests.rows) || [];
    const logs = rows.map((r, i) => {
      const tokens = (r.in || 0) + (r.out || 0) + (r.cache_read || 0);
      const status = r.status >= 400 ? "err" : r.status === 0 || r.status == null ? "run" : "ok";
      const tps = r.decode_ms && r.decode_out
        ? Math.round(r.decode_out / (r.decode_ms / 1000))
        : (r.out && r.ms ? Math.round(r.out / (r.ms / 1000)) : 0);
      return {
        id: r.id || ("r-" + i),
        at: r.t || r.time || new Date(now).toISOString(),
        agent: r.agent || r.agentName || "unknown",
        session: r.session || r.native_session || "—",
        provider: providerOfModel(r.served || r.model || "", r.provider),
        model: r.served || r.model || "—",
        status,
        tokens,
        ttft: r.ttft_ms != null ? Number(r.ttft_ms)
          : r.first_text_ms != null ? Number(r.first_text_ms) : null,
        ms: Number(r.ms) || 0,
        out: Number(r.out) || 0,
        tps,
        cost: r.cost || 0
      };
    });
    // The ledger is the only place with per-request tokens; fold it back onto
    // the route sessions so active cards do not show a misleading 0 TOK.
    const sessionTotals = new Map();
    logs.forEach(l => {
      if (!l.session || l.session === "—") return;
      const t = sessionTotals.get(l.session) || { tokens: 0, tps: 0, n: 0 };
      t.tokens += l.tokens || 0;
      if (l.tps > 0) { t.tps += l.tps; t.n++; }
      sessionTotals.set(l.session, t);
    });
    sessions.forEach(s => {
      const t = sessionTotals.get(s.id);
      if (!t) return;
      s.tokens = t.tokens;
      s.tps = t.n ? t.tps / t.n : 0;
    });

    let heatmap = ((raw.heatmap && raw.heatmap.days) || []).map(d => ({
      date: d.date, tokens: d.tokens || 0, calls: d.calls || 0
    }));
    if (heatmap.length) {
      // Always draw a 53-week calendar, whatever span the source kept.
      const byDate = new Map(heatmap.map(d => [d.date, d]));
      const end = new Date(); end.setHours(0, 0, 0, 0);
      const full = [];
      for (let i = 370; i >= 0; i--) {
        const day = new Date(end.getTime() - i * 86400000).toISOString().slice(0, 10);
        full.push(byDate.get(day) || { date: day, tokens: 0, calls: 0 });
      }
      heatmap = full;
    }

    const q = quotas.map(x => {
      const rawWins = x.windows || [];
      // Magpie normally reports used/remaining as 0–100. Only treat a whole
      // account's windows as 0–1 fractions when every value is <=1 and a
      // remaining value confirms the scale; a real 1% must stay 1%.
      const asFraction = rawWins.length > 0 && rawWins.every(w => {
        if (w.used == null) return true;
        if (w.used > 1) return false;
        if (w.remaining != null) return w.remaining <= 1;
        return false;
      });
      return {
        provider: providerOfModel("", x.provider),
        name: x.name || x.provider,
        user: x.user || "",
        plan: x.plan || x.kind || "",
        balance: x.balance || null,
        windows: rawWins.slice().sort((a, b) => (a.resetsAt || "").localeCompare(b.resetsAt || "")).slice(0, 2).map(w => ({
          name: w.name || "额度",
          used: w.used != null
            ? (asFraction ? w.used * 100 : w.used)
            : (w.remaining != null && w.limit ? (1 - w.remaining / w.limit) * 100 : 0),
          resetsIn: w.resetsAt ? Math.max(0, Math.round((Date.parse(w.resetsAt) - now) / 60000)) : null
        }))
      };
    }).filter(x => x.windows.length || x.balance);

    // Burn-down history: the gateway keeps an `at/left/start/resetsAt` series
    // per account × window. Keep the tail of each series only.
    const quotaHistory = ((raw.quotaHistory && (raw.quotaHistory.data || raw.quotaHistory)) || []).map(x => {
      const provider = providerOfModel("", x.provider || x.name || "");
      return {
        provider,
        name: x.name || providerMeta(provider).name,
        user: x.user || "",
        lines: (x.lines || []).map(l => {
          const raw = (l.points || []).filter(p => p && p.at && isFinite(Number(p.left))).slice(-200);
          // The snapshot omits `start`/`resetsAt` when they repeat; restore
          // them so window math sees the same stamps the gateway sent.
          let lastStart = null, lastReset = null;
          const points = raw.map(p => {
            lastStart = p.start === undefined ? lastStart : p.start;
            lastReset = p.resetsAt === undefined ? lastReset : p.resetsAt;
            return {
              at: p.at,
              left: Math.max(0, Math.min(100, Number(p.left))),
              start: lastStart,
              resetsAt: lastReset
            };
          });
          return { name: l.name || "额度", points };
        }).filter(l => l.points.length >= 2)
      };
    }).filter(x => x.lines.length);

    const activeIds = new Set(sessions.map(s => s.id));
    const recentMap = new Map();
    logs.forEach(l => {
      if (!l.session || l.session === "—" || activeIds.has(l.session) || recentMap.has(l.session)) return;
      recentMap.set(l.session, {
        id: l.session, title: `${agentMeta(l.agent).name} · ${l.model}`, agent: l.agent, provider: l.provider,
        model: l.model, group: "最近完成", mode: "—", rule: "—", intent: "—",
        confidence: null, effort: "", status: l.status === "err" ? "error" : "done",
        tokens: l.tokens, tps: l.tps, startedAt: Date.parse(l.at) || now, ttft: l.ttft,
        tries: [{ provider: l.provider, model: l.model, state: l.status === "err" ? "fail" : "ok", ms: l.ttft, why: l.status === "err" ? "error" : "200" }],
        fallbacks: 0, subagents: []
      });
    });

    return {
      mode: "live",
      fetchedAt: now,
      gateway: raw.gateway || "127.0.0.1:3425",
      kpis: {
        requests: totals.calls || 0,
        calls: totals.calls || 0,
        canceled: totals.canceled || 0,
        errors: totals.errors || 0,
        retried: totals.retried || 0,
        timed: totals.timed || 0,
        requestsDelta: 0,
        tokens: totalTokens,
        tokensDelta: 0,
        cost: totals.cost || 0,
        costDelta: 0,
        cache: cacheRate,
        cacheDelta: 0,
        tps: totals.decode_ms && totals.decode_out ? totals.decode_out / (totals.decode_ms / 1000) : 0,
        tpsDelta: 0,
        active: active.length
      },
      quotas: q,
      quotaHistory,
      sessions,
      recent: Array.from(recentMap.values()).slice(0, 5),
      series,
      heatmap,
      models,
      logs,
      decision: sessions[0] ? {
        session: sessions[0],
        title: sessions[0].title,
        group: sessions[0].group,
        rule: sessions[0].rule,
        intent: sessions[0].intent,
        confidence: sessions[0].confidence,
        classifierMs: 0,
        effort: sessions[0].effort,
        tries: sessions[0].tries,
        narrative: sessions[0].tries.map(t => `${t.provider} · ${t.model} ${t.why}`).join(" → ")
      } : null
    };
  }

  function providerOfModel(model, provider) {
    const p = String(provider || "").toLowerCase().trim();
    // The gateway already knows the seat it used. Keep that identity even
    // when the provider is not in the bundled icon set; the model name is
    // not a reliable provider hint (`workbuddy` serving DeepSeek is not
    // DeepSeek).
    if (p) return p;
    const m = String(model || "").toLowerCase();
    // An aggregator's id is "vendor/model": the call went through the
    // aggregator even when the vendor name is in the model id.
    if (m.includes("/")) return "openrouter";
    if (m.includes("claude")) return "anthropic";
    if (m.includes("gpt") || m.includes("o3") || m.includes("codex")) return "openai";
    if (m.includes("gemini")) return "google";
    if (m.includes("deepseek")) return "deepseek";
    if (m.includes("kimi") || m.includes("moonshot")) return "moonshot";
    if (m.includes("glm") || m.includes("zhipu")) return "zhipu";
    if (m.includes("minimax")) return "minimax";
    if (m.includes("grok")) return "xai";
    if (m.includes("qwen")) return "qwen";
    return "unknown";
  }

  window.MagpieData = {
    mockState, fetchLive, providerMeta, agentMeta, iconUrl, PROVIDERS, AGENTS, MODEL_COLORS,
    fmtTokens, fmtMoney, fmtPct, providerOfModel
  };
})();
