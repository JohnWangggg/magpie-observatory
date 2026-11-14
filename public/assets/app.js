/* ==========================================================================
   Magpie Observatory — UI controller
   Vanilla DOM + SVG. No build step, no runtime dependencies.
   ========================================================================== */
(function () {
  "use strict";

  const D = window.MagpieData;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pad2 = n => String(n).padStart(2, "0");

  const state = {
    mode: "demo",
    data: D.mockState(),
    selectedSession: null,
    filter: null,
    range: "today",
    trendMetric: "tokens",
    heroMode: "route",
    sessionTab: "active",
    paused: false,
    logQuery: "",
    view: null,
    wireSig: "",
    events: 0,
    tickerIndex: 0,
    lastTick: Date.now(),
    timers: [],
    liveTimer: null,
    liveBusy: false,
    tour: false,
    tourTimer: null,
    liveTries: 0,
    liveRetryTimer: null,
    gatewayWatch: null,
    gatewayWatchTries: 0,
    favorites: (() => {
      try {
        const raw = JSON.parse(localStorage.getItem("magpie.favorites") || "[]");
        return Array.isArray(raw) ? raw.filter(x => typeof x === "string") : [];
      } catch (_) { return []; }
    })()
  };

  const STATUS_TEXT = { streaming: "运行中", queued: "排队", done: "完成", error: "失败" };
  const STATUS_CLASS = { streaming: "run", queued: "queue", done: "done", error: "err" };
  const STATUS_LOG = { ok: "ok", run: "run", retry: "retry", err: "err" };

  /* ---------------------------------------------------------- view registry --- */
  // New visual forms live in public/assets/views/*.js and register themselves
  // on window.ObservatoryViews. This keeps app.js small and lets each view own
  // its own files; buildViewCtx() is the only contract between them.
  function viewRegistry() { return window.ObservatoryViews || {}; }
  function buildViewCtx() {
    return {
      data: state.data,
      view: state.view,
      metric: state.metric,
      logs: state.data.logs || [],
      quotas: state.data.quotas || [],
      kpis: state.data.kpis || {},
      fmtTokens, fmtMoney, esc, clamp,
      providerMeta: D.providerMeta,
      providerOfModel: D.providerOfModel,
      providerIcon, agentMeta: D.agentMeta, agentIcon,
      motion: document.documentElement.dataset.motion || "full",
      game: window.Obs && window.Obs.game
    };
  }
  function renderCustomView(mode, force) {
    const view = viewRegistry()[mode];
    const host = $("#view-" + mode);
    if (!view || !host) return;
    view.render(host, buildViewCtx());
    // After the view rebuilds its DOM, re-light any legend chip matching the
    // active session filter so the visual state survives every re-render.
    if (state.filter) {
      const key = state.filter.type === "agent" ? "agent" : state.filter.type === "provider" ? "provider" : null;
      if (key) $$(`[data-${key}]`, host).forEach(el =>
        el.classList.toggle("legend-on", el.dataset[key] === state.filter.value));
    }
  }

  /* ----------------------------------------------------------- view picker --- */
  // One catalog feeds the hero picker, the menu, the active title and each
  // group's accent. Views registered by modules override title/eyebrow.
  const VIEW_GROUPS = ["实时", "用量", "结构", "趣味"];
  const GROUP_COLORS = { "实时": "#56d4dd", "用量": "#8b7cf6", "结构": "#4ade80", "趣味": "#fbbf24" };
  const VIEW_META = [
    { id: "route", title: "实时路由", eyebrow: "LIVE ROUTING", group: "实时", icon: "i-route", hint: "Agent → Provider" },
    { id: "waterfall", title: "会话瀑布", eyebrow: "SESSION WATERFALL", group: "实时", icon: "i-stack", hint: "一次会话的时间轴" },
    { id: "network", title: "关系网络", eyebrow: "RELATION GRAPH", group: "实时", icon: "i-magpie", hint: "Agent / Provider / 模型" },
    { id: "swarm", title: "延迟蜂群", eyebrow: "LATENCY SWARM", group: "实时", icon: "i-bolt", hint: "TTFT 分布" },
    { id: "rings", title: "Token 年轮", eyebrow: "YEAR IN RINGS", group: "用量", icon: "i-clock", hint: "26 周极坐标日历" },
    { id: "latency", title: "延迟热力", eyebrow: "LATENCY HEATMAP", group: "用量", icon: "i-pulse", hint: "时间 × 延迟" },
    { id: "stream", title: "流量河流", eyebrow: "STREAMGRAPH", group: "用量", icon: "i-chart", hint: "Provider 增量" },
    { id: "quota", title: "额度燃尽", eyebrow: "QUOTA PACE", group: "用量", icon: "i-db", hint: "窗口燃尽与预测" },
    { id: "budget", title: "额度预算", eyebrow: "BUDGET BULLETS", group: "用量", icon: "i-bolt", hint: "阈值与配速" },
    { id: "treemap", title: "成本结构", eyebrow: "COST TREEMAP", group: "结构", icon: "i-overview", hint: "Provider → 模型" },
    { id: "marimekko", title: "结构马赛克", eyebrow: "MARIMEKKO", group: "结构", icon: "i-chart", hint: "列宽 / 带高" },
    { id: "sankey", title: "路由流向", eyebrow: "ROUTING FLOW", group: "结构", icon: "i-route", hint: "Agent → Provider" },
    { id: "chord", title: "流向和弦", eyebrow: "CHORD", group: "结构", icon: "i-magpie", hint: "左右弧彩带" },
    { id: "funnel", title: "请求漏斗", eyebrow: "REQUEST FUNNEL", group: "结构", icon: "i-stack", hint: "发出 → 成功" },
    { id: "radar", title: "路由雷达", eyebrow: "RADAR SCAN", group: "趣味", icon: "i-pulse", hint: "Provider 环" },
    { id: "loom", title: "请求织机", eyebrow: "REQUEST LOOM", group: "趣味", icon: "i-stack", hint: "请求织成彩带" },
    { id: "rhythm", title: "请求节奏", eyebrow: "RHYTHM", group: "趣味", icon: "i-bolt", hint: "16 步节拍" },
    { id: "orrery", title: "轨道星图", eyebrow: "ORRERY", group: "趣味", icon: "i-magpie", hint: "行星与卫星" },
    { id: "chips", title: "连击卡牌", eyebrow: "COMBO CHIPS", group: "趣味", icon: "i-zap", hint: "游戏化连击" },
    { id: "factory", title: "请求工厂", eyebrow: "REQUEST FACTORY", group: "趣味", icon: "i-server", hint: "排队 → 完成" },
    { id: "bees", title: "蜂巢", eyebrow: "BEEHIVE", group: "趣味", icon: "i-magpie", hint: "会话绕着 Provider" },
    { id: "stellar", title: "夜航", eyebrow: "STELLAR DRIFT", group: "趣味", icon: "i-sparkle", hint: "星空与流星 · 陪伴首选" },
    { id: "burn", title: "燃烧速率", eyebrow: "BURN RATE", group: "实时", icon: "i-flame", hint: "配额窗口烧速 / 预测重置" },
    { id: "candle", title: "K线吞吐", eyebrow: "CANDLE THROUGHPUT", group: "用量", icon: "i-chart", hint: "OHLC·涨跌K线" },
    { id: "gauge", title: "仪表盘", eyebrow: "GAUGE MATRIX", group: "实时", icon: "i-pulse", hint: "KPI/配额仪表" },
    { id: "bloom", title: "绽放", eyebrow: "REQUEST BLOOM", group: "趣味", icon: "i-sparkle", hint: "请求开花·藤蔓生长" },
    { id: "petri", title: "培养皿", eyebrow: "PETRI DISH", group: "趣味", icon: "i-magpie", hint: "请求=活细胞" },
    { id: "aurora", title: "极光", eyebrow: "AURORA", group: "趣味", icon: "i-sparkle", hint: "请求=天空光带" },
    { id: "constellation", title: "星座", eyebrow: "CONSTELLATION", group: "趣味", icon: "i-magpie", hint: "会话=星图" },
    { id: "prism", title: "棱镜", eyebrow: "PRISM", group: "结构", icon: "i-route", hint: "白光分成Provider份额" },
    { id: "terrarium", title: "玻璃缸", eyebrow: "TERRARIUM", group: "趣味", icon: "i-magpie", hint: "会话=植物生态" },
    { id: "echo", title: "回声", eyebrow: "ECHO", group: "趣味", icon: "i-magpie", hint: "涟漪=Token" },
    { id: "mosaic", title: "马赛克", eyebrow: "MOSAIC", group: "用量", icon: "i-chart", hint: "每请求一块砖" },
    { id: "origami", title: "折纸", eyebrow: "ORIGAMI", group: "趣味", icon: "i-magpie", hint: "纸鹤=会话" },
    { id: "firefly", title: "萤火虫", eyebrow: "FIREFLY", group: "趣味", icon: "i-magpie", hint: "萤火=会话" },
    { id: "mandala", title: "曼陀罗", eyebrow: "MANDALA", group: "趣味", icon: "i-magpie", hint: "瓣=会话 环=尝试" },
    { id: "quilt", title: "拼布", eyebrow: "QUILT", group: "用量", icon: "i-chart", hint: "每会话一块布" },
    { id: "vortex", title: "漩涡", eyebrow: "VORTEX", group: "趣味", icon: "i-magpie", hint: "螺旋=会话" },
    { id: "kaleido", title: "万花筒", eyebrow: "KALEIDO", group: "趣味", icon: "i-magpie", hint: "楔=会话 12折" },
    { id: "orbit", title: "彗星轨道", eyebrow: "ORBIT", group: "趣味", icon: "i-magpie", hint: "彗=会话 尾=弧" },
    { id: "rain", title: "雨幕", eyebrow: "RAIN", group: "趣味", icon: "i-magpie", hint: "滴=会话 红=失败" },
    { id: "bubbles", title: "气泡", eyebrow: "BUBBLES", group: "趣味", icon: "i-magpie", hint: "泡=会话 沉=失败" },
    { id: "spectrum", title: "频谱", eyebrow: "SPECTRUM", group: "用量", icon: "i-chart", hint: "峰=会话 高=Token" },
    { id: "wave", title: "波浪线", eyebrow: "WAVE", group: "用量", icon: "i-chart", hint: "双轨波形" },
    { id: "galaxy", title: "星系", eyebrow: "GALAXY", group: "趣味", icon: "i-magpie", hint: "星=会话 双臂" },
    { id: "dna", title: "DNA", eyebrow: "DNA", group: "趣味", icon: "i-magpie", hint: "对=会话 宽=Token" },
    { id: "nebula", title: "星云", eyebrow: "NEBULA", group: "趣味", icon: "i-magpie", hint: "云=会话 大=Token" },
    { id: "tide", title: "潮汐", eyebrow: "TIDE", group: "趣味", icon: "i-magpie", hint: "潮=今日量" },
    { id: "maze", title: "迷宫", eyebrow: "MAZE", group: "趣味", icon: "i-magpie", hint: "段=会话 长=Token" },
    { id: "quartz", title: "晶簇", eyebrow: "QUARTZ", group: "趣味", icon: "i-magpie", hint: "晶=会话 高=Token" },
    { id: "ripple", title: "涟漪", eyebrow: "RIPPLE", group: "趣味", icon: "i-magpie", hint: "滴=会话 大=Token" },
    { id: "lantern", title: "天灯", eyebrow: "LANTERN", group: "趣味", icon: "i-magpie", hint: "灯=会话 大=Token" },
    { id: "pinwheel", title: "风车", eyebrow: "PINWHEEL", group: "趣味", icon: "i-magpie", hint: "轮=会话 大=Token" },
    { id: "chime", title: "风铃", eyebrow: "CHIME", group: "趣味", icon: "i-magpie", hint: "管=会话 长=Token" },
    { id: "firework", title: "烟花", eyebrow: "FIREWORK", group: "趣味", icon: "i-magpie", hint: "爆=会话 径=Token" },
    { id: "fountain", title: "喷泉", eyebrow: "FOUNTAIN", group: "趣味", icon: "i-magpie", hint: "喷=会话 高=Token" },
    { id: "pendulum", title: "摆锤", eyebrow: "PENDULUM", group: "趣味", icon: "i-magpie", hint: "摆=会话 长=Token" },
    { id: "aurora2", title: "极光幕", eyebrow: "AURORA2", group: "趣味", icon: "i-magpie", hint: "幕=会话 高=Token" },
    { id: "beehive", title: "蜂房", eyebrow: "BEEHIVE", group: "趣味", icon: "i-magpie", hint: "格=会话 满=Token" },
    { id: "vine", title: "藤蔓", eyebrow: "VINE", group: "趣味", icon: "i-magpie", hint: "叶=会话 大=Token" },
    { id: "play", title: "开局", eyebrow: "PLAY · EVERY CALL IS A BEAT", group: "趣味", icon: "i-zap", hint: "转盘 + 判定 + 连击" }
  ];

  function viewMeta(mode) {
    const base = VIEW_META.find(v => v.id === mode);
    const custom = viewRegistry()[mode];
    if (!base && !custom) return null;
    return {
      id: mode,
      title: (custom && custom.title) || (base && base.title) || mode,
      eyebrow: (custom && custom.eyebrow) || (base && base.eyebrow) || "",
      group: (base && base.group) || "趣味",
      icon: (base && base.icon) || "i-magpie",
      hint: (base && base.hint) || ""
    };
  }

  function menuItem(v, accent) {
    const search = `${v.title} ${v.eyebrow} ${v.group} ${v.hint} ${v.id}`.toLowerCase();
    const on = state.favorites.includes(v.id);
    let heat = 0;
    try { heat = (JSON.parse(localStorage.getItem("magpie.viewHeat") || "{}"))[v.id] || 0; } catch (_) {}
    const flame = heat >= 3 ? `<span class="vm-hot" title="常看 · ${heat} 次">🔥</span>` : "";
    return `<div class="vm-row">
      <button class="vm-item" type="button" data-hero="${v.id}" data-search="${esc(search)}" role="option" aria-selected="false" style="--vm-c:${accent}">
        <span class="vm-ic"><svg><use href="#${v.icon}"/></svg></span>
        <span class="vm-copy"><b>${esc(v.title)}</b><small>${esc(v.eyebrow)}</small></span>
        <span class="vm-hint">${esc(v.hint)}</span>${flame}
      </button>
      <button class="vm-star${on ? " on" : ""}" type="button" data-fav="${v.id}" aria-pressed="${on}" aria-label="${on ? "取消收藏" : "收藏"} ${esc(v.title)}" title="${on ? "取消收藏" : "收藏"}">
        <svg><use href="#i-star"/></svg>
      </button>
    </div>`;
  }

  function buildViewMenu() {
    const host = $("#vm-groups");
    if (!host) return;
    const sections = [];
    const favs = state.favorites
      .map(id => VIEW_META.find(v => v.id === id))
      .filter(Boolean);
    if (favs.length) {
      sections.push(`<section class="vm-group vm-fav"><h4 style="--vm-g:var(--amber)"><i></i>收藏<span>${favs.length}</span></h4>${favs.map(v => menuItem(v, "var(--amber)")).join("")}</section>`);
    }
    VIEW_GROUPS.forEach(group => {
      const items = VIEW_META.filter(v => v.group === group).map(v => menuItem(v, GROUP_COLORS[group])).join("");
      sections.push(`<section class="vm-group"><h4 style="--vm-g:${GROUP_COLORS[group]}"><i></i>${group}<span>${VIEW_META.filter(v => v.group === group).length}</span></h4>${items}</section>`);
    });
    host.innerHTML = sections.join("");
  }

  function toggleFavorite(id) {
    const i = state.favorites.indexOf(id);
    if (i >= 0) state.favorites.splice(i, 1); else state.favorites.push(id);
    try { localStorage.setItem("magpie.favorites", JSON.stringify(state.favorites)); } catch (_) {}
    buildViewMenu();
    const search = $("#view-search");
    filterViewMenu(search ? search.value : "");
    $$(".view-menu .vm-item").forEach(b => {
      const on = b.dataset.hero === state.heroMode;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
    });
    const meta = viewMeta(id);
    renderRailFavs();
    toast(state.favorites.includes(id) ? `已收藏「${meta.title}」` : `已取消收藏「${meta.title}」`);
  }

  // Starred views get a permanent icon column on the left rail — the
  // "one click to switch" promised in the README. Rebuilt on toggle/init.
  function renderRailFavs() {
    const host = $("#rail-favs");
    if (!host) return;
    const favs = state.favorites.map(id => VIEW_META.find(v => v.id === id)).filter(Boolean);
    host.hidden = !favs.length;
    host.innerHTML = favs.map(v => `
      <button class="fav-btn${v.id === state.heroMode ? " active" : ""}${v.id === (localStorage.getItem("magpie.defaultView") || "") ? " default" : ""}" data-fav-view="${v.id}" title="${v.title}${v.id === (localStorage.getItem("magpie.defaultView") || "") ? " · 默认视图" : ""}">
        <svg><use href="#${v.icon || "i-sparkle"}"/></svg>
      </button>`).join("");
  }

  function filterViewMenu(query) {
    const needle = String(query || "").trim().toLowerCase();
    let shown = 0;
    $$(".view-menu .vm-item").forEach(b => {
      const on = !needle || b.dataset.search.includes(needle);
      b.hidden = !on;
      if (on) shown++;
    });
    $$(".view-menu .vm-row").forEach(r => {
      const item = r.querySelector(".vm-item");
      r.hidden = !item || item.hidden;
    });
    $$(".view-menu .vm-group").forEach(g => {
      g.hidden = !Array.from(g.querySelectorAll(".vm-item")).some(b => !b.hidden);
    });
    const none = $("#vm-none");
    if (none) none.hidden = shown > 0;
  }

  function positionViewMenu() {
    const picker = $("#view-picker"), menu = $("#view-menu");
    if (!picker || !menu || menu.hidden) return;
    const r = picker.getBoundingClientRect();
    const width = Math.min(620, window.innerWidth - 24);
    const left = Math.max(12, Math.min(r.left, window.innerWidth - width - 12));
    const top = Math.max(12, r.bottom + 8);
    menu.style.width = width + "px";
    menu.style.left = left + "px";
    menu.style.top = top + "px";
    menu.style.maxHeight = Math.max(220, window.innerHeight - top - 16) + "px";
  }

  function openViewMenu() {
    const menu = $("#view-menu"), picker = $("#view-picker");
    if (!menu || !picker) return;
    if (!menu.hidden) return;
    // Rebuild on every open so heat flames and star states are fresh.
    buildViewMenu();
    const styleMenu = $("#style-menu"), settings = $("#settings-menu");
    if (styleMenu) styleMenu.hidden = true;
    if (settings) settings.hidden = true;
    if (state.tour) stopTour(true);
    menu.hidden = false;
    picker.setAttribute("aria-expanded", "true");
    const search = $("#view-search");
    if (search) search.value = "";
    filterViewMenu("");
    positionViewMenu();
    setTimeout(() => {
      const active = $(".view-menu .vm-item.active");
      if (active) active.scrollIntoView({ block: "nearest" });
      const s = $("#view-search");
      if (s) s.focus();
    }, 30);
  }

  function closeViewMenu(focus) {
    const menu = $("#view-menu"), picker = $("#view-picker");
    if (!menu) return;
    menu.hidden = true;
    if (picker) {
      picker.setAttribute("aria-expanded", "false");
      if (focus) picker.focus();
    }
  }

  function toggleViewMenu() {
    const menu = $("#view-menu");
    if (!menu) return;
    if (menu.hidden) openViewMenu(); else closeViewMenu(true);
  }

  function randomView() {
    const pool = VIEW_META.filter(v => v.id !== state.heroMode);
    if (!pool.length) return;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (state.tour) stopTour(true);
    setHeroMode(pick.id);
    closeViewMenu();
  }

  function updateTourUi() {
    const b = $("#vm-tour");
    if (b) {
      b.classList.toggle("active", state.tour);
      b.innerHTML = `<svg><use href="#i-${state.tour ? "pause" : "play"}"/></svg>${state.tour ? "停止巡游" : "巡游"}`;
    }
    const picker = $("#view-picker");
    if (picker) picker.classList.toggle("touring", state.tour);
  }

  function stopTour(silent) {
    state.tour = false;
    clearInterval(state.tourTimer);
    state.tourTimer = null;
    updateTourUi();
    if (!silent) toast("巡游已停止");
  }

  function startTour() {
    if (state.tour) { stopTour(); return; }
    state.tour = true;
    updateTourUi();
    clearInterval(state.tourTimer);
    const secs = Math.max(3, Number(document.documentElement.dataset.tour) || 10);
    state.tourTimer = setInterval(() => {
      if (document.hidden || state.paused) return;
      const idx = VIEW_META.findIndex(v => v.id === state.heroMode);
      const next = VIEW_META[(idx + 1) % VIEW_META.length].id;
      setHeroMode(next);
    }, secs * 1000);
    toast(`巡游开始 · 每 ${secs} 秒切换视图`);
  }

  function openHelp() {
    const help = $("#help-menu");
    if (!help) return;
    closeViewMenu();
    $("#style-menu").hidden = true;
    $("#settings-menu").hidden = true;
    help.hidden = false;
  }

  function closeHelp() {
    const help = $("#help-menu");
    if (help) help.hidden = true;
  }

  function toggleHelp() {
    const help = $("#help-menu");
    if (!help) return;
    if (help.hidden) openHelp(); else closeHelp();
  }

  /* ------------------------------------------------------------- derive --- */
  function computeView() {
    const d = state.data;
    if (state.mode === "live") {
      state.view = { series: d.series || [], kpis: d.kpis };
      return;
    }
    if (state.range === "today") {
      state.view = { series: d.series, kpis: d.kpis, unit: "hour" };
      return;
    }
    const days = state.range === "7d" ? 7 : 30;
    const slice = d.heatmap.slice(-days);
    const series = slice.map(day => ({
      label: day.date.slice(5),
      tokens: day.tokens,
      cost: +(day.tokens / 1e6 * 1.32).toFixed(2),
      date: day.date
    }));
    const tokens = series.reduce((a, b) => a + b.tokens, 0);
    const cost = series.reduce((a, b) => a + b.cost, 0);
    const requests = slice.reduce((a, b) => a + (b.calls || 0), 0);
    state.view = {
      series,
      unit: days === 7 ? "day" : "day",
      kpis: {
        ...d.kpis,
        requests,
        tokens,
        cost: +cost.toFixed(2),
        requestsDelta: state.range === "7d" ? 9.2 : 18.6,
        tokensDelta: state.range === "7d" ? 6.4 : 14.8,
        costDelta: state.range === "7d" ? 1.8 : 5.3
      }
    };
  }

  function selectedSession() {
    if (!state.selectedSession) return null;
    return state.data.sessions.concat(state.data.recent).find(s => s.id === state.selectedSession) || null;
  }

  function activeSessions() {
    return state.data.sessions.filter(s => s.status !== "done");
  }

  function visibleSessions() {
    let list = state.sessionTab === "active"
      ? activeSessions().concat(state.data.recent.filter(s => s.status !== "done")).slice(0, 8)
      : state.data.recent.concat(state.data.sessions.filter(s => s.status === "done"))
          .sort((a, b) => b.startedAt - a.startedAt).slice(0, 10);
    if (state.filter) {
      list = list.filter(s => state.filter.type === "agent"
        ? s.agent === state.filter.value
        : s.provider === state.filter.value);
    }
    return list;
  }

  function effectiveDecision() {
    const sel = selectedSession();
    if (sel) {
      return {
        session: sel, title: sel.title, group: "group/" + (sel.group || "direct"),
        rule: sel.rule || "—", intent: sel.intent || "—", confidence: sel.confidence,
        classifierMs: 0, effort: sel.effort, tries: sel.tries || [],
        narrative: narrativeOf(sel)
      };
    }
    return state.data.decision;
  }

  function narrativeOf(s) {
    const tries = s.tries || [];
    const ok = tries.find(t => t.state === "ok") || tries[tries.length - 1];
    const fails = tries.filter(t => t.state === "fail");
    if (!tries.length) return "等待路由决策。";
    let out = `路由到 ${D.providerMeta(ok.provider).name} / ${ok.model}`;
    if (fails.length) out += `；${fails.length} 次失败后改道，Agent 无感`;
    if (s.rule && s.rule !== "—") out += ` · ${s.rule}`;
    if (s.effort) out += ` · effort ${s.effort}`;
    return out + "。";
  }

  /* -------------------------------------------------------------- format --- */
  function fmtTokens(n) { return D.fmtTokens(n); }
  function fmtMoney(n) { return D.fmtMoney(n); }
  function fmtAge(ms) {
    ms = Math.max(0, ms);
    const s = Math.floor(ms / 1000);
    if (s < 60) return s + "s";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m" + (m < 10 ? pad2(s % 60) : "");
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h" + pad2(m % 60);
    return Math.floor(h / 24) + "d" + (h % 24) + "h";
  }
  function fmtReset(mins) {
    if (mins == null) return "—";
    if (mins <= 0) return "即将重置";
    if (mins < 60) return mins + "m 后重置";
    const h = Math.floor(mins / 60), m = mins % 60;
    if (h < 24) return h + "h" + (m ? m + "m" : "") + " 后重置";
    const d = Math.floor(h / 24);
    return d + "d" + (h % 24) + "h 后重置";
  }
  function providerIcon(p) { return D.iconUrl(D.providerMeta(p).icon); }
  function agentIcon(a) { return D.iconUrl(D.agentMeta(a).icon); }
  function tpsClass(v) {
    if (!v) return "";
    if (v >= 100) return "good";
    if (v >= 60) return "mid";
    return "low";
  }

  /* --------------------------------------------------------------- render --- */
  function renderAll() {
    computeView();
    renderKPIs();
    renderRouteStage();
    renderDecision();
    renderSessions();
    renderQuotas();
    renderTrend();
    renderDonut();
    renderHeatmap();
    renderLogs();
    bindLogExpand();
    bindDecisionJump();
    renderStatus();
    renderMode();
    (window.Obs && window.Obs.hooks.afterRender || []).forEach(fn => { try { fn(apiObj); } catch (_) {} });
  }

  function renderMode() {
    const d = state.data;
    const pill = $("#conn-pill");
    const label = $("#conn-label");
    const host = $("#conn-host");
    pill.dataset.mode = state.mode;
    label.textContent = state.mode === "live" ? "实时连接" : "演示数据";
    host.textContent = state.mode === "live" ? (d.gateway || "127.0.0.1:3425") : "mock://local";
    $("#live-dot").className = "live-dot" + (state.paused ? " stale" : "");
    $("#gateway-addr").textContent = d.gateway || "127.0.0.1:3425";
    $("#hub-addr").textContent = d.gateway || "127.0.0.1:3425";
    const demoBtn = $("#demo-toggle");
    demoBtn.classList.toggle("on", !state.paused);
    demoBtn.innerHTML = `<svg><use href="#i-${state.paused ? "play" : "pause"}"/></svg>`;
    demoBtn.title = state.paused ? "继续实时演示" : "暂停实时演示";
  }

  function renderKPIs() {
    const k = (state.view && state.view.kpis) || state.data.kpis;
    const items = [
      { key: "requests", label: "请求数", value: k.requests.toLocaleString(), unit: "次", delta: k.requestsDelta, icon: "i-bolt", color: "#8b7cf6", spark: [3,5,4,7,6,9,8,11,10,13,12,15] },
      { key: "tokens", label: "Token", value: fmtTokens(k.tokens), unit: "", delta: k.tokensDelta, icon: "i-stack", color: "#56d4dd", spark: [2,4,3,7,5,8,6,10,9,12,11,14] },
      { key: "cost", label: "预估费用", value: fmtMoney(k.cost), unit: "USD", delta: k.costDelta, icon: "i-chart", color: "#4ade80", spark: [7,6,8,7,9,8,10,11,10,12,11,13] },
      { key: "cache", label: "缓存命中", value: k.cache.toFixed(1), unit: "%", delta: k.cacheDelta, icon: "i-db", color: "#fbbf24", spark: [5,5,6,6,7,8,7,8,9,9,10,11] },
      { key: "tps", label: "平均 TPS", value: k.tps.toFixed(1), unit: "tok/s", delta: k.tpsDelta, icon: "i-pulse", color: "#f472b6", spark: [4,6,5,8,7,7,9,11,10,12,13,12] },
      { key: "active", label: "活跃会话", value: String(k.active), unit: "个", delta: k.activeDelta, icon: "i-route", color: "#60a5fa", spark: [1,2,1,3,2,4,3,4,3,5,4,4] }
    ];
    const heat = state.data.heatmap || [];
    const yd = heat.length >= 2 ? heat[heat.length - 2] : null;
    const goal = yd && yd.tokens ? yd.tokens : 0;
    const goalPct = goal ? Math.min(100, Math.round((k.tokens / goal) * 100)) : null;
    $("#kpi-row").innerHTML = items.map(it => {
      const down = it.key === "cost" ? it.delta <= 0 : it.delta < 0;
      const flat = !it.delta;
      const deltaText = flat ? "持平" : (it.delta > 0 ? "+" : "") + it.delta + "%";
      const deltaCls = flat ? "flat" : (down ? "down" : "");
      const spark = sparkPath(it.spark.map(v => v * (0.85 + (it.key.length % 3) * 0.05)));
      const ring = it.key === "tokens" && goalPct != null
        ? `<span class="kpi-goal" title="今日目标 · 昨日 ${fmtTokens(goal)} · 已达成 ${goalPct}%"><svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="7" fill="none" stroke="var(--line)" stroke-width="2.4"/><circle cx="9" cy="9" r="7" fill="none" stroke="${it.color}" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="${(goalPct / 100 * 44).toFixed(1)} 44" transform="rotate(-90 9 9)"/></svg><em>${goalPct}%</em></span>`
        : "";
      return `<article class="kpi" style="--k-c:${it.color}">
        <div class="kpi-label"><span>${it.label}</span><svg><use href="#${it.icon}"/></svg></div>
        <div class="kpi-value"><b>${esc(it.value)}</b><span>${esc(it.unit)}</span>${ring}</div>
        <div class="kpi-foot"><span class="kpi-delta ${deltaCls}">${deltaText}</span>${spark}</div>
      </article>`;
    }).join("");
  }

  function sparkPath(vals) {
    const w = 58, h = 20, max = Math.max(...vals), min = Math.min(...vals);
    const pts = vals.map((v, i) => {
      const x = (i / (vals.length - 1)) * w;
      const y = h - 3 - ((v - min) / Math.max(1, max - min)) * (h - 6);
      return [x, y];
    });
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = line + ` L${w} ${h} L0 ${h} Z`;
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path class="area" d="${area}"/><path d="${line}"/></svg>`;
  }

  function renderRouteStage() {
    const all = state.data.sessions.concat(state.data.recent);
    const active = activeSessions();
    const agentMap = new Map();
    all.forEach(s => {
      const a = agentMap.get(s.agent) || { key: s.agent, count: 0, tokens: 0, group: s.group, active: 0 };
      a.count++;
      a.tokens += s.tokens || 0;
      if (s.status !== "done" && s.status !== "error") {
        a.active++;
        if (s.group) a.group = s.group;
      }
      agentMap.set(s.agent, a);
    });
    const agents = Array.from(agentMap.values()).sort((a, b) => b.active - a.active || b.tokens - a.tokens).slice(0, 5);
    const maxAgentTokens = Math.max(1, ...agents.map(a => a.tokens));

    $("#agents-col").innerHTML = agents.map(a => {
      const meta = D.agentMeta(a.key);
      const hot = state.filter && state.filter.type === "agent" && state.filter.value === a.key;
      return `<div class="agent-node${hot ? " hot" : ""}" data-agent="${esc(a.key)}" style="--agent-c:${meta.color}" role="button" tabindex="0" title="点击筛选 ${esc(meta.name)}">
        <span class="agent-ic"><img src="${agentIcon(a.key)}" alt=""></span>
        <span class="agent-copy"><b>${esc(meta.name)}</b><small>group/${esc(a.group || "direct")}</small></span>
        <span class="agent-live"><i></i>${a.active || "—"}</span>
        <span class="agent-load"><i style="width:${Math.round(a.tokens / maxAgentTokens * 100)}%"></i></span>
      </div>`;
    }).join("");

    const provMap = new Map();
    all.forEach(s => {
      const tries = (s.tries && s.tries.length) ? s.tries : [{ provider: s.provider, model: s.model, state: s.status === "done" ? "ok" : "pending" }];
      tries.forEach(t => {
        const key = t.provider || D.providerOfModel(t.model, s.provider);
        const item = provMap.get(key) || { key, active: 0, models: new Set(), status: "idle", count: 0 };
        item.count++;
        if (t.model && t.model !== "—") item.models.add(t.model);
        if (s.status === "streaming") {
          item.active++;
          item.status = t.state === "fail" ? (item.status === "serving" ? "serving" : "retry") : "serving";
        } else if (s.status === "queued") {
          item.active++;
          if (item.status !== "serving") item.status = "routing";
        } else if (t.state === "fail") {
          if (item.status === "idle") item.status = "retry";
        }
        provMap.set(key, item);
      });
    });
    // Keep quota-bearing providers on the stage even while idle: an account's
    // remaining allowance is part of the routing picture.
    state.data.quotas.forEach(q => {
      if (!provMap.has(q.provider)) {
        provMap.set(q.provider, { key: q.provider, active: 0, models: new Set([q.plan || "待命"]), status: "idle", count: 0 });
      }
    });
    const quotaUsed = (p) => {
      const q = state.data.quotas.find(x => x.provider === p);
      return q && q.windows[0] ? q.windows[0].used : -1;
    };
    const providers = Array.from(provMap.values()).sort((a, b) => {
      const sa = a.status === "serving" ? 2 : a.status === "routing" ? 1 : 0;
      const sb = b.status === "serving" ? 2 : b.status === "routing" ? 1 : 0;
      return sb - sa || b.active - a.active || quotaUsed(b.key) - quotaUsed(a.key) || b.count - a.count;
    }).slice(0, 7);

    $("#providers-col").innerHTML = providers.map(p => {
      const meta = D.providerMeta(p.key);
      const quotas = state.data.quotas.filter(q => q.provider === p.key);
      const accts = quotas.slice(0, 2).map(q => `<span class="acct-chip">${esc(q.user || q.name)}${q.windows[0] ? " · " + q.windows[0].used + "%" : ""}</span>`).join("");
      const more = quotas.length > 2 ? `<span class="acct-chip more">+${quotas.length - 2}</span>` : "";
      const model = Array.from(p.models)[0] || (quotas[0] && quotas[0].plan) || "待命";
      const statusText = p.status === "serving" ? "回答中" : p.status === "routing" ? "排队" : p.status === "retry" ? "已改道" : "待命";
      const statusCls = p.status === "serving" ? "" : p.status === "routing" ? "routing" : p.status === "retry" ? "retry" : "idle";
      const quota = quotas[0] && quotas[0].windows[0] ? quotas[0].windows[0].used : 0;
      const hot = (state.filter && state.filter.type === "provider" && state.filter.value === p.key) ||
        (selectedSession() && D.providerOfModel(selectedSession().model, selectedSession().provider) === p.key);
      return `<div class="provider-node${p.status === "serving" ? " serving" : ""}${hot ? " serving" : ""}" data-provider="${esc(p.key)}" style="--p-c:${meta.color}" role="button" tabindex="0" title="点击筛选 ${esc(meta.name)}">
        <span class="p-ic"><img src="${providerIcon(p.key)}" alt=""></span>
        <b>${esc(meta.name)}</b>
        <span class="p-state ${statusCls}"><i></i>${statusText}</span>
        <small>${esc(model)}</small>
        <span class="p-account">${accts}${more}</span>
        <span class="p-bar"><i style="width:${clamp(quota, 2, 100)}%"></i></span>
      </div>`;
    }).join("");

    const activeCount = active.length;
    $("#hub-sub").textContent = `${activeCount} 会话 · ${activeCount} 并发`;
    const dec = effectiveDecision();
    $("#hub-mode").textContent = dec && dec.session ? (dec.session.mode === "order" ? "按顺序" : dec.session.mode === "rotate" ? "轮询" : "智能路由") : "智能路由";
    $("#hero-requests").textContent = activeCount;
    $("#hero-fallbacks").textContent = active.reduce((a, s) => a + (s.fallbacks || 0), 0);
    $("#hero-errors").textContent = all.filter(s => s.status === "error").length;

    // Keep this stable while only token counters move: rebuilding the SVG
    // would restart every bird mid-flight.
    const sig = JSON.stringify({
      a: agents.map(x => [x.key, x.active, x.group]),
      p: providers.map(x => [x.key, x.status, x.active, Array.from(x.models).join(",")]),
      f: state.filter, s: state.selectedSession
    });
    if (sig !== state.wireSig) {
      state.wireSig = sig;
      requestAnimationFrame(drawWires);
    }
    if (state.heroMode === "radar") renderRadarView();
    else if (state.heroMode === "loom") renderLoomView();
    else if (state.heroMode === "rhythm") renderRhythmView();
    else if (state.heroMode === "rings") renderRingsView();
    else if (state.heroMode === "quota") renderQuotaView();
    else if (viewRegistry()[state.heroMode]) renderCustomView(state.heroMode);
  }

  // The brand magpie, inline once in index.html. The outbound bird is 34px
  // and carries a message dot; the return bird mirrors and is a little
  // smaller, so direction reads even in a still screenshot.
  function birdShape(mirror) {
    const size = mirror ? 25 : 30;
    const half = size / 2;
    const cargo = mirror ? "" : `<circle class="cargo" cx="${(half * 0.72).toFixed(1)}" cy="${(-half * 0.5).toFixed(1)}" r="2.1"/>`;
    return `<g class="bird-art${mirror ? " back-art" : ""}"${mirror ? ' transform="scale(-1 1)"' : ""}>
      <use href="#bird-logo" x="${-half}" y="${-half}" width="${size}" height="${size}"/>
      ${cargo}
    </g>`;
  }

  // SMIL motion is unreliable in WebKit (keyPoints), and an element before
  // its begin time paints at the SVG origin. Position the birds ourselves:
  // eight getPointAtLength calls per frame are cheap and give exact control.
  function bindFlights() {
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionOff = document.documentElement.dataset.motion === "off";
    if (window.innerWidth <= 980) { state.flights = []; return; }
    state.flights = $$("#birds .flier").map(el => {
      const path = document.getElementById(el.dataset.path);
      if (!path) return null;
      let len = 0;
      try { len = path.getTotalLength(); } catch (_) { return null; }
      if (!len) return null;
      return {
        el, path, len,
        dur: Math.max(1, parseFloat(el.dataset.dur) || 2.6),
        offset: parseFloat(el.dataset.offset) || 0
      };
    }).filter(Boolean);
    if (document.documentElement.dataset.motion === "soft") {
      state.flights.forEach(f => { f.dur *= 1.5; f.offset *= 1.5; });
    }
    if (reduced || motionOff) {
      state.flights.forEach(f => setFlightAt(f, 0.5));
      state.flights = [];
    } else {
      positionFlights(performance.now());
    }
    ensureFlightLoop();
  }

  function setFlightAt(f, t) {
    const pt = f.path.getPointAtLength(((t % 1) + 1) % 1 * f.len);
    f.el.setAttribute("transform", `translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)})`);
  }

  function positionFlights(now) {
    const sec = now / 1000;
    (state.flights || []).forEach(f => {
      setFlightAt(f, ((sec + f.offset) % f.dur) / f.dur);
    });
  }

  let lastFlightFrame = 0;
  let flightRaf = 0;
  function flightActive() {
    return !window.__OBS_FREEZE && !document.hidden && !state.paused &&
      state.heroMode === "route" && document.documentElement.dataset.motion !== "off" &&
      state.flights && state.flights.length > 0;
  }
  function flightLoop(ts) {
    flightRaf = 0;
    if (!flightActive()) return;
    if (ts - lastFlightFrame > 32) {
      lastFlightFrame = ts;
      positionFlights(ts);
    }
    flightRaf = requestAnimationFrame(flightLoop);
  }
  function ensureFlightLoop() {
    if (flightRaf || !flightActive()) return;
    lastFlightFrame = 0;
    flightRaf = requestAnimationFrame(flightLoop);
  }

  function drawWires() {
    const stage = $("#route-stage");
    const svg = $("#wires");
    const birds = $("#birds");
    if (!stage || !svg || !birds) return;
    const base = stage.getBoundingClientRect();
    const hub = $("#hub-node").getBoundingClientRect();
    const agentEls = $$(".agent-node", stage);
    const providerEls = $$(".provider-node", stage);
    if (!hub.width) return;
    const W = base.width, H = base.height;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    birds.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const hubL = { x: hub.left - base.left, y: hub.top - base.top + hub.height / 2 };
    const hubR = { x: hub.right - base.left, y: hubL.y };
    let out = `<defs><radialGradient id="pulseGrad"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>`;
    const paths = [];
    let idx = 0;

    agentEls.forEach(el => {
      const r = el.getBoundingClientRect();
      const start = { x: r.right - base.left, y: r.top - base.top + r.height / 2 };
      const end = { x: hubL.x - 6, y: hubL.y };
      const d = `M${start.x.toFixed(1)} ${start.y.toFixed(1)} C${(start.x + 44).toFixed(1)} ${start.y.toFixed(1)} ${(end.x - 52).toFixed(1)} ${end.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
      const meta = D.agentMeta(el.dataset.agent);
      const active = activeSessions().filter(s => s.agent === el.dataset.agent).length;
      const filtered = state.filter && !(state.filter.type === "agent" && state.filter.value === el.dataset.agent);
      const id = "wire-a-" + (idx++);
      out += `<path id="${id}" class="wire${active ? " flow" : ""}${filtered ? " dim" : ""}" style="--w-c:${meta.color}" d="${d}"/>`;
      paths.push({ id, type: "agent", color: meta.color, active, filtered, d, start, end });
    });

    providerEls.forEach(el => {
      const r = el.getBoundingClientRect();
      const start = { x: hubR.x + 6, y: hubR.y };
      const end = { x: r.left - base.left, y: r.top - base.top + r.height / 2 };
      const d = `M${start.x.toFixed(1)} ${start.y.toFixed(1)} C${(start.x + 52).toFixed(1)} ${start.y.toFixed(1)} ${(end.x - 44).toFixed(1)} ${end.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
      const meta = D.providerMeta(el.dataset.provider);
      const active = activeSessions().filter(s => D.providerOfModel(s.model, s.provider) === el.dataset.provider).length;
      const filtered = state.filter && !(state.filter.type === "provider" && state.filter.value === el.dataset.provider);
      const id = "wire-p-" + (idx++);
      out += `<path id="${id}" class="wire${active ? " flow" : ""}${filtered ? " dim" : ""}" style="--w-c:${meta.color}" d="${d}"/>`;
      paths.push({ id, type: "provider", color: meta.color, active, filtered, d, start, end });
    });

    // Two magpies per live conversation: one carries the request out, one
    // brings the answer back. The pair follows the whole agent -> magpie ->
    // provider path, not one segment, so the direction reads at a glance.
    const agentByKey = new Map($$(".agent-node", stage).map(el => [el.dataset.agent, el]));
    const providerByKey = new Map($$(".provider-node", stage).map(el => [el.dataset.provider, el]));
    let birdOut = "";
    const live = activeSessions().filter(s => s.status === "streaming" || s.status === "queued").slice(0, 3);
    live.forEach((s, i) => {
      const aEl = agentByKey.get(s.agent);
      const pKey = D.providerOfModel(s.model, s.provider);
      const pEl = providerByKey.get(pKey);
      if (!aEl || !pEl) return;
      const ar = aEl.getBoundingClientRect();
      const pr = pEl.getBoundingClientRect();
      const start = { x: ar.right - base.left, y: ar.top - base.top + ar.height / 2 };
      const end = { x: pr.left - base.left, y: pr.top - base.top + pr.height / 2 };
      const hx = hub.left - base.left + hub.width / 2;
      // Pass just above or below the hub's wordmark instead of through it.
      const hy = hub.top - base.top + hub.height / 2 + (i % 2 ? 32 : -30);
      const d = `M${start.x.toFixed(1)} ${start.y.toFixed(1)} C${(start.x + 46).toFixed(1)} ${start.y.toFixed(1)} ${(hx - 62).toFixed(1)} ${hy.toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)} C${(hx + 62).toFixed(1)} ${hy.toFixed(1)} ${(end.x - 46).toFixed(1)} ${end.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`;
      // WebKit does not run keyPoints on an mpath reliably; draw the return
      // trip as its own reversed path instead.
      const dBack = `M${end.x.toFixed(1)} ${end.y.toFixed(1)} C${(end.x - 46).toFixed(1)} ${end.y.toFixed(1)} ${(hx + 62).toFixed(1)} ${hy.toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)} C${(hx - 62).toFixed(1)} ${hy.toFixed(1)} ${(start.x + 46).toFixed(1)} ${start.y.toFixed(1)} ${start.x.toFixed(1)} ${start.y.toFixed(1)}`;
      const id = "flight-" + i;
      const idBack = "flight-back-" + i;
      const aColor = D.agentMeta(s.agent).color;
      const dur = (2.6 + (i % 3) * 0.32).toFixed(2);
      const dim = state.selectedSession && state.selectedSession !== s.id ? " dim" : "";
      birdOut += `<path id="${id}" class="flight" d="${d}"/><path id="${idBack}" class="flight" d="${dBack}"/>`;
      birdOut += `<g class="flier${dim}" style="--f-c:${aColor}" data-path="${id}" data-dur="${dur}" data-offset="${(i * 0.6).toFixed(2)}">
        <g class="bird-bob">${birdShape(false)}</g>
      </g>`;
      birdOut += `<g class="flier back${dim}" style="--f-c:${aColor}" data-path="${idBack}" data-dur="${dur}" data-offset="${(dur / 2 + i * 0.6).toFixed(2)}">
        <g class="bird-bob">${birdShape(true)}</g>
      </g>`;
    });

    svg.innerHTML = out;
    birds.innerHTML = birdOut;
    bindFlights();
  }

  function heroProviderStats() {
    const map = new Map();
    const touch = (key) => {
      const meta = D.providerMeta(key);
      if (!map.has(key)) map.set(key, { key, name: meta.name, color: meta.color, active: 0, used: 0, model: "", plan: "", error: false });
      return map.get(key);
    };
    state.data.sessions.forEach(s => {
      const key = D.providerOfModel(s.model, s.provider);
      const p = touch(key);
      if (s.status === "streaming" || s.status === "queued") p.active++;
      if (s.model) p.model = s.model;
      if (s.status === "error") p.error = true;
    });
    state.data.recent.slice(0, 8).forEach(s => {
      const p = touch(D.providerOfModel(s.model, s.provider));
      if (!p.model) p.model = s.model;
      if (s.status === "error") p.error = true;
    });
    state.data.quotas.forEach(q => {
      const p = touch(q.provider);
      p.used = q.windows[0] ? Math.round(q.windows[0].used || 0) : 0;
      p.plan = q.plan || "";
    });
    return Array.from(map.values()).sort((a, b) => b.active - a.active || b.used - a.used);
  }

  function renderRadarView(force) {
    const host = $("#view-radar");
    if (!host) return;
    const provs = heroProviderStats().slice(0, 7);
    const active = activeSessions();
    const tokens = state.data.sessions.reduce((a, s) => a + (s.tokens || 0), 0);
    const sig = JSON.stringify({
      p: provs.map(p => [p.key, p.active, p.used, p.model]),
      a: active.map(s => [s.id, s.status])
    });
    if (!force && host.dataset.sig === sig && host.innerHTML) return;
    host.dataset.sig = sig;
    const n = Math.max(1, provs.length);
    const R = 33.5;
    const nodes = provs.map((p, i) => {
      const angle = (-90 + i * 360 / n) * Math.PI / 180;
      const x = 50 + Math.cos(angle) * R;
      const y = 50 + Math.sin(angle) * R;
      return `<button class="radar-node${p.active ? " serving" : ""}" data-provider="${esc(p.key)}" style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%;--p-c:${p.color}" title="${esc(p.name)} · ${esc(p.model || p.plan || "")}">
        <span class="radar-quota" style="--used:${clamp(p.used, 0, 100)}"><img src="${providerIcon(p.key)}" alt=""></span>
        <b>${esc(p.name)}</b><small>${esc((p.model || p.plan || "待命").split("/").pop())}</small>
      </button>`;
    }).join("");
    const size = Math.max(220, Math.min(host.clientHeight || 280, 330) - 6);
    const flights = active.slice(0, 5).map(s => {
      const meta = D.agentMeta(s.agent);
      return `<div class="radar-flight" style="--s-c:${meta.color}">
        <img src="${agentIcon(s.agent)}" alt="">
        <span class="rf-copy"><b>${esc(s.title)}</b><small>${esc(s.model)}</small></span>
        <span class="rf-tps">${s.tps ? s.tps.toFixed(0) : "—"}<small>tok/s</small></span>
      </div>`;
    }).join("") || `<div class="radar-empty">等待新的请求</div>`;
    const quotaRows = provs.slice(0, 6).map(p => `<div class="radar-qrow" style="--p-c:${p.color}">
      <img src="${providerIcon(p.key)}" alt="">
      <span><b>${esc(p.name)}</b><i><em style="width:${clamp(p.used, 0, 100)}%"></em></i></span>
      <strong>${p.used}%</strong>
    </div>`).join("");
    host.innerHTML = `<div class="radar-board">
      <aside class="radar-side left">
        <div class="radar-side-title"><span>IN FLIGHT</span><span>${active.length}</span></div>
        <div class="radar-flights">${flights}</div>
        <div class="radar-side-stat"><span>REQUESTS</span><b>${state.data.kpis.requests.toLocaleString()}</b><span>TOKENS</span><b>${fmtTokens(state.data.kpis.tokens)}</b></div>
      </aside>
      <div class="radar-wrap"><div class="radar" style="width:${size}px;height:${size}px">
        <i class="radar-ring r1"></i><i class="radar-ring r2"></i><i class="radar-ring r3"></i>
        <i class="radar-cross x"></i><i class="radar-cross y"></i>
        <i class="radar-sweep"></i>
        <i class="radar-ping p1"></i><i class="radar-ping p2"></i><i class="radar-ping p3"></i>
        ${nodes}
        <div class="radar-core">
          <span class="radar-core-logo"><svg viewBox="0 0 44 44"><use href="#bird-logo"/></svg></span>
          <b>magpie</b><span>LIVE SCAN</span><small>${active.length} active · ${fmtTokens(tokens)}</small>
        </div>
        <span class="radar-tag left">RADAR</span>
        <span class="radar-tag right">${provs.length} providers</span>
      </div></div>
      <aside class="radar-side right">
        <div class="radar-side-title"><span>QUOTA RINGS</span><span>${provs.length}</span></div>
        <div class="radar-quotas">${quotaRows}</div>
        <div class="radar-cache"><span class="radar-cache-ring" style="--used:${state.data.kpis.cache.toFixed(1)}"></span><span><b>${state.data.kpis.cache.toFixed(1)}%</b><small>CACHE HIT</small></span></div>
      </aside>
    </div>`;
  }

  function renderLoomView(force) {
    const host = $("#view-loom");
    if (!host) return;
    const logs = state.data.logs.slice(0, 16);
    const sig = logs.map(r => r.id + ":" + r.status + ":" + r.tokens).join("|");
    if (!force && host.dataset.sig === sig && host.innerHTML) return;
    host.dataset.sig = sig;
    if (!logs.length) {
      host.innerHTML = `<div class="empty-state"><b>织机等待第一根线</b><span>请求完成后会在这里织成一行。</span></div>`;
      return;
    }
    const colors = new Map();
    logs.forEach(r => {
      const key = D.providerOfModel(r.model, r.provider);
      colors.set(key, D.providerMeta(key).color);
    });
    const maxTok = Math.max(1, ...logs.map(r => r.tokens || 0));
    const rows = logs.map((r, i) => {
      const key = D.providerOfModel(r.model, r.provider);
      const color = colors.get(key);
      const cells = Array.from({ length: 18 }, (_, j) => {
        const wave = Math.abs(Math.sin((i + 1.7) * (j + 2.1) * 0.43));
        const o = 0.12 + wave * 0.88;
        return `<i style="--o:${o.toFixed(2)}"></i>`;
      }).join("");
      const st = r.status === "ok" ? "ok" : r.status === "err" ? "err" : r.status === "retry" ? "retry" : "run";
      return `<div class="loom-row" style="--i:${i};--p-c:${color}" title="${esc(r.session)} · ${esc(r.model)}">
        <span class="loom-time">${new Date(r.at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
        <span class="loom-weave">${cells}</span>
        <img class="loom-icon" src="${providerIcon(key)}" alt="">
        <span class="loom-model">${esc(r.model)}</span>
        <span class="loom-tok">${fmtTokens(r.tokens)}</span>
        <span class="loom-st"><i class="${st}"></i></span>
      </div>`;
    }).join("");
    host.innerHTML = `<div class="loom-wrap">
      <div class="loom-head"><span><b>REQUEST LOOM</b> · 请求织机</span><span>${logs.length} picks · cache ${state.data.kpis.cache.toFixed(1)}%</span></div>
      <div class="loom-body">${rows}</div>
      <i class="loom-shuttle"></i>
    </div>`;
  }

  function renderRhythmView(force) {
    const host = $("#view-rhythm");
    if (!host) return;
    const logs = state.data.logs.slice(0, 16);
    const sig = logs.map(r => r.id + ":" + r.status + ":" + r.tokens).join("|");
    if (!force && host.dataset.sig === sig && host.innerHTML) return;
    host.dataset.sig = sig;
    if (!logs.length) {
      host.innerHTML = `<div class="empty-state"><b>节拍等待第一拍</b><span>请求完成后会落在对应 Provider 的轨道上。</span></div>`;
      return;
    }
    // One column per request, oldest on the left, newest on the right.
    const cols = 16;
    const ordered = logs.slice().reverse();
    const lanes = [];
    ordered.forEach(r => {
      const key = D.providerOfModel(r.model, r.provider);
      let lane = lanes.find(l => l.key === key);
      if (!lane) { lane = { key, name: D.providerMeta(key).name, color: D.providerMeta(key).color, notes: [] }; lanes.push(lane); }
      lane.notes.push(r);
    });
    const laneRows = lanes.slice(0, 6).map(lane => {
      const notes = new Map();
      lane.notes.forEach(r => {
        const col = ordered.indexOf(r);
        notes.set(col, r);
      });
      const steps = Array.from({ length: cols }, (_, i) => {
        const r = notes.get(i);
        if (!r) return `<i class="rhythm-step"></i>`;
        const strength = clamp((r.tokens || 0) / 26000, .35, 1);
        return `<i class="rhythm-step on ${r.status === 'err' ? 'bad' : ''}" style="--d:${i * 0.08}s;--o:${strength.toFixed(2)}" title="${esc(r.session)} · ${esc(r.model)}"></i>`;
      }).join("");
      return `<div class="rhythm-lane" style="--p-c:${lane.color}">
        <span class="rhythm-label"><img src="${providerIcon(lane.key)}" alt=""><span><b>${esc(lane.name)}</b><small>${lane.notes.length} notes</small></span></span>
        <span class="rhythm-steps">${steps}</span>
      </div>`;
    }).join("");
    const beats = Array.from({ length: cols }, (_, i) => `<i>${i + 1}</i>`).join("");
    const ok = logs.filter(r => r.status === "ok").length;
    const combo = ok * 3 + logs.filter(r => r.status === "retry").length;
    host.innerHTML = `<div class="rhythm-board">
      <div class="rhythm-top"><span><b>RHYTHM</b> · 请求节拍</span><span>${logs.length} beats · cache ${state.data.kpis.cache.toFixed(1)}%</span></div>
      <div class="rhythm-beats"><span></span><span class="rhythm-beatnums">${beats}</span></div>
      <div class="rhythm-main">
        <div class="rhythm-lanes">${laneRows}</div>
        <i class="rhythm-playhead"></i>
      </div>
      <div class="rhythm-foot">
        <span class="rhythm-judge">PERFECT <b>×${combo}</b></span>
        <span class="rhythm-hint">颜色 = Provider · 亮度 = Token · 红点 = 失败</span>
        <span class="rhythm-combo">COMBO <b>${combo}</b></span>
      </div>
    </div>`;
  }

  /* -------------------------------------------------------------- rings --- */
  // A half-year as a polar calendar: 7 concentric rings (Mon -> Sun) and one
  // column per week. Beads grow toward the rim so the dense inner rings stay
  // legible; color uses the same five-level scale as the heatmap.
  const RINGS_WEEKS = 26;

  function ringsLevel(day, max) {
    const pct = max > 0 ? (day.tokens || 0) / max : 0;
    return pct === 0 ? 0 : pct < .18 ? 1 : pct < .36 ? 2 : pct < .62 ? 3 : 4;
  }

  function ringsSideHtml(days) {
    const total = days.reduce((a, d) => a + (d.tokens || 0), 0);
    const active = days.filter(d => (d.tokens || 0) > 0).length;
    const best = days.reduce((a, d) => (d.tokens || 0) > (a.tokens || 0) ? d : a, days[0]);
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) { if ((days[i].tokens || 0) > 0) streak++; else break; }
    const last = days[days.length - 1];
    const months = new Map();
    days.forEach(d => {
      const key = d.date.slice(0, 7);
      months.set(key, (months.get(key) || 0) + (d.tokens || 0));
    });
    const maxMonth = Math.max(1, ...months.values());
    const monthRows = Array.from(months.entries()).slice(-6).map(([key, value]) =>
      `<div class="rings-mrow"><span>${Number(key.slice(5, 7))}月</span><i><em style="width:${Math.round(value / maxMonth * 100)}%"></em></i><b>${fmtTokens(value)}</b></div>`
    ).join("");
    return `<aside class="rings-side">
      <div class="rings-side-title"><span>HALF YEAR IN RINGS</span><span>${days.length} days</span></div>
      <div class="rings-stats">
        <div class="rings-stat"><span>总 Token</span><b>${fmtTokens(total)}</b><small>${active} 天有请求</small></div>
        <div class="rings-stat"><span>最忙一天</span><b>${fmtTokens(best.tokens)}</b><small>${esc(best.date)}</small></div>
        <div class="rings-stat"><span>今日</span><b>${fmtTokens(last.tokens)}</b><small>${last.calls || 0} 次调用</small></div>
        <div class="rings-stat"><span>连续活跃</span><b>${streak}</b><small>天</small></div>
      </div>
      <div class="rings-legend"><span>少</span><i data-level="0"></i><i data-level="1"></i><i data-level="2"></i><i data-level="3"></i><i data-level="4"></i><span>多</span><span class="rings-legend-note">点大小 = Token</span></div>
      <div class="rings-weeknote">内圈 周一 · 外圈 周日</div>
      <div class="rings-months">${monthRows}</div>
    </aside>`;
  }

  function renderRingsView(force) {
    const host = $("#view-rings");
    if (!host) return;
    const allDays = state.data.heatmap || [];
    if (!allDays.length) {
      host.innerHTML = `<div class="empty-state"><b>年轮等待第一圈</b><span>需要 Magpie 的日粒度历史；headless 网关会用 usage 序列回退。</span></div>`;
      host.dataset.sig = "";
      return;
    }
    const days = allDays.slice(-RINGS_WEEKS * 7);
    const sig = `${days.length}:${days[0].date}:${days[days.length - 1].date}`;
    const built = host.querySelector(".rings-svg");
    if (!force && built && host.dataset.sig === sig) {
      // Same window, only today's numbers moved: update one bead in place so
      // the reveal animation never restarts under a live counter.
      const max = host.__max || Math.max(1, ...days.map(d => d.tokens || 0));
      const last = days[days.length - 1];
      const pearl = host.querySelector(`.rings-pearl[data-i="${days.length - 1}"]`);
      if (pearl) {
        pearl.dataset.level = String(ringsLevel(last, max));
        pearl.dataset.tokens = String(last.tokens || 0);
        pearl.dataset.calls = String(last.calls || 0);
      }
      const side = host.querySelector(".rings-side");
      if (side) side.outerHTML = ringsSideHtml(days);
      return;
    }
    host.dataset.sig = sig;
    const max = Math.max(1, ...days.map(d => d.tokens || 0));
    host.__max = max;
    const CX = 260, CY = 260, R_MIN = 96, R_MAX = 234;
    const firstDow = (new Date(days[0].date + "T00:00:00").getDay() + 6) % 7; // Mon = 0
    const cols = Math.ceil((days.length + firstDow) / 7);
    const ringGap = (R_MAX - R_MIN) / 6;
    const angleStep = Math.PI * 2 / cols;
    const posOf = (i) => {
      const d = new Date(days[i].date + "T00:00:00");
      const dow = (d.getDay() + 6) % 7;
      const week = Math.floor((i + firstDow) / 7);
      const angle = week * angleStep - Math.PI / 2;
      const r = R_MIN + dow * ringGap;
      return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle), r, angle, week, dow };
    };
    const tracks = Array.from({ length: 7 }, (_, d) => {
      const r = R_MIN + d * ringGap;
      return `<circle class="rings-track" cx="${CX}" cy="${CY}" r="${r.toFixed(1)}"/>`;
    }).join("");
    const pearls = days.map((d, i) => {
      const p = posOf(i);
      const level = ringsLevel(d, max);
      const rad = (3.4 + (p.r - R_MIN) / (R_MAX - R_MIN) * 4.6).toFixed(2);
      const today = i === days.length - 1;
      return `<circle class="rings-pearl${today ? " today" : ""}" data-level="${level}" data-i="${i}" data-date="${esc(d.date)}" data-tokens="${d.tokens || 0}" data-calls="${d.calls || 0}" cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${rad}" style="--i:${p.week}"/>`;
    }).join("");
    const labels = [];
    let lastMonth = "";
    days.forEach((d, i) => {
      const key = d.date.slice(0, 7);
      if (key === lastMonth) return;
      lastMonth = key;
      const p = posOf(i);
      const lx = CX + (R_MAX + 17) * Math.cos(p.angle);
      const ly = CY + (R_MAX + 17) * Math.sin(p.angle);
      labels.push(`<text class="rings-month" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle">${Number(d.date.slice(5, 7))}月</text>`);
    });
    const total = days.reduce((a, d) => a + (d.tokens || 0), 0);
    host.classList.add("rings-anim");
    host.innerHTML = `<div class="rings-board">
      <div class="rings-stage">
        <svg class="rings-svg" viewBox="0 0 520 520" role="img" aria-label="${RINGS_WEEKS} 周 Token 年轮">
          <defs>
            <radialGradient id="rings-core" cx=".5" cy=".5" r=".5">
              <stop offset="0" stop-color="rgba(139,124,246,.22)"/>
              <stop offset="1" stop-color="rgba(139,124,246,0)"/>
            </radialGradient>
          </defs>
          <circle class="rings-glow" cx="260" cy="260" r="252" fill="url(#rings-core)"/>
          <g class="rings-tracks">${tracks}</g>
          <g class="rings-pearls">${pearls}</g>
          <g class="rings-labels">${labels.join("")}</g>
          <g class="rings-core">
            <circle cx="260" cy="260" r="56"/>
            <text x="260" y="253" class="rings-core-num">${fmtTokens(total)}</text>
            <text x="260" y="268" class="rings-core-sub">TOKENS · ${RINGS_WEEKS}W</text>
          </g>
        </svg>
        <div class="rings-tip" hidden></div>
      </div>
      ${ringsSideHtml(days)}
    </div>`;
    const svg = host.querySelector(".rings-svg");
    const tip = host.querySelector(".rings-tip");
    const stage = host.querySelector(".rings-stage");
    svg.addEventListener("pointerover", e => {
      const bead = e.target.closest(".rings-pearl");
      if (!bead) return;
      const d = days[Number(bead.dataset.i)];
      if (!d) return;
      tip.hidden = false;
      tip.innerHTML = `<b>${esc(d.date)}</b><span>${fmtTokens(d.tokens)} tokens · ${d.calls || 0} 次</span>`;
    });
    svg.addEventListener("pointermove", e => {
      const box = stage.getBoundingClientRect();
      const x = e.clientX - box.left, y = e.clientY - box.top;
      tip.style.left = clamp(x, 60, box.width - 60) + "px";
      tip.style.top = clamp(y, 30, box.height - 10) + "px";
    });
    svg.addEventListener("pointerleave", () => { tip.hidden = true; });
  }

  /* ----------------------------------------------------------- quota pace --- */
  // Burn-down + pace: one row per account × window. x is the history the
  // gateway kept, y is what is left of the window (0-100). The dotted tail
  // projects the recent burn rate to the reset, so the color of the line
  // answers "will this window run out before it resets?".
  const QUOTA_ROWS_MAX = 8;
  const QP_PAD = { l: 3, r: 3, t: 3, b: 3 };
  const QUOTA_RISK_TEXT = { green: "能撑到重置", amber: "余量告急", red: "会提前用完", flat: "无重置窗口" };

  function quotaMotionOn() {
    if (document.documentElement.dataset.motion === "off") return false;
    return !(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function fmtCountdown(ms) {
    if (ms == null) return "—";
    if (ms <= 0) return "重置中";
    const mins = Math.round(ms / 60000);
    if (mins < 60) return mins + "m";
    const h = Math.floor(mins / 60), m = mins % 60;
    if (h < 24) return h + "h" + (m ? pad2(m) : "");
    return Math.floor(h / 24) + "d" + (h % 24) + "h";
  }

  function quotaTimeLabel(ms, spanMs) {
    const d = new Date(ms);
    const hm = pad2(d.getHours()) + ":" + pad2(d.getMinutes());
    return spanMs > 172800000 ? `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${hm}` : hm;
  }

  // One row per account × window, riskiest first: the projection at the reset
  // is the sort key, and a line without a reset falls back to what is left.
  function quotaRows() {
    const rows = [];
    (state.data.quotaHistory || []).forEach(entry => {
      (entry.lines || []).forEach(line => {
        const pts = (line.points || []).filter(p => p && p.at && isFinite(Number(p.left)));
        if (pts.length < 2) return;
        const last = pts[pts.length - 1];
        const t0 = Date.parse(pts[0].start || pts[0].at);
        const resetMs = last.resetsAt ? Date.parse(last.resetsAt) : null;
        const endMs = resetMs != null && resetMs > t0 ? resetMs : Date.parse(last.at);
        // Burn rate over the window in flight only: averaging an earlier
        // reset's fresh 100% back in would flatten the slope.
        const winStart = Date.parse(last.start || pts[0].at);
        let from = pts[0];
        for (let i = pts.length - 1; i >= 0; i--) {
          if (winStart && Date.parse(pts[i].at) < winStart) break;
          from = pts[i];
        }
        const hours = (Date.parse(last.at) - Date.parse(from.at)) / 3600000;
        const rate = hours > 0.1 ? Math.max(0, (from.left - last.left) / hours) : 0;
        const toResetH = resetMs != null ? Math.max(0, (resetMs - Date.parse(last.at)) / 3600000) : null;
        const projected = toResetH != null ? last.left - rate * toResetH : null;
        const risk = projected == null ? "flat" : projected < 0 ? "red" : projected < 20 ? "amber" : "green";
        rows.push({
          entry, line, pts, last, t0, endMs, resetMs, rate, projected, risk,
          resetIn: resetMs != null ? resetMs - Date.now() : null,
          meta: D.providerMeta(entry.provider),
          sortKey: projected == null ? last.left : projected
        });
      });
    });
    return rows.sort((a, b) => a.sortKey - b.sortKey).slice(0, QUOTA_ROWS_MAX);
  }

  // Drawn in real pixels (viewBox === element box) so strokes, dashes and the
  // end dot keep their weight whatever the row width is.
  function drawQuotaRow(row, svg, w, h) {
    const span = Math.max(1, row.endMs - row.t0);
    if (!(w > 60) || !(h > 12)) return;
    const px = (ms) => QP_PAD.l + (ms - row.t0) / span * (w - QP_PAD.l - QP_PAD.r);
    const py = (left) => QP_PAD.t + (1 - clamp(left, 0, 100) / 100) * (h - QP_PAD.t - QP_PAD.b);
    const right = (w - QP_PAD.r).toFixed(1);
    const bottom = (h - QP_PAD.b).toFixed(1);
    const grid = [0, 50, 100].map(v =>
      `<line class="qp-grid" x1="${QP_PAD.l}" y1="${py(v).toFixed(1)}" x2="${right}" y2="${py(v).toFixed(1)}"/>`).join("");
    const threshold = `<line class="qp-thresh" x1="${QP_PAD.l}" y1="${py(20).toFixed(1)}" x2="${right}" y2="${py(20).toFixed(1)}"/>`;
    const resetX = px(row.endMs).toFixed(1);
    const marker = row.resetMs != null
      ? `<line class="qp-reset" x1="${resetX}" y1="${QP_PAD.t}" x2="${resetX}" y2="${bottom}"/>`
      : "";
    const lastX = px(Date.parse(row.last.at)).toFixed(1);
    const lastY = py(row.last.left).toFixed(1);
    const projection = row.projected == null ? ""
      : `<line class="qp-proj" x1="${lastX}" y1="${lastY}" x2="${resetX}" y2="${py(clamp(row.projected, 0, 100)).toFixed(1)}"/>`;
    const d = row.pts.map((p, i) =>
      (i ? "L" : "M") + px(Date.parse(p.at)).toFixed(1) + " " + py(p.left).toFixed(1)).join(" ");
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.innerHTML = `${grid}${threshold}${marker}${projection}<path class="qp-line" d="${d}"/><circle class="qp-dot" cx="${lastX}" cy="${lastY}" r="2"/>`;
    const path = svg.querySelector(".qp-line");
    if (path && quotaMotionOn()) {
      try {
        const len = path.getTotalLength();
        path.style.strokeDasharray = String(len);
        path.style.strokeDashoffset = String(len);
        requestAnimationFrame(() => {
          path.style.transition = "stroke-dashoffset .85s cubic-bezier(.4,0,.2,1)";
          path.style.strokeDashoffset = "0";
        });
      } catch (_) {}
    }
  }

  function renderQuotaView(force) {
    const host = $("#view-quota");
    if (!host) return;
    const rows = quotaRows();
    if (!rows.length) {
      host.dataset.sig = "";
      host.innerHTML = `<div class="empty-state qp-empty">
        <b>额度燃尽等待历史</b>
        <span>曲线来自 <code>/v1/magpie/quotas/history</code>：每个账号 × 窗口的 remaining 序列。</span>
        <span>GUI / tray 网关若不提供该接口（或只保留当前额度），这里会保持为空。</span>
      </div>`;
      return;
    }
    const sig = rows.map(r => `${r.entry.provider}|${r.entry.user}|${r.line.name}:${r.pts.length}:${r.last.at}:${r.last.left}`).join("~");
    if (!force && host.dataset.sig === sig && host.innerHTML) return;
    host.dataset.sig = sig;

    const accounts = new Set(rows.map(r => r.entry.user || r.entry.name)).size;
    const atRisk = rows.filter(r => r.risk === "red" || r.risk === "amber").length;
    const withReset = rows.filter(r => r.resetIn != null).sort((a, b) => a.resetIn - b.resetIn);
    const soon = withReset[0] || null;

    const rowHtml = rows.map((r, i) => {
      const label = r.entry.name || r.meta.name;
      const proj = r.projected == null ? "—" : Math.round(r.projected) + "%";
      return `<div class="qp-row ${r.risk}" data-ri="${i}" tabindex="0" role="button" title="${esc(label)} · ${esc(r.line.name)} · ${esc(QUOTA_RISK_TEXT[r.risk])}">
        <span class="qp-id"><img src="${providerIcon(r.entry.provider)}" alt=""><span><b>${esc(label)}</b><small>${esc(r.line.name)} · ${esc(r.meta.name)}</small></span></span>
        <span class="qp-plot"><svg class="qp-svg" preserveAspectRatio="none" aria-hidden="true"></svg></span>
        <span class="qp-left"><b>${Math.round(r.last.left)}%</b><small>→ ${esc(proj)}</small></span>
      </div>`;
    }).join("");

    const itemHtml = rows.map((r, i) => {
      const label = r.entry.name || r.meta.name;
      const proj = r.projected == null ? "—" : Math.round(r.projected) + "%";
      return `<button class="qp-item ${r.risk}" data-ri="${i}" title="${esc(label)} · ${esc(r.line.name)} · ${r.rate.toFixed(1)}%/h · ${esc(QUOTA_RISK_TEXT[r.risk])}">
        <img src="${providerIcon(r.entry.provider)}" alt="">
        <span class="qp-item-copy"><b>${esc(label)}</b><small>${esc(r.line.name)} · ${r.rate.toFixed(1)}%/h → ${esc(proj)}</small></span>
        <span class="qp-item-num"><b>${Math.round(r.last.left)}%</b></span>
        <span class="qp-item-cd">${esc(fmtCountdown(r.resetIn))}</span>
      </button>`;
    }).join("");

    host.innerHTML = `<div class="qp-board">
      <div class="qp-main">
        <div class="qp-head"><span><b>BURN-DOWN</b> · 额度燃尽</span><span>${rows.length} 个窗口 · 余量 100 → 0</span></div>
        <div class="qp-rows">${rowHtml}</div>
      </div>
      <aside class="qp-side">
        <div class="qp-side-title"><span>QUOTA PACE</span><span>按风险排序</span></div>
        <div class="qp-summary">
          <span>窗口 <b>${rows.length}</b> · 账号 <b>${accounts}</b></span>
          <span>有风险 <b>${atRisk}</b></span>
          <span title="${soon ? esc(soon.entry.name || soon.meta.name) + " · " + esc(soon.line.name) : "没有带重置的窗口"}">最近重置 <b>${esc(fmtCountdown(soon ? soon.resetIn : null))}</b></span>
        </div>
        <div class="qp-list">${itemHtml}</div>
        <div class="qp-legend">
          <span><i class="green"></i>能撑到重置</span>
          <span><i class="amber"></i>≤20%</span>
          <span><i class="red"></i>提前用尽</span>
          <span class="qp-legend-note">虚线 = 按最近配速外推 · 竖虚线 = 重置点</span>
        </div>
      </aside>
    </div>
    <div class="qp-tip" hidden></div>`;

    const tip = $(".qp-tip", host);
    const applySel = (ri) => {
      host.dataset.sel = ri == null ? "" : String(ri);
      $$(".qp-row", host).forEach(el => el.classList.toggle("sel", el.dataset.ri === host.dataset.sel));
      $$(".qp-item", host).forEach(el => el.classList.toggle("sel", el.dataset.ri === host.dataset.sel));
    };
    const select = (ri) => applySel(host.dataset.sel === String(ri) ? null : ri);

    $$(".qp-plot", host).forEach(plot => {
      const svg = $(".qp-svg", plot);
      const ri = Number(plot.parentElement.dataset.ri);
      const width = plot.clientWidth || 600;
      plot.dataset.w = String(width);
      drawQuotaRow(rows[ri], svg, width, plot.clientHeight || 26);
      plot.addEventListener("pointermove", e => {
        const row = rows[ri];
        const box = plot.getBoundingClientRect();
        const span = Math.max(1, row.endMs - row.t0);
        const x = clamp(e.clientX - box.left, QP_PAD.l, box.width - QP_PAD.r);
        const at = row.t0 + (x - QP_PAD.l) / Math.max(1, box.width - QP_PAD.l - QP_PAD.r) * span;
        let nearest = row.pts[0], dist = Infinity;
        row.pts.forEach(p => {
          const d = Math.abs(Date.parse(p.at) - at);
          if (d < dist) { dist = d; nearest = p; }
        });
        const hostBox = host.getBoundingClientRect();
        tip.hidden = false;
        tip.innerHTML = `<b>${esc(quotaTimeLabel(Date.parse(nearest.at), span))}</b><span>剩 ${nearest.left.toFixed(1)}% · ${esc(row.line.name)} · ${esc(row.entry.name || row.meta.name)}</span>`;
        // Keep the tip inside the view: above the cursor, flipping below when
        // the row is too close to the top.
        const tw = tip.offsetWidth, th = tip.offsetHeight;
        const cx = e.clientX - hostBox.left, cy = e.clientY - hostBox.top;
        const top = cy - th - 8 < 4 ? cy + 10 : cy - th - 8;
        tip.style.left = clamp(cx - tw / 2, 4, Math.max(4, hostBox.width - tw - 4)) + "px";
        tip.style.top = clamp(top, 4, Math.max(4, hostBox.height - th - 4)) + "px";
      });
      plot.addEventListener("pointerleave", () => { tip.hidden = true; });
    });
    $$(".qp-row", host).forEach(el => {
      el.addEventListener("click", () => select(el.dataset.ri));
      el.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(el.dataset.ri); }
      });
    });
    $$(".qp-item", host).forEach(el => el.addEventListener("click", () => select(el.dataset.ri)));
    if (host.dataset.sel) applySel(host.dataset.sel);
  }

  function setHeroMode(mode) {
    state.heroMode = mode;
    try {
      const h = JSON.parse(localStorage.getItem("magpie.viewHeat") || "{}");
      h[mode] = (h[mode] || 0) + 1;
      localStorage.setItem("magpie.viewHeat", JSON.stringify(h));
    } catch (_) {}
    const custom = viewRegistry()[mode];
    const meta = viewMeta(mode) || { title: "实时路由", eyebrow: "LIVE ROUTING", group: "实时", icon: "i-route" };
    $("#hero-title").textContent = meta.title;
    const eb = $(".hero-head .eyebrow");
    if (eb) eb.innerHTML = `<span class="live-ring"></span> ${meta.eyebrow}`;
    const vpTitle = $("#vp-title"), vpEyebrow = $("#vp-eyebrow"), vpIcon = $("#vp-ic");
    if (vpTitle) vpTitle.textContent = meta.title;
    if (vpEyebrow) vpEyebrow.textContent = meta.eyebrow;
    if (vpIcon) vpIcon.innerHTML = `<svg><use href="#${meta.icon}"/></svg>`;
    const hero = $(".hero");
    if (hero) {
      hero.style.setProperty("--hero-accent", GROUP_COLORS[meta.group] || "#8b7cf6");
      hero.dataset.mode = mode;
    }
    $$(".view-menu .vm-item").forEach(b => {
      const on = b.dataset.hero === mode;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", String(on));
    });
    $$("#rail-favs .fav-btn").forEach(b => b.classList.toggle("active", b.dataset.favView === mode));
    // Scroll-position memory: stash the outgoing scrollable view's scrollTop
    // and restore it when the mode comes back — long lists don't reset.
    const prev = $(".stage-view:not([hidden])");
    if (prev) {
      const sc = prev.scrollHeight > prev.clientHeight ? prev : [...prev.children].find(k => k.scrollHeight > k.clientHeight);
      if (sc && sc.scrollTop > 0) {
        state.viewScroll = state.viewScroll || {};
        state.viewScroll[prev.id.replace("view-", "")] = sc.scrollTop;
      }
    }
    $$(".stage-view").forEach(v => { v.hidden = true; });
    const host = $("#view-" + mode);
    if (host) {
      host.hidden = false;
      host.classList.remove("view-enter");
      void host.offsetWidth;
      host.classList.add("view-enter");
      setTimeout(() => host.classList.remove("view-enter"), 340);
    }
    if (host && state.viewScroll && state.viewScroll[mode] != null) {
      requestAnimationFrame(() => {
        const sc = host.scrollHeight > host.clientHeight ? host : [...host.children].find(k => k.scrollHeight > k.clientHeight);
        (sc || host).scrollTop = state.viewScroll[mode];
      });
    }
    if (custom) { renderCustomView(mode, true); return; }
    if (mode === "route") { requestAnimationFrame(drawWires); ensureFlightLoop(); }
    if (mode === "radar") renderRadarView(true);
    if (mode === "loom") renderLoomView(true);
    if (mode === "rhythm") renderRhythmView(true);
    if (mode === "rings") renderRingsView(true);
    if (mode === "quota") renderQuotaView(true);
  }

  function sessionCard(s) {
    const meta = D.agentMeta(s.agent);
    const sel = s.id === state.selectedSession;
    const age = Date.now() - s.startedAt;
    const st = STATUS_CLASS[s.status] || "";
    const tps = s.tps ? `${s.tps.toFixed(1)} tok/s` : "— tok/s";
    const subs = (s.subagents || []).map(sub => `<div class="subagent-row"><b>${esc(sub.name)}</b><span>${esc(STATUS_TEXT[sub.status] || sub.status)}</span><span class="sub-model">${esc(sub.model)} · ${sub.tps ? sub.tps.toFixed(0) : "—"} TPS</span></div>`).join("");
    return `<article class="session-card${sel ? " selected" : ""}${s.status === "streaming" ? " streaming" : ""}" role="button" aria-selected="${sel}" aria-label="${esc(s.title)} · ${esc(s.model)} · ${esc(STATUS_TEXT[s.status] || s.status)}" data-session="${esc(s.id)}" style="--s-c:${meta.color}" tabindex="0">
      <div class="session-top">
        <span class="session-agent"><img src="${agentIcon(s.agent)}" alt=""></span>
        <span class="session-title" title="${esc(s.title)}">${esc(s.title)}</span>
        <span class="session-state ${st}">${STATUS_TEXT[s.status] || s.status}</span>
      </div>
      <div class="session-meta"><span class="session-model">${esc(s.model)}</span><span class="session-route">→ ${s.group === "最近完成" ? "最近完成" : "group/" + esc(s.group || "direct")}</span></div>
      <div class="session-bottom">
        <span><b>${s.tokens ? fmtTokens(s.tokens) : "—"}</b> TOK</span>
        <span>${fmtAge(age)}</span>
        ${s.fallbacks ? `<span class="chip amber">${s.fallbacks} 改道</span>` : ""}
        <span class="tps ${tpsClass(s.tps)}">${tps}</span>
      </div>
      ${subs}
    </article>`;
  }

  function matchFilter(s) {
    if (!state.filter) return true;
    return state.filter.type === "agent" ? s.agent === state.filter.value : s.provider === state.filter.value;
  }

  function renderSessions() {
    const list = visibleSessions();
    const live = activeSessions();
    const host = $("#session-list");
    // Keep the clear-filter chip honest on every render pass, even the ones
    // that short-circuit below when the session signature is unchanged.
    const chip = $("#filter-chip");
    if (chip) {
      const on = !!state.filter;
      chip.hidden = !on;
      if (on) {
        const label = state.filter.type === "agent" ? D.agentMeta(state.filter.value).name
          : state.filter.type === "provider" ? D.providerMeta(state.filter.value).name : String(state.filter.value);
        $("#filter-chip-label").textContent = label;
      }
    }
    const extra = state.sessionTab === "active"
      ? state.data.recent.filter(s => !list.some(x => x.id === s.id) && matchFilter(s)).slice(0, 3)
      : [];
    // Rebuild only when the rendered set changed; the age text refreshes on
    // the 30-second bucket so a streaming card never looks frozen.
    const sig = [state.sessionTab,
      state.filter ? state.filter.type + ":" + state.filter.value : "",
      state.selectedSession || "", live.length, Math.floor(Date.now() / 30000),
      list.concat(extra).map(s => [s.id, s.status, s.title, s.model, s.provider, s.group,
        s.tokens, s.tps && s.tps.toFixed(1), s.fallbacks, s.startedAt, (s.subagents || []).length].join(",")).join("\u0001")
    ].join("\u0002");
    if (host.dataset.sig === sig) return;
    host.dataset.sig = sig;
    $("#active-count").textContent = String(live.length);
    const scroll = host.scrollTop;
    host.dataset.tab = state.sessionTab;
    let html = list.map(sessionCard).join("");
    if (state.sessionTab === "active") {
      // A quiet live gateway can have two active sessions; showing the last
      // completed ones keeps the rail informative instead of half empty.
      const seen = new Set(list.map(s => s.id));
      const recent = state.data.recent.filter(s => !seen.has(s.id) && matchFilter(s)).slice(0, 3);
      if (recent.length) html += `<div class="list-divider"><span>最近</span></div>` + recent.map(sessionCard).join("");
    }
    if (!html) {
      html = `<div class="empty-row">没有匹配的会话</div>`;
    } else if (state.sessionTab === "active" && list.length < 3) {
      html += `<div class="session-ghost"><span class="radar"></span><b>等待新的请求</b><small>trace 每秒刷新 · 完成后会留在这里</small></div>`;
    }
    host.innerHTML = html;
    host.scrollTop = scroll;
  }

  function renderQuotas() {
    const list = state.data.quotas;
    const host = $("#quota-list");
    const sig = [state.mode, Math.round(host.clientWidth), window.innerWidth,
      list.map(q => [q.provider, q.name, q.user, q.plan, q.balance,
        (q.windows || []).map(w => [w.name, Math.round(w.used || 0), w.resetsIn == null ? "" : Math.round(w.resetsIn / 5) * 5].join(":")).join("|")
      ].join(",")).join("\u0001")
    ].join("\u0002");
    if (host.dataset.sig === sig) return;
    host.dataset.sig = sig;
    // Few accounts should not leave an empty third column; four read well
    // as a 2×2, five or six as the CSS 3-column grid.
    const qw = host.clientWidth || 800;
    const cap = Math.max(220, Math.min(380, (qw - 8) / 2));
    const one = Math.max(240, Math.min(620, qw));
    host.style.gridTemplateColumns = window.innerWidth <= 680
      ? "minmax(0, 1fr)"
      : list.length <= 2
        ? `minmax(0, ${one.toFixed(0)}px)`
        : list.length <= 4
          ? `repeat(2, minmax(0, ${cap.toFixed(0)}px))`
          : "";
    host.classList.toggle("few", list.length <= 4);
    host.innerHTML = list.map(q => {
      const meta = D.providerMeta(q.provider);
      const w = q.windows[0] || { name: "额度", used: 0, resetsIn: null };
      const used = Math.round(w.used || 0);
      const color = used >= 88 ? "var(--red)" : used >= 70 ? "var(--amber)" : meta.color;
      const detail = q.windows.map(win => `${win.name} ${Math.round(win.used || 0)}%`).join(" · ");
      const value = q.balance ? q.balance : used + "%";
      const reset = q.balance ? "余额" : fmtReset(w.resetsIn);
      return `<div class="quota-item goto" role="button" tabindex="0" aria-label="${esc(q.name)} · ${esc(detail)} · 点击查看烧速" data-goto="burn" data-prov="${esc(q.provider)}" style="--q-c:${color}" title="${esc(q.name)} · ${esc(q.user || "")} · ${esc(q.plan || "")} · ${esc(detail)} · 点击看烧速">
        <span class="quota-ring" style="--used:${clamp(used, 0, 100)}"><img src="${providerIcon(q.provider)}" alt=""></span>
        <span class="quota-copy">
          <span class="quota-top"><b>${esc(q.name)}</b><em>${esc(q.plan || "")}</em></span>
          <span class="quota-bar ${used >= 88 ? "crit" : used >= 70 ? "hot" : ""}"><i style="width:${clamp(used, 0, 100)}%;background:${color}"></i></span>
          <span class="quota-sub"><span>${esc(q.user || "—")}</span><span>${esc(w.name)} · ${esc(reset)}</span></span>
        </span>
        <span class="quota-pct" style="color:${color}">${esc(value)}</span>
      </div>`;
    }).join("");
    $("#quota-stamp").textContent = state.mode === "live" ? "kept=1" : "刚刚";
  }

  function renderTrend() {
    const series = (state.view && state.view.series) || state.data.series;
    const svg = $("#trend-chart");
    const wrap = $("#trend-wrap");
    if (!series.length) {
      svg.innerHTML = `<text x="50%" y="46%" text-anchor="middle" fill="var(--faint)" font-size="10">暂无用量数据</text>`;
      $("#trend-summary").textContent = "—";
      return;
    }
    const W = Math.max(300, wrap.clientWidth || 520);
    const H = Math.max(140, Math.round(wrap.clientHeight || 196));
    const pad = { l: 36, r: 8, t: 12, b: 22 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const metric = state.trendMetric;
    const max = Math.max(1, ...series.map(p => metric === "tokens" ? p.tokens : p.cost));
    const x = i => pad.l + (series.length <= 1 ? iw / 2 : (i / (series.length - 1)) * iw);
    const y = v => pad.t + ih - (v / max) * ih;

    let out = `<defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".30"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>`;
    for (let i = 0; i <= 4; i++) {
      const gy = pad.t + (i / 4) * ih;
      out += `<line class="grid-line" x1="${pad.l}" y1="${gy}" x2="${W - pad.r}" y2="${gy}"/>`;
      const val = max * (1 - i / 4);
      const label = metric === "tokens" ? fmtTokens(val) : fmtMoney(val, val < 10 ? 1 : 0);
      out += `<text class="axis-label" x="${pad.l - 6}" y="${gy + 3}" text-anchor="end">${esc(label)}</text>`;
    }
    // 24h: every 6 hours; 7d: every 2 days; 30d: about 5 labels.
    const step = series.length === 24 ? 6 : Math.max(1, Math.ceil(series.length / 5));
    const idxs = [];
    for (let i = 0; i < series.length; i += step) idxs.push(i);
    if (idxs[idxs.length - 1] !== series.length - 1) idxs.push(series.length - 1);
    idxs.forEach(i => {
      const p = series[i];
      const label = state.range === "today" ? (i === series.length - 1 ? "现在" : pad2(i) + ":00") : (p.label || "");
      out += `<text class="axis-label" x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? "start" : i === series.length - 1 ? "end" : "middle"}">${esc(label)}</text>`;
    });

    const lineD = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(metric === "tokens" ? p.tokens : p.cost).toFixed(1)}`).join(" ");
    if (series.length >= 3) {
      const areaD = lineD + ` L${x(series.length - 1).toFixed(1)} ${pad.t + ih} L${x(0).toFixed(1)} ${pad.t + ih} Z`;
      out += `<path class="area" d="${areaD}"/>`;
    }
    out += `<path class="line" d="${lineD}"/>`;
    if (series.length < 3) {
      // A snapshot with one or two buckets is a line, not a filled wedge.
      series.forEach((p, i) => {
        out += `<circle class="hover-dot" cx="${x(i)}" cy="${y(metric === "tokens" ? p.tokens : p.cost)}" r="3.2"/>`;
      });
    }

    // secondary metric: costs on token view, tokens on cost view
    const secMax = Math.max(1, ...series.map(p => metric === "tokens" ? p.cost : p.tokens));
    const secD = series.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${(pad.t + ih - ((metric === "tokens" ? p.cost : p.tokens) / secMax) * ih * 0.82).toFixed(1)}`).join(" ");
    out += `<path class="cost-line" d="${secD}"/>`;

    out += `<g id="trend-hover" style="display:none"><line class="hover-line" y1="${pad.t}" y2="${pad.t + ih}"/><circle class="hover-dot" r="3.2"/></g>`;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = out;

    const hover = svg.querySelector("#trend-hover");
    const tip = $("#trend-tip");
    svg.onmousemove = (ev) => {
      const rect = svg.getBoundingClientRect();
      const px = (ev.clientX - rect.left) / rect.width * W;
      const i = clamp(Math.round((px - pad.l) / Math.max(1, iw) * (series.length - 1)), 0, series.length - 1);
      const p = series[i];
      hover.style.display = "";
      hover.querySelector("line").setAttribute("x1", x(i));
      hover.querySelector("line").setAttribute("x2", x(i));
      hover.querySelector("circle").setAttribute("cx", x(i));
      hover.querySelector("circle").setAttribute("cy", y(metric === "tokens" ? p.tokens : p.cost));
      const label = state.range === "today" ? pad2(i) + ":00" : (p.date || p.label || "");
      tip.hidden = false;
      tip.innerHTML = `<div>${esc(label)}</div><div>Token <b>${fmtTokens(p.tokens)}</b></div><div>费用 <b>${fmtMoney(p.cost)}</b></div>`;
      const left = (x(i) / W) * rect.width;
      tip.style.left = clamp(left, 52, rect.width - 52) + "px";
      tip.style.top = Math.max(28, (y(metric === "tokens" ? p.tokens : p.cost) / H) * rect.height - 10) + "px";
    };
    svg.onmouseleave = () => { hover.style.display = "none"; tip.hidden = true; };

    const total = series.reduce((a, b) => a + (metric === "tokens" ? b.tokens : b.cost), 0);
    $("#trend-summary").textContent = metric === "tokens"
      ? `${fmtTokens(total)} tokens · ${fmtMoney(series.reduce((a, b) => a + b.cost, 0))}`
      : `${fmtMoney(total)} · ${fmtTokens(series.reduce((a, b) => a + b.tokens, 0))} tokens`;
    const title = $("#trend-title");
    title.textContent = state.range === "today" ? "24 小时用量" : state.range === "7d" ? "7 天用量" : "30 天用量";
    $$("#trend-seg button").forEach(b => b.classList.toggle("active", b.dataset.metric === metric));
  }

  function renderDonut() {
    const models = state.data.models;
    const total = models.reduce((a, b) => a + b.tokens, 0) || 1;
    const svg = $("#donut");
    const R = 52, C = 2 * Math.PI * R;
    let offset = 0;
    let out = `<circle class="track" cx="70" cy="70" r="${R}"/>`;
    models.forEach((m, i) => {
      const frac = m.tokens / total;
      const len = Math.max(0, frac * C - 2);
      const color = D.MODEL_COLORS[i % D.MODEL_COLORS.length];
      out += `<circle class="seg" cx="70" cy="70" r="${R}" stroke="${color}" stroke-dasharray="${len.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}"/>`;
      offset += frac * C;
    });
    svg.innerHTML = out;
    $("#donut-total").textContent = fmtTokens(total);
    $("#donut-legend").innerHTML = models.map((m, i) => {
      const color = D.MODEL_COLORS[i % D.MODEL_COLORS.length];
      return `<div class="donut-legend-row"><i style="background:${color}"></i><span title="${esc(m.name)}">${esc(m.name)}</span><b>${Math.round(m.tokens / total * 100)}%</b></div>`;
    }).join("");
  }

  function renderHeatmap() {
    const allDays = state.data.heatmap;
    const weeks = window.innerWidth < 680 ? 13 : window.innerWidth < 1700 ? 26 : 53;
    const days = allDays.slice(-weeks * 7);
    if (!days.length) {
      $("#heat-months").innerHTML = "";
      $("#heat-grid").innerHTML = `<div class="empty-state"><b>等待历史数据</b><span>热力图读取 Magpie 桌面版的 <code>/api/usage/heatmap</code>；headless 网关没有此路由。</span></div>`;
      $("#heat-summary").textContent = "—";
      return;
    }
    const max = Math.max(1, ...days.map(d => d.tokens));
    const shownWeeks = Math.ceil(days.length / 7);
    const todayKey = new Date().toISOString().slice(0, 10);
    const grid = $("#heat-grid");
    const sig = `${days.length}:${window.innerWidth}:${days[0].date}:${todayKey}`;
    // A live poll usually only moves today's cell. Rebuild 371 divs only when
    // the calendar itself changes; otherwise patch levels/title in place.
    if (grid.dataset.sig === sig && grid.children.length === days.length) {
      const cells = grid.children;
      days.forEach((d, i) => {
        const pct = d.tokens / max;
        const level = String(pct === 0 ? 0 : pct < .18 ? 1 : pct < .36 ? 2 : pct < .62 ? 3 : 4);
        if (cells[i].dataset.level !== level) cells[i].dataset.level = level;
        if (i === days.length - 1) cells[i].title = `${d.date} · ${fmtTokens(d.tokens)} tokens · ${d.calls || 0} 次调用`;
      });
      const total = days.reduce((a, b) => a + b.tokens, 0);
      $("#heat-summary").textContent = `${shownWeeks} 周 · ${fmtTokens(total)} tokens`;
      return;
    }
    grid.dataset.sig = sig;
    const months = [];
    let lastMonth = -1;
    for (let w = 0; w < shownWeeks; w++) {
      const d = new Date(days[w * 7].date + "T00:00:00");
      const month = d.getMonth();
      months.push(`<span>${month !== lastMonth ? (month + 1) + "月" : ""}</span>`);
      lastMonth = month;
    }
    $("#heat-months").style.gridTemplateColumns = `repeat(${shownWeeks}, minmax(0, 1fr))`;
    $("#heat-months").innerHTML = months.join("");
    $("#heat-grid").innerHTML = days.map(d => {
      const pct = d.tokens / max;
      const level = pct === 0 ? 0 : pct < .18 ? 1 : pct < .36 ? 2 : pct < .62 ? 3 : 4;
      const isToday = d.date === new Date().toISOString().slice(0, 10);
      return `<div class="heat-cell${isToday ? " today" : ""}" data-level="${level}" title="${d.date} · ${fmtTokens(d.tokens)} tokens · ${d.calls || 0} 次调用"></div>`;
    }).join("");
    const total = days.reduce((a, b) => a + b.tokens, 0);
    $("#heat-summary").textContent = `${shownWeeks} 周 · ${fmtTokens(total)} tokens`;
    const stamp = document.querySelector(".heat-card .stamp");
    if (stamp) stamp.textContent = shownWeeks + " 周";
  }

  function renderLogs() {
    const q = state.logQuery.toLowerCase();
    const logs = state.data.logs.filter(r => {
      if (!q) return true;
      return [r.session, r.model, r.provider, r.agent, (r.at || "").slice(0, 10)].join(" ").toLowerCase().includes(q);
    }).slice(0, 22);
    const host = $("#log-body");
    const sig = q + "\u0002" + logs.map(r => [r.at, r.status, r.model, r.provider, r.agent, r.session,
      r.tokens, r.ttft, r.tps == null ? "" : r.tps.toFixed(0), r.cost].join(",")).join("\u0001");
    if (host.dataset.sig === sig) return;
    host.dataset.sig = sig;
    host.innerHTML = logs.map(r => {
      const meta = D.agentMeta(r.agent);
      const dt = new Date(r.at);
      const time = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:${pad2(dt.getSeconds())}`;
      const pm = D.providerMeta(r.provider);
      return `<tr class="log-tr" data-idx="${logs.indexOf(r)}" role="button" aria-expanded="false">
        <td><span class="t">${time}</span></td>
        <td><span class="log-agent"><img src="${agentIcon(r.agent)}" alt=""><span><b>${esc(meta.name)}</b><small>${esc(r.session || "—")}</small></span></span></td>
        <td><span class="route-cell"><img src="${providerIcon(r.provider)}" alt=""><code>${esc(r.model)}</code><span class="arrow">·</span><span style="font-size:8px;color:var(--faint)">${esc(pm.name)}</span></span></td>
        <td><span class="status ${STATUS_LOG[r.status] || ""}"><i></i>${r.status === "ok" ? "200" : r.status === "run" ? "流式" : r.status === "retry" ? "改道" : "错误"}</span></td>
        <td class="num">${fmtTokens(r.tokens)}</td>
        <td class="num">${r.ttft ? r.ttft + "ms" : "—"}</td>
        <td class="num">${r.tps ? r.tps.toFixed(0) : "—"}</td>
        <td class="num money">${r.cost != null ? fmtMoney(r.cost) : "—"}</td>
      </tr>`;
    }).join("") || `<tr><td colspan="8" class="empty-row">没有匹配的请求</td></tr>`;
  }

  // Click a log row → inline detail strip: session / provider / model / TTFT /
  // TPS / tokens / cost, plus a route-try pill trail if the log carried one.
  let logExpandBound = false;
  function bindLogExpand() {
    const body = $("#log-body");
    if (!body || logExpandBound) return;
    logExpandBound = true;
    body.addEventListener("click", e => {
      const tr = e.target.closest(".log-tr");
      if (!tr) return;
      const was = tr.classList.contains("open");
      body.querySelectorAll(".log-detail").forEach(d => d.remove());
      body.querySelectorAll(".log-tr").forEach(x => { x.classList.remove("open"); x.setAttribute("aria-expanded", "false"); });
      if (was) return;
      tr.classList.add("open");
      tr.setAttribute("aria-expanded", "true");
      const logs = state.data.logs.filter(r => {
        const q = state.logQuery.toLowerCase();
        if (!q) return true;
        return [r.session, r.model, r.provider, r.agent, (r.at || "").slice(0, 10)].join(" ").toLowerCase().includes(q);
      }).slice(0, 22);
      const r = logs[+tr.dataset.idx];
      if (!r) return;
      const meta = D.agentMeta(r.agent);
      const pm = D.providerMeta(r.provider);
      const tries = (r.tries || []).map(t => {
        const tp = D.providerMeta(t.provider);
        const cls = t.state === "ok" ? "ok" : t.state === "fail" ? "fail" : "pending";
        return `<span class="try-pill ${cls}" title="${esc(t.why || "")}"><img src="${providerIcon(t.provider)}" alt="">${esc((t.model || "").split("/").pop())}${t.state === "fail" ? " ✕" : t.state === "pending" ? " …" : ""}</span>`;
      }).join("");
      const det = document.createElement("tr");
      det.className = "log-detail";
      det.innerHTML = `<td colspan="8"><div class="ld-strip">
        <span><b>${esc(meta.name)}</b>${r.session ? ` · ${esc(r.session)}` : ""}</span>
        <span>${esc(pm.name)} / ${esc(r.model)}</span>
        <span>ttft ${r.ttft != null ? r.ttft + "ms" : "—"} · tps ${r.tps != null ? r.tps.toFixed(1) : "—"}</span>
        <span>${fmtTokens(r.tokens)} tok · ${r.cost != null ? fmtMoney(r.cost) : "—"}</span>
        ${tries ? `<span class="ld-tries">${tries}</span>` : ""}
      </div></td>`;
      tr.after(det);
    });
    body.addEventListener("contextmenu", e => {
      const tr = e.target.closest(".log-tr");
      if (!tr) return;
      e.preventDefault();
      const logs = state.data.logs.filter(r => {
        const q = state.logQuery.toLowerCase();
        if (!q) return true;
        return [r.session, r.model, r.provider, r.agent, (r.at || "").slice(0, 10)].join(" ").toLowerCase().includes(q);
      }).slice(0, 22);
      const r = logs[+tr.dataset.idx];
      if (!r) return;
      const csv = [r.at, r.session || "", r.agent, r.provider, r.model, r.status, r.tokens, r.ttft || "", r.tps || "", r.cost || ""].join(",");
      navigator.clipboard?.writeText(csv).then(() => toast("该行已复制为 CSV"));
    });
    body.addEventListener("dblclick", e => {
      const tr = e.target.closest(".log-tr");
      if (!tr) return;
      const logs = state.data.logs.filter(r => {
        const q = state.logQuery.toLowerCase();
        if (!q) return true;
        return [r.session, r.model, r.provider, r.agent, (r.at || "").slice(0, 10)].join(" ").toLowerCase().includes(q);
      }).slice(0, 22);
      const r = logs[+tr.dataset.idx];
      if (!r) return;
      navigator.clipboard?.writeText(JSON.stringify(r, null, 2)).then(() => toast("该行已复制为 JSON"));
    });
    // ↑↓/Enter on the log table — same pattern as burn rows.
    body.tabIndex = 0;
    let logKb = -1;
    body.addEventListener("keydown", e => {
      const rows = [...body.querySelectorAll(".log-tr")];
      if (!rows.length) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        logKb = e.key === "ArrowDown" ? Math.min(rows.length - 1, logKb + 1) : Math.max(0, logKb - 1);
        rows.forEach((r, i) => r.classList.toggle("kb-focus", i === logKb));
        rows[logKb]?.scrollIntoView({ block: "nearest" });
      }
      if (e.key === "Enter" && logKb >= 0) rows[logKb]?.click();
      if (e.key === "Escape") { body.querySelectorAll(".log-detail").forEach(d => d.remove()); rows.forEach(r => r.classList.remove("open", "kb-focus")); logKb = -1; }
    });
  }

  function renderDecision() {
    const dec = effectiveDecision();
    if (!dec) {
      $("#decision-title").textContent = "等待请求";
      $("#decision-text").textContent = "Agent 发出的每个请求都会在这里实时播放。";
      $("#decision-tries").innerHTML = "";
      return;
    }
    $("#decision-title").textContent = dec.title || "等待请求";
    $("#decision-group").textContent = dec.group || "—";
    $("#decision-rule").textContent = dec.rule || "规则 —";
    $("#decision-classifier").textContent = dec.confidence != null
      ? `${dec.intent || "—"} · ${(dec.confidence * 100).toFixed(0)}%${dec.classifierMs ? ` · ${dec.classifierMs}ms` : ""}`
      : (dec.intent && dec.intent !== "—" ? dec.intent : "");
    $("#decision-text").textContent = dec.narrative || narrativeOf(dec.session || {});
    $("#decision-tries").innerHTML = (dec.tries || []).map((t, i) => {
      const pm = D.providerMeta(t.provider);
      const cls = t.state === "ok" ? "ok" : t.state === "fail" ? "fail" : "pending";
      const arrow = i ? `<span class="try-arrow">›</span>` : "";
      return `${arrow}<span class="try-pill ${cls} goto" data-prov="${esc(t.provider)}" data-model="${esc(t.model || "")}" title="${esc(t.why || "")} · 左键看配额 · 右键复制模型"><img src="${providerIcon(t.provider)}" alt="">${esc((t.model || "").split("/").pop())}${t.state === "fail" ? " ✕" : t.state === "pending" ? " …" : ""}</span>`;
    }).join("");
  }

  // Click the decision strip → find that session's card, select it, scroll it
  // into view. Decision ↔ session card two-way.
  let decJumpBound = false;
  function bindDecisionJump() {
    const strip = document.querySelector(".decision-strip");
    if (!strip || decJumpBound) return;
    decJumpBound = true;
    strip.tabIndex = 0;
    strip.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        strip.click();
      }
    });
    strip.addEventListener("contextmenu", e => {
      const pill = e.target.closest(".try-pill.goto");
      if (!pill) return;
      e.preventDefault();
      navigator.clipboard?.writeText(pill.dataset.model || pill.dataset.prov).then(() => toast(`模型已复制：${pill.dataset.model}`));
    });
    strip.addEventListener("click", e => {
      const pill = e.target.closest(".try-pill.goto");
      if (pill) {
        const prov = pill.dataset.prov;
        const card = document.querySelector(`.quota-item.goto[data-prov="${CSS.escape(prov)}"]`);
        if (card) { card.scrollIntoView({ behavior: "smooth", block: "nearest" }); card.classList.add("pulse"); setTimeout(() => card.classList.remove("pulse"), 1200); }
        else toast("配额卡无此 provider");
        return;
      }
      const dec = effectiveDecision();
      const sid = dec && dec.session && dec.session.id;
      if (!sid) return;
      const card = document.querySelector(`.session-card[data-session="${CSS.escape(sid)}"]`);
      if (!card) { toast("该会话不在当前列表"); return; }
      state.selectedSession = sid;
      state.filter = null;
      renderSessions(); renderRouteStage(); renderDecision();
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
      toast(`已定位：${dec.session.title || sid}`);
    });
  }

  function renderStatus() {
    $("#status-events").textContent = `${state.events} 条事件`;
    $("#last-update").textContent = state.paused ? "演示已暂停" : "刚刚更新";
    const tps = state.data.sessions.filter(s => s.tps).reduce((a, s) => a + s.tps, 0);
    $("#global-tps").textContent = `${tps.toFixed(1)} tok/s`;
    $("#clock").textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
    renderTicker();
  }

  function tickerFacts() {
    const d = state.data, k = d.kpis || {}, facts = [];
    if (k.cache != null) facts.push(`缓存 ${Number(k.cache).toFixed(1)}%`);
    if (k.requests != null) facts.push(`${Number(k.requests).toLocaleString()} 次请求`);
    if (k.cost != null) facts.push(`费用 $${Number(k.cost).toFixed(2)}`);
    const active = activeSessions();
    facts.push(`${active.length} 个活跃会话`);
    const reroutes = active.reduce((a, s) => a + (s.fallbacks || 0), 0);
    if (reroutes) facts.push(`${reroutes} 次改道`);
    let nextQ = null;
    (d.quotas || []).forEach(q => (q.windows || []).forEach(w => {
      if (typeof w.resetsIn === "number" && w.resetsIn > 0 && (!nextQ || w.resetsIn < nextQ.resetsIn)) nextQ = { name: q.name, resetsIn: w.resetsIn };
    }));
    if (nextQ) facts.push(`${nextQ.name} ${fmtReset(nextQ.resetsIn)}`);
    return facts;
  }

  function renderTicker() {
    const el = $("#ticker-text");
    if (!el) return;
    const facts = tickerFacts();
    if (!facts.length) return;
    const idx = (state.tickerIndex || 0) % facts.length;
    el.textContent = facts[idx];
  }

  /* ------------------------------------------------------------- simulate --- */
  const SPAWN_POOL = [
    { title: "补全 provider 图标映射", agent: "cursor", provider: "moonshot", model: "kimi-k2.5", group: "cheap-and-fast", mode: "order", rule: "规则 1 · cheap", intent: "code", confidence: .89, effort: "low", tokens: 3400, tps: 81.2 },
    { title: "把 trace 长轮询接进 HUD", agent: "codex", provider: "openai", model: "gpt-5.2-codex", group: "daily-coding", mode: "smart", rule: "规则 2 · hard-to-strong", intent: "code", confidence: .91, effort: "medium", tokens: 4200, tps: 121.7 },
    { title: "解释 cache_read 的计费口径", agent: "claude", provider: "anthropic", model: "claude-sonnet-4-5", group: "daily-coding", mode: "smart", rule: "规则 3 · explain", intent: "explain", confidence: .93, effort: "low", tokens: 2800, tps: 69.2 },
    { title: "整理 8 周活跃热力图", agent: "gemini", provider: "google", model: "gemini-3-pro", group: "long-context", mode: "smart", rule: "规则 4 · long-context", intent: "analysis", confidence: .87, effort: "high", tokens: 5100, tps: 85.4 },
    { title: "生成 Lighthouse 报告摘要", agent: "opencode", provider: "deepseek", model: "deepseek-v4", group: "cheap-and-fast", mode: "order", rule: "规则 1 · cheap", intent: "summarize", confidence: .95, effort: "low", tokens: 2200, tps: 102.3 },
    { title: "检查 subagent 会话归属", agent: "claude", provider: "openrouter", model: "claude-opus-4-5", group: "daily-coding", mode: "smart", rule: "规则 2 · hard-to-strong", intent: "debug", confidence: .84, effort: "high", tokens: 6800, tps: 58.7 }
  ];

  function demoTick() {
    if (state.paused || state.mode !== "demo" || window.__OBS_FREEZE || document.hidden) return;
    const now = Date.now();
    state.lastTick = now;
    let completed = 0;
    state.data.sessions.forEach(s => {
      if (s.status === "queued") {
        s._wait = (s._wait || 0) + 1;
        if (s._wait > 3 + Math.random() * 4) {
          s.status = "streaming";
          s.tps = 60 + Math.random() * 70;
          s._wait = 0;
          state.events++;
        }
        return;
      }
      if (s.status !== "streaming") return;
      const dt = 1.2;
      const delta = Math.max(1, s.tps * dt * (0.8 + Math.random() * 0.45));
      s.tokens += Math.round(delta);
      s.tps = clamp(s.tps + (Math.random() - 0.5) * 4, 28, 168);
      s._age = (s._age || 0) + dt;
      state.data.kpis.tokens += Math.round(delta);
      state.data.kpis.cost += delta / 1e6 * 1.35;
      const target = 300000 + Math.random() * 60000;
      if (s.tokens > target) {
        s.status = "done";
        completed++;
        state.events++;
        state.data.recent.unshift({ ...s });
        if (state.data.recent.length > 8) state.data.recent.pop();
      }
    });
    if (completed) {
      state.data.sessions = state.data.sessions.filter(s => s.status !== "done");
      state.data.kpis.requests += completed;
      state.data.kpis.active = state.data.sessions.length;
    }
    if (state.data.sessions.length < 4 && Math.random() < 0.5) spawnSession();
    if (!state.data.sessions.length) spawnSession();
    state.data.kpis.active = state.data.sessions.length;

    // Keep the last hour and the current heat cell moving.
    const last = state.data.series[state.data.series.length - 1];
    last.tokens += Math.round(40000 + Math.random() * 90000);
    last.cost = +(last.cost + 0.05 + Math.random() * 0.12).toFixed(3);
    const today = state.data.heatmap[state.data.heatmap.length - 1];
    today.tokens = Math.round(state.data.series.reduce((a, b) => a + b.tokens, 0));
    today.calls = state.data.kpis.requests;

    computeView();
    renderKPIs();
    renderSessions();
    renderRouteStage();
    renderDecision();
    renderTrend();
    renderDonut();
    renderStatus();
    (window.Obs && window.Obs.hooks.afterTick || []).forEach(fn => { try { fn(apiObj, completed); } catch (_) {} });
  }

  function spawnSession() {
    const t = SPAWN_POOL[Math.floor(Math.random() * SPAWN_POOL.length)];
    const meta = D.agentMeta(t.agent);
    const id = "s-" + Math.random().toString(16).slice(2, 6);
    const tries = [{ provider: t.provider, model: t.model, state: "pending", ms: 0, why: "in flight" }];
    if (Math.random() < 0.28) {
      const alt = t.provider === "anthropic" ? "openrouter" : t.provider === "openai" ? "openrouter" : "anthropic";
      tries.unshift({ provider: alt, model: t.model, state: "fail", ms: 900 + Math.random() * 1800, why: "429 · rate limited" });
      tries[tries.length - 1].state = "ok";
      tries[tries.length - 1].why = "streaming";
    }
    state.data.sessions.unshift({
      id, title: t.title, agent: t.agent, provider: t.provider, model: t.model, served: t.model,
      group: t.group, mode: t.mode, rule: t.rule, intent: t.intent, confidence: t.confidence,
      effort: t.effort, status: "queued", tokens: 0, tps: 0, startedAt: Date.now(),
      ttft: 0, tries, fallbacks: tries.filter(x => x.state === "fail").length, routeId: 9900 + Math.floor(Math.random() * 99)
    });
    state.events++;
    // Add a log row for the new request.
    state.data.logs.unshift({
      id: "r-" + id, at: new Date().toISOString(), agent: t.agent, session: t.title,
      provider: t.provider, model: t.model, status: "run", tokens: 0, ttft: 0, tps: 0, cost: 0
    });
    if (state.data.logs.length > 24) state.data.logs.pop();
  }

  /* ---------------------------------------------------------------- events --- */
  function bindEvents() {
    $("#style-toggle").addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = $("#style-menu");
      closeViewMenu();
      $("#settings-menu").hidden = true;
      menu.hidden = !menu.hidden;
      syncStyleMenu();
    });
    $("#settings-toggle").addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = $("#settings-menu");
      closeViewMenu();
      $("#style-menu").hidden = true;
      menu.hidden = !menu.hidden;
      syncSettingsMenu();
    });
    $("#settings-menu").addEventListener("click", e => {
      const b = e.target.closest("button[data-layout],button[data-density],button[data-motion],button[data-tour]");
      if (!b) return;
      if (b.dataset.layout) applySetting("layout", b.dataset.layout);
      if (b.dataset.density) applySetting("density", b.dataset.density);
      if (b.dataset.motion) applySetting("motion", b.dataset.motion);
      if (b.dataset.tour) applySetting("tour", b.dataset.tour);
    });
    $("#style-menu").addEventListener("click", e => {
      const b = e.target.closest(".style-item");
      if (!b) return;
      applyStyle(b.dataset.style);
      $("#style-menu").hidden = true;
    });
    document.addEventListener("click", e => {
      const menu = $("#style-menu");
      if (!menu.hidden && !e.target.closest("#style-menu") && !e.target.closest("#style-toggle")) menu.hidden = true;
      const settings = $("#settings-menu");
      if (!settings.hidden && !e.target.closest("#settings-menu") && !e.target.closest("#settings-toggle")) settings.hidden = true;
      const viewMenu = $("#view-menu");
      if (viewMenu && !viewMenu.hidden && !e.target.closest("#view-menu") && !e.target.closest("#view-picker")) closeViewMenu();
      const help = $("#help-menu");
      if (help && !help.hidden && !e.target.closest("#help-menu") && !e.target.closest("#vm-help")) closeHelp();
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        $("#style-menu").hidden = true;
        $("#settings-menu").hidden = true;
        closeHelp();
        if (!$("#view-menu").hidden) closeViewMenu(true);
      }
    });

    $("#theme-toggle").addEventListener("click", () => {
      const root = document.documentElement;
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem("magpie.theme", root.dataset.theme); } catch (_) {}
      setTimeout(() => { renderTrend(); drawWires(); }, 30);
    });

    $("#demo-toggle").addEventListener("click", () => {
      state.paused = !state.paused;
      renderMode();
      renderStatus();
      ensureFlightLoop();
      if (!state.paused && state.mode === "live") connectLive(true);
      toast(state.paused ? "演示已暂停" : "演示继续");
    });

    $("#refresh").addEventListener("click", () => {
      if (state.mode === "live") connectLive(true);
      else {
        state.data = D.mockState();
        state.selectedSession = null;
        state.filter = null;
        renderAll();
        toast("演示快照已刷新");
      }
    });

    $("#conn-pill").addEventListener("click", () => {
      if (state.mode === "live") { switchDemo(); }
      else connectLive();
    });

    $("#range-seg").addEventListener("click", e => {
      const b = e.target.closest("button[data-range]");
      if (!b) return;
      state.range = b.dataset.range;
      $$("#range-seg button").forEach(x => x.classList.toggle("active", x === b));
      computeView();
      renderKPIs();
      renderTrend();
      renderStatus();
      if (state.mode === "live") connectLive(true);
    });

    $("#rail-favs").addEventListener("click", e => {
      const b = e.target.closest(".fav-btn[data-fav-view]");
      if (!b) return;
      if (state.tour) stopTour(true);
      setHeroMode(b.dataset.favView);
    });

    // Right-click a rail fav → remove it from favorites without opening the menu.
    $("#rail-favs").addEventListener("contextmenu", e => {
      const b = e.target.closest(".fav-btn[data-fav-view]");
      if (!b) return;
      e.preventDefault();
      toggleFavorite(b.dataset.favView);
    });
    // ↑↓ on the rail → move between favs and switch views.
    $("#rail-favs").tabIndex = 0;
    $("#rail-favs").addEventListener("keydown", e => {
      const btns = [...document.querySelectorAll("#rail-favs .fav-btn")];
      if (!btns.length) return;
      const cur = btns.findIndex(b => b.classList.contains("kb-focus"));
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = e.key === "ArrowDown" ? Math.min(btns.length - 1, cur + 1) : Math.max(0, cur < 0 ? 0 : cur - 1);
        btns.forEach((b, i) => b.classList.toggle("kb-focus", i === next));
      }
      if (e.key === "Enter" && cur >= 0) btns[cur]?.click();
      if (e.key === "Escape") btns.forEach(b => b.classList.remove("kb-focus"));
    });

    // Double-click a rail fav → make it the startup view (unless ?view= is set).
    $("#rail-favs").addEventListener("dblclick", e => {
      const b = e.target.closest(".fav-btn[data-fav-view]");
      if (!b) return;
      const id = b.dataset.favView;
      try {
        localStorage.setItem("magpie.defaultView", id);
        toast(`默认视图：${viewMeta(id).title} · 下次打开直达`);
      } catch (_) {}
      renderRailFavs();
    });

    $("#view-picker").addEventListener("click", e => {
      e.stopPropagation();
      toggleViewMenu();
    });
    $("#view-menu").addEventListener("click", e => {
      const star = e.target.closest(".vm-star");
      if (star) { e.preventDefault(); toggleFavorite(star.dataset.fav); return; }
      const b = e.target.closest("button[data-hero]");
      if (b) { if (state.tour) stopTour(true); setHeroMode(b.dataset.hero); closeViewMenu(); }
    });
    $("#view-menu-close").addEventListener("click", () => closeViewMenu(true));
    $("#view-search").addEventListener("input", e => filterViewMenu(e.target.value));
    $("#view-search").addEventListener("keydown", e => {
      if (e.key === "Enter") {
        const first = $(".view-menu .vm-item:not([hidden])");
        if (first) { e.preventDefault(); setHeroMode(first.dataset.hero); closeViewMenu(); }
      }
      if (e.key === "ArrowDown") {
        const first = $(".view-menu .vm-item:not([hidden])");
        if (first) { e.preventDefault(); first.focus(); }
      }
    });
    $("#view-menu").addEventListener("keydown", e => {
      if (e.key === "Escape") { e.preventDefault(); closeViewMenu(true); return; }
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
      const items = $$(".view-menu .vm-item:not([hidden])");
      if (!items.length) return;
      e.preventDefault();
      const at = items.indexOf(document.activeElement);
      let next = 0;
      if (e.key === "ArrowDown") next = at < 0 ? 0 : (at + 1) % items.length;
      if (e.key === "ArrowUp") next = at <= 0 ? items.length - 1 : at - 1;
      if (e.key === "End") next = items.length - 1;
      items[next].focus();
    });
    $("#vm-random").addEventListener("click", randomView);
    $("#vm-tour").addEventListener("click", () => { if (state.tour) { stopTour(); } else { startTour(); } closeViewMenu(); });
    $("#vm-help").addEventListener("click", () => { closeViewMenu(); openHelp(); });
    $("#help-close").addEventListener("click", closeHelp);
    $("#help-menu").addEventListener("click", e => { if (e.target === e.currentTarget) closeHelp(); });
    $("#view-menu").addEventListener("keydown", e => {
      if (e.key !== "Tab") return;
      const items = $$("#view-menu button, #view-menu input").filter(el => !el.hidden && el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    const ticker = $(".status-item.ticker");
    if (ticker) ticker.addEventListener("click", () => {
      state.tickerIndex = (state.tickerIndex || 0) + 1;
      const el = $("#ticker-text");
      if (!el) return;
      el.classList.add("swap");
      setTimeout(() => { renderTicker(); el.classList.remove("swap"); }, 180);
    });

    $("#trend-seg").addEventListener("click", e => {
      const b = e.target.closest("button[data-metric]");
      if (!b) return;
      state.trendMetric = b.dataset.metric;
      renderTrend();
    });

    $("#filter-chip-x").addEventListener("click", () => {
      state.filter = null;
      state.selectedSession = null;
      renderSessions();
      renderDecision();
      renderCustomView(state.heroMode, true);
      toast("筛选已清除");
    });
    $("#session-list").addEventListener("click", e => {
      const card = e.target.closest(".session-card");
      if (!card) return;
      const id = card.dataset.session;
      state.selectedSession = state.selectedSession === id ? null : id;
      state.filter = null;
      renderSessions();
      renderRouteStage();
      renderDecision();
      const qs = $("#log-search");
      if (state.selectedSession) {
        if (qs) qs.value = id;
        state.logQuery = id;
      } else {
        if (qs) qs.value = "";
        state.logQuery = "";
      }
      renderLogs();
      if (state.selectedSession) {
        const s = selectedSession();
        if (s) toast(`正在查看：${s.title}`);
      }
    });
    $("#session-list").addEventListener("keydown", e => {
      const cards = [...document.querySelectorAll(".session-card")];
      const cur = cards.findIndex(c => c.classList.contains("kb-focus"));
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const next = e.key === "ArrowDown" ? Math.min(cards.length - 1, cur + 1) : Math.max(0, cur < 0 ? 0 : cur - 1);
        cards.forEach((c, i) => c.classList.toggle("kb-focus", i === next));
        cards[next]?.scrollIntoView({ block: "nearest" });
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        const card = cur >= 0 ? cards[cur] : e.target.closest(".session-card");
        if (card) { e.preventDefault(); card.click(); }
      }
      if (e.key === "Escape") cards.forEach(c => c.classList.remove("kb-focus"));
    });

    // Right-click a session card → copy its id to clipboard (session↔log
    // searches, support tickets). Long-press on touch also lands here.
    $("#session-list").addEventListener("contextmenu", e => {
      const card = e.target.closest(".session-card");
      if (!card) return;
      e.preventDefault();
      const id = card.dataset.session;
      navigator.clipboard?.writeText(id).then(() => toast(`session id 已复制：${id}`));
    });

    // Double-click a session card → copy its try chain summary
    // (provider/model ✓✕ trail) for bug reports.
    $("#session-list").addEventListener("dblclick", e => {
      const card = e.target.closest(".session-card");
      if (!card) return;
      const s = (state.data.sessions || []).concat(state.data.recent || []).find(x => x.id === card.dataset.session);
      if (!s) return;
      const tries = (s.tries || []).map(t => `${D.providerMeta(t.provider).name}/${t.model.split("/").pop()} ${t.state === "ok" ? "✓" : t.state === "fail" ? "✕" : "…"}`).join(" → ");
      const txt = `${s.title} | ${s.tokens ? fmtTokens(s.tokens) + " tok" : "—"} | ${tries || s.model}`;
      navigator.clipboard?.writeText(txt).then(() => toast("tries 摘要已复制"));
    });

    $$(".mini-tab[data-session-tab]").forEach(b => b.addEventListener("click", () => {
      state.sessionTab = b.dataset.sessionTab;
      $$(".mini-tab[data-session-tab]").forEach(x => x.classList.toggle("active", x === b));
      renderSessions();
    }));

    // Right-click the hero card → toggle its favorite slot on the rail.
    $(".hero").addEventListener("contextmenu", e => {
      if (e.target.closest("button, a, input, select, .decision-strip, .attn-item")) return;
      e.preventDefault();
      toggleFavorite(state.heroMode);
    });

    // Double-click the hero title → copy the view's name.
    $("#hero-title").addEventListener("dblclick", () => {
      const meta = viewMeta(state.heroMode);
      navigator.clipboard?.writeText(meta.title).then(() => toast(`视图名已复制：${meta.title}`));
    });

    // Double-click the decision strip title → copy the session title.
    $("#decision-title").addEventListener("dblclick", e => {
      e.stopPropagation();
      const t = $("#decision-title").textContent.trim();
      if (t && t !== "等待请求") navigator.clipboard?.writeText(t).then(() => toast(`标题已复制：${t}`));
    });

    $("#route-stage").addEventListener("click", e => {
      // Legend chips in custom views — click an agent swatch to filter the
      // session list, click again to clear. Views opt in via data-agent.
      const lgItem = e.target.closest("[data-agent]");
      if (lgItem) {
        const v = lgItem.dataset.agent;
        state.filter = state.filter && state.filter.type === "agent" && state.filter.value === v ? null : { type: "agent", value: v };
        state.selectedSession = null;
        renderSessions();
        renderDecision();
        renderCustomView(state.heroMode, true);
        toast(state.filter ? "已筛选：" + D.agentMeta(v).name : "筛选已清除");
        return;
      }
      const lgProv = e.target.closest("[data-provider]");
      if (lgProv) {
        const v = lgProv.dataset.provider;
        state.filter = state.filter && state.filter.type === "provider" && state.filter.value === v ? null : { type: "provider", value: v };
        state.selectedSession = null;
        renderSessions();
        renderDecision();
        renderCustomView(state.heroMode, true);
        toast(state.filter ? "已筛选：" + D.providerMeta(v).name : "筛选已清除");
        return;
      }
      const radarNode = e.target.closest(".radar-node");
      if (radarNode) {
        const v = radarNode.dataset.provider;
        state.filter = state.filter && state.filter.type === "provider" && state.filter.value === v ? null : { type: "provider", value: v };
        state.selectedSession = null;
        renderSessions();
        renderDecision();
        toast(state.filter ? "已筛选：" + D.providerMeta(v).name : "筛选已清除");
        return;
      }
      const agent = e.target.closest(".agent-node");
      const provider = e.target.closest(".provider-node");
      if (agent) {
        const v = agent.dataset.agent;
        state.filter = state.filter && state.filter.type === "agent" && state.filter.value === v ? null : { type: "agent", value: v };
      } else if (provider) {
        const v = provider.dataset.provider;
        state.filter = state.filter && state.filter.type === "provider" && state.filter.value === v ? null : { type: "provider", value: v };
      } else return;
      state.selectedSession = null;
      renderSessions();
      renderRouteStage();
      renderDecision();
      toast(state.filter ? "已筛选：" + (state.filter.type === "agent" ? D.agentMeta(state.filter.value).name : D.providerMeta(state.filter.value).name) : "筛选已清除");
    });
    $("#route-stage").addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        const n = e.target.closest(".agent-node,.provider-node");
        if (n) { e.preventDefault(); n.click(); }
      }
    });

    $("#log-search").addEventListener("input", e => {
      state.logQuery = e.target.value.trim();
      renderLogs();
    });

    $("#log-export").addEventListener("click", () => {
      const rows = state.data.logs;
      const head = ["time", "agent", "session", "provider", "model", "status", "tokens", "ttft_ms", "tps", "cost_usd"];
      const cell = v => {
        let s = String(v == null ? "" : v);
        // Do not let a ledger value become a spreadsheet formula.
        if (/^[=+\-@]/.test(s)) s = "'" + s;
        return `"${s.replace(/"/g, '""')}"`;
      };
      const csv = [head.join(",")].concat(rows.map(r => [
        r.at, r.agent, r.session, r.provider, r.model, r.status, r.tokens, r.ttft, r.tps, r.cost
      ].map(cell).join(","))).join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `magpie-requests-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("CSV 已导出");
    });

    $$(".nav-item[data-view]").forEach(b => b.addEventListener("click", () => {
      $$(".nav-item[data-view]").forEach(x => x.classList.toggle("active", x === b));
      const view = b.dataset.view;
      const target = view === "overview" ? $("#grid")
        : view === "routing" ? $(".hero")
        : view === "usage" ? $(".chart-card")
        : view === "sessions" ? $(".live-panel")
        : $(".quota-card");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      toast("已定位到 " + b.textContent.trim());
    }));

    // Global shortcuts: / focuses search, space pauses demo, t toggles theme, v opens views.
    document.addEventListener("keydown", e => {
      if (e.target.matches("input, textarea, select, [contenteditable]")) return;
      if (e.key === "/") { e.preventDefault(); $("#log-search").focus(); }
      if (e.key === " ") { e.preventDefault(); $("#demo-toggle").click(); }
      if (e.key.toLowerCase() === "t") { e.preventDefault(); $("#theme-toggle").click(); }
      if (e.key.toLowerCase() === "v" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); toggleViewMenu(); }
      if (e.key.toLowerCase() === "r" && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); randomView(); }
      else if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); (window.Obs && window.Obs.onKeyR ? window.Obs.onKeyR(e) : randomView()); }
      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); if (state.tour) stopTour(); else { closeViewMenu(); startTour(); } }
      if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); toggleFavorite(state.heroMode); }
      if (e.key === "?") { e.preventDefault(); toggleHelp(); }
      if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const idx = VIEW_META.findIndex(v => v.id === state.heroMode);
        const step = e.key === "ArrowRight" ? 1 : -1;
        const next = VIEW_META[(idx + step + VIEW_META.length) % VIEW_META.length].id;
        setHeroMode(next);
      }
    });



    $$(".nav-item[data-view]").forEach(b => b.addEventListener("click", () => {
      $$(".nav-item[data-view]").forEach(x => x.classList.toggle("active", x === b));
      const view = b.dataset.view;
      const target = view === "overview" ? $("#grid")
        : view === "routing" ? $(".hero")
        : view === "usage" ? $(".chart-card")
        : view === "sessions" ? $(".live-panel")
        : $(".quota-card");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      toast("已定位到 " + b.textContent.trim());
    }));

    document.addEventListener("visibilitychange", () => { if (!document.hidden) ensureFlightLoop(); });
    let resizeTimer = null;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renderTrend(); renderHeatmap(); renderQuotas(); drawWires();
        if (state.heroMode === "radar") renderRadarView(true);
        if (state.heroMode === "loom") renderLoomView(true);
        if (state.heroMode === "rhythm") renderRhythmView(true);
        if (state.heroMode === "rings") renderRingsView(true);
        if (state.heroMode === "quota") renderQuotaView(true);
        if (viewRegistry()[state.heroMode]) renderCustomView(state.heroMode, true);
        if (!$("#view-menu").hidden) positionViewMenu();
      }, 120);
    });

    setInterval(() => {
      $("#clock").textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false });
      if (!state.paused) {
        // Refresh relative ages in the session list without a full re-render.
        $$(".session-card").forEach(card => {
          const s = visibleSessions().find(x => x.id === card.dataset.session);
          if (!s) return;
          const spans = card.querySelectorAll(".session-bottom span");
          if (spans[1]) spans[1].textContent = fmtAge(Date.now() - s.startedAt);
        });
      }
    }, 1000);
    (window.Obs && window.Obs.hooks.bind || []).forEach(fn => { try { fn(apiObj); } catch (_) {} });
  }

  /* ----------------------------------------------------------------- live --- */
  // A fresh install opens the page before Magpie's gateway is up, and on a
  // moved port 3425 is not the gateway at all. Retry a couple of times, then
  // fall back to the demo and watch /api/health until the gateway answers.
  function apiHeaders() {
    const el = document.querySelector('meta[name="magpie-api-token"]');
    return el && el.content ? { "x-magpie-api-token": el.content } : {};
  }

  function stopGatewayWatch() {
    clearInterval(state.gatewayWatch);
    state.gatewayWatch = null;
    state.gatewayWatchTries = 0;
  }

  function startGatewayWatch() {
    if (state.gatewayWatch) return;
    state.gatewayWatchTries = 0;
    state.gatewayWatch = setInterval(async () => {
      if (state.mode !== "demo") { stopGatewayWatch(); return; }
      if (++state.gatewayWatchTries > 90) { stopGatewayWatch(); return; }
      try {
        const res = await fetch("api/health", { cache: "no-store", headers: apiHeaders() });
        const body = await res.json();
        if (body && body.ok) {
          stopGatewayWatch();
          toast("本地网关已就绪 · 正在切换实时数据");
          connectLive(true);
        }
      } catch { /* still nothing there; keep watching */ }
    }, 10000);
  }

  async function gatewayAddress() {
    try {
      const res = await fetch("api/health", { cache: "no-store", headers: apiHeaders() });
      const body = await res.json();
      return body && body.gateway ? body.gateway : "";
    } catch (_) { return ""; }
  }

  async function connectLive(silent) {
    if (state.liveBusy) return;
    if (silent && (document.hidden || state.paused)) return;
    state.liveBusy = true;
    try {
      if (!silent) toast("正在连接 Magpie…");
      const period = state.range === "7d" ? "week" : state.range === "30d" ? "month" : "today";
      const data = await D.fetchLive(period);
      state.mode = "live";
      state.data = data;
      state.liveError = false;
      if (!silent) {
        state.selectedSession = null;
        state.filter = null;
      }
      state.liveTries = 0;
      stopGatewayWatch();
      clearInterval(state.liveTimer);
      state.liveTimer = setInterval(() => connectLive(true), 2500);
      renderAll();
      if (!silent) {
        const pill = $("#conn-pill");
        pill.classList.remove("fresh");
        void pill.offsetWidth;
        pill.classList.add("fresh");
        setTimeout(() => pill.classList.remove("fresh"), 760);
        toast("已连接 Magpie：" + (data.gateway || "127.0.0.1:3425"));
      }
    } catch (err) {
      if (state.mode !== "live") {
        if (state.liveTries < 2) {
          state.liveTries++;
          toast(`本地网关还没就绪 · 正在重试（${state.liveTries}/2）`);
          clearTimeout(state.liveRetryTimer);
          state.liveRetryTimer = setTimeout(() => connectLive(true), 2400);
        } else {
          const addr = await gatewayAddress();
          toast(`无法连接本地网关${addr ? " " + addr : ""}，继续使用演示数据`);
          switchDemo();
          startGatewayWatch();
        }
      } else {
        $("#conn-pill").dataset.mode = "offline";
        $("#conn-label").textContent = "连接中断";
        $("#live-dot").className = "live-dot off";
        if (!state.liveError) {
          state.liveError = true;
          toast("实时连接中断，保留最后一次快照");
        }
      }
    } finally {
      state.liveBusy = false;
    }
  }

  function switchDemo() {
    clearInterval(state.liveTimer);
    state.liveTimer = null;
    state.mode = "demo";
    state.data = D.mockState();
    state.selectedSession = null;
    state.filter = null;
    renderAll();
  }

  /* ------------------------------------------------------------- settings --- */
  function syncSettingsMenu() {
    const root = document.documentElement;
    $$("#layout-seg button").forEach(b => b.classList.toggle("active", b.dataset.layout === (root.dataset.layout || "auto")));
    $$("#density-seg button").forEach(b => b.classList.toggle("active", b.dataset.density === (root.dataset.density || "cozy")));
    $$("#motion-seg button").forEach(b => b.classList.toggle("active", b.dataset.motion === (root.dataset.motion || "full")));
    $$("#tour-seg button").forEach(b => b.classList.toggle("active", b.dataset.tour === (root.dataset.tour || "10")));
  }
  function applySetting(kind, value) {
    const root = document.documentElement;
    root.dataset[kind] = value;
    try { localStorage.setItem("magpie." + kind, value); } catch (_) {}
    syncSettingsMenu();
    renderAll();
    requestAnimationFrame(drawWires);
    ensureFlightLoop();
    const names = { layout: { auto: "自动", fit: "一屏", comfort: "舒展" }, density: { compact: "紧凑", cozy: "标准", spacious: "宽松" }, motion: { full: "全部", soft: "轻柔", off: "关闭" }, tour: { 5: "5 秒", 10: "10 秒", 30: "30 秒" } };
    const prefix = { layout: "布局：", density: "密度：", motion: "动效：", tour: "巡游：" };
    if (kind === "tour" && state.tour) { stopTour(true); startTour(); }
    const fallback = kind === "layout" && value === "fit" && (window.innerWidth < 1200 || window.innerHeight < 900);
    toast((prefix[kind] || "") + ((names[kind] || {})[value] || value)
      + (fallback ? "（当前尺寸改用滚动）" : ""));
  }

  /* ---------------------------------------------------------------- style --- */
  const STYLE_NAMES = { control: "控制室", pixel: "像素", paper: "纸感", neon: "霓虹", terminal: "终端", blueprint: "蓝图", zine: "拼贴" };
  function syncStyleMenu() {
    const style = document.documentElement.dataset.style || "control";
    $$(".style-item").forEach(b => b.classList.toggle("active", b.dataset.style === style));
  }
  function applyStyle(style) {
    document.documentElement.dataset.style = style;
    try { localStorage.setItem("magpie.style", style); } catch (_) {}
    syncStyleMenu();
    renderAll();
    if (state.heroMode === "route") requestAnimationFrame(drawWires);
    toast("风格：" + (STYLE_NAMES[style] || style));
  }

  /* ---------------------------------------------------------------- toast --- */
  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => { el.hidden = true; }, 220);
    }, 2200);
  }

  /* ------------------------------------------------------------------ init --- */
  function init() {
    try { console.info("%c Magpie Observatory v1.0.1 · twenty-five views · 7 styles · layout settings", "color:#8b7cf6;font-weight:bold"); } catch (_) {}
    (window.Obs && window.Obs.hooks.init || []).forEach(fn => { try { fn(apiObj); } catch (_) {} });
    try {
      const hostTheme = new URLSearchParams(location.search).get("hostTheme");
      if (hostTheme === "light" || hostTheme === "dark") {
        if (!localStorage.getItem("magpie.theme")) document.documentElement.dataset.theme = hostTheme;
      }
      const saved = localStorage.getItem("magpie.theme");
      if (saved === "light") document.documentElement.dataset.theme = "light";
      if (saved === "dark") document.documentElement.dataset.theme = "dark";
      const savedStyle = localStorage.getItem("magpie.style");
      if (savedStyle) document.documentElement.dataset.style = savedStyle;
      ["layout", "density", "motion", "tour"].forEach(k => {
        const v = localStorage.getItem("magpie." + k);
        if (v) document.documentElement.dataset[k] = v;
      });
    } catch (_) {}
    syncStyleMenu();
    syncSettingsMenu();
    buildViewMenu();
    renderRailFavs();
    computeView();
    renderAll();
    bindEvents();
    setHeroMode(state.heroMode);
    setInterval(demoTick, 1200);
    // Rotate one live fact in the status bar; data refreshes keep it current.
    setInterval(() => {
      state.tickerIndex = (state.tickerIndex || 0) + 1;
      const el = $("#ticker-text");
      if (!el) return;
      el.classList.add("swap");
      setTimeout(() => { renderTicker(); el.classList.remove("swap"); }, 180);
    }, 6000);
    // Countdowns should move even when no new request arrives.
    setInterval(() => {
      (state.data.quotas || []).forEach(q => (q.windows || []).forEach(w => {
        if (typeof w.resetsIn === "number" && w.resetsIn > 0) w.resetsIn -= 1;
      }));
      renderQuotas();
    }, 60000);
    ensureFlightLoop();
    // A small delayed redraw catches web-font/layout settling.
    setTimeout(() => { renderTrend(); drawWires(); }, 120);
  }

  /* -------------------------------------------------------------- api ------ */
  // The surface app-plus.js builds on. Kept tiny and stable.
  window.Obs = window.Obs || { hooks: { afterRender: [], afterTick: [], bind: [], init: [] }, game: {} };
  var apiObj = {
    state, toast, setHeroMode, renderAll, fmtTokens, fmtMoney, fmtReset,
    computeView, drawWires, randomView, startTour, stopTour, connectLive,
    apiHeaders, viewMeta, providerMeta: D.providerMeta, agentMeta: D.agentMeta,
    agentIcon, providerIcon, esc, clamp
  };
  window.Obs.api = apiObj;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
