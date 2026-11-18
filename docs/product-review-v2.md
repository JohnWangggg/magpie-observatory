# Magpie Observatory v2 — 功能清点、调研与删减决定

2026-11-18 · 版本 2.0.0

> 注：v1 前端已在本版从仓库删除，下文出现的 `app.js`、`app-plus.js`、
> `app.css`、`views/` 等路径指删除前的 v1.10.130 树，保留为证据。

> 结论先说：旧版不是「数据不对」，而是**把 Magpie 已经有的页面又做了一遍，
> 并且在上面叠了 25 个视图、7 套皮肤和一套游戏化**。每天打开的成本高于它
> 节省的时间。v2 只保留 Magpie 没有的一屏判断：现在、今天、额度风险。

---

## 1. 旧版清点（v1.10.130）

### 1.1 表面

| 类别 | 数量 / 事实 | 证据 |
| --- | --- | --- |
| 视图入口 | 8 个（`VIEW_META`） | `public/assets/app.js:153` |
| 视图模块 | 25 个（`ObservatoryManifest`） | `public/assets/views/manifest.js` |
| 图表模块 | 17 个独立模块 + 5 个 board 别名 + route/rings 内建 | `public/assets/views/*.js` |
| 主面板卡片 | 10 个 `data-slot` + KPI 行 | `public/index.html` |
| 首屏高度 | 1365×768 下 2009px，需滚动 2.6 屏 | 浏览器实测 |
| 风格包 | 7 套 × 明/暗；另有 5 主色、3 密度、3 动效、3 布局、3 巡游间隔 | README / `app.css` |
| 游戏化 | XP 等级、8 枚徽章、连续天数、最佳连击、战绩、combo 里程碑 | `app-plus.js` |
| 回放 | 180 帧、拖动、变速、A/B 循环、帧对比、diff、书签、快照、JSON/HTML/链接导出 | `app-plus.js` |
| 分享 | 今日/本周/近30天/对比 4 种 PNG、周报卡、网关对比 | `app-plus.js` |
| 其它 | 命令面板（约 25 个动作）、便签、会话便签、拖拽布局、KPI 隐藏、PWA、mini 模式、环境粒子、吉祥物、声音、每日摘要弹窗 | `app-plus.js` |
| localStorage 键 | 42 个 `magpie.*` | 全库检索 |
| 事件/定时器 | 231 处 `addEventListener`、12 个 `setInterval`、53 处 `setTimeout`（静态计数） | `app.js` + `app-plus.js` |
| 前端体积 | 618 KB 原始 / 约 151 KB gzip（app.js 220K + app-plus 190K + app.css 208K） | `wc -c` |
| 视图代码 | 7,269 行 JS + 4,190 行 CSS | `wc -l` |
| 仓库资产 | `public/` 4.1 MB，`docs/` 32 MB | `du -sh` |

### 1.2 数据与架构

- 本地服务监听 `127.0.0.1:3488`，代理 6 个只读接口（trace / quotas /
  quota history / usage / concurrency / requests）。
- 插件页只是一个启动器，导航到服务；服务用 `Origin: null` + 每次启动生成的
  口令做 CORS。
- `package.json` 没有 `magpie.permissions`，没有使用 Magpie 的
  `_magpie/bridge.js`、`usage:summary` / `usage:day` / `providers:list`，
  也没有 panel、action 或 `replaces`。
- 因此它**能工作，但不是 Magpie 页面的原生形态**：自带服务、自带主题、
  自带一套导航；在 `magpie web` 下依赖 `magpie.service` 代理。

### 1.3 实测到的缺陷（已修）

| 缺陷 | 影响 | 位置 |
| --- | --- | --- |
| **7 天其实是 30 天** | 页面把 `7d` 映射成 `week`，网关把 `week` 静默当 `30d`；7 天标签一直显示 30 天数据 | `app.js` → `server.mjs` |
| 版本号三处不一致 | 控制台 `v1.0.1`、页面 `v1.10.130`、`/api/version` `1.0.1` | `app.js` / `server.mjs` |
| 视图菜单 11 个分组、7 个空分组 | 「趣味 / 天象 / 生态 / 几何 / 场景 / 洞察 / 抽象」都是 0，占一整排 | `buildViewMenu` |
| 左侧 rail 是假导航 | 点击只 `scrollIntoView` + toast，不是切页；同一段绑定还注册了两次 | `app.js` |
| 每日摘要弹窗 | 每天首次打开盖住整个仪表板，要先关掉才能看数据 | `app-plus.js` |
| `state.metric` 不存在 | `buildViewCtx` 传入 `undefined` | `app.js` |
| `[hidden]` 被 `display:flex` 覆盖 | 专注页的空 banner 仍会画出一个小胶囊（旧版回放条已有 `[hidden]` 修复） | CSS |
| 入口不可发现 | 未进社区 registry；带本地服务的页面在 GitHub Discover 会被归为 provider，只能走 registry 的 `kind: page` 条目 | `docs/community-listing.md` |

---

## 2. 调研：什么样的插件会被人长期打开

### 2.1 Magpie 社区里的 page 插件

| 插件 | 规模 | 只读权限 | 做法 | 可学 / 不可学 |
| --- | --- | --- | --- | --- |
| `@magpie-community/page-usage`（Usage Glance） | **271 行 / 36 KB** | `usage:summary` | 一个页面、三个周期、四个数字、模型榜；60 秒刷新；跟随 Magpie 主题 | **最像「长期用」的形态**：零配置、一屏、单一问题 |
| `@magpie-community/page-day-card`（Day Card） | 1,586 行 / 868 KB（含字体） | `usage:day` | 把一天打印成小票，可复制/保存 PNG | 一个可带走的产物；但模板和字体很重 |
| `@magpie-community/page-usage-board` | 1,664 行 / 872 KB | 本地服务 | README 明说「大部分重复 Magpie Usage 页」，只为 5 件 Usage 没有的事 | **诚实划边界**：只做宿主没做的 |
| `@magpie-community/page-usage-tree` | 2,867 行 / 280 KB | 本地服务 | Provider → Account → Model 树，补 `usage:summary` 缺的账号层 | 一个明确的缺口 |
| `@magpie-community/page-agent-office` | 10,978 行 / 4.9 MB | 本地会话文件 | 3D 办公室 / 等距 / 工作台 | 花哨但**单一目的**；不为每个数据做一种图 |
| `@magpie-community/page-chat` | 22 stars | 本地服务 | Magpie 窗口里的聊天页 | 服务型页面的参考 |

Magpie 官方 page 能申请的读只有三个：`usage:summary`、`usage:day`、
`providers:list`（`internal/plugin/page.go`）。需要 trace/配额历史的页面
只能走本地服务；这不是问题，但服务应该只做宿主没有的那部分。

### 2.2 Magpie 之外的同类

| 项目 | 关键做法 | 对长期使用的启示 |
| --- | --- | --- |
| `Javis603/token-monitor` | 54+ 工具、菜单栏/刘海/小组件/多设备同步 | 活在用户已经在看的地方，而不是一个要专门打开的网页 |
| `luwill/token-watcher` | FSEvents → 增量解析 → SSE，<1s；菜单栏；余额对账；明确写测量限制 | 实时是「增量」不是「每次全量」；诚实标注估算 |
| `tt-a1i/tokenmeter` | 本地 dashboard、实时事件流、预算告警、预测、热力图 | 告警和预测比第 18 种图表有用 |
| `smallcat2333/magpie-hud` | 置顶 HUD、1s 并发、60s 配额、≤420px 高时收成一行 | 形态可以很小；信息按高度分级 |
| `ryoppippi/ccusage` | CLI、5 小时计费块、日/月报表 | 一个命令回答一个问题，不需要 UI |
| `@magpie-community/gateway-notify` | 任务完成/失败、订阅掉线时推送 | 真正留人的是「有事找你」，不是「你去找它」 |

### 2.3 共同规律

1. **一个问题，一屏。** 活得久的页面都能用一句话说清。
2. **在用户已经在的地方出现。** 菜单栏、刘海、通知、宿主页面里的 panel，
   比「再开一个 dashboard」更容易形成习惯。
3. **原生。** 跟随宿主主题、用宿主权限、用宿主的字体和间距。
4. **增量与低延迟。** 全量轮询越做越重；增量快照/SSE 才能常开。
5. **诚实。** 标注估算、未定价、数据年龄和测量限制，比多一个漂亮数字重要。
6. **游戏化不 retention。** 徽章、等级、连击只在第一次有趣；之后是噪声。
7. **划边界。** 明确写「只做宿主没有的 N 件事」，用户才知道为什么装它。

---

## 3. 评估矩阵：留、收、删

| 功能 | 旧版状态 | 与 Magpie 自有页的关系 | 决定 |
| --- | --- | --- | --- |
| 在飞会话 / 路由 / 改道 | 有 | Routing 页有实时舞台 | **留**，压成 3–4 行 |
| 今日 Token / 费用 / 调用 / 错误 | 有 | Usage 页有总量 | **留**，作为一屏数字 |
| 账号额度 / 重置倒计时 | 有 | Quotas 页有窗口 | **留** |
| 额度消耗速度 / 耗尽预测 | 有（burn/forecast 视图） | Magpie 的额度卡已有逐卡走势和「按此速度」预测，但没有跨账号排序 | **留，做成跨账号核心** |
| 模型构成 | 有 | Usage 有按模型拆分 | **留**，前 4 名 |
| 14 天走势 | 有 | Usage 有趋势 | **留**，一条 sparkline |
| 25 个图表视图 | 有 | 大部分是 Magpie 页面的另一种画法 | **删**（保留源码，不进产品/包） |
| 7 套风格 + 主色 | 有 | 宿主已有明暗 | **删**，跟随 `--magpie-*` |
| XP / 等级 / 徽章 / 连击 / 战绩 | 有 | 无 | **删** |
| 每日摘要弹窗 | 有 | 无 | **删**自动弹出；需要时从命令面板看 |
| 回放 / A-B / 帧对比 / 导出 | 有 | Trace 历史在 Magpie | **删** |
| 分享卡 / 周报 / 网关对比 | 有 | 无 | **删**（Day Card 已覆盖「带走一张图」） |
| 命令面板 | 有 | 无 | **删**（页面只有 3 个控件） |
| 便签 / 会话便签 | 有 | 无 | **删** |
| 拖拽布局 / 隐藏 KPI | 有 | 无 | **删** |
| PWA / mini 模式 | 有 | 无 | **删**（插件已经在 Magpie 窗口里） |
| 声音 / 粒子 / 吉祥物 / attract | 有 | 无 | **删** |
| 多网关切换 | 有 | Magpie 设置里有 | **删** |
| 浏览器通知 | 有 | Gateway Notify 插件更可靠 | **不做**，避免重复 |

---

## 4. v2 产品定义

### 4.1 一句话

> 打开一屏，三秒内知道：现在有没有事、今天花得正不正常、哪个额度要先没。

### 4.2 一屏结构

```
┌──────────────────────────────────────────────┬────────────────────┐
│ 现在：在飞/最近完成（Agent → Provider → 模型）│ 今天：Token 大字    │
│       TTFT · tok/s · 改道 · 排队              │ 费用/调用/错误/缓存 │
│                                              │ 近14天 sparkline    │
├──────────────────────────────────────────────┼────────────────────┤
│ 额度：按风险排序；余量、重置、预计耗尽时间     │ 构成：前4个账号     │
│       跨账号，带账号名                         │ 费用；可切模型      │
└──────────────────────────────────────────────┴────────────────────┘
```

### 4.3 额度预测

- 取每个窗口最近 90 分钟的历史点；不足时用当前窗口的全部点；
- 窗口长度从 `start`/`resetsAt` 读，读不到就从窗口名（`5 hours`、`7 days`）解析；
- 需要的最小跨度：`min(6h, max(30m, window × 2%))`。30 天窗口至少 6 小时，
  5 小时窗口至少 30 分钟——**不拿 18 分钟的突发外推 30 天**；
- `rate = (left_first - left_last) / minutes`，低于 0.001%/分钟视为没有消耗；
- `eta = left / rate`；
- 与 `resetsIn` 比较：`eta < reset` → 红；`eta < reset * 1.2` → 黄；
  否则绿；已用 ≥90% 且没有趋势时也标红，≥80% 标黄；
- 仍不够 → 明确写「数据不足」，只显示已用/剩余；
- 排序是跨账号、跨窗口的，所以一屏先看到「谁会在重置前耗尽」。

### 4.4 与 Magpie 自带的对比

| 问题 | Magpie 自带 | Observatory |
| --- | --- | --- |
| 现在谁在跑、为什么改道 | Routing 舞台，最详细 | 一屏 3–4 行，带账号、路由组、失败码 |
| 今天花了多少 | Usage 概览，最详细 | 一屏数字 + 较昨日全天/日均 |
| 哪个账号先没额度 | 额度卡墙，逐卡走势 | **跨账号风险排序** + 重置前耗尽 |
| 今天谁在花钱 | 账号拆分，页面下方 | **同屏 Top 4 账号**（可切模型；红点=该账号有额度风险） |
| 深挖请求 | 最近请求/重放 | 不做，留给 Magpie |

Observatory 不是 Magpie Usage 的替代品，而是打开 Magpie 后的第一眼。

### 4.5 体验规则

- 打开不弹任何东西；
- 只有 3 个时间范围按钮，没有设置；
- 跟随 Magpie 明暗，不另做主题；
- 数字用等宽字体，单位小一号；
- 空闲时显示最近完成，不假装有在飞；
- 连接断了保留上一帧，并明确写「连接中断」和数据时间；
- 演示数据必须带「演示数据」标记。

### 4.6 性能预算

| 指标 | 预算 | v2 实测 |
| --- | --- | --- |
| 首屏前端 | < 60 KB gzip | HTML 1.0 KB + focus.js 6.6 KB + quota.js 1.1 KB + focus.css 3.4 KB + data.js ~11 KB gzip |
| 首次快照 | < 200 KB | 今日 ~104 KB；30 天 ~119 KB（v1 为 203 KB / 767 KB） |
| Usage panel | < 10 KB gzip | HTML 0.5 KB + usage.js 2.1 KB + usage.css 0.8 KB，共 3.2 KB |
| 首次渲染 | < 1.2 s（含 sandbox / 网络） | 远程 Tern 浏览器 FCP 1.05 s；本地直连更快 |
| 轮询 | 3 s；后台暂停 | 3 s |
| 常驻内存 | 不跑动画/粒子 | 无 canvas、无动画循环 |
| 配置 | 0 项 | 只有插件端口 |

---

## 5. 本次已实施

1. **新入口** `public/focus.html` + `focus.css` + `focus.js`：一屏三问。
2. **服务根路径改为专注页**；`/index.html` 302 到 `/`。
3. **插件启动页**直接导航到服务根，不再有「完整视图」入口。
4. **package.json 2.0.0**：描述、summary、`files` 只打包专注页与 panel 所需
   文件；`npm run check` 检查 server/focus/quota/data 并跑额度预测测试。
5. **修掉 7 天=30 天**：period 规范为 `today/7d/30d/all`，兼容旧别名。
6. **版本号单一来源**：`server.mjs` 从 `package.json` 读。
7. **视图菜单空分组**过滤；**rail 真导航**；**重复绑定**去除。
8. **每日摘要弹窗**默认不弹（`magpie.digestAuto=1` 才弹）。
9. **`state.metric`** 补上。
10. **README 双语重写**：只讲三个问题、边界和隐私。
11. **旧版从仓库删除**（`public/index.html`、`app.js`、`app-plus.js`、
    `app.css`、`views/`、`shots/`、旧脚本和 32MB 旧截图），不再进 npm 包。
12. **原生 Usage panel**：`panels/usage.*`，在 Magpie 自己的 Usage 页底部
    显示「今日 vs 7 天日均」，只读 `usage:summary`，不经过本地服务。
13. **额度预测抽成 `public/assets/quota.js`**，配套
    `scripts/test-quota.mjs`（9 组场景）；`scripts/test-structure.mjs` 检查
    page/panel/package 契约。`npm test` / `npm run check` 都会跑。
14. **构成可切「账号 / 模型」**：默认按账号费用排序，直接回答「今天谁在花钱」；
    数据来自 `usage.accounts`。
15. **在飞行带账号、路由组和失败码**：不用打开 Routing 舞台就能看到为什么改道。
16. **额度预测变保守**：最近 90 分钟不够时用本窗口平均；仍不够写「数据不足」，
    不拿短突发外推长窗口。
17. **Token 口径与 Magpie Usage 对齐**：输入+输出；缓存读取单独显示，不再
    混进大字，避免「11.79B」与自带页面的「278M」对不上。
18. **额度行带账号**：`WorkBuddy · 177****2373` / `WorkBuddy · 楼楼大王`，
    不再只显示 provider，多个账号可以区分。
19. **账号花费带风险点**：构成卡按账号费用排序，账号前红点/黄点来自该账号
    的额度窗口；一屏内同时回答「谁在花钱」和「谁快没额度」。
20. **中英双语**：启动页从 `magpie.ready.lang` 带 `?lang=`；页面标题、状态、
    额度判词、日期和面板都跟随。
21. **本机额度告警**：服务每 5 分钟用同一份 `quota.js` 检查；会在重置前耗尽
    的窗口发系统通知（macOS `osascript` / Linux `notify-send`），6 小时冷却，
    多个窗口合并一条；`notify:false` 关闭。
22. **sandbox 口令与端口竞态**：口令持久化到
    `~/.config/magpie/observatory-page-token`（600），多个 Magpie 窗口共用；
    403 自动带 `tokenReload=1` 刷新一次；端口被另一个宿主占用时等待而不是
    复用短命服务。

### 删除/隐藏的功能

25 个视图、7 套风格、XP/徽章/连击/战绩、回放全套、分享卡/周报/网关对比、
命令面板、便签、拖拽布局、PWA、mini、声音、粒子、吉祥物、attract、
每日摘要自动弹出、多网关切换。

---

## 6. 下一步（按优先级）

1. **发布**：`npm publish --access public`（当前机器未登录 npm），然后向
   `magpie-community/plugins` 提交 `kind: "page"` 条目。带本地服务的页面在
   GitHub Discover 会被归为 provider，registry 才是正确入口。
2. **边界标注**：在额度卡上加一个「？」说明线性外推、最近 90 分钟窗口和
   「没有历史就不预测」。
3. **可选**：给 panel 增加 `usage:day` 的昨日对比，但不要把它做成第二个页面。
4. **可选**：Windows 系统通知（目前只写服务日志）；以及告警阈值/静默时段设置。

---

## 7. 验收

- 1365×768 和 1440×900 下，四张卡都在首屏，无横向滚动，无弹窗遮罩。
- 打开后 3 秒内能回答：有没有在飞、今天花了多少、哪个额度最危险。
- 7 天/30 天切换后，标题和数字一致（不再出现 7 天显示 30 天）。
- 断网/网关关闭：保留上一帧，顶部状态变黄/红，底部写明错误；不显示演示数据。
- 页面无 console error；`npm run check` 通过。
- npm 包只包含 `focus`、`quota`、`panels` 所需文件，tarball < 200 KB；
  `/index.html` 不再可访问旧版。
- Magpie 的 Usage 页底部出现「今日一眼」panel，数字与 Usage 页一致。

---

## 参考

- Magpie 插件文档（page / bridge / permissions）：<https://usemagpie.ai/docs/plugins>
- `magpie-community/plugins` registry：<https://github.com/magpie-community/plugins>
- Usage Glance：`packages/usage`（271 行，`usage:summary`）
- Day Card：`packages/day-card`（1,586 行，`usage:day`）
- Usage Board：`packages/page-usage-board`（README 的「5 件 Usage 没有的事」）
- Usage Tree：`packages/page-usage-tree`（Provider → Account → Model）
- Token Monitor：<https://github.com/Javis603/token-monitor>
- Token Watcher：<https://github.com/luwill/token-watcher>
- TokenMeter：<https://github.com/tt-a1i/tokenmeter>
- Magpie HUD：<https://github.com/smallcat2333/magpie-hud>
- ccusage：<https://github.com/ryoppippi/ccusage>
