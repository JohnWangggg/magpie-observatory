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
    sessionQuery: "",
    paused: false,
    logQuery: "",
    view: null,
    wireSig: "",
    unseenOnly: false,
    events: 0,
    tickerIndex: 0,
    lastTick: Date.now(),
    timers: [],
    liveTimer: null,
    liveBusy: false,
    tour: false,
    tourTimer: null,
    tourPool: null,
    liveTries: 0,
    liveRetryTimer: null,
    gatewayWatch: null,
    gatewayWatchTries: 0,
    viewRecent: (() => {
      try {
        const raw = JSON.parse(localStorage.getItem("magpie.viewRecent") || "[]");
        return Array.isArray(raw) ? raw.filter(x => typeof x === "string").slice(0, 10) : [];
      } catch (_) { return []; }
    })(),
    favorites: (() => {
      try {
        const raw = JSON.parse(localStorage.getItem("magpie.favorites") || "[]");
        return Array.isArray(raw) ? raw.filter(x => typeof x === "string") : [];
      } catch (_) { return []; }
    })(),
    pinnedSessions: (() => {
      try {
        const raw = JSON.parse(localStorage.getItem("magpie.pinnedSessions") || "[]");
        return Array.isArray(raw) ? raw.filter(x => typeof x === "string").slice(0, 12) : [];
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
    if (!view || !host) { if (!host && view) console.warn(`renderCustomView: no host for ${mode}`); return; }
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
  const VIEW_GROUPS = ["实时", "用量", "结构", "趣味", "天象", "生态", "几何", "场景", "洞察", "配额", "抽象"];
  const GROUP_COLORS = { "实时": "#56d4dd", "用量": "#8b7cf6", "结构": "#4ade80", "趣味": "#fbbf24", "天象": "#7c9ef8", "生态": "#34d399", "几何": "#e879f9", "场景": "#fb923c", "洞察": "#f472b6", "配额": "#facc15", "抽象": "#94a3b8" };
  const VIEW_META = [
    { id: "route", title: "实时路由", eyebrow: "LIVE ROUTING", group: "实时", icon: "i-route", hint: "Agent → Provider" },
    { id: "waterfall", title: "会话瀑布", eyebrow: "SESSION WATERFALL", group: "实时", icon: "i-stack", hint: "一次会话的时间轴" },
    { id: "network", title: "关系网络", eyebrow: "RELATION GRAPH", group: "实时", icon: "i-magpie", hint: "Agent / Provider / 模型" },
    { id: "swarm", title: "延迟蜂群", eyebrow: "LATENCY SWARM", group: "实时", icon: "i-bolt", hint: "TTFT 分布" },
    { id: "pulse", title: "脉搏", eyebrow: "PULSE MONITOR", group: "实时", icon: "i-pulse", hint: "会话 ECG · 每行一个心跳" },
    { id: "compass", title: "罗盘", eyebrow: "QUOTA COMPASS", group: "配额", icon: "i-route", hint: "窗=表盘 针=燃速 环=余量" },
    { id: "barometer", title: "气压计", eyebrow: "BURN BAROMETER", group: "配额", icon: "i-chart", hint: "燃速=气压 错=风暴" },
    { id: "sextant", title: "六分仪", eyebrow: "LATITUDE OF LATENCY", group: "延迟", icon: "i-chart", hint: "慢=高角 快=贴地平线" },
    { id: "darkroom", title: "暗房", eyebrow: "DARKROOM", group: "氛围", icon: "i-magpie", hint: "聚光灯跟手 照亮日志" },
    { id: "sonar", title: "声呐", eyebrow: "PROVIDER SONAR", group: "实时", icon: "i-pulse", hint: "provider=接触点 扫线转" },
    { id: "metronome", title: "节拍器", eyebrow: "REQUEST METRONOME", group: "实时", icon: "i-pulse", hint: "摆频=请求率" },
    { id: "neighborhood", title: "街坊", eyebrow: "PROVIDER BLOCK", group: "场景", icon: "i-magpie", hint: "房=provider 灯=会话 烟=错" },
    { id: "warehouse", title: "仓库", eyebrow: "TOKEN WAREHOUSE", group: "用量", icon: "i-stack", hint: "架=provider 箱=token 灯=会话" },
    { id: "plankton", title: "浮游群", eyebrow: "LOG PLANKTON", group: "氛围", icon: "i-magpie", hint: "点=日志 色=provider 漂" },
    { id: "cartographer", title: "地图师", eyebrow: "USAGE CARTOGRAPHY", group: "用量", icon: "i-stack", hint: "峰=provider 等高线=token" },
    { id: "newsreel", title: "新闻片", eyebrow: "LOG NEWSREEL", group: "氛围", icon: "i-magpie", hint: "日志=老电影帧 底片" },
    { id: "sundial", title: "日晷", eyebrow: "HOUR SUNDIAL", group: "天象", icon: "i-clock", hint: "影=时刻 石=会话 刻=小时" },
    { id: "ledger", title: "账本", eyebrow: "PROVIDER LEDGER", group: "洞察", icon: "i-doc", hint: "栏=provider 行=日志 Σ=token" },
    { id: "astrolabe", title: "星盘", eyebrow: "ASTROLABE", group: "延迟", icon: "i-route", hint: "model=纬圈 provider=指针" },
    { id: "weathervane", title: "风向标", eyebrow: "PROVIDER VANE", group: "实时", icon: "i-bolt", hint: "箭=最热provider 摆" },
    { id: "beacon", title: "烽火台", eyebrow: "SIGNAL BEACONS", group: "场景", icon: "i-magpie", hint: "火=provider 焰=会话 烟=用量" },
    { id: "clocktower", title: "钟楼", eyebrow: "QUOTA CLOCKTOWER", group: "配额", icon: "i-clock", hint: "盘=配额窗 针=燃速 铃=临近重置" },
    { id: "belltower", title: "钟楼铃", eyebrow: "QUOTA BELLS", group: "配额", icon: "i-clock", hint: "铃=配额窗 摆速=燃速" },
    { id: "cottage", title: "小屋", eyebrow: "QUOTA COTTAGE", group: "配额", icon: "i-magpie", hint: "窗=配额窗 灯=会话 烟=错 园=余量" },
    { id: "dockyard", title: "船坞", eyebrow: "AGENT DOCKYARD", group: "实时", icon: "i-server", hint: "船=agent 舱=token 旗=provider" },
    { id: "bellfoundry", title: "铸钟坊", eyebrow: "BELL FOUNDRY", group: "配额", icon: "i-flame", hint: "炉=配额窗 水=燃速 铃=会话 火=错" },
    { id: "atlas", title: "图集", eyebrow: "QUOTA ATLAS", group: "配额", icon: "i-route", hint: "页=配额窗 岛=用量 旗=会话" },
    { id: "manor", title: "庄园", eyebrow: "PROVIDER MANOR", group: "配额", icon: "i-magpie", hint: "翼=配额窗 灯=会话 园=余量 烟=错" },
    { id: "portcullis", title: "闸门", eyebrow: "PORTCULLIS", group: "配额", icon: "i-magpie", hint: "闸=燃速 人=会话 炬=错" },
    { id: "strand", title: "海岸", eyebrow: "QUOTA STRAND", group: "配额", icon: "i-magpie", hint: "湾=配额窗 水=余量 鸥=会话 旗=错" },
    { id: "flotilla", title: "船队", eyebrow: "AGENT FLOTILLA", group: "实时", icon: "i-server", hint: "船=agent 舷=token 帆=provider 红帆=错" },
    { id: "ember", title: "余烬", eyebrow: "QUOTA EMBERS", group: "配额", icon: "i-flame", hint: "炭=配额窗 光=燃速 灰=余量 火=会话" },
    { id: "flagstone", title: "石板路", eyebrow: "LOG FLAGSTONES", group: "用量", icon: "i-stack", hint: "石=日志 宽=token 裂=错" },
    { id: "topography", title: "地形", eyebrow: "PROVIDER TOPOGRAPHY", group: "用量", icon: "i-chart", hint: "峰=provider 高=token 旗=会话 崩=错" },
    { id: "stargate", title: "星门", eyebrow: "QUOTA STARGATE", group: "配额", icon: "i-magpie", hint: "环=配额窗 收缩=余量 光=会话 红=错" },
    { id: "geodesic", title: "穹顶", eyebrow: "LOG GEODESIC", group: "用量", icon: "i-stack", hint: "面=日志 色=provider 裂=错" },
    { id: "fresco", title: "湿壁画", eyebrow: "QUOTA FRESCO", group: "配额", icon: "i-magpie", hint: "板=配额窗 涂=用量 湿=会话 裂=过热" },
    { id: "pharos", title: "灯塔", eyebrow: "QUOTA PHAROS", group: "配额", icon: "i-magpie", hint: "塔=配额窗 高=用量 光=会话 旗=错" },
    { id: "warren", title: "兔穴", eyebrow: "QUOTA WARREN", group: "配额", icon: "i-magpie", hint: "丘=配额窗 兔=会话 迹=错" },
    { id: "topiary", title: "修剪园", eyebrow: "PROVIDER TOPIARY", group: "用量", icon: "i-magpie", hint: "冠=provider 高=token 鸟=会话 枯=错" },
    { id: "gnomon", title: "晷针", eyebrow: "QUOTA GNOMON", group: "配额", icon: "i-clock", hint: "盘=配额窗 影=用量 鸟=会话 线=错" },
    { id: "cistern", title: "蓄水池", eyebrow: "QUOTA CISTERN", group: "配额", icon: "i-magpie", hint: "拱=配额窗 水=余量 滴=会话 痕=错" },
    { id: "flotsam", title: "漂流瓶", eyebrow: "LOG FLOTSAM", group: "用量", icon: "i-stack", hint: "瓶=日志 塞=token 裂=错" },
    { id: "clinker", title: "烧结砖", eyebrow: "LOG CLINKER", group: "用量", icon: "i-stack", hint: "砖=日志 温=token 裂=错" },
    { id: "amphora", title: "双耳瓶", eyebrow: "PROVIDER AMPHORA", group: "配额", icon: "i-magpie", hint: "瓮=配额窗 酒=余量 绘=会话 倾=错" },
    { id: "semaphore", title: "旗语", eyebrow: "QUOTA SEMAPHORE", group: "配额", icon: "i-magpie", hint: "塔=配额窗 臂=用量 灯=会话 闪=错" },
    { id: "pitstop", title: "维修站", eyebrow: "PROVIDER PITSTOP", group: "用量", icon: "i-route", hint: "道=provider 车=token 胎=用量 旗=错" },
    { id: "fireescape", title: "消防梯", eyebrow: "QUOTA FIREESCAPE", group: "配额", icon: "i-magpie", hint: "梯=配额窗 段=用量 人=会话 红=错" },
    { id: "catacomb", title: "墓窟", eyebrow: "QUOTA CATACOMB", group: "配额", icon: "i-magpie", hint: "龛=配额窗 深=用量 烛=会话 髅=错" },
    { id: "oast", title: "烘麦窑", eyebrow: "QUOTA OAST", group: "配额", icon: "i-magpie", hint: "窑=配额窗 锥=用量 风=会话 环=错" },
    { id: "croft", title: "小农场", eyebrow: "QUOTA CROFT", group: "配额", icon: "i-magpie", hint: "垄=配额窗 沟=用量 羊=会话 云=错" },
    { id: "tidemill", title: "潮汐磨坊", eyebrow: "QUOTA TIDEMILL", group: "配额", icon: "i-magpie", hint: "轮=配额窗 速=用量 鱼=会话" },
    { id: "tramway", title: "缆车", eyebrow: "PROVIDER TRAMWAY", group: "实时", icon: "i-server", hint: "索=provider 车=会话 断=错" },
    { id: "belljar", title: "钟形罩", eyebrow: "PROVIDER BELLJAR", group: "用量", icon: "i-magpie", hint: "罩=provider 植=token 露=会话 裂=错" },
    { id: "driftline", title: "雪脊", eyebrow: "PROVIDER DRIFTLINE", group: "用量", icon: "i-chart", hint: "堆=provider 高=token 粒=会话 裂=错" },
    { id: "windfarm", title: "风电场", eyebrow: "PROVIDER WINDFARM", group: "用量", icon: "i-pulse", hint: "塔=provider 叶=用量 条=错" },
    { id: "quarry", title: "采石场", eyebrow: "PROVIDER QUARRY", group: "用量", icon: "i-magpie", hint: "层=provider 深=token 车=会话 脉=错" },
    { id: "pier", title: "防波堤", eyebrow: "PROVIDER PIER", group: "用量", icon: "i-magpie", hint: "桩=provider 深=token 鸟=会话 斜=错" },
    { id: "cadence", title: "节奏", eyebrow: "QUOTA CADENCE", group: "配额", icon: "i-clock", hint: "钟=配额窗 摆=用量 亮=会话 裂=错" },
    { id: "faultline", title: "断层", eyebrow: "PROVIDER FAULTLINE", group: "用量", icon: "i-magpie", hint: "迹=provider 错=token 震=会话 带=错" },
    { id: "cloister", title: "回廊", eyebrow: "PROVIDER CLOISTER", group: "用量", icon: "i-magpie", hint: "拱=provider 深=token 烛=会话 坠=错" },
    { id: "crucible", title: "熔杯", eyebrow: "QUOTA CRUCIBLE", group: "配额", icon: "i-flame", hint: "杯=配额窗 液=余量 勺=会话 裂=错" },
    { id: "sheaf", title: "麦捆", eyebrow: "QUOTA SHEAF", group: "配额", icon: "i-magpie", hint: "捆=配额窗 高=用量 镰=会话 折=错" },
    { id: "sounder", title: "测深锤", eyebrow: "PROVIDER SOUNDER", group: "用量", icon: "i-pulse", hint: "坠=provider 深=token 溅=会话 断=错" },
    { id: "doocot", title: "鸽舍", eyebrow: "QUOTA DOOCOT", group: "配额", icon: "i-magpie", hint: "舍=配额窗 巢=余量 鸽=会话 瓦=错" },
    { id: "vault", title: "金库", eyebrow: "QUOTA VAULT", group: "配额", icon: "i-magpie", hint: "门=配额窗 开=余量 锭=用量 锁=会话 钻=错" },
    { id: "ferry", title: "渡口", eyebrow: "QUOTA FERRY", group: "配额", icon: "i-magpie", hint: "渡=配额窗 程=用量 客=会话 绳=错" },
    { id: "shottower", title: "弹塔", eyebrow: "QUOTA SHOTTOWER", group: "配额", icon: "i-magpie", hint: "塔=配额窗 高=用量 丸=会话 裂=错" },
    { id: "odeon", title: "乐厅", eyebrow: "PROVIDER ODEON", group: "用量", icon: "i-magpie", hint: "环=provider 座=token 炬=会话" },
    { id: "lockgate", title: "船闸", eyebrow: "QUOTA LOCKGATE", group: "配额", icon: "i-magpie", hint: "闸=配额窗 水=余量 船=会话 闸=错" },
    { id: "steelyard", title: "杆秤", eyebrow: "PROVIDER STEELYARD", group: "用量", icon: "i-chart", hint: "杆=provider 砣=token 钩=会话 断=错" },
    { id: "pergola", title: "藤架", eyebrow: "QUOTA PERGOLA", group: "配额", icon: "i-magpie", hint: "拱=配额窗 藤=用量 凳=会话 折=错" },
    { id: "rigging", title: "索具", eyebrow: "QUOTA RIGGING", group: "配额", icon: "i-magpie", hint: "桅=配额窗 帆=用量 旗=会话 绳=错" },
    { id: "orangery", title: "橘温室", eyebrow: "PROVIDER ORANGERY", group: "用量", icon: "i-magpie", hint: "树=provider 果=token 壶=会话 裂=错" },
    { id: "papermill", title: "抄纸坊", eyebrow: "QUOTA PAPERMILL", group: "配额", icon: "i-magpie", hint: "槽=配额窗 浆=余量 纸=会话 裂=错" },
    { id: "hammam", title: "浴场", eyebrow: "PROVIDER HAMMAM", group: "用量", icon: "i-magpie", hint: "池=provider 汽=token 巾=会话 裂=错" },
    { id: "menagerie", title: "兽苑", eyebrow: "QUOTA MENAGERIE", group: "配额", icon: "i-magpie", hint: "笼=配额窗 兽=用量 守=会话 崩=错" },
    { id: "battery", title: "炮垒", eyebrow: "PROVIDER BATTERY", group: "用量", icon: "i-magpie", hint: "位=provider 烟=token 长=会话 炸=错" },
    { id: "spinning", title: "纺车", eyebrow: "PROVIDER SPINNING", group: "用量", icon: "i-magpie", hint: "车=provider 线=token 踏=会话 断=错" },
    { id: "aqueduct", title: "渡槽", eyebrow: "QUOTA AQUEDUCT", group: "配额", icon: "i-magpie", hint: "拱=配额窗 水=余量 桶=会话 裂=错" },
    { id: "typecase", title: "字盘", eyebrow: "PROVIDER TYPECASE", group: "用量", icon: "i-magpie", hint: "盘=provider 铅=token 手=会话 裂=错" },
    { id: "tollhouse", title: "收费站", eyebrow: "PROVIDER TOLLHOUSE", group: "用量", icon: "i-magpie", hint: "亭=provider 铃=token 旅=会话 断=错" },
    { id: "fermentery", title: "发酵坊", eyebrow: "PROVIDER FERMENTERY", group: "用量", icon: "i-magpie", hint: "桶=provider 泡=token 管=会话 裂=错" },
    { id: "columbarium", title: "龛堂", eyebrow: "PROVIDER COLUMBARIUM", group: "用量", icon: "i-magpie", hint: "龛=provider 光=token 灯=会话 裂=错" },
    { id: "anatomy", title: "解剖剧场", eyebrow: "PROVIDER ANATOMY", group: "用量", icon: "i-magpie", hint: "座=provider 烛=token 指=会话 肋=错" },
    { id: "ropewalk", title: "绳廊", eyebrow: "PROVIDER ROPEWALK", group: "用量", icon: "i-magpie", hint: "道=provider 捻=token 转=会话 断=错" },
    { id: "brickyard", title: "砖窑", eyebrow: "PROVIDER BRICKYARD", group: "用量", icon: "i-magpie", hint: "窑=provider 烟=token 车=会话 裂=错" },
    { id: "overshot", title: "水轮", eyebrow: "PROVIDER OVERSHOT", group: "用量", icon: "i-magpie", hint: "轮=provider 斗=token 槽=会话 裂=错" },
    { id: "smokehouse", title: "熏房", eyebrow: "PROVIDER SMOKEHOUSE", group: "用量", icon: "i-magpie", hint: "房=provider 烟=token 挂=会话 裂=错" },
    { id: "curriery", title: "鞣坑", eyebrow: "QUOTA CURRIERY", group: "配额", icon: "i-magpie", hint: "坑=配额窗 浆=余量 革=会话 裂=错" },
    { id: "serac", title: "冰塔", eyebrow: "PROVIDER SERAC", group: "用量", icon: "i-magpie", hint: "塔=provider 高=token 绳=会话 崩=错" },
    { id: "filature", title: "缫丝", eyebrow: "PROVIDER FILATURE", group: "用量", icon: "i-magpie", hint: "盆=provider 茧=token 丝=会话 裂=错" },
    { id: "herringweir", title: "鱼堰", eyebrow: "QUOTA HERRINGWEIR", group: "配额", icon: "i-magpie", hint: "桩=配额窗 网=用量 鱼=会话 断=错" },
    { id: "cheesery", title: "奶酪坊", eyebrow: "QUOTA CHEESERY", group: "配额", icon: "i-magpie", hint: "压=配额窗 凝=余量 乳=会话 裂=错" },
    { id: "malthouse", title: "芽床", eyebrow: "PROVIDER MALTHOUSE", group: "用量", icon: "i-magpie", hint: "床=provider 芽=token 铲=会话 焦=错" },
    { id: "kelpfarm", title: "藻筏", eyebrow: "PROVIDER KELPFARM", group: "用量", icon: "i-magpie", hint: "筏=provider 藻=token 船=会话 断=错" },
    { id: "sugarmill", title: "糖坊", eyebrow: "PROVIDER SUGARMILL", group: "用量", icon: "i-magpie", hint: "辊=provider 汁=token 蔗=会话 裂=错" },
    { id: "drydock", title: "干船坞", eyebrow: "QUOTA DRYDOCK", group: "配额", icon: "i-magpie", hint: "坞=配额窗 线=余量 架=会话 裂=错" },
    { id: "caskhouse", title: "酒桶", eyebrow: "QUOTA CASKHOUSE", group: "配额", icon: "i-magpie", hint: "桶=配额窗 箍=余量 滴=会话 崩=错" },
    { id: "belfry", title: "钟塔", eyebrow: "PROVIDER BELFRY", group: "用量", icon: "i-clock", hint: "塔=provider 摆=token 铃=会话 轭=错" },
    { id: "clothesline", title: "晾衣绳", eyebrow: "PROVIDER CLOTHESLINE", group: "用量", icon: "i-magpie", hint: "绳=provider 衣=token 风=会话 断=错" },
    { id: "incline", title: "斜道", eyebrow: "PROVIDER INCLINE", group: "用量", icon: "i-magpie", hint: "坡=provider 车=token 站=会话 翻=错" },
    { id: "clough", title: "闸阀", eyebrow: "QUOTA CLOUGH", group: "配额", icon: "i-magpie", hint: "闸=配额窗 水=余量 板=用量 桨=会话 翘=错" },
    { id: "pigeonry", title: "鸽房", eyebrow: "PROVIDER PIGEONRY", group: "用量", icon: "i-magpie", hint: "孔=provider 鸽=token 旋=会话 裂=错" },
    { id: "tenterfield", title: "拉幅场", eyebrow: "PROVIDER TENTERFIELD", group: "用量", icon: "i-magpie", hint: "架=provider 布=token 风=会话 撕=错" },
    { id: "headgear", title: "井架", eyebrow: "QUOTA HEADGEAR", group: "配额", icon: "i-magpie", hint: "塔=配额窗 罐=余量 笼=会话 脱=错" },
    { id: "fullery", title: "缩绒坊", eyebrow: "PROVIDER FULLERY", group: "用量", icon: "i-magpie", hint: "槽=provider 布=token 锤=会话 裂=错" },
    { id: "lapidary", title: "宝石坊", eyebrow: "PROVIDER LAPIDARY", group: "用量", icon: "i-magpie", hint: "盘=provider 石=token 臂=会话 崩=错" },
    { id: "sailloft", title: "帆篷", eyebrow: "PROVIDER SAILLOFT", group: "用量", icon: "i-magpie", hint: "帆=provider 板=token 匠=会话 撕=错" },
    { id: "limekiln", title: "石灰窑", eyebrow: "PROVIDER LIMEKILN", group: "用量", icon: "i-magpie", hint: "窑=provider 火=token 拱=会话 塌=错" },
    { id: "charcoalmeiler", title: "炭堆", eyebrow: "PROVIDER CHARCOAL MEILER", group: "用量", icon: "i-magpie", hint: "堆=provider 孔=token 匠=会话 喷=错" },
    { id: "cressbed", title: "水芹床", eyebrow: "PROVIDER CRESSBED", group: "用量", icon: "i-magpie", hint: "槽=provider 芹=token 采=会话 污=错" },
    { id: "glasshouse", title: "玻璃坊", eyebrow: "PROVIDER GLASSHOUSE", group: "用量", icon: "i-magpie", hint: "炉=provider 泡=token 匠=会话 裂=错" },
    { id: "saltern", title: "盐田", eyebrow: "QUOTA SALTERN", group: "配额", icon: "i-magpie", hint: "池=配额窗 盐=余量 耙=会话 决=错" },
    { id: "mews", title: "鹰房", eyebrow: "PROVIDER MEWS", group: "用量", icon: "i-magpie", hint: "位=provider 鹰=token 扑=会话 失=错" },
    { id: "vinery", title: "葡萄房", eyebrow: "PROVIDER VINERY", group: "用量", icon: "i-magpie", hint: "架=provider 穗=token 剪=会话 裂=错" },
    { id: "bleachfield", title: "漂场", eyebrow: "PROVIDER BLEACHFIELD", group: "用量", icon: "i-magpie", hint: "场=provider 布=token 翻=会话 焦=错" },
    { id: "bloomery", title: "块炼炉", eyebrow: "PROVIDER BLOOMERY", group: "用量", icon: "i-magpie", hint: "炉=provider 团=token 鞴=会话 渣=错" },
    { id: "dewpond", title: "露池", eyebrow: "QUOTA DEWPOND", group: "配额", icon: "i-magpie", hint: "池=配额窗 水=余量 羊=会话 裂=错" },
    { id: "stewpond", title: "鱼塘", eyebrow: "PROVIDER STEWPOND", group: "用量", icon: "i-magpie", hint: "塘=provider 鱼=token 僧=会话 漏=错" },
    { id: "wheelwright", title: "轮匠坊", eyebrow: "PROVIDER WHEELWRIGHT", group: "用量", icon: "i-magpie", hint: "轮=provider 辐=token 匠=会话 裂=错" },
    { id: "dovecote", title: "鸽楼", eyebrow: "PROVIDER DOVECOTE", group: "用量", icon: "i-magpie", hint: "楼=provider 孔=token 旋=会话 破=错" },
    { id: "chandlery", title: "蜡烛坊", eyebrow: "PROVIDER CHANDLERY", group: "用量", icon: "i-magpie", hint: "架=provider 烛=token 匠=会话 泪=错" },
    { id: "letterpress", title: "活版印坊", eyebrow: "PROVIDER LETTERPRESS", group: "用量", icon: "i-magpie", hint: "机=provider 页=token 工=会话 卡=错" },
    { id: "potbank", title: "陶窑厂", eyebrow: "PROVIDER POTBANK", group: "用量", icon: "i-magpie", hint: "窑=provider 匣=token 工=会话 鼓=错" },
    { id: "blondin", title: "缆索采场", eyebrow: "PROVIDER BLONDIN", group: "用量", icon: "i-magpie", hint: "索=provider 板=token 车=会话 断=错" },
    { id: "transporter", title: "运输桥", eyebrow: "PROVIDER TRANSPORTER", group: "用量", icon: "i-magpie", hint: "塔=provider 车=token 渡=会话 索=错" },
    { id: "mailcoach", title: "驿马车", eyebrow: "PROVIDER MAILCOACH", group: "用量", icon: "i-magpie", hint: "车=provider 袋=token 骑=会话 轮=错" },
    { id: "puddling", title: "搅炼炉", eyebrow: "PROVIDER PUDDLING", group: "用量", icon: "i-magpie", hint: "炉=provider 球=token 搅=会话 冷=错" },
    { id: "icehouse", title: "冰窖", eyebrow: "QUOTA ICEHOUSE", group: "配额", icon: "i-magpie", hint: "窖=配额窗 冰=余量 夫=会话 融=错" },
    { id: "implosion", title: "定向爆破", eyebrow: "PROVIDER IMPLOSION", group: "用量", icon: "i-magpie", hint: "楼=provider 药=token 手=会话 哑=错" },
    { id: "treadwheelcrane", title: "踏轮吊", eyebrow: "PROVIDER TREADWHEEL CRANE", group: "用量", icon: "i-magpie", hint: "吊=provider 包=token 人=会话 索=错" },
    { id: "tanpit", title: "鞣皮坑", eyebrow: "PROVIDER TANPIT", group: "用量", icon: "i-magpie", hint: "坑=provider 皮=token 匠=会话 腐=错" },
    { id: "qanat", title: "坎儿井", eyebrow: "QUOTA QANAT", group: "配额", icon: "i-magpie", hint: "井=配额窗 水=余量 夫=会话 塌=错" },
    { id: "lightship", title: "灯船", eyebrow: "PROVIDER LIGHTSHIP", group: "用量", icon: "i-magpie", hint: "船=provider 光=token 守=会话 熄=错" },
    { id: "watertower", title: "水塔", eyebrow: "QUOTA WATERTOWER", group: "配额", icon: "i-magpie", hint: "罐=配额窗 水=余量 阀=会话 爆=错" },
    { id: "lagar", title: "踏酒槽", eyebrow: "PROVIDER LAGAR", group: "用量", icon: "i-magpie", hint: "槽=provider 汁=token 人=会话 漏=错" },
    { id: "dragonbone", title: "龙骨水车", eyebrow: "PROVIDER DRAGONBONE", group: "用量", icon: "i-magpie", hint: "槽=provider 板=token 摇=会话 落=错" },
    { id: "pumpjack", title: "磕头机", eyebrow: "PROVIDER PUMPJACK", group: "用量", icon: "i-magpie", hint: "架=provider 冲=token 工=会话 齿=错" },
    { id: "ropeway", title: "索道", eyebrow: "PROVIDER ROPEWAY", group: "用量", icon: "i-magpie", hint: "架=provider 斗=token 工=会话 落=错" },
    { id: "canallock", title: "船闸", eyebrow: "PROVIDER CANALLOCK", group: "用量", icon: "i-magpie", hint: "室=provider 水=token 工=会话 漏=错" },
    { id: "bascule", title: "开启桥", eyebrow: "PROVIDER BASCULE", group: "用量", icon: "i-magpie", hint: "瓣=provider 角=token 工=会话 卡=错" },
    { id: "smokejack", title: "烟轮", eyebrow: "PROVIDER SMOKEJACK", group: "用量", icon: "i-magpie", hint: "囱=provider 轮=token 叉=会话 垢=错" },
    { id: "flapgate", title: "潮闸", eyebrow: "PROVIDER FLAPGATE", group: "用量", icon: "i-magpie", hint: "涵=provider 板=token 守=会话 卡=错" },
    { id: "blastfurnace", title: "高炉", eyebrow: "PROVIDER BLAST FURNACE", group: "用量", icon: "i-magpie", hint: "炉=provider 焰=token 工=会话 凝=错" },
    { id: "mashtun", title: "糖化槽", eyebrow: "PROVIDER MASH TUN", group: "用量", icon: "i-magpie", hint: "槽=provider 醪=token 工=会话 焦=错" },
    { id: "boxbellows", title: "箱风箱", eyebrow: "PROVIDER BOX BELLOWS", group: "用量", icon: "i-magpie", hint: "箱=provider 塞=token 工=会话 裂=错" },
    { id: "plateway", title: "盘道", eyebrow: "PROVIDER PLATEWAY", group: "用量", icon: "i-magpie", hint: "轨=provider 车=token 工=会话 断=错" },
    { id: "whimgin", title: "马力绞盘", eyebrow: "PROVIDER WHIM GIN", group: "用量", icon: "i-magpie", hint: "轮=provider 绳=token 马=会话 断=错" },
    { id: "woolshed", title: "剪毛棚", eyebrow: "PROVIDER WOOLSHED", group: "用量", icon: "i-magpie", hint: "棚=provider 垛=token 工=会话 污=错" },
    { id: "blockmaker", title: "滑轮匠", eyebrow: "PROVIDER BLOCKMAKER", group: "用量", icon: "i-magpie", hint: "轮=provider 槽=token 匠=会话 裂=错" },
    { id: "glassblow", title: "玻璃吹炉", eyebrow: "PROVIDER GLASSBLOW", group: "用量", icon: "i-magpie", hint: "炉=provider 泡=token 匠=会话 裂=错" },
    { id: "dyevat", title: "染缸", eyebrow: "PROVIDER DYEVAT", group: "用量", icon: "i-magpie", hint: "缸=provider 液=token 工=会话 漏=错" },
    { id: "meiler", title: "炭堆", eyebrow: "PROVIDER MEILER", group: "用量", icon: "i-magpie", hint: "堆=provider 烟=token 工=会话 陷=错" },
    { id: "alembic", title: "蒸馏釜", eyebrow: "PROVIDER ALEMBIC", group: "用量", icon: "i-magpie", hint: "釜=provider 滴=token 工=会话 裂=错" },
    { id: "sugarloaf", title: "糖锥", eyebrow: "PROVIDER SUGARLOAF", group: "用量", icon: "i-magpie", hint: "模=provider 滴=token 工=会话 裂=错" },
    { id: "sawpit", title: "坑锯", eyebrow: "PROVIDER SAWPIT", group: "用量", icon: "i-magpie", hint: "木=provider 板=token 工=会话 夹=错" },
    { id: "slipway", title: "滑道船台", eyebrow: "PROVIDER SLIPWAY", group: "用量", icon: "i-magpie", hint: "台=provider 肋=token 匠=会话 拱=错" },
    { id: "screwpress", title: "压币机", eyebrow: "PROVIDER SCREWPRESS", group: "用量", icon: "i-magpie", hint: "机=provider 币=token 工=会话 剪=错" },
    { id: "corning", title: "腌肉坊", eyebrow: "PROVIDER CORNING", group: "用量", icon: "i-magpie", hint: "桶=provider 肉=token 工=会话 漏=错" },
    { id: "fishweir", title: "鱼梁", eyebrow: "PROVIDER FISHWEIR", group: "用量", icon: "i-magpie", hint: "堰=provider 鱼=token 人=会话 断=错" },
    { id: "brinepan", title: "煮盐盘", eyebrow: "PROVIDER BRINEPAN", group: "用量", icon: "i-magpie", hint: "盘=provider 盐=token 人=会话 焦=错" },
    { id: "stampmill", title: "捣矿磨", eyebrow: "PROVIDER STAMPMILL", group: "用量", icon: "i-magpie", hint: "架=provider 锤=token 工=会话 脱=错" },
    { id: "leachpit", title: "淋灰坑", eyebrow: "PROVIDER LEACHPIT", group: "用量", icon: "i-magpie", hint: "斗=provider 碱=token 人=会话 漏=错" },
    { id: "nilometer", title: "尼罗水位计", eyebrow: "QUOTA NILOMETER", group: "配额", icon: "i-magpie", hint: "井=配额窗 水=余量 读=会话 淤=错" },
    { id: "netloft", title: "织网楼", eyebrow: "PROVIDER NETLOFT", group: "用量", icon: "i-magpie", hint: "网=provider 目=token 工=会话 破=错" },
    { id: "oilpress", title: "油榨坊", eyebrow: "PROVIDER OILPRESS", group: "用量", icon: "i-magpie", hint: "床=provider 油=token 人=会话 裂=错" },
    { id: "jackwell", title: "取水井", eyebrow: "QUOTA JACKWELL", group: "配额", icon: "i-magpie", hint: "井=配额窗 水=余量 泵=会话 塞=错" },
    { id: "ashlaryard", title: "琢石场", eyebrow: "PROVIDER ASHLARYARD", group: "用量", icon: "i-magpie", hint: "台=provider 块=token 匠=会话 崩=错" },
    { id: "saggaryard", title: "匣钵堆场", eyebrow: "PROVIDER SAGGARYARD", group: "用量", icon: "i-magpie", hint: "堆=provider 坯=token 工=会话 裂=错" },
    { id: "dyehouse", title: "染坊", eyebrow: "PROVIDER DYEHOUSE", group: "用量", icon: "i-magpie", hint: "缸=provider 绞=token 工=会话 渍=错" },
    { id: "coopery", title: "箍桶铺", eyebrow: "PROVIDER COOPERY", group: "用量", icon: "i-magpie", hint: "桶=provider 板=token 匠=会话 脱=错" },
    { id: "waxhouse", title: "蜡烛屋", eyebrow: "PROVIDER WAXHOUSE", group: "用量", icon: "i-magpie", hint: "架=provider 烛=token 匠=会话 泪=错" },
    { id: "fishgarth", title: "渔堰", eyebrow: "PROVIDER FISHGARTH", group: "用量", icon: "i-magpie", hint: "堰=provider 鱼=token 人=会话 破=错" },
    { id: "turnery", title: "车旋坊", eyebrow: "PROVIDER TURNERY", group: "用量", icon: "i-magpie", hint: "床=provider 坯=token 匠=会话 裂=错" },
    { id: "smokery", title: "熏坊", eyebrow: "PROVIDER SMOKERY", group: "用量", icon: "i-magpie", hint: "架=provider 条=token 人=会话 坠=错" },
    { id: "ciderpress", title: "苹果酒坊", eyebrow: "PROVIDER CIDERPRESS", group: "用量", icon: "i-magpie", hint: "床=provider 汁=token 人=会话 散=错" },
    { id: "brickclamp", title: "砖窑夹", eyebrow: "PROVIDER BRICKCLAMP", group: "用量", icon: "i-magpie", hint: "堆=provider 砖=token 人=会话 焦=错" },
    { id: "limeburn", title: "石灰窑", eyebrow: "PROVIDER LIMEBURN", group: "用量", icon: "i-magpie", hint: "窑=provider 灰=token 工=会话 裂=错" },
    { id: "maltkiln", title: "焙麦窑", eyebrow: "PROVIDER MALTKILN", group: "用量", icon: "i-magpie", hint: "床=provider 麦=token 工=会话 焦=错" },
    { id: "saltcote", title: "盐屋", eyebrow: "PROVIDER SALTCOTE", group: "用量", icon: "i-magpie", hint: "槽=provider 盐=token 工=会话 浊=错" },
    { id: "tarkiln", title: "沥青窑", eyebrow: "PROVIDER TARKILN", group: "用量", icon: "i-magpie", hint: "釜=provider 漆=token 工=会话 溢=错" },
    { id: "barkhouse", title: "鞣皮坊", eyebrow: "PROVIDER BARKHOUSE", group: "用量", icon: "i-magpie", hint: "磨=provider 屑=token 工=会话 卡=错" },
    { id: "sugarhouse", title: "糖坊", eyebrow: "PROVIDER SUGARHOUSE", group: "用量", icon: "i-magpie", hint: "锅=provider 沸=token 工=会话 糊=错" },
    { id: "vinegarhouse", title: "醋坊", eyebrow: "PROVIDER VINEGARHOUSE", group: "用量", icon: "i-magpie", hint: "桶=provider 母=token 人=会话 腻=错" },
    { id: "brewhouse", title: "酿酒坊", eyebrow: "PROVIDER BREWHOUSE", group: "用量", icon: "i-magpie", hint: "槽=provider 帽=token 匠=会话 凝=错" },
    { id: "palmento", title: "踩酒庄", eyebrow: "PROVIDER PALMENTO", group: "用量", icon: "i-magpie", hint: "池=provider 帽=token 人=会话 酸=错" },
    { id: "cornloft", title: "高架谷仓", eyebrow: "PROVIDER CORNLOFT", group: "用量", icon: "i-magpie", hint: "仓=provider 谷=token 工=会话 蠹=错" },
    { id: "glasscone", title: "玻璃窑", eyebrow: "PROVIDER GLASSCONE", group: "用量", icon: "i-magpie", hint: "窑=provider 泡=token 匠=会话 霜=错" },
    { id: "yarnloft", title: "绞线楼", eyebrow: "PROVIDER YARNLOFT", group: "用量", icon: "i-magpie", hint: "轮=provider 绞=token 工=会话 缠=错" },
    { id: "gigmill", title: "起绒机", eyebrow: "PROVIDER GIGMILL", group: "用量", icon: "i-magpie", hint: "辊=provider 绒=token 工=会话 撕=错" },
    { id: "pinmill", title: "制针坊", eyebrow: "PROVIDER PINMILL", group: "用量", icon: "i-magpie", hint: "轮=provider 针=token 工=会话 折=错" },
    { id: "wirebench", title: "拉丝台", eyebrow: "PROVIDER WIREBENCH", group: "用量", icon: "i-magpie", hint: "台=provider 线=token 人=会话 断=错" },
    { id: "nailery", title: "钉坊", eyebrow: "PROVIDER NAILERY", group: "用量", icon: "i-magpie", hint: "砧=provider 钉=token 匠=会话 弯=错" },
    { id: "finery", title: "精炼炉", eyebrow: "PROVIDER FINERY", group: "用量", icon: "i-magpie", hint: "炉=provider 团=token 工=会话 冷=错" },
    { id: "slittingmill", title: "纵剪机", eyebrow: "PROVIDER SLITTINGMILL", group: "用量", icon: "i-magpie", hint: "辊=provider 条=token 人=会话 卡=错" },
    { id: "japanworks", title: "涂漆坊", eyebrow: "PROVIDER JAPANWORKS", group: "用量", icon: "i-magpie", hint: "架=provider 件=token 匠=会话 泡=错" },
    { id: "pressroom", title: "印刷坊", eyebrow: "PROVIDER PRESSROOM", group: "用量", icon: "i-magpie", hint: "机=provider 张=token 匠=会话 污=错" },
    { id: "bindery", title: "装订坊", eyebrow: "PROVIDER BINDERY", group: "用量", icon: "i-magpie", hint: "架=provider 帖=token 工=会话 散=错" },
    { id: "paperpress", title: "压纸坊", eyebrow: "PROVIDER PAPERPRESS", group: "用量", icon: "i-magpie", hint: "压=provider 帖=token 工=会话 皱=错" },
    { id: "bodger", title: "绿木工", eyebrow: "PROVIDER BODGER", group: "用量", icon: "i-magpie", hint: "马=provider 腿=token 工=会话 裂=错" },
    { id: "joinery", title: "细木坊", eyebrow: "PROVIDER JOINERY", group: "用量", icon: "i-magpie", hint: "台=provider 榫=token 工=会话 崩=错" },
    { id: "ripsaw", title: "拉锯坊", eyebrow: "PROVIDER RIPSAW", group: "用量", icon: "i-magpie", hint: "锯=provider 板=token 工=会话 卡=错" },
    { id: "steambend", title: "蒸弯坊", eyebrow: "PROVIDER STEAMBEND", group: "用量", icon: "i-magpie", hint: "箱=provider 条=token 工=会话 弹=错" },
    { id: "marquetry", title: "镶嵌坊", eyebrow: "PROVIDER MARQUETRY", group: "用量", icon: "i-magpie", hint: "板=provider 片=token 匠=会话 翘=错" },
    { id: "clockbench", title: "钟表坊", eyebrow: "PROVIDER CLOCKBENCH", group: "用量", icon: "i-magpie", hint: "轮=provider 齿=token 匠=会话 断=错" },
    { id: "lensgrinder", title: "磨镜坊", eyebrow: "PROVIDER LENSGRINDER", group: "用量", icon: "i-magpie", hint: "盘=provider 镜=token 匠=会话 干=错" },
    { id: "filer", title: "锉匠坊", eyebrow: "PROVIDER FILER", group: "用量", icon: "i-magpie", hint: "台=provider 件=token 工=会话 钝=错" },
    { id: "planer", title: "刨床坊", eyebrow: "PROVIDER PLANER", group: "用量", icon: "i-magpie", hint: "床=provider 屑=token 工=会话 撕=错" },
    { id: "cordwain", title: "制鞋坊", eyebrow: "PROVIDER CORDWAIN", group: "用量", icon: "i-magpie", hint: "楦=provider 鞋=token 匠=会话 裂=错" },
    { id: "harnessmaker", title: "马具坊", eyebrow: "PROVIDER HARNESSMAKER", group: "用量", icon: "i-magpie", hint: "轭=provider 套=token 匠=会话 松=错" },
    { id: "tinsmith", title: "锡器坊", eyebrow: "PROVIDER TINSMITH", group: "用量", icon: "i-magpie", hint: "卷=provider 壶=token 工=会话 裂=错" },
    { id: "pewterer", title: "白镴坊", eyebrow: "PROVIDER PEWTERER", group: "用量", icon: "i-magpie", hint: "埚=provider 罐=token 匠=会话 干=错" },
    { id: "cannonfoundry", title: "铸炮坊", eyebrow: "PROVIDER CANNONFOUNDRY", group: "用量", icon: "i-magpie", hint: "镗=provider 炮=token 匠=会话 砂=错" },
    { id: "farrier", title: "蹄铁坊", eyebrow: "PROVIDER FARRIER", group: "用量", icon: "i-magpie", hint: "箱=provider 蹄=token 匠=会话 偏=错" },
    { id: "knifegrinder", title: "磨刀坊", eyebrow: "PROVIDER KNIFEGRINDER", group: "用量", icon: "i-magpie", hint: "轮=provider 刀=token 工=会话 缺=错" },
    { id: "keysmith", title: "锁匙坊", eyebrow: "PROVIDER KEYSMITH", group: "用量", icon: "i-magpie", hint: "台=provider 匙=token 工=会话 偏=错" },
    { id: "riddle", title: "筛坊", eyebrow: "PROVIDER RIDDLE", group: "用量", icon: "i-magpie", hint: "筛=provider 粒=token 工=会话 破=错" },
    { id: "hooper", title: "箍匠坊", eyebrow: "PROVIDER HOOPER", group: "用量", icon: "i-magpie", hint: "桶=provider 箍=token 匠=会话 脱=错" },
    { id: "mint", title: "铸币坊", eyebrow: "PROVIDER MINT", group: "用量", icon: "i-magpie", hint: "压=provider 币=token 工=会话 裂=错" },
    { id: "litho", title: "石印坊", eyebrow: "PROVIDER LITHO", group: "用量", icon: "i-magpie", hint: "版=provider 印=token 工=会话 糊=错" },
    { id: "pottery", title: "陶坊", eyebrow: "PROVIDER POTTERY", group: "用量", icon: "i-magpie", hint: "轮=provider 坯=token 工=会话 塌=错" },
    { id: "warploom", title: "立织机", eyebrow: "PROVIDER WARPLOOM", group: "用量", icon: "i-magpie", hint: "机=provider 经=token 工=会话 断=错" },
    { id: "scriptorium", title: "抄写坊", eyebrow: "PROVIDER SCRIPTORIUM", group: "用量", icon: "i-magpie", hint: "案=provider 页=token 笔=会话 污=错" },
    { id: "whipcord", title: "绞绳坊", eyebrow: "PROVIDER WHIPCORD", group: "用量", icon: "i-magpie", hint: "架=provider 股=token 工=会话 扭=错" },
    { id: "tentmaker", title: "帐幕坊", eyebrow: "PROVIDER TENTMAKER", group: "用量", icon: "i-magpie", hint: "架=provider 幅=token 工=会话 撕=错" },
    { id: "horsegin", title: "绞盘坊", eyebrow: "PROVIDER HORSEGIN", group: "用量", icon: "i-magpie", hint: "盘=provider 桶=token 马=会话 卡=错" },
    { id: "cupola", title: "冶炼坊", eyebrow: "PROVIDER CUPOLA", group: "用量", icon: "i-magpie", hint: "炉=provider 锭=token 工=会话 凝=错" },
    { id: "assay", title: "化验坊", eyebrow: "PROVIDER ASSAY", group: "用量", icon: "i-magpie", hint: "秤=provider 码=token 师=会话 漂=错" },
    { id: "noria", title: "链水车", eyebrow: "PROVIDER NORIA", group: "用量", icon: "i-magpie", hint: "轮=provider 兜=token 工=会话 绞=错" },
    { id: "hollander", title: "打浆坊", eyebrow: "PROVIDER HOLLANDER", group: "用量", icon: "i-magpie", hint: "槽=provider 张=token 工=会话 裂=错" },
    { id: "trapetum", title: "碾油坊", eyebrow: "PROVIDER TRAPETUM", group: "用量", icon: "i-magpie", hint: "碾=provider 油=token 工=会话 裂=错" },
    { id: "fuller", title: "漂洗坊", eyebrow: "PROVIDER FULLER", group: "用量", icon: "i-magpie", hint: "槽=provider 匹=token 工=会话 裂=错" },
    { id: "brickfield", title: "砖窑场", eyebrow: "PROVIDER BRICKFIELD", group: "用量", icon: "i-magpie", hint: "窑=provider 砖=token 工=会话 塌=错" },
    { id: "gloryhole", title: "吹制坊", eyebrow: "PROVIDER GLORYHOLE", group: "用量", icon: "i-magpie", hint: "炉=provider 泡=token 工=会话 裂=错" },
    { id: "topcart", title: "顶车坊", eyebrow: "PROVIDER TOPCART", group: "用量", icon: "i-magpie", hint: "轮=provider 股=token 车=会话 绷=错" },
    { id: "hogshead", title: "大桶坊", eyebrow: "PROVIDER HOGSHEAD", group: "用量", icon: "i-magpie", hint: "桶=provider 箍=token 匠=会话 崩=错" },
    { id: "cordwood", title: "柴炭场", eyebrow: "PROVIDER CORDWOOD", group: "用量", icon: "i-magpie", hint: "堆=provider 捆=token 工=会话 塌=错" },
    { id: "triphammer", title: "锤锻坊", eyebrow: "PROVIDER TRIPHAMMER", group: "用量", icon: "i-magpie", hint: "锤=provider 锻=token 工=会话 落=错" },
    { id: "drawkiln", title: "抽料窑", eyebrow: "PROVIDER DRAWKILN", group: "用量", icon: "i-magpie", hint: "窑=provider 料=token 工=会话 堵=错" },
    { id: "bleachgreen", title: "漂青场", eyebrow: "PROVIDER BLEACHGREEN", group: "用量", icon: "i-magpie", hint: "场=provider 匹=token 工=会话 焦=错" },
    { id: "sailmaker", title: "帆匠坊", eyebrow: "PROVIDER SAILMAKER", group: "用量", icon: "i-magpie", hint: "台=provider 帆=token 匠=会话 撕=错" },
    { id: "nursery", title: "苗圃", eyebrow: "PROVIDER NURSERY", group: "用量", icon: "i-magpie", hint: "床=provider 苗=token 工=会话 蔫=错" },
    { id: "basketry", title: "编篮坊", eyebrow: "PROVIDER BASKETRY", group: "用量", icon: "i-magpie", hint: "框=provider 股=token 工=会话 折=错" },
    { id: "hopyard", title: "啤酒花架", eyebrow: "PROVIDER HOPYARD", group: "用量", icon: "i-magpie", hint: "架=provider 藤=token 工=会话 断=错" },
    { id: "gravelpit", title: "采砾坑", eyebrow: "PROVIDER GRAVELPIT", group: "用量", icon: "i-magpie", hint: "坑=provider 砾=token 工=会话 塌=错" },
    { id: "saltpan", title: "晒盐池", eyebrow: "PROVIDER SALTPAN", group: "用量", icon: "i-magpie", hint: "池=provider 晶=token 耙=会话 决=错" },
    { id: "tileworks", title: "瓦作场", eyebrow: "PROVIDER TILEWORKS", group: "用量", icon: "i-magpie", hint: "窑=provider 瓦=token 工=会话 裂=错" },
    { id: "wormtub", title: "冷凝坊", eyebrow: "PROVIDER WORMTUB", group: "用量", icon: "i-magpie", hint: "槽=provider 滴=token 工=会话 漏=错" },
    { id: "tallow", title: "熬脂坊", eyebrow: "PROVIDER TALLOW", group: "用量", icon: "i-magpie", hint: "锅=provider 块=token 工=会话 糊=错" },
    { id: "engraving", title: "雕版坊", eyebrow: "PROVIDER ENGRAVING", group: "用量", icon: "i-magpie", hint: "版=provider 线=token 工=会话 滑=错" },
    { id: "polelathe", title: "杆车床", eyebrow: "PROVIDER POLELATHE", group: "用量", icon: "i-magpie", hint: "床=provider 坯=token 工=会话 甩=错" },
    { id: "heckle", title: "梳麻坊", eyebrow: "PROVIDER HECKLE", group: "用量", icon: "i-magpie", hint: "台=provider 缕=token 工=会话 折=错" },
    { id: "inkworks", title: "制墨坊", eyebrow: "PROVIDER INKWORKS", group: "用量", icon: "i-magpie", hint: "锅=provider 锭=token 工=会话 裂=错" },
    { id: "oysterbed", title: "牡蛎床", eyebrow: "PROVIDER OYSTERBED", group: "用量", icon: "i-magpie", hint: "床=provider 蚝=token 舟=会话 碎=错" },
    { id: "granary", title: "谷仓", eyebrow: "PROVIDER GRANARY", group: "用量", icon: "i-magpie", hint: "仓=provider 袋=token 农=会话 爆=错" },
    { id: "creamery", title: "乳酪坊", eyebrow: "PROVIDER CREAMERY", group: "用量", icon: "i-magpie", hint: "搅=provider 酪=token 工=会话 裂=错" },
    { id: "goffering", title: "褶熨坊", eyebrow: "PROVIDER GOFFERING", group: "用量", icon: "i-magpie", hint: "筒=provider 褶=token 工=会话 焦=错" },
    { id: "starchery", title: "浆纱坊", eyebrow: "PROVIDER STARCHERY", group: "用量", icon: "i-magpie", hint: "槽=provider 匹=token 工=会话 霉=错" },
    { id: "glazier", title: "镶玻璃坊", eyebrow: "PROVIDER GLAZIER", group: "用量", icon: "i-magpie", hint: "窗=provider 格=token 工=会话 裂=错" },
    { id: "lampwright", title: "灯具坊", eyebrow: "PROVIDER LAMPWRIGHT", group: "用量", icon: "i-magpie", hint: "台=provider 焰=token 工=会话 熏=错" },
    { id: "luthier", title: "提琴坊", eyebrow: "PROVIDER LUTHIER", group: "用量", icon: "i-magpie", hint: "台=provider 琴=token 工=会话 裂=错" },
    { id: "watchmaker", title: "钟表坊", eyebrow: "PROVIDER WATCHMAKER", group: "用量", icon: "i-magpie", hint: "台=provider 轮=token 工=会话 弹=错" },
    { id: "illuminator", title: "缮写坊", eyebrow: "PROVIDER ILLUMINATOR", group: "用量", icon: "i-magpie", hint: "案=provider 彩=token 工=会话 污=错" },
    { id: "jacquard", title: "提花织坊", eyebrow: "PROVIDER JACQUARD", group: "用量", icon: "i-magpie", hint: "机=provider 纹=token 工=会话 断=错" },
    { id: "lacemaker", title: "蕾丝坊", eyebrow: "PROVIDER LACEMAKER", group: "用量", icon: "i-magpie", hint: "枕=provider 辫=token 工=会话 挂=错" },
    { id: "apothecary", title: "药房", eyebrow: "PROVIDER APOTHECARY", group: "用量", icon: "i-magpie", hint: "柜=provider 瓶=token 秤=会话 裂=错" },
    { id: "hatter", title: "帽匠坊", eyebrow: "PROVIDER HATTER", group: "用量", icon: "i-magpie", hint: "楦=provider 帽=token 工=会话 破=错" },
    { id: "milliner", title: "女帽坊", eyebrow: "PROVIDER MILLINER", group: "用量", icon: "i-magpie", hint: "架=provider 饰=token 工=会话 破=错" },
    { id: "haberdasher", title: "杂货坊", eyebrow: "PROVIDER HABERDASHER", group: "用量", icon: "i-magpie", hint: "柜=provider 卷=token 尺=会话 洒=错" },
    { id: "osier", title: "柳编坊", eyebrow: "PROVIDER OSIER", group: "用量", icon: "i-magpie", hint: "凳=provider 篮=token 条=会话 弹=错" },
    { id: "perfumery", title: "调香坊", eyebrow: "PROVIDER PERFUMERY", group: "用量", icon: "i-magpie", hint: "案=provider 瓶=token 工=会话 洒=错" },
    { id: "tinker", title: "白铁匠", eyebrow: "PROVIDER TINKER", group: "用量", icon: "i-magpie", hint: "炉=provider 壶=token 焊=会话 漏=错" },
    { id: "quern", title: "手磨坊", eyebrow: "PROVIDER QUERN", group: "用量", icon: "i-magpie", hint: "盘=provider 谷=token 转=会话 裂=错" },
    { id: "stillroom", title: "蒸馏坊", eyebrow: "PROVIDER STILLROOM", group: "用量", icon: "i-magpie", hint: "釜=provider 滴=token 工=会话 爆=错" },
    { id: "herbalist", title: "草药坊", eyebrow: "PROVIDER HERBALIST", group: "用量", icon: "i-magpie", hint: "架=provider 束=token 捆=会话 枯=错" },
    { id: "japanner", title: "莳绘坊", eyebrow: "PROVIDER MAKI-E", group: "用量", icon: "i-magpie", hint: "案=provider 层=token 工=会话 泡=错" },
    { id: "banker", title: "石作台", eyebrow: "PROVIDER BANKER", group: "用量", icon: "i-magpie", hint: "台=provider 石=token 锤=会话 裂=错" },
    { id: "enameler", title: "珐琅坊", eyebrow: "PROVIDER ENAMELER", group: "用量", icon: "i-magpie", hint: "窑=provider 层=token 绘=会话 泡=错" },
    { id: "salter", title: "腌坊", eyebrow: "PROVIDER SALTER", group: "用量", icon: "i-magpie", hint: "槽=provider 鱼=token 腌=会话 腐=错" },
    { id: "besom", title: "扫帚坊", eyebrow: "PROVIDER BESOM", group: "用量", icon: "i-magpie", hint: "凳=provider 帚=token 扎=会话 散=错" },
    { id: "confectioner", title: "糖果坊", eyebrow: "PROVIDER CONFECTIONER", group: "用量", icon: "i-magpie", hint: "案=provider 糖=token 拉=会话 焦=错" },
    { id: "organbuilder", title: "管风琴坊", eyebrow: "PROVIDER ORGANBUILDER", group: "用量", icon: "i-magpie", hint: "架=provider 管=token 校=会话 凹=错" },
    { id: "flutemaker", title: "笛坊", eyebrow: "PROVIDER FLUTEMAKER", group: "用量", icon: "i-magpie", hint: "床=provider 笛=token 铰=会话 裂=错" },
    { id: "harpmaker", title: "竖琴坊", eyebrow: "PROVIDER HARPMAKER", group: "用量", icon: "i-magpie", hint: "架=provider 弦=token 雕=会话 绷=错" },
    { id: "stevedore", title: "码头坊", eyebrow: "PROVIDER STEVEDORE", group: "用量", icon: "i-magpie", hint: "泊=provider 包=token 钩=会话 爆=错" },
    { id: "lighterman", title: "驳船", eyebrow: "PROVIDER LIGHTERMAN", group: "用量", icon: "i-magpie", hint: "船=provider 桶=token 篙=会话 沉=错" },
    { id: "ferryman", title: "渡船", eyebrow: "PROVIDER FERRYMAN", group: "用量", icon: "i-magpie", hint: "渡=provider 客=token 缆=会话 缠=错" },
    { id: "lockkeeper", title: "闸房", eyebrow: "PROVIDER LOCKKEEPER", group: "用量", icon: "i-magpie", hint: "室=provider 水=token 绞=会话 卡=错" },
    { id: "narrowboat", title: "窄船", eyebrow: "PROVIDER NARROWBOAT", group: "用量", icon: "i-magpie", hint: "舱=provider 箱=token 舵=会话 倾=错" },
    { id: "harbormaster", title: "港务", eyebrow: "PROVIDER HARBORMASTER", group: "用量", icon: "i-magpie", hint: "楼=provider 船=token 旗=会话 缠=错" },
    { id: "customshouse", title: "关楼", eyebrow: "PROVIDER CUSTOMSHOUSE", group: "用量", icon: "i-magpie", hint: "署=provider 包=token 戳=会话 锁=错" },
    { id: "pilothouse", title: "引航", eyebrow: "PROVIDER PILOTHOUSE", group: "用量", icon: "i-magpie", hint: "站=provider 舟=token 读=会话 雾=错" },
    { id: "lookout", title: "瞭望塔", eyebrow: "PROVIDER LOOKOUT", group: "用量", icon: "i-magpie", hint: "台=provider 帆=token 望=会话 破=错" },
    { id: "signalman", title: "信号台", eyebrow: "PROVIDER SIGNALMAN", group: "用量", icon: "i-magpie", hint: "塔=provider 旗=token 绞=会话 缠=错" },
    { id: "tidegauge", title: "潮位", eyebrow: "PROVIDER TIDEGAUGE", group: "用量", icon: "i-magpie", hint: "尺=provider 水=token 读=会话 淤=错" },
    { id: "tollkeeper", title: "收费桥", eyebrow: "PROVIDER TOLLKEEPER", group: "用量", icon: "i-magpie", hint: "亭=provider 车=token 杆=会话 卡=错" },
    { id: "bridgemaster", title: "桥务", eyebrow: "PROVIDER BRIDGEMASTER", group: "用量", icon: "i-magpie", hint: "拱=provider 船=token 探=会话 裂=错" },
    { id: "shipwright", title: "船匠", eyebrow: "PROVIDER SHIPWRIGHT", group: "用量", icon: "i-magpie", hint: "台=provider 肋=token 斫=会话 裂=错" },
    { id: "ropemaker", title: "索匠", eyebrow: "PROVIDER ROPEMAKER", group: "用量", icon: "i-magpie", hint: "槽=provider 股=token 转=会话 结=错" },
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
    { id: "radar", title: "路由雷达", eyebrow: "RADAR SCAN", group: "几何", icon: "i-pulse", hint: "Provider 环" },
    { id: "loom", title: "请求织机", eyebrow: "REQUEST LOOM", group: "几何", icon: "i-stack", hint: "请求织成彩带" },
    { id: "rhythm", title: "请求节奏", eyebrow: "RHYTHM", group: "几何", icon: "i-bolt", hint: "16 步节拍" },
    { id: "orrery", title: "轨道星图", eyebrow: "ORRERY", group: "场景", icon: "i-magpie", hint: "行星与卫星" },
    { id: "chips", title: "连击卡牌", eyebrow: "COMBO CHIPS", group: "趣味", icon: "i-zap", hint: "游戏化连击" },
    { id: "factory", title: "请求工厂", eyebrow: "REQUEST FACTORY", group: "场景", icon: "i-server", hint: "排队 → 完成" },
    { id: "bees", title: "蜂巢", eyebrow: "BEEHIVE", group: "生态", icon: "i-magpie", hint: "会话绕着 Provider" },
    { id: "stellar", title: "夜航", eyebrow: "STELLAR DRIFT", group: "天象", icon: "i-sparkle", hint: "星空与流星 · 陪伴首选" },
    { id: "burn", title: "燃烧速率", eyebrow: "BURN RATE", group: "实时", icon: "i-flame", hint: "配额窗口烧速 / 预测重置" },
    { id: "candle", title: "K线吞吐", eyebrow: "CANDLE THROUGHPUT", group: "用量", icon: "i-chart", hint: "OHLC·涨跌K线" },
    { id: "gauge", title: "仪表盘", eyebrow: "GAUGE MATRIX", group: "实时", icon: "i-pulse", hint: "KPI/配额仪表" },
    { id: "bloom", title: "绽放", eyebrow: "REQUEST BLOOM", group: "生态", icon: "i-sparkle", hint: "请求开花·藤蔓生长" },
    { id: "petri", title: "培养皿", eyebrow: "PETRI DISH", group: "生态", icon: "i-magpie", hint: "请求=活细胞" },
    { id: "aurora", title: "极光", eyebrow: "AURORA", group: "天象", icon: "i-sparkle", hint: "请求=天空光带" },
    { id: "constellation", title: "星座", eyebrow: "CONSTELLATION", group: "天象", icon: "i-magpie", hint: "会话=星图" },
    { id: "prism", title: "棱镜", eyebrow: "PRISM", group: "结构", icon: "i-route", hint: "白光分成Provider份额" },
    { id: "terrarium", title: "玻璃缸", eyebrow: "TERRARIUM", group: "生态", icon: "i-magpie", hint: "会话=植物生态" },
    { id: "echo", title: "回声", eyebrow: "ECHO", group: "天象", icon: "i-magpie", hint: "涟漪=Token" },
    { id: "mosaic", title: "马赛克", eyebrow: "MOSAIC", group: "用量", icon: "i-chart", hint: "每请求一块砖" },
    { id: "origami", title: "折纸", eyebrow: "ORIGAMI", group: "几何", icon: "i-magpie", hint: "纸鹤=会话" },
    { id: "firefly", title: "萤火虫", eyebrow: "FIREFLY", group: "生态", icon: "i-magpie", hint: "萤火=会话" },
    { id: "mandala", title: "曼陀罗", eyebrow: "MANDALA", group: "几何", icon: "i-magpie", hint: "瓣=会话 环=尝试" },
    { id: "quilt", title: "拼布", eyebrow: "QUILT", group: "用量", icon: "i-chart", hint: "每会话一块布" },
    { id: "vortex", title: "漩涡", eyebrow: "VORTEX", group: "几何", icon: "i-magpie", hint: "螺旋=会话" },
    { id: "kaleido", title: "万花筒", eyebrow: "KALEIDO", group: "几何", icon: "i-magpie", hint: "楔=会话 12折" },
    { id: "orbit", title: "彗星轨道", eyebrow: "ORBIT", group: "趣味", icon: "i-magpie", hint: "彗=会话 尾=弧" },
    { id: "rain", title: "雨幕", eyebrow: "RAIN", group: "天象", icon: "i-magpie", hint: "滴=会话 红=失败" },
    { id: "bubbles", title: "气泡", eyebrow: "BUBBLES", group: "生态", icon: "i-magpie", hint: "泡=会话 沉=失败" },
    { id: "spectrum", title: "频谱", eyebrow: "SPECTRUM", group: "用量", icon: "i-chart", hint: "峰=会话 高=Token" },
    { id: "wave", title: "波浪线", eyebrow: "WAVE", group: "用量", icon: "i-chart", hint: "双轨波形" },
    { id: "galaxy", title: "星系", eyebrow: "GALAXY", group: "天象", icon: "i-magpie", hint: "星=会话 双臂" },
    { id: "dna", title: "DNA", eyebrow: "DNA", group: "几何", icon: "i-magpie", hint: "对=会话 宽=Token" },
    { id: "nebula", title: "星云", eyebrow: "NEBULA", group: "天象", icon: "i-magpie", hint: "云=会话 大=Token" },
    { id: "tide", title: "潮汐", eyebrow: "TIDE", group: "天象", icon: "i-magpie", hint: "潮=今日量" },
    { id: "maze", title: "迷宫", eyebrow: "MAZE", group: "趣味", icon: "i-magpie", hint: "段=会话 长=Token" },
    { id: "quartz", title: "晶簇", eyebrow: "QUARTZ", group: "几何", icon: "i-magpie", hint: "晶=会话 高=Token" },
    { id: "ripple", title: "涟漪", eyebrow: "RIPPLE", group: "几何", icon: "i-magpie", hint: "滴=会话 大=Token" },
    { id: "lantern", title: "天灯", eyebrow: "LANTERN", group: "天象", icon: "i-magpie", hint: "灯=会话 大=Token" },
    { id: "pinwheel", title: "风车", eyebrow: "PINWHEEL", group: "生态", icon: "i-magpie", hint: "轮=会话 大=Token" },
    { id: "chime", title: "风铃", eyebrow: "CHIME", group: "天象", icon: "i-magpie", hint: "管=会话 长=Token" },
    { id: "firework", title: "烟花", eyebrow: "FIREWORK", group: "天象", icon: "i-magpie", hint: "爆=会话 径=Token" },
    { id: "fountain", title: "喷泉", eyebrow: "FOUNTAIN", group: "天象", icon: "i-magpie", hint: "喷=会话 高=Token" },
    { id: "pendulum", title: "摆锤", eyebrow: "PENDULUM", group: "几何", icon: "i-magpie", hint: "摆=会话 长=Token" },
    { id: "aurora2", title: "极光幕", eyebrow: "AURORA2", group: "天象", icon: "i-magpie", hint: "幕=会话 高=Token" },
    { id: "beehive", title: "蜂房", eyebrow: "BEEHIVE", group: "生态", icon: "i-magpie", hint: "格=会话 满=Token" },
    { id: "galton", title: "豆袋机", eyebrow: "GALTON", group: "趣味", icon: "i-chart", hint: "球=会话 落=Provider" },
    { id: "tidepool", title: "潮汐池", eyebrow: "TIDEPOOL", group: "用量", icon: "i-pulse", hint: "水位=配额 浪=TPS" },
    { id: "pinboard", title: "钉板", eyebrow: "PINBOARD", group: "实时", icon: "i-stack", hint: "KPI/配额/会话钉上墙" },
    { id: "rosetta", title: "罗塞塔", eyebrow: "ROSETTA", group: "配额", icon: "i-chart", hint: "环带=配额 刻痕=会话" },
    { id: "eclipse", title: "日蚀", eyebrow: "ECLIPSE", group: "配额", icon: "i-sun", hint: "暗盘=量 冕=会话 沿=窗" },
    { id: "tapestry", title: "织锦", eyebrow: "TAPESTRY", group: "配额", icon: "i-stack", hint: "经=配额 纬=会话" },
    { id: "lighthouse", title: "灯塔", eyebrow: "LIGHTHOUSE", group: "实时", icon: "i-pulse", hint: "塔=配额 光束=会话" },
    { id: "harbor", title: "港口", eyebrow: "HARBOR", group: "实时", icon: "i-stack", hint: "船=agent 箱=tries 浮标=配额" },
    { id: "aviary", title: "鸟舍", eyebrow: "AVIARY", group: "生态", icon: "i-magpie", hint: "巢=agent 蛋=会话 果=配额" },
    { id: "greenhouse", title: "温室", eyebrow: "GREENHOUSE", group: "生态", icon: "i-magpie", hint: "架=agent 盆=会话 温度计=配额" },
    { id: "winery", title: "酒庄", eyebrow: "WINERY", group: "配额", icon: "i-stack", hint: "桶=配额窗 滴=会话" },
    { id: "bakery", title: "面包房", eyebrow: "BAKERY", group: "场景", icon: "i-magpie", hint: "炉=agent 包=会话 计=配额" },
    { id: "carnival", title: "嘉年华", eyebrow: "CARNIVAL", group: "场景", icon: "i-magpie", hint: "帐=配额窗 灯=热度 球=会话" },
    { id: "studio", title: "画室", eyebrow: "STUDIO", group: "场景", icon: "i-magpie", hint: "架=配额窗 笔=会话 罐=provider" },
    { id: "campfire", title: "篝火", eyebrow: "CAMPFIRE", group: "生态", icon: "i-flame", hint: "火=会话 石=agent 柴=配额余" },
    { id: "aquarium", title: "水族箱", eyebrow: "AQUARIUM", group: "生态", icon: "i-magpie", hint: "泡=agent 鱼=会话 水线=配额" },
    { id: "dojo", title: "道场", eyebrow: "DOJO", group: "场景", icon: "i-zap", hint: "桩=agent 痕=tries 卷=配额" },
    { id: "library", title: "图书馆", eyebrow: "LIBRARY", group: "场景", icon: "i-doc", hint: "架=配额窗 书=余量 桌=会话" },
    { id: "arcade", title: "电玩厅", eyebrow: "ARCADE", group: "场景", icon: "i-zap", hint: "机=配额窗 灯=热度 杆=会话" },
    { id: "castle", title: "城堡", eyebrow: "CASTLE", group: "场景", icon: "i-magpie", hint: "塔=配额窗 旗=热度 卫=会话" },
    { id: "observatory", title: "天文台", eyebrow: "OBSERVATORY", group: "场景", icon: "i-magpie", hint: "穹=配额窗 镜=会话 缝=用量" },
    { id: "station", title: "车站", eyebrow: "STATION", group: "场景", icon: "i-route", hint: "灯=配额窗 车=会话 钟=当前" },
    { id: "circus", title: "马戏团", eyebrow: "CIRCUS", group: "场景", icon: "i-magpie", hint: "索=会话 杆=token 球=配额" },
    { id: "subway", title: "地铁图", eyebrow: "SUBWAY", group: "场景", icon: "i-route", hint: "站=配额窗 车=会话" },
    { id: "windmill", title: "风车塔", eyebrow: "WINDMILL", group: "场景", icon: "i-magpie", hint: "塔=配额窗 叶=热度 鸟=会话" },
    { id: "orchestra", title: "管弦乐", eyebrow: "ORCHESTRA", group: "场景", icon: "i-magpie", hint: "环=配额窗 音符=会话" },
    { id: "harvest", title: "麦田", eyebrow: "HARVEST", group: "场景", icon: "i-magpie", hint: "穗=配额窗 机=会话 高=余量" },
    { id: "hotpot", title: "火锅店", eyebrow: "HOTPOT", group: "场景", icon: "i-flame", hint: "锅=配额窗 料=会话 火=热度" },
    { id: "racing", title: "赛道", eyebrow: "RACING", group: "场景", icon: "i-zap", hint: "门=配额窗 车=会话 灯=热度" },
    { id: "forge", title: "铁匠铺", eyebrow: "FORGE", group: "场景", icon: "i-flame", hint: "炉=配额窗 件=会话 火=热度" },
    { id: "reef", title: "珊瑚礁", eyebrow: "REEF", group: "生态", icon: "i-magpie", hint: "瑚=配额窗 鱼=会话 高=余量" },
    { id: "tavern", title: "酒馆", eyebrow: "TAVERN", group: "场景", icon: "i-magpie", hint: "桶=配额窗 客=会话 酒=余量" },
    { id: "rodeo", title: "牧场", eyebrow: "RODEO", group: "场景", icon: "i-magpie", hint: "栏=配额窗 骑=会话 门=用量" },
    { id: "depot", title: "分拣站", eyebrow: "DEPOT", group: "场景", icon: "i-stack", hint: "架=配额窗 件=会话 位=余量" },
    { id: "laundry", title: "洗衣房", eyebrow: "LAUNDRY", group: "场景", icon: "i-magpie", hint: "筒=配额窗 衣=会话 位=余量" },
    { id: "temple", title: "神社", eyebrow: "TEMPLE", group: "场景", icon: "i-magpie", hint: "居=配额窗 客=会话 灯=热度" },
    { id: "market", title: "市集", eyebrow: "MARKET", group: "场景", icon: "i-magpie", hint: "摊=配额窗 客=会话 货=余量" },
    { id: "gallery", title: "美术馆", eyebrow: "GALLERY", group: "场景", icon: "i-magpie", hint: "画=配额窗 客=会话 色=用量" },
    { id: "zen", title: "枯山水", eyebrow: "ZEN", group: "场景", icon: "i-magpie", hint: "石=配额窗 纹=用量 叶=会话" },
    { id: "sakura", title: "樱道", eyebrow: "SAKURA", group: "场景", icon: "i-magpie", hint: "树=配额窗 花=用量 瓣=会话" },
    { id: "rain2", title: "雨窗", eyebrow: "RAIN", group: "场景", icon: "i-magpie", hint: "格=配额窗 雨=用量 痕=会话" },
    { id: "tank", title: "水族馆", eyebrow: "TANK", group: "场景", icon: "i-magpie", hint: "缸=配额窗 水=用量 鱼=会话" },
    { id: "camp", title: "营地", eyebrow: "CAMP", group: "场景", icon: "i-magpie", hint: "火=配额窗 焰=用量 帐=会话" },
    { id: "harbor2", title: "灯塔港", eyebrow: "HARBOR", group: "场景", icon: "i-magpie", hint: "塔=配额窗 扫=用量 船=会话" },
    { id: "metro", title: "地下铁", eyebrow: "METRO", group: "场景", icon: "i-magpie", hint: "线=配额窗 宽=拥挤 车=会话" },
    { id: "glacier", title: "冰川", eyebrow: "GLACIER", group: "天象", icon: "i-magpie", hint: "冰=配额窗 高=用量 鹅=会话" },
    { id: "volcano", title: "火山", eyebrow: "VOLCANO", group: "场景", icon: "i-magpie", hint: "锥=配额窗 烟=用量 鸟=会话" },
    { id: "canyon", title: "峡谷", eyebrow: "CANYON", group: "场景", icon: "i-magpie", hint: "层=配额窗 深=用量 客=会话" },
    { id: "lake", title: "湖泊", eyebrow: "LAKE", group: "场景", icon: "i-magpie", hint: "莲=配额窗 沉=用量 黾=会话" },
    { id: "harvest2", title: "麦浪", eyebrow: "HARVEST", group: "场景", icon: "i-magpie", hint: "垄=配额窗 穗=用量 农=会话" },
    { id: "marina", title: "码头", eyebrow: "MARINA", group: "场景", icon: "i-magpie", hint: "船=配额窗 桅=用量 鸥=会话" },
    { id: "river", title: "河流", eyebrow: "RIVER", group: "场景", icon: "i-magpie", hint: "湾=配额窗 宽=用量 鱼=会话" },
    { id: "forest", title: "森林", eyebrow: "FOREST", group: "场景", icon: "i-magpie", hint: "树=配额窗 高=用量 鸟=会话" },
    { id: "village", title: "村落", eyebrow: "VILLAGE", group: "场景", icon: "i-magpie", hint: "屋=配额窗 烟=用量 人=会话" },
    { id: "beach", title: "海滩", eyebrow: "BEACH", group: "场景", icon: "i-magpie", hint: "浪=配额窗 高=用量 蟹=会话" },
    { id: "skyline", title: "天际线", eyebrow: "SKYLINE", group: "场景", icon: "i-magpie", hint: "楼=配额窗 高=用量 星=会话" },
    { id: "pasture", title: "草场", eyebrow: "PASTURE", group: "场景", icon: "i-magpie", hint: "坡=配额窗 高=用量 畜=会话" },
    { id: "wetland", title: "湿地", eyebrow: "WETLAND", group: "生态", icon: "i-magpie", hint: "泽=配额窗 深=用量 鹭=会话" },
    { id: "garden", title: "庭院", eyebrow: "GARDEN", group: "生态", icon: "i-magpie", hint: "坛=配额窗 茂=用量 蝶=会话" },
    { id: "monsoon", title: "雨季", eyebrow: "MONSOON", group: "天象", icon: "i-magpie", hint: "云=配额窗 雨=用量 伞=会话" },
    { id: "fjord", title: "峡湾", eyebrow: "FJORD", group: "场景", icon: "i-magpie", hint: "崖=配额窗 水=用量 舟=会话" },
    { id: "vine", title: "藤蔓", eyebrow: "VINE", group: "生态", icon: "i-sparkle", hint: "蔓=请求流 叶=会话 枯=失败" },
    { id: "atoll", title: "环礁", eyebrow: "ATOLL", group: "场景", icon: "i-magpie", hint: "环=配额窗 礁=用量 帆=会话" },
    { id: "meadow", title: "草甸", eyebrow: "MEADOW", group: "生态", icon: "i-magpie", hint: "丛=配额窗 茂=用量 蝶=会话" },
    { id: "tundra", title: "苔原", eyebrow: "TUNDRA", group: "生态", icon: "i-magpie", hint: "丘=配额窗 雪=用量 羚=会话" },
    { id: "dune", title: "沙丘海", eyebrow: "DUNE", group: "场景", icon: "i-magpie", hint: "丘=配额窗 脊=用量 舟=会话" },
    { id: "lagoon", title: "环礁湖", eyebrow: "LAGOON", group: "场景", icon: "i-magpie", hint: "岛=配额窗 环=用量 鹬=会话" },
    { id: "oasis", title: "绿洲", eyebrow: "OASIS", group: "场景", icon: "i-magpie", hint: "泉=配额窗 涌=用量 驼=会话" },
    { id: "cascade", title: "阶瀑", eyebrow: "CASCADE", group: "用量", icon: "i-chart", hint: "级=模型 宽=份额 滴=会话" },
    { id: "delta", title: "河口", eyebrow: "DELTA", group: "场景", icon: "i-magpie", hint: "汊=配额窗 流=用量 艇=会话" },
    { id: "solarwind", title: "太阳风", eyebrow: "SOLAR WIND", group: "天象", icon: "i-magpie", hint: "冕=配额窗 珥=用量 粒=会话" },
    { id: "mangrove", title: "红树林", eyebrow: "MANGROVE", group: "生态", icon: "i-magpie", hint: "树=配额窗 根=用量 鱼=会话" },
    { id: "heath", title: "石楠原", eyebrow: "HEATH", group: "生态", icon: "i-magpie", hint: "丛=配额窗 铃=用量 蜂=会话" },
    { id: "steppe", title: "草原", eyebrow: "STEPPE", group: "场景", icon: "i-magpie", hint: "浪=配额窗 高=用量 马=会话" },
    { id: "pampa", title: "潘帕斯", eyebrow: "PAMPA", group: "场景", icon: "i-magpie", hint: "草=配额窗 径=用量 仔=会话" },
    { id: "mesa", title: "台地", eyebrow: "MESA", group: "场景", icon: "i-magpie", hint: "台=配额窗 壁=用量 鹫=会话" },
    { id: "terrace", title: "梯田", eyebrow: "TERRACE", group: "场景", icon: "i-magpie", hint: "田=配额窗 水=用量 农=会话" },
    { id: "kelp", title: "海藻林", eyebrow: "KELP", group: "生态", icon: "i-magpie", hint: "藻=配额窗 高=用量 獭=会话" },
    { id: "prairie", title: "大草原", eyebrow: "PRAIRIE", group: "场景", icon: "i-magpie", hint: "丛=配额窗 穗=用量 羚=会话" },
    { id: "taiga", title: "针叶林", eyebrow: "TAIGA", group: "生态", icon: "i-magpie", hint: "杉=配额窗 雪=用量 鹿=会话" },
    { id: "geyser", title: "间歇泉", eyebrow: "GEYSER", group: "场景", icon: "i-magpie", hint: "泉=配额窗 柱=用量 客=会话" },
    { id: "meteor", title: "流星雨", eyebrow: "METEOR", group: "场景", icon: "i-magpie", hint: "雨=配额窗 尾=用量 卫=会话" },
    { id: "cavern", title: "溶洞", eyebrow: "CAVERN", group: "场景", icon: "i-magpie", hint: "钟乳=配额窗 长=用量 蝠=会话" },
    { id: "bayou", title: "沼泽", eyebrow: "BAYOU", group: "生态", icon: "i-magpie", hint: "柏=配额窗 苔=用量 萤=会话" },
    { id: "fen", title: "泥沼", eyebrow: "FEN", group: "生态", icon: "i-magpie", hint: "棉草=配额窗 高=用量 蜻=会话" },
    { id: "bog", title: "酸沼", eyebrow: "BOG", group: "生态", icon: "i-magpie", hint: "捕虫笼=配额窗 高=用量 蛙=会话" },
    { id: "marsh", title: "芦苇荡", eyebrow: "MARSH", group: "生态", icon: "i-magpie", hint: "蒲=配额窗 高=用量 鹭=会话" },
    { id: "karst", title: "喀斯特", eyebrow: "KARST", group: "场景", icon: "i-magpie", hint: "峰=配额窗 高=用量 猴=会话" },
    { id: "badlands", title: "恶地", eyebrow: "BADLANDS", group: "场景", icon: "i-magpie", hint: "柱=配额窗 高=用量 羊=会话" },
    { id: "veldt", title: "稀树草原", eyebrow: "VELDT", group: "生态", icon: "i-magpie", hint: "金合欢=配额窗 冠=用量 象=会话" },
    { id: "chaparral", title: "灌丛", eyebrow: "CHAPARRAL", group: "生态", icon: "i-magpie", hint: "灌=配额窗 高=用量 狼=会话" },
    { id: "glade", title: "林间空地", eyebrow: "GLADE", group: "生态", icon: "i-magpie", hint: "蕨=配额窗 高=用量 鹿=会话" },
    { id: "cove", title: "海湾", eyebrow: "COVE", group: "场景", icon: "i-magpie", hint: "柱=配额窗 高=用量 豹=会话" },
    { id: "islet", title: "小岛", eyebrow: "ISLET", group: "场景", icon: "i-magpie", hint: "椰=配额窗 冠=用量 蟹=会话" },
    { id: "dell", title: "幽谷", eyebrow: "DELL", group: "场景", icon: "i-magpie", hint: "铃兰=配额窗 高=用量 兔=会话" },
    { id: "sierra", title: "山岭", eyebrow: "SIERRA", group: "场景", icon: "i-magpie", hint: "雪岭=配额窗 峰高=用量 山羊=会话" },
    { id: "basin", title: "盆地", eyebrow: "BASIN", group: "场景", icon: "i-magpie", hint: "盐柱=配额窗 高=用量 羚=会话" },
    { id: "outcrop", title: "裸岩", eyebrow: "OUTCROP", group: "场景", icon: "i-magpie", hint: "岩柱=配额窗 高=用量 蜥=会话" },
    { id: "plateau", title: "台原", eyebrow: "PLATEAU", group: "场景", icon: "i-magpie", hint: "台原=配额窗 缘高=用量 鹰=会话" },
    { id: "ridge", title: "山脊", eyebrow: "RIDGE", group: "场景", icon: "i-magpie", hint: "山脊=配额窗 峰高=用量 隼=会话" },
    { id: "escarp", title: "断崖", eyebrow: "ESCARP", group: "场景", icon: "i-magpie", hint: "断崖=配额窗 壁高=用量 岩鸽=会话" },
    { id: "bluff", title: "峭壁", eyebrow: "BLUFF", group: "场景", icon: "i-magpie", hint: "峭壁=配额窗 壁高=用量 燕=会话" },
    { id: "crag", title: "崖顶", eyebrow: "CRAG", group: "场景", icon: "i-magpie", hint: "崖顶=配额窗 高=用量 秃鹫=会话" },
    { id: "inlet", title: "入湾", eyebrow: "INLET", group: "场景", icon: "i-magpie", hint: "浮标=配额窗 深=用量 鸥=会话" },
    { id: "loch", title: "湖心", eyebrow: "LOCH", group: "场景", icon: "i-magpie", hint: "深标=配额窗 深=用量 天鹅=会话" },
    { id: "cape", title: "海角", eyebrow: "CAPE", group: "场景", icon: "i-magpie", hint: "海岬=配额窗 高=用量 鸥=会话" },
    { id: "headland", title: "岬头", eyebrow: "HEADLAND", group: "场景", icon: "i-magpie", hint: "岬头=配额窗 高=用量 信天翁=会话" },
    { id: "sound", title: "海峡", eyebrow: "SOUND", group: "场景", icon: "i-magpie", hint: "深标=配额窗 深=用量 鸬鹚=会话" },
    { id: "creek", title: "溪流", eyebrow: "CREEK", group: "场景", icon: "i-magpie", hint: "溪石=配额窗 高=用量 鲑=会话" },
    { id: "point", title: "海角尖", eyebrow: "POINT", group: "场景", icon: "i-magpie", hint: "灯塔=配额窗 光程=用量 海鸟=会话" },
    { id: "abyss", title: "深渊", eyebrow: "ABYSS", group: "场景", icon: "i-magpie", hint: "热泉口=配额窗 烟柱=用量 深海鱼=会话" },
    { id: "grotto", title: "岩洞", eyebrow: "GROTTO", group: "场景", icon: "i-magpie", hint: "钟乳石=配额窗 长=用量 蝙蝠=会话" },
    { id: "hollow", title: "洼地", eyebrow: "HOLLOW", group: "场景", icon: "i-magpie", hint: "洼坑=配额窗 深=用量 萤火虫=会话" },
    { id: "savanna", title: "草原", eyebrow: "SAVANNA", group: "场景", icon: "i-magpie", hint: "金合欢=配额窗 冠宽=用量 角马=会话" },
    { id: "jungle", title: "雨林", eyebrow: "JUNGLE", group: "场景", icon: "i-magpie", hint: "藤蔓=配额窗 垂长=用量 鹦鹉=会话" },
    { id: "moor", title: "荒野", eyebrow: "MOOR", group: "场景", icon: "i-magpie", hint: "石堆=配额窗 高=用量 羊=会话" },
    { id: "vale", title: "幽谷", eyebrow: "VALE", group: "场景", icon: "i-magpie", hint: "雾团=配额窗 浓=用量 鹿=会话" },
    { id: "understory", title: "林下", eyebrow: "UNDERSTORY", group: "场景", icon: "i-magpie", hint: "幼树=配额窗 冠密=用量 松鼠=会话" },
    { id: "butte", title: "孤丘", eyebrow: "BUTTE", group: "场景", icon: "i-magpie", hint: "岩柱=配额窗 高=用量 鹰=会话" },
    { id: "pinnacle", title: "石柱", eyebrow: "PINNACLE", group: "场景", icon: "i-magpie", hint: "石尖=配额窗 高=用量 鹰=会话" },
    { id: "rainforest", title: "雨层林", eyebrow: "RAINFOREST", group: "场景", icon: "i-magpie", hint: "雨团=配额窗 雨强=用量 树懒=会话" },
    { id: "shoal", title: "浅滩", eyebrow: "SHOAL", group: "场景", icon: "i-magpie", hint: "沙洲=配额窗 大=用量 海豚=会话" },
    { id: "estuary", title: "河口", eyebrow: "ESTUARY", group: "场景", icon: "i-magpie", hint: "沙嘴=配额窗 长=用量 翠鸟=会话" },
    { id: "arch", title: "拱门", eyebrow: "ARCH", group: "场景", icon: "i-magpie", hint: "石拱=配额窗 跨度=用量 海燕=会话" },
    { id: "hoodoos", title: "蘑菇岩", eyebrow: "HOODOOS", group: "场景", icon: "i-magpie", hint: "蘑菇岩=配额窗 高=用量 乌鸦=会话" },
    { id: "domes", title: "穹顶", eyebrow: "DOMES", group: "场景", icon: "i-magpie", hint: "穹顶=配额窗 半径=用量 攀岩者=会话" },
    { id: "tors", title: "岩山", eyebrow: "TORS", group: "场景", icon: "i-magpie", hint: "岩山=配额窗 高=用量 小马=会话" },
    { id: "needles", title: "石针", eyebrow: "NEEDLES", group: "场景", icon: "i-magpie", hint: "石针=配额窗 高=用量 雨燕=会话" },
    { id: "spires", title: "尖塔", eyebrow: "SPIRES", group: "场景", icon: "i-magpie", hint: "尖塔=配额窗 高=用量 蝙蝠=会话" },
    { id: "monoliths", title: "巨石", eyebrow: "MONOLITHS", group: "场景", icon: "i-magpie", hint: "巨石=配额窗 高=用量 蜥蜴=会话" },
    { id: "towers", title: "塔楼", eyebrow: "TOWERS", group: "场景", icon: "i-magpie", hint: "塔楼=配额窗 高=用量 海鸥=会话" },
    { id: "crags", title: "峭壁", eyebrow: "CRAGS", group: "场景", icon: "i-magpie", hint: "峭壁=配额窗 高=用量 海燕=会话" },
    { id: "mesas", title: "平顶山", eyebrow: "MESAS", group: "场景", icon: "i-magpie", hint: "平顶山=配额窗 顶宽=用量 兀鹫=会话" },
    { id: "dunes", title: "沙丘", eyebrow: "DUNES", group: "场景", icon: "i-magpie", hint: "沙山=配额窗 高=用量 甲虫=会话" },
    { id: "outcrops", title: "露头", eyebrow: "OUTCROPS", group: "场景", icon: "i-magpie", hint: "露头=配额窗 宽=用量 旱獭=会话" },
    { id: "pinnacles", title: "石针群", eyebrow: "PINNACLES", group: "场景", icon: "i-magpie", hint: "石针群=配额窗 高=用量 雨燕=会话" },
    { id: "summits", title: "群峰", eyebrow: "SUMMITS", group: "场景", icon: "i-magpie", hint: "群峰=配额窗 高=用量 攀登者=会话" },
    { id: "chimneys", title: "烟囱", eyebrow: "CHIMNEYS", group: "场景", icon: "i-magpie", hint: "烟囱=配额窗 高=用量 麻雀=会话" },
    { id: "arches", title: "拱门群", eyebrow: "ARCHES", group: "场景", icon: "i-magpie", hint: "石拱=配额窗 跨度=用量 雨燕=会话" },
    { id: "lighthouses", title: "灯塔群", eyebrow: "LIGHTHOUSES", group: "场景", icon: "i-magpie", hint: "灯塔=配额窗 光程=用量 海鸥=会话" },
    { id: "castles", title: "城堡群", eyebrow: "CASTLES", group: "场景", icon: "i-magpie", hint: "城堡=配额窗 高=用量 骑士=会话" },
    { id: "ridges", title: "山脊群", eyebrow: "RIDGES", group: "场景", icon: "i-magpie", hint: "山脊=配额窗 高=用量 徒步者=会话" },
    { id: "terraces", title: "梯田", eyebrow: "TERRACES", group: "场景", icon: "i-magpie", hint: "梯田=配额窗 水宽=用量 白鹭=会话" },
    { id: "waterwheels", title: "水车群", eyebrow: "WATERWHEELS", group: "场景", icon: "i-magpie", hint: "水车=配额窗 直径=用量 游鱼=会话" },
    { id: "pagodas", title: "宝塔群", eyebrow: "PAGODAS", group: "场景", icon: "i-magpie", hint: "宝塔=配额窗 层数=用量 燕子=会话" },
    { id: "oceans", title: "海洋", eyebrow: "OCEANS", group: "场景", icon: "i-magpie", hint: "浪=配额窗 浪高=用量 信天翁=会话" },
    { id: "moorland", title: "荒原", eyebrow: "MOORLAND", group: "场景", icon: "i-magpie", hint: "荒原=配额窗 丘高=用量 野兔=会话" },
    { id: "vineyards", title: "葡萄园", eyebrow: "VINEYARDS", group: "场景", icon: "i-magpie", hint: "葡园=配额窗 架高=用量 麻雀=会话" },
    { id: "orchards", title: "果园", eyebrow: "ORCHARDS", group: "场景", icon: "i-magpie", hint: "果树=配额窗 冠幅=用量 蜜蜂=会话" },
    { id: "hedges", title: "绿篱", eyebrow: "HEDGES", group: "场景", icon: "i-magpie", hint: "绿篱=配额窗 篱高=用量 瓢虫=会话" },
    { id: "crofts", title: "石屋", eyebrow: "CROFTS", group: "场景", icon: "i-magpie", hint: "石屋=配额窗 烟囱=用量 羊群=会话" },
    { id: "paddocks", title: "围场", eyebrow: "PADDOCKS", group: "场景", icon: "i-magpie", hint: "围场=配额窗 栏长=用量 小马=会话" },
    { id: "gardens", title: "花坛", eyebrow: "GARDENS", group: "场景", icon: "i-magpie", hint: "花坛=配额窗 花量=用量 蝴蝶=会话" },
    { id: "groves", title: "橄榄林", eyebrow: "GROVES", group: "场景", icon: "i-magpie", hint: "橄树=配额窗 冠幅=用量 雀=会话" },
    { id: "harbours", title: "渔港", eyebrow: "HARBOURS", group: "场景", icon: "i-magpie", hint: "船=配额窗 桅高=用量 鸥=会话" },
    { id: "fjords", title: "峡湾", eyebrow: "FJORDS", group: "场景", icon: "i-magpie", hint: "峡壁=配额窗 高=用量 鹰=会话" },
    { id: "lochs", title: "湖群", eyebrow: "LOCHS", group: "场景", icon: "i-magpie", hint: "岛=配额窗 树高=用量 水獭=会话" },
    { id: "geysers", title: "间歇泉", eyebrow: "GEYSERS", group: "场景", icon: "i-magpie", hint: "泉=配额窗 柱高=用量 蜻蜓=会话" },
    { id: "bayous", title: "沼泽", eyebrow: "BAYOUS", group: "场景", icon: "i-magpie", hint: "柏=配额窗 干高=用量 鹭=会话" },
    { id: "tarns", title: "冰斗湖", eyebrow: "TARNS", group: "场景", icon: "i-magpie", hint: "冰斗湖=配额窗 深=用量 鼠兔=会话" },
    { id: "meres", title: "湖沼", eyebrow: "MERES", group: "场景", icon: "i-magpie", hint: "苇床=配额窗 高=用量 骨顶鸡=会话" },
    { id: "springs", title: "山泉", eyebrow: "SPRINGS", group: "场景", icon: "i-magpie", hint: "泉=配额窗 弧高=用量 鹡鸰=会话" },
    { id: "brooks", title: "溪流", eyebrow: "BROOKS", group: "场景", icon: "i-magpie", hint: "石=配额窗 石径=用量 河乌=会话" },
    { id: "fords", title: "浅滩", eyebrow: "FORDS", group: "场景", icon: "i-magpie", hint: "石=配额窗 石宽=用量 牛=会话" },
    { id: "inlets", title: "入海岬", eyebrow: "INLETS", group: "场景", icon: "i-magpie", hint: "岬=配额窗 高=用量 鸬鹚=会话" },
    { id: "creeks", title: "潮沟", eyebrow: "CREEKS", group: "场景", icon: "i-magpie", hint: "潮沟=配额窗 宽=用量 鹬=会话" },
    { id: "sloughs", title: "池沼", eyebrow: "SLOUGHS", group: "场景", icon: "i-magpie", hint: "沼=配额窗 宽=用量 红翅鹂=会话" },
    { id: "deltas", title: "三角洲", eyebrow: "DELTAS", group: "场景", icon: "i-magpie", hint: "汊道=配额窗 宽=用量 鹈鹕=会话" },
    { id: "atolls", title: "环礁", eyebrow: "ATOLLS", group: "场景", icon: "i-magpie", hint: "礁环=配额窗 环径=用量 燕鸥=会话" },
    { id: "reefs", title: "礁脉", eyebrow: "REEFS", group: "场景", icon: "i-magpie", hint: "珊瑚=配额窗 高=用量 鱼群=会话" },
    { id: "lagoons", title: "泻湖", eyebrow: "LAGOONS", group: "场景", icon: "i-magpie", hint: "澙湖=配额窗 池径=用量 火烈鸟=会话" },
    { id: "shoals", title: "浅洲", eyebrow: "SHOALS", group: "场景", icon: "i-magpie", hint: "浅洲=配额窗 丘高=用量 燕鸥=会话" },
    { id: "sandbars", title: "沙洲", eyebrow: "SANDBARS", group: "场景", icon: "i-magpie", hint: "沙洲=配额窗 长=用量 蛎鹬=会话" },
    { id: "breakers", title: "碎浪", eyebrow: "BREAKERS", group: "场景", icon: "i-magpie", hint: "浪=配额窗 卷高=用量 冲浪者=会话" },
    { id: "icebergs", title: "冰山群", eyebrow: "ICEBERGS", group: "场景", icon: "i-magpie", hint: "冰山=配额窗 帆高=用量 海豹=会话" },
    { id: "floes", title: "浮冰", eyebrow: "FLOES", group: "场景", icon: "i-magpie", hint: "浮冰=配额窗 面积=用量 北极熊=会话" },
    { id: "nunataks", title: "岛峰", eyebrow: "NUNATAKS", group: "场景", icon: "i-magpie", hint: "岛峰=配额窗 露高=用量 雪鹀=会话" },
    { id: "moraines", title: "冰碛", eyebrow: "MORAINES", group: "场景", icon: "i-magpie", hint: "冰碛=配额窗 丘高=用量 旱獭=会话" },
    { id: "crevasses", title: "冰裂隙", eyebrow: "CREVASSES", group: "场景", icon: "i-magpie", hint: "裂隙=配额窗 深=用量 登山者=会话" },
    { id: "eskers", title: "蛇丘", eyebrow: "ESKERS", group: "场景", icon: "i-magpie", hint: "蛇丘=配额窗 长=用量 雷鸟=会话" },
    { id: "cirques", title: "冰斗", eyebrow: "CIRQUES", group: "场景", icon: "i-magpie", hint: "冰斗=配额窗 斗深=用量 山羊=会话" },
    { id: "drumlins", title: "鼓丘", eyebrow: "DRUMLINS", group: "场景", icon: "i-magpie", hint: "鼓丘=配额窗 长=用量 野兔=会话" },
    { id: "kames", title: "冰砾阜", eyebrow: "KAMES", group: "场景", icon: "i-magpie", hint: "砾阜=配额窗 陡=用量 松鸡=会话" },
    { id: "seracs", title: "冰塔", eyebrow: "SERACS", group: "场景", icon: "i-magpie", hint: "冰塔=配额窗 倾角=用量 渡鸦=会话" },
    { id: "buttes", title: "孤丘", eyebrow: "BUTTES", group: "场景", icon: "i-magpie", hint: "孤丘=配额窗 帽岩宽=用量 叉角羚=会话" },
    { id: "fins", title: "石鳍", eyebrow: "FINS", group: "场景", icon: "i-magpie", hint: "石鳍=配额窗 高=用量 雨燕=会话" },
    { id: "yardangs", title: "雅丹", eyebrow: "YARDANGS", group: "场景", icon: "i-magpie", hint: "雅丹=配额窗 流线=用量 耳廓狐=会话" },
    { id: "playas", title: "干盐湖", eyebrow: "PLAYAS", group: "场景", icon: "i-magpie", hint: "干盐裂=配额窗 块大=用量 帆石=会话" },
    { id: "wadis", title: "干河谷", eyebrow: "WADIS", group: "场景", icon: "i-magpie", hint: "干河谷=配额窗 辫宽=用量 骆驼=会话" },
    { id: "hamadas", title: "石漠", eyebrow: "HAMADAS", group: "场景", icon: "i-magpie", hint: "石漠=配额窗 嶙峋=用量 跳鼠=会话" },
    { id: "forecast", title: "预测", eyebrow: "FORECAST", group: "洞察", icon: "i-chart", hint: "烧线+虚线投影 · ⚠=重置前耗尽" },
    { id: "trophies", title: "成就", eyebrow: "TROPHIES", group: "洞察", icon: "i-chart", hint: "徽章架 · 环=解锁进度" },
    { id: "burnrate", title: "燃尽", eyebrow: "BURNRATE", group: "洞察", icon: "i-chart", hint: "本月每日成本 · 虚线=月末预测" },
    { id: "scorecard", title: "计分卡", eyebrow: "SCORECARD", group: "洞察", icon: "i-chart", hint: "弧=成功率 针=延迟 V=回退" },
    { id: "latrank", title: "延迟榜", eyebrow: "LATRANK", group: "洞察", icon: "i-chart", hint: "粗=TTFT 细=TPS · 奖牌/蜗牛" },
    { id: "league", title: "联赛", eyebrow: "LEAGUE", group: "洞察", icon: "i-chart", hint: "模型份额榜 · ↺=掉包率" },
    { id: "versus", title: "对决", eyebrow: "VERSUS", group: "洞察", icon: "i-chart", hint: "Agent 对阵 · 粗=tokens 细=时长" },
    { id: "accounts", title: "账户", eyebrow: "ACCOUNTS", group: "洞察", icon: "i-chart", hint: "账户卡 · 配额条+余额 · 琥珀=热窗" },
    { id: "vaults", title: "金库", eyebrow: "VAULTS", group: "洞察", icon: "i-chart", hint: "保管箱=配额窗 满度=用量 推车=会话" },
    { id: "onsen", title: "温泉", eyebrow: "ONSEN", group: "场景", icon: "i-magpie", hint: "汤池=配额窗 水位=用量 蒸汽=过热 浴客=会话" },
    { id: "nightmarket", title: "夜市", eyebrow: "NIGHTMARKET", group: "场景", icon: "i-magpie", hint: "摊位=配额窗 灯牌=用量 提灯客=会话" },
    { id: "bonfire", title: "篝火", eyebrow: "BONFIRE", group: "场景", icon: "i-magpie", hint: "木石=配额窗 炭头=用量 中央火=平均 火星=会话" },
    { id: "workshop", title: "工坊", eyebrow: "WORKSHOP", group: "场景", icon: "i-magpie", hint: "工位=配额窗 摆臂=用量 吊灯=过热 工人=会话" },
    { id: "stadium", title: "体育场", eyebrow: "STADIUM", group: "场景", icon: "i-magpie", hint: "跑道=配额窗 弧长=用量 跑者=会话" },
    { id: "theater", title: "剧场", eyebrow: "THEATER", group: "场景", icon: "i-magpie", hint: "聚光=配额窗 锥度=用量 演员=会话" },
    { id: "arena", title: "竞技场", eyebrow: "ARENA", group: "场景", icon: "i-magpie", hint: "旌旗=配额窗 满度=用量 斗士=会话" },
    { id: "vineyard", title: "葡萄园", eyebrow: "VINEYARD", group: "场景", icon: "i-magpie", hint: "藤架=配额窗 果串=用量 采摘工=会话" },
    { id: "kitchen", title: "厨房", eyebrow: "KITCHEN", group: "场景", icon: "i-magpie", hint: "灶台=配额窗 汽泡=用量 火焰=过热 厨师=会话" },
    { id: "hangar", title: "机库", eyebrow: "HANGAR", group: "场景", icon: "i-magpie", hint: "停机位=配额窗 尾焰=用量 地勤=会话" },
    { id: "planetarium", title: "天象馆", eyebrow: "PLANETARIUM", group: "场景", icon: "i-magpie", hint: "轨道=配额窗 行星=用量 彗星=会话" },
    { id: "museum", title: "博物馆", eyebrow: "MUSEUM", group: "场景", icon: "i-magpie", hint: "展柜=配额窗 满度=用量 观众=会话" },
    { id: "conservatory", title: "温室", eyebrow: "CONSERVATORY", group: "场景", icon: "i-magpie", hint: "花盆=配额窗 株高=用量 园丁=会话" },
    { id: "atrium", title: "中庭", eyebrow: "ATRIUM", group: "场景", icon: "i-magpie", hint: "花台=配额窗 垂蔓=用量 廊客=会话" },
    { id: "kiln", title: "窑炉", eyebrow: "KILN", group: "场景", icon: "i-magpie", hint: "窑体=配额窗 窑火=用量 烟囱=过热 陶工=会话" },
    { id: "igloo", title: "冰屋", eyebrow: "IGLOO", group: "场景", icon: "i-magpie", hint: "冰屋=配额窗 门光=用量 旅人=会话" },
    { id: "apiary", title: "蜂场", eyebrow: "APIARY", group: "场景", icon: "i-magpie", hint: "蜂箱=配额窗 巢脾=用量 工蜂=会话" },
    { id: "avalanche", title: "雪崩", eyebrow: "AVALANCHE", group: "场景", icon: "i-magpie", hint: "雪檐=配额窗 裂崩=用量 滑手=会话" },
    { id: "arboretum", title: "树木园", eyebrow: "ARBORETUM", group: "场景", icon: "i-magpie", hint: "标本树=配额窗 冠幅=用量 策展人=会话" },
    { id: "brewery", title: "酿酒坊", eyebrow: "BREWERY", group: "场景", icon: "i-magpie", hint: "铜釜=配额窗 泡沫=用量 蒸汽=过热 酿酒师=会话" },
    { id: "distillery", title: "蒸馏厂", eyebrow: "DISTILLERY", group: "场景", icon: "i-magpie", hint: "蒸馏柱=配额窗 汽柱=用量 冷凝=过热 技师=会话" },
    { id: "mill", title: "磨坊", eyebrow: "MILL", group: "场景", icon: "i-magpie", hint: "磨坊=配额窗 轮速=用量 轮毂=过热 磨工=会话" },
    { id: "foundry", title: "铸造厂", eyebrow: "FOUNDRY", group: "场景", icon: "i-magpie", hint: "熔炉=配额窗 熔液=用量 出渣=过热 铸工=会话" },
    { id: "smithy", title: "铁匠铺", eyebrow: "SMITHY", group: "场景", icon: "i-magpie", hint: "铁砧=配额窗 锻件=用量 火花=过热 铁匠=会话" },
    { id: "tannery", title: "鞣革坊", eyebrow: "TANNERY", group: "场景", icon: "i-magpie", hint: "鞣池=配额窗 液位=用量 泡腾=过热 鞣工=会话" },
    { id: "glassworks", title: "玻璃厂", eyebrow: "GLASSWORKS", group: "场景", icon: "i-magpie", hint: "窑口=配额窗 泡团=用量 吹工=会话" },
    { id: "shipyard", title: "造船厂", eyebrow: "SHIPYARD", group: "场景", icon: "i-magpie", hint: "船台=配额窗 船体=用量 吊钩=过热 船匠=会话" },
    { id: "sawmill", title: "锯木厂", eyebrow: "SAWMILL", group: "场景", icon: "i-magpie", hint: "圆锯=配额窗 转速=用量 锯屑=过热 锯工=会话" },
    { id: "printshop", title: "印刷坊", eyebrow: "PRINTSHOP", group: "场景", icon: "i-magpie", hint: "印刷机=配额窗 压印=用量 墨辊=过热 印刷工=会话" },
    { id: "cooperage", title: "箍桶坊", eyebrow: "COOPERAGE", group: "场景", icon: "i-magpie", hint: "木桶=配额窗 板缝=用量 桶箍=过热 箍匠=会话" },
    { id: "saddler", title: "鞍具坊", eyebrow: "SADDLER", group: "场景", icon: "i-magpie", hint: "鞍架=配额窗 镫长=用量 鞍扣=过热 鞍匠=会话" },
    { id: "cobbler", title: "鞋匠铺", eyebrow: "COBBLER", group: "场景", icon: "i-magpie", hint: "鞋楦=配额窗 鞋跟=用量 鞋头=过热 鞋匠=会话" },
    { id: "fletcher", title: "箭匠坊", eyebrow: "FLETCHER", group: "场景", icon: "i-magpie", hint: "箭束=配额窗 展羽=用量 箭簇=过热 箭匠=会话" },
    { id: "bowyer", title: "弓匠坊", eyebrow: "BOWYER", group: "场景", icon: "i-magpie", hint: "弓架=配额窗 弧弯=用量 弦扣=过热 弓匠=会话" },
    { id: "goldsmith", title: "金匠坊", eyebrow: "GOLDSMITH", group: "场景", icon: "i-magpie", hint: "金环=配额窗 弧光=用量 宝托=过热 金匠=会话" },
    { id: "silversmith", title: "银匠坊", eyebrow: "SILVERSMITH", group: "场景", icon: "i-magpie", hint: "银杯=配额窗 碗光=用量 锤点=过热 银匠=会话" },
    { id: "locksmith", title: "锁匠坊", eyebrow: "LOCKSMITH", group: "场景", icon: "i-magpie", hint: "挂锁=配额窗 拱梁=用量 匙孔=过热 锁匠=会话" },
    { id: "terminal", title: "终点站", eyebrow: "TERMINAL", group: "场景", icon: "i-magpie", hint: "站台=配额窗 告牌=用量 蒸汽=过热 搬运工=会话" },
    { id: "kaleidoscope", title: "万花筒", eyebrow: "KALEIDO", group: "抽象", icon: "i-magpie", hint: "瓣=配额窗 镜线=用量 核=过热 彩尘=会话" },
    { id: "etching", title: "蚀刻坊", eyebrow: "ETCHING", group: "场景", icon: "i-magpie", hint: "铜版=配额窗 线深=用量 划痕=过热 蚀刻师=会话" },
    { id: "monotype", title: "单版印", eyebrow: "MONOTYPE", group: "场景", icon: "i-magpie", hint: "单版=配额窗 墨厚=用量 鬼影=过热 印工=会话" },
    { id: "bazaar", title: "大巴扎", eyebrow: "BAZAAR", group: "场景", icon: "i-magpie", hint: "摊位=配额窗 篷纹=用量 灯笼=过热 商贩=会话" },
    { id: "telescope", title: "观星台", eyebrow: "TELESCOPE", group: "场景", icon: "i-magpie", hint: "星标=配额窗 星等=用量 十字丝=过热 观星者=会话" },
    { id: "seaport", title: "海埠", eyebrow: "SEAPORT", group: "场景", icon: "i-magpie", hint: "泊位=配额窗 货垛=用量 桅旗=过热 搬运工=会话" },
    { id: "laboratory", title: "实验室", eyebrow: "LABORATORY", group: "场景", icon: "i-magpie", hint: "器皿=配额窗 液位=用量 冷凝=过热 实验员=会话" },
    { id: "checkpoint", title: "哨卡", eyebrow: "CHECKPOINT", group: "场景", icon: "i-magpie", hint: "岗亭=配额窗 杆角=用量 号灯=过热 哨兵=会话" },
    { id: "gatehouse", title: "门楼", eyebrow: "GATEHOUSE", group: "场景", icon: "i-magpie", hint: "门洞=配额窗 栅深=用量 火盆=过热 守门=会话" },
    { id: "tollbooth", title: "收费站", eyebrow: "TOLLBOOTH", group: "场景", icon: "i-magpie", hint: "篮=配额窗 币堆=用量 帜=过热 收税=会话" },
    { id: "caravanserai", title: "商队驿", eyebrow: "CARAVAN", group: "场景", icon: "i-magpie", hint: "窑洞=配额窗 挂灯=用量 火盆=过热 驼夫=会话" },
    { id: "ranch2", title: "牧场二号", eyebrow: "RANCH II", group: "场景", icon: "i-magpie", hint: "牛=配额窗 耳标=用量 烙烟=过热 牛仔=会话" },
    { id: "paddock", title: "围场", eyebrow: "PADDOCK", group: "场景", icon: "i-magpie", hint: "驹=配额窗 草堆=用量 水槽=过热 马夫=会话" },
    { id: "corral", title: "畜栏", eyebrow: "CORRAL", group: "场景", icon: "i-magpie", hint: "烈马=配额窗 蹄尘=用量 门柱=过热 驯马=会话" },
    { id: "pasture2", title: "草场二号", eyebrow: "PASTURE II", group: "场景", icon: "i-magpie", hint: "羊=配额窗 绒深=用量 舔石=过热 牧人=会话" },
    { id: "atelier", title: "画室", eyebrow: "ATELIER", group: "场景", icon: "i-magpie", hint: "画布=配额窗 彩点=用量 调色刀=过热 画工=会话" },
    { id: "studio2", title: "工坊二号", eyebrow: "STUDIO II", group: "场景", icon: "i-magpie", hint: "轮盘=配额窗 泥堆=用量 窥孔=过热 陶工=会话" },
    { id: "workshop2", title: "车间二号", eyebrow: "WORKSHOP II", group: "场景", icon: "i-magpie", hint: "车床=配额窗 卡盘=用量 刀尖=过热 机工=会话" },
    { id: "vivarium", title: "生态缸", eyebrow: "VIVARIUM", group: "场景", icon: "i-magpie", hint: "缸=配额窗 叶展=用量 湿灯=过热 保育员=会话" },
    { id: "waypoint", title: "航点", eyebrow: "WAYPOINT", group: "场景", icon: "i-magpie", hint: "石堆=配额窗 路标=用量 顶旗=过热 行客=会话" },
    { id: "crossroads", title: "十字路口", eyebrow: "CROSSROADS", group: "场景", icon: "i-magpie", hint: "路牌=配额窗 臂长=用量 角灯=过热 马车=会话" },
    { id: "junction2", title: "枢纽二号", eyebrow: "JUNCTION II", group: "场景", icon: "i-magpie", hint: "转辙=配额窗 灯=用量 尖轨=过热 扳道=会话" },
    { id: "interchange", title: "立交桥", eyebrow: "INTERCHANGE", group: "场景", icon: "i-magpie", hint: "匝道=配额窗 墩高=用量 灯=过热 车流=会话" },
    { id: "garden2", title: "园囿二号", eyebrow: "GARDEN II", group: "场景", icon: "i-magpie", hint: "苗床=配额窗 垄=用量 晷针=过热 园丁=会话" },
    { id: "orchard2", title: "果园二号", eyebrow: "ORCHARD II", group: "场景", icon: "i-magpie", hint: "树=配额窗 果=用量 蜂=过热 摘手=会话" },
    { id: "vineyard2", title: "葡萄园二号", eyebrow: "VINEYARD II", group: "场景", icon: "i-magpie", hint: "藤行=配额窗 叶冠=用量 穗=过热 剪工=会话" },
    { id: "grove2", title: "树丛二号", eyebrow: "GROVE II", group: "场景", icon: "i-magpie", hint: "丛=配额窗 条=用量 篮=过热 砍柴=会话" },
    { id: "souk", title: "露天集", eyebrow: "SOUK", group: "场景", icon: "i-magpie", hint: "毯摊=配额窗 纹密=用量 香炉=过热 商贩=会话" },
    { id: "fair2", title: "市集二号", eyebrow: "FAIR II", group: "场景", icon: "i-magpie", hint: "帐篷=配额窗 条纹=用量 炬=过热 摊主=会话" },
    { id: "market2", title: "市场二号", eyebrow: "MARKET II", group: "场景", icon: "i-magpie", hint: "货摊=配额窗 堆=用量 秤=过热 摊贩=会话" },
    { id: "meadow2", title: "草甸二号", eyebrow: "MEADOW II", group: "场景", icon: "i-magpie", hint: "草垛=配额窗 草茎=用量 叉=过热 割草=会话" },
    { id: "threshold2", title: "阈界二号", eyebrow: "THRESHOLD II", group: "场景", icon: "i-magpie", hint: "门=配额窗 雾=用量 钥=过热 越客=会话" },
    { id: "roundabout", title: "环岛", eyebrow: "ROUNDABOUT", group: "场景", icon: "i-magpie", hint: "入口=配额窗 斑马=用量 岛心=过热 骑行=会话" },
    { id: "oasis2", title: "绿洲二号", eyebrow: "OASIS II", group: "场景", icon: "i-magpie", hint: "椰=配额窗 叶展=用量 蜃=过热 驼客=会话" },
    { id: "reserve2", title: "保护区二号", eyebrow: "RESERVE II", group: "场景", icon: "i-magpie", hint: "观测=配额窗 隙=用量 栖枝=过热 守护=会话" },
    { id: "desert", title: "沙丘", eyebrow: "DESERT", group: "场景", icon: "i-magpie", hint: "丘=配额窗 高=用量 驼=会话" },
    { id: "grove", title: "果园", eyebrow: "GROVE", group: "生态", icon: "i-magpie", hint: "树=配额窗 果=用量 人=会话" },
    { id: "pond", title: "荷塘", eyebrow: "POND", group: "生态", icon: "i-magpie", hint: "莲=配额窗 漪=用量 蛙=会话" },
    { id: "fortune", title: "每日签", eyebrow: "FORTUNE", group: "趣味", icon: "i-zap", hint: "宜忌运数 · 真实数据抽签" },
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
    let heat = 0, seen = false;
    try { heat = (JSON.parse(localStorage.getItem("magpie.viewHeat") || "{}"))[v.id] || 0; } catch (_) {}
    try { seen = (JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]")).includes(v.id); } catch (_) {}
    let seenAt = "";
    try { seenAt = (JSON.parse(localStorage.getItem("magpie.viewSeenAt") || "{}"))[v.id] || ""; } catch (_) {}
    const flame = heat >= 3 ? `<span class="vm-hot" title="常看 · ${heat} 次">🔥</span>` : "";
    const when = seenAt ? (seenAt.length > 10 ? ` · ${seenAt.slice(5, 10)} ${seenAt.slice(11, 16)}` : ` · ${seenAt.slice(5)}`) : "";
    const dot = seen ? `<span class="vm-seen" title="已加入图鉴${when}"></span>` : `<span class="vm-seen off" title="未看过"></span>`;
    return `<div class="vm-row${seen ? " seen" : ""}">
      <button class="vm-item" type="button" data-hero="${v.id}" data-search="${esc(search)}" role="option" aria-selected="false" style="--vm-c:${accent}">
        <span class="vm-ic"><svg><use href="#${v.icon}"/></svg></span>
        <span class="vm-copy"><b>${esc(v.title)}</b><small>${esc(v.eyebrow)}</small></span>
        <span class="vm-hint">${esc(v.hint)}</span>${flame}${dot}
        <span class="vm-thumb" aria-hidden="true"><img src="shots/${v.id}.png" alt="" loading="lazy" onerror="this.closest('.vm-thumb').classList.add('none'); console.info('[obs] missing shot:', '${v.id}'); this.remove()"><i class="vm-thumb-fallback"><svg><use href="#${v.icon}"/></svg><b>${esc(v.title)}</b></i></span>
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
    const recent = (state.viewRecent || [])
      .map(id => VIEW_META.find(v => v.id === id))
      .filter(v => v && !state.favorites.includes(v.id))
      .slice(0, 6);
    if (recent.length) {
      sections.push(`<section class="vm-group vm-recent"><h4 style="--vm-g:var(--green)"><i></i>最近<span>${recent.length}</span></h4>${recent.map(v => menuItem(v, "var(--green)")).join("")}</section>`);
    }
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
    // 14-day switch-count sparkline in the picker header.
    const spark = $("#vm-spark");
    if (spark) {
      try {
        const log = JSON.parse(localStorage.getItem("magpie.viewCountLog") || "[]");
        const max = Math.max(1, ...log.map(r => r.n));
        spark.innerHTML = log.map(r => `<i title="${r.d} · ${r.n} 次" style="height:${Math.max(2, Math.round(r.n / max * 100))}%"></i>`).join("");
      } catch (_) { spark.innerHTML = ""; }
    }
    const dex = $("#vm-dex"), cnt = $("#vm-count");
    if (cnt) cnt.textContent = `${VIEW_META.length} VIEWS`;
    if (dex) {
      try {
        const seen = JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]");
        const at = JSON.parse(localStorage.getItem("magpie.viewSeenAt") || "{}");
        const week = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        const recent = seen.filter(id => at[id] && at[id] >= week).length;
        const pct = VIEW_META.length ? Math.round(seen.length / VIEW_META.length * 100) : 0;
        dex.textContent = `图鉴 ${seen.length}/${VIEW_META.length} · ${pct}%${recent ? ` · +${recent}` : ""}`;
        dex.title = recent ? `最近 7 天收集了 ${recent} 个新视图` : "图鉴进度";
      } catch (_) { dex.textContent = ""; }
    }
    // Thumbnails stay lazy — the browser fetches each row's shot when it
    // scrolls into the menu viewport; no manual preloader needed.
    // Thumb preview: pointerenter/leave (works regardless of :hover quirks
    // inside transformed or filter parents).
    if (!host.dataset.thumbBound) {
      host.dataset.thumbBound = "1";
      host.addEventListener("pointerover", e => {
        const item = e.target.closest(".vm-item");
        const thumb = item && item.querySelector(".vm-thumb");
        if (thumb) {
          const img = thumb.querySelector("img");
          if (img && img.loading !== "eager") { img.loading = "eager"; }
          thumb.classList.add("on");
          thumb.style.opacity = "1";
          clearTimeout(thumb._peek);
          thumb._peek = setTimeout(() => thumb.classList.add("peek"), 420);
        }
      });
      host.addEventListener("pointerout", e => {
        const item = e.target.closest(".vm-item");
        const thumb = item && item.querySelector(".vm-thumb");
        if (thumb && !item.contains(e.relatedTarget)) { clearTimeout(thumb._peek); thumb.classList.remove("on", "peek"); thumb.style.opacity = ""; }
      });
    }
  }
  // Clicking a menu thumbnail pops the shot big while the view loads behind it.
  function showVlight(id) {
    const box = $("#vlight");
    if (!box) return;
    const img = box.querySelector("img");
    box.classList.remove("ready");
    img.onload = () => box.classList.add("ready");
    img.src = `shots/${id}.png`;
    if (img.complete && img.naturalWidth) box.classList.add("ready");
    img.alt = id;
    box.hidden = false;
    box.setAttribute("aria-hidden", "false");
    clearTimeout(box._t);
    box._t = setTimeout(hideVlight, 2400);
  }
  function hideVlight() {
    const box = $("#vlight");
    if (box) { box.hidden = true; box.setAttribute("aria-hidden", "true"); }
  }
  if (window.Obs) { window.Obs.showVlight = showVlight; window.Obs.hideVlight = hideVlight; }


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
      <button draggable="true" class="fav-btn${v.id === state.heroMode ? " active" : ""}${v.id === (localStorage.getItem("magpie.defaultView") || "") ? " default" : ""}" data-fav-view="${v.id}" title="${v.title} · 拖动排序${v.id === (localStorage.getItem("magpie.defaultView") || "") ? " · 默认视图" : ""}">
        <svg><use href="#${v.icon || "i-sparkle"}"/></svg>
        <span class="fav-thumb" aria-hidden="true"><img src="shots/${v.id}.png" alt="" loading="lazy" onerror="this.remove()"></span>
      </button>`).join("");
  }

  function filterViewMenu(query) {
    const needle = String(query || "").trim().toLowerCase();
    let shown = 0;
    $$(".view-menu .vm-item").forEach(b => {
      const on = (!needle || b.dataset.search.includes(needle)) && !(state.unseenOnly && b.closest(".vm-row").classList.contains("seen"));
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
    menu.classList.add("opening");
    // Stagger rows in on open — capped so the tail of 336 doesn't wait forever.
    $$(".vm-item", menu).forEach((b, i) => { b.style.setProperty("--vm-i", Math.min(i, 18)); });
    setTimeout(() => menu.classList.remove("opening"), 700);
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
    updateTourCount();
    const bar = $("#tour-bar");
    if (bar) {
      bar.hidden = !state.tour;
      if (state.tour) {
        const secs = Math.max(3, Number(document.documentElement.dataset.tour) || 10);
        bar.style.setProperty("--tour-secs", secs + "s");
        bar.style.setProperty("animation-play-state", "running");
      }
    }
  }

  function updateTourCount() {
    let chip = $("#tour-count");
    if (!chip) {
      const picker = $("#view-picker");
      if (!picker) return;
      chip = document.createElement("span");
      chip.id = "tour-count";
      chip.className = "tour-count";
      picker.appendChild(chip);
    }
    if (!state.tour) { chip.textContent = ""; return; }
    const pool = state.tourPool && state.tourPool.length
      ? state.tourPool.filter(id => VIEW_META.some(v => v.id === id))
      : VIEW_META.map(v => v.id);
    const idx = Math.max(0, pool.indexOf(state.heroMode));
    chip.textContent = `${idx + 1}/${pool.length}`;
  }

  function stopTour(silent) {
    state.tour = false;
    clearInterval(state.tourTimer);
    state.tourTimer = null;
    state.tourPool = null;
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
      const pool = state.tourPool && state.tourPool.length
        ? state.tourPool.map(id => VIEW_META.find(v => v.id === id)).filter(Boolean)
        : VIEW_META;
      const idx = pool.findIndex(v => v.id === state.heroMode);
      const next = pool[(idx + 1) % pool.length].id;
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
    if (state.pinnedSessions.length) {
      const pin = new Set(state.pinnedSessions);
      list = list.slice().sort((a, b) => (pin.has(b.id) ? 1 : 0) - (pin.has(a.id) ? 1 : 0));
    }
    if (state.sessionQuery) {
      const q = state.sessionQuery.toLowerCase();
      list = list.filter(s =>
        [s.title, s.agent, s.provider, s.model, s.group].filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q)));
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
    renderVs();
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
    // streak badge on requests KPI — fire shows when >=2 days running
    const streakN = (() => {
      const days = (state.data.heatmap || []).slice(-30);
      let n = 0;
      for (let i = days.length - 1; i >= 0; i--) { if ((days[i].tokens || 0) > 0) n++; else break; }
      return n;
    })();
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
      return `<article class="kpi" data-kpi-jump="${it.key}" style="--k-c:${it.color}" title="点击跳到相关视图">
        <div class="kpi-label"><span>${it.label}</span><svg><use href="#${it.icon}"/></svg></div>
        <div class="kpi-value"><b>${esc(it.value)}</b><span>${esc(it.unit)}</span>${ring}</div>
        <div class="kpi-foot"><span class="kpi-delta ${deltaCls}">${deltaText}</span>${it.key === "requests" && streakN >= 2 ? `<span class="kpi-streak" title="连续活跃 ${streakN} 天"><svg viewBox="0 0 12 12"><path d="M6 1c1 2 3 3 3 5.5a3 3 0 0 1-6 0C3 4.5 4 3 6 1Z" fill="#fbbf24"/><path d="M6 4c.5 1 1.5 1.5 1.5 3a1.5 1.5 0 0 1-3 0C4.5 6 5 5 6 4Z" fill="#f59e0b"/></svg>${streakN}</span>` : ""}${spark}</div>
      </article>`;
    }).join("");
    $$("#kpi-row .kpi[data-kpi-jump]").forEach(el => {
      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        const map = { requests: ".table-card", tokens: "trend", cost: ".quota-card", cache: ".quota-card", tps: "latency", active: "orrery" };
        const target = map[el.dataset.kpiJump];
        if (!target) return;
        if (target.startsWith(".")) {
          const node = document.querySelector(target);
          if (node) { node.scrollIntoView({ behavior: "smooth", block: "center" }); toast("已定位"); return; }
        }
        if (viewRegistry()[target]) { setHeroMode(target); document.querySelector(".hero").scrollIntoView({ behavior: "smooth", block: "start" }); toast(`已切到 ${D.providerMeta ? "" : ""}${target}`); }
      });
    });
  }

  function renderVs() {
    const k = (state.view && state.view.kpis) || state.data.kpis;
    const heat = state.data.heatmap || [];
    const yd = heat.length >= 2 ? heat[heat.length - 2] : null;
    const td = heat.length >= 1 ? heat[heat.length - 1] : null;
    if (!td || !yd) { const c = $("#vs-t-num"), c2 = $("#vs-c-num"); if (c) c.textContent = "—"; if (c2) c2.textContent = "—"; return; }
    const tT = td.tokens || 0, yT = yd.tokens || 0, tC = (td.tokens || 0) / 1e6 * 1.32, yC = (yd.tokens || 0) / 1e6 * 1.32;
    const maxT = Math.max(tT, yT, 1), maxC = Math.max(tC, yC, .01);
    const tEl = $("#vs-today-t"), yEl = $("#vs-yest-t"), cEl = $("#vs-today-c"), cyEl = $("#vs-yest-c");
    const nT = $("#vs-t-num"), nC = $("#vs-c-num");
    if (tEl) tEl.style.setProperty("--vs", Math.round(tT / maxT * 100) + "%");
    if (yEl) yEl.style.setProperty("--vs", Math.round(yT / maxT * 100) + "%");
    if (cEl) cEl.style.setProperty("--vs", Math.round(tC / maxC * 100) + "%");
    if (cyEl) cyEl.style.setProperty("--vs", Math.round(yC / maxC * 100) + "%");
    const pctT = yT ? Math.round((tT - yT) / yT * 100) : null;
    const pctC = yC ? Math.round((tC - yC) / yC * 100) : null;
    if (nT) nT.innerHTML = fmtTokens(tT) + (pctT != null ? `<em>${pctT >= 0 ? "+" : ""}${pctT}%</em>` : "");
    if (nC) nC.innerHTML = fmtMoney(tC) + (pctC != null ? `<em>${pctC >= 0 ? "+" : ""}${pctC}%</em>` : "");
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

  // Number bump: counts roll up to the new value and flash the card accent.
  // Skipped on first paint and when motion is off.
  // Number roll: counts tween up to the new value and flash the card accent.
  // Skipped when motion is off or the number did not change.
  const _statT = new Map();
  function animateStat(sel, target) {
    const el = $(sel);
    if (!el) return;
    const prev = parseInt(el.textContent, 10) || 0;
    if (prev === target) { el.textContent = target; return; }
    const motion = document.documentElement.dataset.motion || "full";
    if (motion === "off") { el.textContent = target; return; }
    clearTimeout(_statT.get(sel));
    el.classList.remove("stat-bump", "stat-up", "stat-down");
    void el.offsetWidth;
    el.classList.add("stat-bump", target > prev ? "stat-up" : "stat-down");
    const from = prev, delta = target - from, t0 = performance.now(), dur = 420;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      const ease = 1 - Math.pow(1 - k, 3);
      el.textContent = Math.round(from + delta * ease);
      if (k < 1) _statT.set(sel, setTimeout(step, 16));
      else { el.textContent = target; _statT.delete(sel); }
    };
    _statT.set(sel, setTimeout(step, 16));
  }

    const activeCount = active.length;
    $("#hub-sub").textContent = `${activeCount} 会话 · ${activeCount} 并发`;
    const dec = effectiveDecision();
    $("#hub-mode").textContent = dec && dec.session ? (dec.session.mode === "order" ? "按顺序" : dec.session.mode === "rotate" ? "轮询" : "智能路由") : "智能路由";
    animateStat("#hero-requests", activeCount);
    animateStat("#hero-fallbacks", active.reduce((a, s) => a + (s.fallbacks || 0), 0));
    animateStat("#hero-errors", all.filter(s => s.status === "error").length);

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
      const vc = parseInt(localStorage.getItem("magpie.viewCount") || "0", 10) || 0;
      localStorage.setItem("magpie.viewCount", String(vc + 1));
      const today = new Date().toISOString().slice(0, 10);
      const day = JSON.parse(localStorage.getItem("magpie.viewCountDay") || "{}");
      if (day.date !== today) { day.date = today; day.n = 0; }
      day.n = (day.n || 0) + 1;
      localStorage.setItem("magpie.viewCountDay", JSON.stringify(day));
      // 14-day rolling log for the sparkline in the picker header.
      const log = JSON.parse(localStorage.getItem("magpie.viewCountLog") || "[]");
      const last = log[log.length - 1];
      if (last && last.d === today) last.n += 1; else log.push({ d: today, n: 1 });
      localStorage.setItem("magpie.viewCountLog", JSON.stringify(log.slice(-14)));
      const seen = JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]");
      if (!seen.includes(mode)) {
        seen.push(mode);
        localStorage.setItem("magpie.viewSeen", JSON.stringify(seen));
      }
      const seenAt = JSON.parse(localStorage.getItem("magpie.viewSeenAt") || "{}");
      if (!seenAt[mode]) {
        seenAt[mode] = new Date().toISOString();
        localStorage.setItem("magpie.viewSeenAt", JSON.stringify(seenAt));
      }
      const h = JSON.parse(localStorage.getItem("magpie.viewHeat") || "{}");
      h[mode] = (h[mode] || 0) + 1;
      localStorage.setItem("magpie.viewHeat", JSON.stringify(h));
      state.viewRecent = [mode, ...state.viewRecent.filter(x => x !== mode)].slice(0, 10);
      localStorage.setItem("magpie.viewRecent", JSON.stringify(state.viewRecent));
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
    const vpThumb = $("#vp-thumb img");
    if (vpThumb) vpThumb.src = `shots/${mode}.png`;
    const chThumb = $("#ch-thumb img");
    if (chThumb) chThumb.src = `shots/${mode}.png`;
    const hero = $(".hero");
    if (hero) {
      hero.style.setProperty("--hero-accent", GROUP_COLORS[meta.group] || "#8b7cf6");
      hero.dataset.mode = mode;
    }
    if (state.tour) updateTourCount();
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
      // Accent bloom on the hero card — matches the view's group colour.
      const hero = $(".hero");
      if (hero) {
        hero.classList.add("view-bloom");
        setTimeout(() => hero.classList.remove("view-bloom"), 480);
      }
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
    const pinned = state.pinnedSessions.includes(s.id);
    const age = Date.now() - s.startedAt;
    const st = STATUS_CLASS[s.status] || "";
    const tps = s.tps ? `${s.tps.toFixed(1)} tok/s` : "— tok/s";
    const subs = (s.subagents || []).map(sub => `<div class="subagent-row"><b>${esc(sub.name)}</b><span>${esc(STATUS_TEXT[sub.status] || sub.status)}</span><span class="sub-model">${esc(sub.model)} · ${sub.tps ? sub.tps.toFixed(0) : "—"} TPS</span></div>`).join("");
    return `<article class="session-card${sel ? " selected" : ""}${pinned ? " pinned" : ""}${s.status === "streaming" ? " streaming" : ""}" role="button" aria-selected="${sel}" aria-label="${esc(s.title)} · ${esc(s.model)} · ${esc(STATUS_TEXT[s.status] || s.status)}" data-session="${esc(s.id)}" style="--s-c:${meta.color}" tabindex="0">
      <div class="session-top">
        <span class="session-agent"><img src="${agentIcon(s.agent)}" alt=""></span>
        <span class="session-title" title="${esc(s.title)}">${esc(s.title)}</span>
        <button class="session-pin${pinned ? " on" : ""}" data-pin="${esc(s.id)}" title="${pinned ? "取消置顶" : "置顶会话"}" aria-label="pin">${pinned ? "★" : "☆"}</button>
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
      state.selectedSession || "", state.pinnedSessions.join(","), live.length, Math.floor(Date.now() / 30000),
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
html += `<div class="session-ghost" title="点我"><span class="radar"></span><b>等待新的请求</b><small>trace 每秒刷新 · 完成后会留在这里</small></div>`;
    }
    host.innerHTML = html;
    host.scrollTop = scroll;
    buildSessionMap(list.concat(extra));
  }

  /* ------------------------------------------------- session minimap --- */
  let sessionMapOnScroll = null;
  function buildSessionMap(cards) {
    let map = $("#session-map");
    if (!map) {
      const host = $("#session-list");
      if (!host || !host.parentElement) return;
      map = document.createElement("div");
      map.id = "session-map";
      map.className = "session-map";
      host.parentElement.style.position = "relative";
      host.parentElement.appendChild(map);
      map.addEventListener("click", e => {
        const dot = e.target.closest(".sm-dot");
        if (!dot) return;
        const card = host.querySelector(`.session-card[data-session="${CSS.escape(dot.dataset.sid)}"]`);
        if (card) card.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      sessionMapOnScroll = () => {
        const frac = host.scrollTop / Math.max(1, host.scrollHeight - host.clientHeight);
        const vh = map.clientHeight;
        const viewH = Math.min(vh, vh * (host.clientHeight / Math.max(1, host.scrollHeight)));
        const view = map.querySelector(".sm-view");
        if (view) {
          view.style.height = Math.max(14, viewH) + "px";
          view.style.top = ((vh - Math.max(14, viewH)) * frac) + "px";
        }
      };
      host.addEventListener("scroll", sessionMapOnScroll, { passive: true });
    }
    if (cards.length < 4) { map.hidden = true; return; }
    map.hidden = false;
    map.innerHTML = `<i class="sm-view"></i>` + cards.map(s => {
      const cls = s.status === "error" ? "err" : s.status === "streaming" ? "live" : state.pinnedSessions.includes(s.id) ? "pin" : "";
      return `<i class="sm-dot ${cls}" data-sid="${esc(s.id)}" style="top:${(cards.indexOf(s) / cards.length * 100).toFixed(1)}%"></i>`;
    }).join("");
    if (sessionMapOnScroll) sessionMapOnScroll();
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
    const mc = $("#mascot");
    if (mc) {
      const hot = list.some(q => (q.windows || []).some(w => (w.used || 0) >= 85));
      const busy = (state.data.sessions || []).some(x => x.status !== "done");
      mc.classList.toggle("mascot-alert", hot);
      mc.classList.toggle("mascot-fly", !hot && busy);
    }
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
      return `<div class="donut-legend-row${state.logFilterModel === m.name ? " on" : ""}" role="button" tabindex="0" data-mix-model="${esc(m.name)}" title="${esc(m.name)} · 点击按此模型过滤日志"><i style="background:${color}"></i><span>${esc(m.name)}</span><b>${Math.round(m.tokens / total * 100)}%</b></div>`;
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
    let logs = state.data.logs.filter(r => {
      if (!q) return true;
      return [r.session, r.model, r.provider, r.agent, (r.at || "").slice(0, 10)].join(" ").toLowerCase().includes(q);
    });
    if (state.logSort && state.logSort.key) {
      const { key, dir } = state.logSort;
      logs = logs.slice().sort((a, b) => {
        const va = a[key] == null ? (dir === 1 ? Infinity : -Infinity) : a[key];
        const vb = b[key] == null ? (dir === 1 ? Infinity : -Infinity) : b[key];
        if (typeof va === "string" || typeof vb === "string") return String(va).localeCompare(String(vb)) * dir;
        return (va - vb) * dir;
      });
    }
    logs = logs.slice(0, 22);
    // reflect sort on th
    $$(".log-table th[data-sort]").forEach(th => {
      const on = state.logSort && state.logSort.key === th.dataset.sort;
      th.classList.toggle("sort-on", !!on);
      th.dataset.dir = on ? (state.logSort.dir === 1 ? "asc" : "desc") : "";
    });
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
      const b = e.target.closest("button[data-layout],button[data-density],button[data-motion],button[data-tour],button[data-accent]");
      if (!b) return;
      if (b.dataset.layout) applySetting("layout", b.dataset.layout);
      if (b.dataset.density) applySetting("density", b.dataset.density);
      if (b.dataset.motion) applySetting("motion", b.dataset.motion);
      if (b.dataset.tour) applySetting("tour", b.dataset.tour);
      if (b.dataset.accent) applySetting("accent", b.dataset.accent);
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
        hideVlight();
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
      if (e.target.closest(".fav-thumb")) showVlight(b.dataset.favView);
    });

    // Right-click a rail fav → remove it from favorites without opening the menu.
    $("#rail-favs").addEventListener("contextmenu", e => {
      const b = e.target.closest(".fav-btn[data-fav-view]");
      if (!b) return;
      e.preventDefault();
      toggleFavorite(b.dataset.favView);
    });
    // Fav thumbnail bubbles — JS-driven for the same reason as vm-thumb.
    $("#rail-favs").addEventListener("pointerover", e => {
      const b = e.target.closest(".fav-btn");
      const th = b && b.querySelector(".fav-thumb");
      if (th) { th.classList.add("on"); th.style.opacity = "1"; clearTimeout(th._peek); th._peek = setTimeout(() => th.classList.add("peek"), 420); }
    });
    $("#rail-favs").addEventListener("pointerout", e => {
      const b = e.target.closest(".fav-btn");
      const th = b && b.querySelector(".fav-thumb");
      if (th && !b.contains(e.relatedTarget)) { clearTimeout(th._peek); th.classList.remove("on", "peek"); th.style.opacity = ""; }
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

    // Drag a rail fav to reorder favorites; drop position becomes the
    // stored order (ambient tour follows the same list).
    let favDrag = null;
    const rail = $("#rail-favs");
    rail.addEventListener("dragstart", e => {
      const b = e.target.closest(".fav-btn[data-fav-view]");
      if (!b) return;
      favDrag = b.dataset.favView;
      e.dataTransfer.effectAllowed = "move";
    });
    rail.addEventListener("dragover", e => {
      if (!favDrag) return;
      e.preventDefault();
      const b = e.target.closest(".fav-btn[data-fav-view]");
      $$("#rail-favs .fav-btn").forEach(x => x.classList.toggle("drop-hint", x === b && b.dataset.favView !== favDrag));
    });
    rail.addEventListener("drop", e => {
      if (!favDrag) return;
      e.preventDefault();
      const b = e.target.closest(".fav-btn[data-fav-view]");
      const favs = state.favorites.filter(x => x !== favDrag);
      const at = b ? favs.indexOf(b.dataset.favView) : favs.length;
      favs.splice(at < 0 ? favs.length : at, 0, favDrag);
      state.favorites = favs;
      try { localStorage.setItem("magpie.favorites", JSON.stringify(favs)); } catch (_) {}
      favDrag = null;
      $$("#rail-favs .fav-btn").forEach(x => x.classList.remove("drop-hint"));
      renderRailFavs();
      toast("收藏顺序已更新");
    });
    rail.addEventListener("dragend", () => {
      favDrag = null;
      $$("#rail-favs .fav-btn").forEach(x => x.classList.remove("drop-hint"));
    });

    $("#view-picker").addEventListener("click", e => {
      e.stopPropagation();
      toggleViewMenu();
    });
    const chThumb = $("#ch-thumb");
    if (chThumb) chThumb.addEventListener("click", e => { e.stopPropagation(); showVlight(state.heroMode); });
    // Thumbnail bubble on the picker — JS-driven like .vm-thumb so the
    // hover state can't be swallowed by ancestor transforms.
    $("#view-picker").addEventListener("pointerover", () => {
      const th = $("#vp-thumb");
      if (th) { th.classList.add("on"); th.style.opacity = "1"; }
    });
    $("#view-picker").addEventListener("pointerout", () => {
      const th = $("#vp-thumb");
      if (th) { th.classList.remove("on"); th.style.opacity = ""; }
    });
    $("#view-menu").addEventListener("click", e => {
      const star = e.target.closest(".vm-star");
      if (star) { e.preventDefault(); toggleFavorite(star.dataset.fav); return; }
      const b = e.target.closest("button[data-hero]");
      if (b) {
        if (state.tour) stopTour(true);
        setHeroMode(b.dataset.hero);
        if (e.target.closest(".vm-thumb")) showVlight(b.dataset.hero);
        closeViewMenu();
      }
    });
    $("#view-menu-close").addEventListener("click", () => closeViewMenu(true));
    const vlight = $("#vlight");
    if (vlight) vlight.addEventListener("click", e => { if (e.target === vlight) hideVlight(); });
    $("#view-search").addEventListener("input", e => filterViewMenu(e.target.value));
    const vmNew = $("#vm-new");
    if (vmNew) vmNew.addEventListener("click", () => {
      state.unseenOnly = !state.unseenOnly;
      vmNew.classList.toggle("on", state.unseenOnly);
      filterViewMenu($("#view-search") ? $("#view-search").value : "");
    });
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
    function updateDefBtn() {
      const b = $("#vm-defview"); if (!b) return;
      const cur = localStorage.getItem("magpie.defaultView");
      b.classList.toggle("active", !!cur && cur === state.heroMode);
      const label = cur ? (viewMeta(cur) || {}).title : null;
      b.title = cur ? `默认视图：${label}${state.heroMode === cur ? "（当前生效）" : ""}` : "把当前视图设为启动视图";
    }
    $("#vm-defview").addEventListener("click", () => {
      if (localStorage.getItem("magpie.defaultView") === state.heroMode) {
        localStorage.removeItem("magpie.defaultView");
        toast("已取消默认视图");
      } else {
        localStorage.setItem("magpie.defaultView", state.heroMode);
        toast("已把「" + (viewMeta(state.heroMode) || {}).title + "」设为默认视图");
      }
      updateDefBtn();
      closeViewMenu();
    });
    $("#vm-dexreset").addEventListener("click", () => {
      if (localStorage.getItem("magpie.viewSeen") === "[]") { toast("图鉴已是空的"); return; }
      localStorage.removeItem("magpie.viewSeen");
      toast("图鉴已清空 · 重新收集吧");
      buildViewMenu(); // refresh the dex counter + green dots
    });
    Obs.hooks.afterRender.push(updateDefBtn);
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

    $("#donut-legend").addEventListener("click", e => {
      const row = e.target.closest("[data-mix-model]");
      if (!row) return;
      const name = row.dataset.mixModel;
      if (state.logFilterModel === name) {
        state.logFilterModel = null;
        state.logQuery = "";
        const qs = $("#log-search"); if (qs) qs.value = "";
        toast("日志筛选已清除");
      } else {
        state.logFilterModel = name;
        state.logQuery = name;
        const qs = $("#log-search"); if (qs) qs.value = name;
        toast(`日志已过滤：${name}`);
      }
      renderLogs(); renderDonut();
      document.querySelector(".table-card")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    $("#trend-seg").addEventListener("click", e => {
      const b = e.target.closest("button[data-metric]");
      if (!b) return;
      state.trendMetric = b.dataset.metric;
      renderTrend();
    });

    const mc2 = $("#mascot");
    if (mc2) {
      let magpieClicks = 0;
      try { magpieClicks = parseInt(localStorage.getItem("magpie.clicks") || "0", 10) || 0; } catch (_) {}
      const mcTitle = () => mc2.setAttribute("title", `台鹊 · 鹊缘 ${magpieClicks} 次 · 双击绕场`);
      mcTitle();
      mc2.addEventListener("click", () => {
        mc2.classList.remove("mascot-hop");
        void mc2.offsetWidth;
        mc2.classList.add("mascot-hop");
        magpieClicks++;
        try { localStorage.setItem("magpie.clicks", String(magpieClicks)); } catch (_) {}
        mcTitle();
        const quips = ["叽喳", "喳喳！", "今日宜多开会话", "token 不够就改道", "窗口快满啦", "吉签大吉", "缓存复用是好习惯", "别盯着报错看"];
        toast("台鹊：" + quips[Math.floor(Math.random() * quips.length)] + ` · 鹊缘 ${magpieClicks}`);
        setTimeout(() => mc2.classList.remove("mascot-hop"), 520);
      });
    }
    mc2.addEventListener("dblclick", () => {
      mc2.classList.remove("mascot-lap");
      void mc2.offsetWidth;
      mc2.classList.add("mascot-lap");
      toast("台鹊绕场一周！");
      setTimeout(() => mc2.classList.remove("mascot-lap"), 3450);
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
      // easter egg: tap any session-row area 5x quickly → tiny magpie flies out
      {
        const now = performance.now();
        state.tapTrack = state.tapTrack || { n: 0, t: 0 };
        if (now - state.tapTrack.t > 650) state.tapTrack.n = 0;
        state.tapTrack.t = now;
        state.tapTrack.n++;
        if (state.tapTrack.n === 5) {
          state.tapTrack.n = 0;
          const b = document.createElement("span");
          b.className = "ghost-magpie";
          b.innerHTML = `<svg viewBox="0 0 32 26" style="width:26px;height:21px"><path d="M3 14c2-5 7-8 12-8 4 0 7 2 9 5l5-1-4 5 4 4-6-1c-2 3-6 5-10 5-4 0-8-2-10-5l-1-5z" fill="var(--accent)"/><circle cx="13" cy="11" r="1.2" fill="var(--bg)"/></svg>`;
          b.style.left = e.clientX + "px";
          b.style.top = (e.clientY - 20) + "px";
          b.style.position = "fixed";
          b.style.zIndex = "9999";
          document.body.appendChild(b);
          setTimeout(() => b.remove(), 2600);
          toast("台鹊探头：别急，马上来！");
        }
      }
      const pinBtn = e.target.closest(".session-pin");
      if (pinBtn) {
        e.stopPropagation();
        const id = pinBtn.dataset.pin;
        const i = state.pinnedSessions.indexOf(id);
        if (i >= 0) state.pinnedSessions.splice(i, 1); else state.pinnedSessions.unshift(id);
        state.pinnedSessions = state.pinnedSessions.slice(0, 12);
        try { localStorage.setItem("magpie.pinnedSessions", JSON.stringify(state.pinnedSessions)); } catch (_) {}
        renderSessions();
        toast(i >= 0 ? "已取消置顶" : "会话已置顶");
        return;
      }
      const card = e.target.closest(".session-card");
      if (!card) return;
      const id = card.dataset.session;
      state.selectedSession = state.selectedSession === id ? null : id;
      state.filter = null;
      renderSessions();
      renderRouteStage();
      renderDecision();
      state.logFilterModel = null;
      const qs = $("#log-search");
      if (state.selectedSession) {
        if (qs) qs.value = id;
        state.logQuery = id;
      } else {
        if (qs) qs.value = "";
        state.logQuery = "";
      }
      renderLogs(); renderDonut();
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

    // Hover a session card ~350ms → fixed popover with its tries chain and
    // live stats; hides on leave/scroll so the list stays calm.
    let popTimer = null;
    const pop = document.createElement("div");
    pop.className = "session-pop"; pop.hidden = true;
    document.body.appendChild(pop);
    const hidePop = () => { clearTimeout(popTimer); pop.hidden = true; };
    $("#session-list").addEventListener("mouseover", e => {
      const card = e.target.closest(".session-card");
      if (!card) { return; }
      clearTimeout(popTimer);
      popTimer = setTimeout(() => {
        const s = (state.data.sessions || []).concat(state.data.recent || []).find(x => x.id === card.dataset.session);
        if (!s) return;
        const tries = (s.tries || []).map(t =>
          `<div class="pop-try"><span>${esc(D.providerMeta(t.provider).name)}/${esc(t.model.split("/").pop())}</span><em class="${t.state}">${t.state === "ok" ? "✓" : t.state === "fail" ? "✕" : "…"}</em></div>`).join("");
        const subs = (s.subagents || []).length;
        pop.innerHTML = `
          <div class="pop-head"><b>${esc(s.title)}</b><span>${esc(STATUS_TEXT[s.status] || s.status)}</span></div>
          <div class="pop-meta">${esc(D.agentMeta(s.agent).name)} · ${esc(s.model)} · group/${esc(s.group || "direct")}</div>
          <div class="pop-stats"><span><b>${fmtTokens(s.tokens || 0)}</b> tok</span><span><b>${s.tps ? s.tps.toFixed(0) : "—"}</b> tok/s</span><span><b>${fmtAge(Date.now() - s.startedAt)}</b></span><span><b>${subs}</b> 子任务</span></div>
          ${tries ? `<div class="pop-tries">${tries}</div>` : ""}`;
        const r = card.getBoundingClientRect();
        pop.hidden = false;
        const pw = 260;
        pop.style.left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left)) + "px";
        pop.style.top = (r.bottom + 6 + pop.offsetHeight > window.innerHeight ? r.top - pop.offsetHeight - 6 : r.bottom + 6) + "px";
      }, 350);
    });
    $("#session-list").addEventListener("mouseout", e => { if (e.target.closest(".session-card")) hidePop(); });
    $("#session-list").addEventListener("scroll", hidePop, { passive: true });
    document.addEventListener("click", e => { if (!e.target.closest(".session-pop")) hidePop(); });

    // Hover a quota item → same pop style: all windows with bars + reset ETA.
    let qPopTimer = null;
    const qpop = document.createElement("div");
    qpop.className = "session-pop quota-pop"; qpop.hidden = true;
    document.body.appendChild(qpop);
    const hideQPop = () => { clearTimeout(qPopTimer); qpop.hidden = true; };
    const ql = $("#quota-list");
    if (ql) {
      ql.addEventListener("mouseover", e => {
        const item = e.target.closest(".quota-item");
        if (!item) return;
        clearTimeout(qPopTimer);
        qPopTimer = setTimeout(() => {
          const q = (state.data.quotas || []).find(x => x.provider === item.dataset.prov);
          if (!q) return;
          const meta = D.providerMeta(q.provider);
          const rows = (q.windows || []).map(w => {
            const u = Math.round(w.used || 0);
            const col = u >= 88 ? "var(--red)" : u >= 70 ? "var(--amber)" : meta.color;
            return `<div class="pop-try"><span>${esc(w.name)}</span><em class="${u >= 88 ? "fail" : "ok"}" style="color:${col}">${u}% · ${esc(fmtReset(w.resetsIn))}</em></div>`;
          }).join("");
          qpop.innerHTML = `
            <div class="pop-head"><b>${esc(meta.name || q.provider)}</b><span>${esc(q.plan || "")}</span></div>
            <div class="pop-meta">${esc(q.name)}${q.user ? " · " + esc(q.user) : ""}${q.balance ? " · 余额 " + esc(q.balance) : ""}</div>
            <div class="pop-tries">${rows || '<div class="pop-try"><span>无窗口数据</span></div>'}</div>`;
          const r = item.getBoundingClientRect();
          qpop.hidden = false;
          const pw = 260;
          qpop.style.left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.left)) + "px";
          qpop.style.top = (r.bottom + 6 + qpop.offsetHeight > window.innerHeight ? r.top - qpop.offsetHeight - 6 : r.bottom + 6) + "px";
        }, 350);
      });
      ql.addEventListener("mouseout", e => { if (e.target.closest(".quota-item")) hideQPop(); });
      ql.addEventListener("scroll", hideQPop, { passive: true });
      document.addEventListener("click", e => { if (!e.target.closest(".quota-pop")) hideQPop(); });
    }

    // Right-click a session card → little context menu with the four things
    // you actually do with a session id. Replaces the old copy-id-only flow.
    const ctxMenu = document.createElement("div");
    ctxMenu.className = "session-ctx"; ctxMenu.hidden = true;
    document.body.appendChild(ctxMenu);
    const hideCtx = () => { ctxMenu.hidden = true; };
    let ctxSess = null;
    $("#session-list").addEventListener("contextmenu", e => {
      const card = e.target.closest(".session-card");
      if (!card) return;
      e.preventDefault();
      hidePop();
      ctxSess = (state.data.sessions || []).concat(state.data.recent || []).find(x => x.id === card.dataset.session);
      if (!ctxSess) return;
      ctxMenu.innerHTML = `
        <button data-act="copy-id"><svg><use href="#i-link"/></svg>复制会话 ID</button>
        <button data-act="copy-tries"><svg><use href="#i-arrow"/></svg>复制 tries 链</button>
        <button data-act="filter"><svg><use href="#i-search"/></svg>只看 ${esc(D.agentMeta(ctxSess.agent).name)}</button>
        <button data-act="logs"><svg><use href="#i-db"/></svg>跳到日志</button>`;
      ctxMenu.hidden = false;
      const mw = 168;
      ctxMenu.style.left = Math.min(e.clientX, innerWidth - mw - 8) + "px";
      ctxMenu.style.top = Math.min(e.clientY, innerHeight - ctxMenu.offsetHeight - 8) + "px";
    });
    ctxMenu.addEventListener("click", e => {
      const b = e.target.closest("[data-act]");
      if (!b || !ctxSess) { hideCtx(); return; }
      const act = b.dataset.act;
      if (act === "copy-id") navigator.clipboard?.writeText(ctxSess.id).then(() => toast("会话 ID 已复制"));
      if (act === "copy-tries") {
        const t = (ctxSess.tries || []).map(x => `${D.providerMeta(x.provider).name}/${x.model.split("/").pop()} ${x.state === "ok" ? "✓" : "✕"}`).join(" → ");
        navigator.clipboard?.writeText(`${ctxSess.title} | ${fmtTokens(ctxSess.tokens || 0)} tok | ${t || ctxSess.model}`).then(() => toast("tries 链已复制"));
      }
      if (act === "filter") {
        state.filter = { type: "agent", value: ctxSess.agent };
        state.selectedSession = null;
        renderSessions(); renderDecision(); renderCustomView(state.heroMode, true);
        toast(`已筛选：${D.agentMeta(ctxSess.agent).name}`);
      }
      if (act === "logs") {
        const card = document.querySelector(".table-card");
        if (card) { card.scrollIntoView({ behavior: "smooth", block: "center" }); toast("已跳到日志"); }
      }
      hideCtx();
    });
    document.addEventListener("click", e => { if (!e.target.closest(".session-ctx")) hideCtx(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") hideCtx(); });

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

    const ssInput = $("#session-search");
    if (ssInput) ssInput.addEventListener("input", () => {
      state.sessionQuery = ssInput.value.trim();
      renderSessions();
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

    // column sort on thead click
    document.querySelector(".log-table thead")?.addEventListener("click", e => {
      const th = e.target.closest("th[data-sort]");
      if (!th) return;
      const k = th.dataset.sort;
      if (!state.logSort) state.logSort = { key: "at", dir: -1 };
      if (state.logSort.key === k) state.logSort.dir *= -1;
      else state.logSort = { key: k, dir: -1 };
      renderLogs();
    });

    $("#log-search").addEventListener("input", e => {
      state.logQuery = e.target.value.trim();
      state.logFilterModel = null;
      renderLogs(); renderDonut();
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

    // Weekly digest: aggregate the last 7 heatmap days + live session/quota
    // state into a Markdown report that pastes cleanly into an issue or wiki.
    $("#log-digest").addEventListener("click", () => {
      const days = (state.data.heatmap || []).slice(-7);
      const total = days.reduce((a, d) => a + (d.tokens || 0), 0);
      const calls = days.reduce((a, d) => a + (d.calls || 0), 0);
      const peak = days.reduce((a, d) => (d.tokens > (a.tokens || 0) ? d : a), days[0] || {});
      const k = state.data.kpis || {};

      const byProv = {};
      (state.data.logs || []).forEach(r => {
        const p = r.provider || "?";
        byProv[p] = byProv[p] || { tokens: 0, calls: 0, cost: 0 };
        byProv[p].tokens += r.tokens || 0;
        byProv[p].calls += 1;
        byProv[p].cost += r.cost || 0;
      });
      const provRows = Object.entries(byProv).sort((a, b) => b[1].tokens - a[1].tokens).slice(0, 8);

      const warn = (state.data.quotas || []).flatMap(q =>
        (q.windows || []).filter(w => (w.used || 0) >= 85).map(w => `${q.provider}/${w.name || "窗口"} ${Math.round(w.used)}%`));

      const errs = (state.data.logs || []).filter(r => r.status === "err" || r.status === "fail").length;
      const span = days.length ? `${days[0].date} ~ ${days[days.length - 1].date}` : "—";

      const md = [
        `# Magpie 使用周报`,
        ``,
        `> 区间 **${span}** · 导出 ${new Date().toISOString().slice(0, 16).replace("T", " ")} · ${state.mode === "live" ? "实时" : "演示"}数据`,
        ``,
        `## 概览`,
        `| 指标 | 值 |`,
        `|---|---|`,
        `| 请求数 | ${calls.toLocaleString()} |`,
        `| Tokens | ${fmtTokens(total)} |`,
        `| 估算成本 | $${(total / 1e6 * 1.32).toFixed(2)} |`,
        `| 缓存命中 | ${(k.cache || 0).toFixed(1)}% |`,
        `| 错误请求 | ${errs} |`,
        `| 峰值日 | ${peak.date || "—"} (${fmtTokens(peak.tokens || 0)}) |`,
        ``,
        `## 每日`,
        `| 日期 | Tokens | 请求 |`,
        `|---|---|---|`,
        ...days.map(d => `| ${d.date} | ${fmtTokens(d.tokens || 0)} | ${(d.calls || 0).toLocaleString()} |`),
        ``,
        `## 服务商 Top`,
        `| 服务商 | Tokens | 请求 | 费用 |`,
        `|---|---|---|---|`,
        ...(provRows.length ? provRows.map(([p, v]) => `| ${p} | ${fmtTokens(v.tokens)} | ${v.calls} | $${v.cost.toFixed(2)} |`) : ["| — | — | — | — |"]),
        ``,
        `## 配额告警 ≥85%`,
        ...(warn.length ? warn.map(w => `- ⚠️ ${w}`) : ["- ✅ 全部窗口健康"]),
        ``
      ].join("\n");

      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `magpie-weekly-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast("周报已导出");
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
      if (e.target instanceof Element && e.target.matches("input, textarea, select, [contenteditable]")) return;
      if (e.key === "/") { e.preventDefault(); $("#log-search").focus(); }
      if (e.key === " ") { e.preventDefault(); $("#demo-toggle").click(); }
      if (e.key.toLowerCase() === "t") { e.preventDefault(); $("#theme-toggle").click(); }
      if (e.key.toLowerCase() === "v" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); toggleViewMenu(); }
      if (e.key.toLowerCase() === "r" && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); randomView(); }
      else if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); (window.Obs && window.Obs.onKeyR ? window.Obs.onKeyR(e) : randomView()); }
      if (e.key.toLowerCase() === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); if (state.tour) stopTour(); else { closeViewMenu(); startTour(); } }
      if (e.key.toLowerCase() === "f" && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); toggleFavorite(state.heroMode); }
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        try {
          const seen = JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]");
          const idx = VIEW_META.findIndex(v => v.id === state.heroMode);
          let next = null;
          for (let i = 1; i <= VIEW_META.length; i++) {
            const cand = VIEW_META[(idx + i) % VIEW_META.length];
            if (!seen.includes(cand.id)) { next = cand; break; }
          }
          if (next) { setHeroMode(next.id); toast("下一个未看：「" + (next.title || next.id) + "」"); }
          else toast("图鉴已集齐 · 全图鉴达成");
        } catch (_) {}
      }
      if (e.key.toLowerCase() === "u" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        try {
          const seen = JSON.parse(localStorage.getItem("magpie.viewSeen") || "[]");
          const i = seen.indexOf(state.heroMode);
          const meta = viewMeta(state.heroMode);
          const name = (meta && meta.title || state.heroMode);
          if (i >= 0) {
            seen.splice(i, 1);
            localStorage.setItem("magpie.viewSeen", JSON.stringify(seen));
            const at = JSON.parse(localStorage.getItem("magpie.viewSeenAt") || "{}");
            delete at[state.heroMode];
            localStorage.setItem("magpie.viewSeenAt", JSON.stringify(at));
            toast("图鉴移除：「" + name + "」 · 剩 " + seen.length + "/" + VIEW_META.length);
          } else {
            seen.push(state.heroMode);
            localStorage.setItem("magpie.viewSeen", JSON.stringify(seen));
            const at = JSON.parse(localStorage.getItem("magpie.viewSeenAt") || "{}");
            at[state.heroMode] = new Date().toISOString();
            localStorage.setItem("magpie.viewSeenAt", JSON.stringify(at));
            toast("图鉴加入：「" + name + "」 · " + seen.length + "/" + VIEW_META.length);
          }
        } catch (_) {}
      }
      if (e.key.toLowerCase() === "d" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        try {
          const d = JSON.parse(localStorage.getItem("magpie.viewCountDay") || "{}");
          const n = (d.date === new Date().toISOString().slice(0, 10) ? d.n : 0);
          const vc = parseInt(localStorage.getItem("magpie.viewCount") || "0", 10) || 0;
          toast(`今日切视图 ${n} 次 · 累计 ${vc} 次`);
        } catch (_) {}
      }
      if (e.key.toLowerCase() === "b" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const CYCLE = ["burn", "rhythm", "quota", "loom"];
        const i = CYCLE.indexOf(state.heroMode);
        if (i === -1 || i === CYCLE.length - 1) {
          if (i === -1) { setHeroMode(CYCLE[0]); toast("跳到燃烧速率"); }
          else toast("已在织机 · 再按 `` 回上一视图");
        } else {
          setHeroMode(CYCLE[i + 1]);
          toast("跳到 " + CYCLE[i + 1]);
        }
      }
      if (e.key === "?") { e.preventDefault(); toggleHelp(); }
      if (e.key === "\`" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const prev = (state.viewRecent || []).find(id => id !== state.heroMode);
        if (prev && viewMeta(prev)) { setHeroMode(prev); toast("回到「" + (viewMeta(prev).title || prev) + "」"); }
        else toast("没有上一视图");
      }
      if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const idx = VIEW_META.findIndex(v => v.id === state.heroMode);
        const step = e.key === "ArrowRight" ? 1 : -1;
        const next = VIEW_META[(idx + step + VIEW_META.length) % VIEW_META.length].id;
        setHeroMode(next);
      }
      // 1-9: jump straight to a favorited view (matches the ★ rail order).
      if (/^[1-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const favs = state.favorites.map(id => viewMeta(id)).filter(Boolean);
        const pick = favs[+e.key - 1];
        if (pick) { setHeroMode(pick.id); toast(`收藏 ${e.key} · 「${pick.title || pick.id}」`); }
        else toast(favs.length ? `收藏位 ${e.key} 为空（共 ${favs.length} 个）` : "还没有收藏视图 · f 收藏当前");
      }
      // w: export the weekly digest without reaching for the button.
      if (e.key.toLowerCase() === "w" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const btn = $("#log-digest");
        if (btn) btn.click(); else toast("周报按钮未就绪");
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
    $$("#accent-seg button").forEach(b => b.classList.toggle("active", b.dataset.accent === (root.dataset.accent || "aurora")));
  }
  function applySetting(kind, value) {
    const root = document.documentElement;
    root.dataset[kind] = value;
    try { localStorage.setItem("magpie." + kind, value); } catch (_) {}
    syncSettingsMenu();
    renderAll();
    requestAnimationFrame(drawWires);
    ensureFlightLoop();
    const names = { layout: { auto: "自动", fit: "一屏", comfort: "舒展" }, density: { compact: "紧凑", cozy: "标准", spacious: "宽松" }, motion: { full: "全部", soft: "轻柔", off: "关闭" }, tour: { 5: "5 秒", 10: "10 秒", 30: "30 秒" }, accent: { aurora: "极光", ember: "熔金", mint: "薄荷", rose: "蔷薇", mono: "石墨" } };
    const prefix = { layout: "布局：", density: "密度：", motion: "动效：", tour: "巡游：", accent: "主色：" };
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
  const toastSeen = new Map();
  function toast(msg) {
    const el = $("#toast");
    // merge identical toasts fired within 1.2s — append ×N badge
    const now = performance.now();
    const last = toastSeen.get(msg) || 0;
    const isDup = now - last < 1200;
    toastSeen.set(msg, now);
    // prune old entries so the map stays small
    if (toastSeen.size > 60) toastSeen.forEach((t, k) => { if (now - t > 60000) toastSeen.delete(k); });
    if (isDup) {
      const n = (el.dataset.dup ? +el.dataset.dup : 1) + 1;
      el.dataset.dup = String(n);
      el.innerHTML = `${esc(msg)} <span class="toast-n">×${n}</span>`;
    } else {
      delete el.dataset.dup;
      el.textContent = msg;
    }
    el.hidden = false;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.remove("show");
      setTimeout(() => { el.hidden = true; }, 220);
    }, 2200);
  }

  /* ------------------------------------------------------------- confetti --- */
  // Lightweight canvas burst — achievement unlocks only.
  function confetti(n) {
    if (document.documentElement.dataset.motion === "off") return;
    const c = document.createElement("canvas");
    c.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:400";
    c.width = innerWidth; c.height = innerHeight;
    document.body.appendChild(c);
    const ctx = c.getContext("2d");
    const parts = [];
    const colors = ["#8b7cf6","#4ade80","#fbbf24","#f472b6","#60a5fa","#f97316"];
    const cx = innerWidth / 2, cy = innerHeight / 2;
    for (let i = 0; i < (n || 60); i++) {
      const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 7;
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, r: 2 + Math.random() * 4, c: colors[i % colors.length], t: 0 });
    }
    const start = performance.now();
    function frame(t) {
      ctx.clearRect(0, 0, c.width, c.height);
      const dt = (t - start) / 1000;
      let alive = false;
      parts.forEach(p => {
        p.t += .016;
        p.vy += .16;
        p.x += p.vx; p.y += p.vy;
        p.vx *= .985;
        const life = 1 - p.t / 1.4;
        if (life <= 0) return;
        alive = true;
        ctx.globalAlpha = life;
        ctx.fillStyle = p.c;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.t * 8 + p.r);
        ctx.fillRect(-p.r, -p.r * .5, p.r * 2, p.r);
        ctx.restore();
      });
      if (alive) requestAnimationFrame(frame);
      else c.remove();
    }
    requestAnimationFrame(frame);
    setTimeout(() => { try { c.remove(); } catch (_) {} }, 2000);
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
      ["layout", "density", "motion", "tour", "accent"].forEach(k => {
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
    // ?view= wins, then the double-clicked default, then the built-in route.
    const qView = new URLSearchParams(location.search).get("view");
    const storedView = (() => { try { return localStorage.getItem("magpie.defaultView"); } catch (_) { return null; } })();
    const bootView = (qView && viewRegistry()[qView]) ? qView
      : (storedView && viewRegistry()[storedView]) ? storedView
      : state.heroMode;
    setHeroMode(bootView);
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
    state, toast, confetti, setHeroMode, renderAll, fmtTokens, fmtMoney, fmtReset,
    computeView, drawWires, randomView, startTour, stopTour, connectLive,
    closeViewMenu,
    apiHeaders, viewMeta, VIEW_META, providerMeta: D.providerMeta, agentMeta: D.agentMeta,
    agentIcon, providerIcon, esc, clamp
  };
  window.Obs.api = apiObj;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
