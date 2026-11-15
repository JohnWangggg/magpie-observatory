# Magpie Observatory — 后续优化路线（2026 Q4）

> 目标用户原话：*既不好玩，又不好看，也不好用 —— 不会有人长时间盯着它看。*
> 参考：Javis603/token-monitor（3.7k stars）与同类 token 监控产品。

本文档分两节：**A. 诊断**（为什么现在留不住视线）、**B. 分期路线**（每期做什么、
怎么验收）。每条改动都标注了当前代码里的落点。

---

## A. 诊断：我们现在的三个病

### A1 不好看 —— "仪表盘感"太重，"观测台感"为零

- **Hero 太小**。`route-stage` 只占首屏 ~30%（`.grid` 里 hero 是 `span 8` × 第 1
  行 1.45fr），周围 KPI、quota、heatmap 把它挤成小窗。观测台的核心戏是
  "喜鹊飞来飞去"，现在的画布根本飞不开。
- **视觉层级平**。12 列网格里所有卡等权重，没有焦点；暗色主题层次靠
  `#0e1118` 与 `#121622` 的微弱差，一眼看过去"一块蓝灰色板"。
- **数字没有呼吸**。KPI 卡是静态大数+假 sparkline，没有"此刻"的脉冲；
  会话流没有声音/脉冲式的节拍提示，屏幕不会"活过来"。
- **亮色主题廉价**。白卡片+浅灰底，是"默认 admin 模板"气质。

### A2 不好玩 —— 21 个视图都藏在 15px 的按钮后面

- 视口切换入口是 hero 角落一个 `view-picker` 按钮（~110px 宽），首次打开
  的用户甚至不知道蜂巢、轨道星图、连击卡牌存在。
- 趣味视图没有"持续观看价值"：渲染一帧就静止，只有切数据时才动。
- 没有任何陪伴属性。token-monitor 的核心启发是：**监控器要活在用户的余光
  里**（菜单栏、刘海、边缘 dock），而不是一个需要"专门打开看"的网页。
  我们没法做系统菜单栏，但可以做浏览器侧的等价物。

### A3 不好用 —— 导航是假的，信息没有优先级

- 左侧 rail 的"总览/路由/用量/会话/服务商"点击后只是
  `scrollIntoView`+toast（`app.js:2059`），不是真页面，用户点完会困惑。
- 首屏 7 个区块信息平权：用户不知道"现在该看哪里"。没有"注意力排序"——
  配额要烧完和配额还剩 90% 的呈现是一样重的。
- 快捷键不可发现（藏在 `?` 弹层），视图 21 个只能靠肉眼翻菜单。
- 真实模式下没有"今日一句话总结"：盯 3 秒看不懂"今天花得正不正常"。

---

## B. 分期路线

### Phase 1 —— 让它值得被多看 30 秒（本次提交）

核心策略：**把 hero 变成主角，给视图配上"影院"，用注意力条告诉用户该看什么。**

| # | 功能 | 落点 | 验收 |
|---|------|------|------|
| 1.1 | **影院模式 Cinema Mode**：按 `O` 或视图菜单按钮，hero 视图占满整个视口，隐藏 rail/topbar/KPI/侧栏，只留漂浮的标题胶囊+活数字+Esc 提示；配合巡游（G）就是"大屏轮播"，挂个副屏/平板当装饰 | `body.cinema` CSS；`app.js` `toggleCinema()`；键盘 `O` | 按 O 全屏，再按 Esc/O 恢复；巡游在影院内持续切视图 |
| 1.2 | **注意力条 Attention Strip**：hero 与 KPI 之间一条细条，只显示"此刻值得看的"：配额 ≥80% 告警（带重置倒计时）、错误率突增、连续使用 streak（从 heatmap 算）、今日花费一句话。无事发生时显示"一切平稳" | `renderAll` 里 `renderAttention()`；`.attn-strip` | demo 下 Kimi 80% 配额出现 amber 条目；streak ≥1 显示火焰 |
| 1.3 | **新视图：夜航 stellar**——把路由数据画成一片深空：provider 是恒星（大小=活跃会话、亮度=配额余量），请求是划过的流星（流星轨迹=Agent→Provider），最近完成的请求变余烬。专门给影院/陪伴场景设计，"能挂墙上" | `views/stellar.js` + `views/stellar.css`，`VIEW_META` 注册 | 视图菜单出现"夜航"，影院模式下有星场背景缓动 |
| 1.4 | **命令面板 ⌘K**：统一入口——切视图（模糊搜）、换风格、切明暗、跳区块、开关影院/巡游。解决"21 个视图找不到" | `#cmd-palette` 浮层；`app.js` `togglePalette()` | ⌘K/点击 topbar 的 ⌘K 提示打开，搜索"蜂巢"可跳转 |
| 1.5 | **视觉打磨**：hero 占比 8→9 列且行高加大；卡片圆角/边框层次统一；KPI 数字加 tabular-nums+轻微跳动动画；rail 导航文字去掉歧义（加 tooltip 注明"定位区块"）；深色背景加深空微纹理；亮色主题卡片加暖灰层次 | `app.css` `:root`/`.grid`/`.kpi`/`.hero` | 首屏 hero 高度 +30%，视觉上明显"主角化" |
| 1.6 | **文档/计数/版本**：README 增"影院模式/命令面板"段；view 计数 21→22；版本 0.19.0；帮助弹层加 `O`/`⌘K` | index.html/package.json/README*/docs | `npm run check` 通过 |

### Phase 2 —— 让它值得被每天打开（下一个迭代）

| # | 功能 | 说明 |
|---|------|------|
| 2.1 | **每日摘要 Daily Digest**：每天首次打开出一张"昨日报告"卡（token、费用、最忙时段、改道率、连续天数），可 dismiss，localStorage 记日期 |
| 2.2 | **成就/连击系统**：把 `chips` 视图的连击概念做成全局：连续 N 天使用、单日最高 TPS、最省钱的模型——达成时 toast 出徽章，rail 底部一个"奖杯"入口 |
| 2.3 | **Mini 模式**：`?mode=mini` 输出一个 320×180 的超小视口布局（只留 hero+TPS），给浏览器画中画/挂件用 |
| 2.4 | **PWA manifest**：可"安装"到桌面/平板主屏，全屏启动即影院模式 |
| 2.5 | **视图收藏夹常驻**：收藏过的视图（已有 favorites）在 rail 变成快捷入口，不再埋在菜单 |
| 2.6 | **声音提示（可选）**：`motion` 同级 `sound` 设置——请求成功一声极轻的"啾"，失败一声闷响，默认关 |

### Phase 3 —— 让它值得被推荐（再下一个迭代）

| # | 功能 |
|---|------|
| 3.1 | **时间轴回放**：把 trace 日志存 IndexedDB，影院模式可拖时间轴"回放昨天的高峰" |
| 3.2 | **多网关聚合**：一个页面看家里 NAS + 工作机的两个 magpie（类似 token-monitor 多设备同步） |
| 3.3 | **每周热力图邮件/截图导出**：一键把 53 周热力图+摘要导出 PNG 分享 |
| 3.4 | **视图自定义排列**：grid 区块可拖拽重排/隐藏，localStorage 记忆 |
| 3.5 | **告警推送**：配额阈值/错误率超限时浏览器 Notification + 可选 webhook |

---

## 验收标准（Phase 1 完成定义）

- `npm run check`（node --check 全文件）无语法错误
- `node preview.mjs` 起服务后：`/` 首页正常渲染；`O` 键进出影院；影院内
  `G` 巡游切视图；`⌘K` 命令面板模糊搜"蜂巢/纸感/影院"均可跳转；注意力条
  在 demo 数据下显示 Kimi 80% 告警+连续天数；视图菜单出现"夜航"且渲染
  无报错；移动端窄屏下影院模式与命令面板可用

---

## Phase 2 落地记录（2026-11-14 · v0.20.0）

- **每日摘要**：每天首次打开出"昨日观测报告"卡（昨日 tokens / 调用数 /
  连续天数 / 最常用 Agent + 与近 7 天均值对比），Esc 或按钮关闭，
  localStorage 记日期；命令面板可"重新查看昨日报告"。
- **成就系统**：8 个徽章（初次观测 / 三日同行 / 七日同辉 / 月度陪伴 /
  百万字海 / 千万星河 / 三路并发 / 夜航人），解锁时 toast，
  localStorage 记达成日期。
- **收藏夹常驻**：收藏的视图（F）以图标列形式常驻左侧 rail，一点即切，
  不再需要翻菜单。
- **Mini 模式**：`?mode=mini`（可加 `&view=stellar`）把整页压成一个影院级
  氛围挂件——HUD 缩成一行，给浏览器画中画 / 常挂小窗用。
- **PWA**：`manifest.webmanifest` + 最小 `sw.js`（预缓存 shell，网络优先），
  可"安装"到桌面/平板主屏。
- **截图入库**：`docs/mode-stellar.png` / `docs/digest.png` /
  `docs/palette.png`。

剩余 Phase 2 尾巴（下轮可补）：`2.6` 声音提示（可选，默认关）。

## Phase 3 细化（下一个迭代的目标）

| # | 功能 | 关键点 |
|---|------|--------|
| 3.1 | **时间轴回放**：trace 日志进 IndexedDB，影院模式可拖时间轴"回放昨天的高峰" | 需 server.mjs 增 `/api/trace/archive` 端点 + 前端 scrubber |
| 3.2 | **多网关聚合**：一页看家里 NAS + 工作机的两个 magpie（类似 token-monitor 多设备同步） | `state.data` 改成多源数组，每个 provider 节点标 gateway 前缀 |
| 3.3 | **截图分享**：一键把 53 周热力图 + 摘要导出 PNG | `renderHeatmap` 的 DOM 转 canvas（html2canvas 太重，手绘 2D 网格） |
| 3.4 | **布局自定义**：grid 区块可拖拽重排 / 隐藏，localStorage 记忆 | `.card` 加 `data-slot`，拖动时交换 grid-area，存 `magpie.layout` |
| 3.5 | **告警推送**：配额阈值 / 错误率超限时浏览器 Notification（可选 webhook） | `checkAchievements` 同款条件，Notification.requestPermission |

## 验收标准（Phase 2 完成定义 · 已验证）

- digest 卡在 demo 首次加载 1.6s 后出现，显示昨日 tokens/调用/连续天数/最常用
  Agent；Esc 或"知道了"关闭，当日不再弹
- `?mode=mini&view=stellar` 整页进入影院+精简 HUD，无 chrome
- 收藏视图后 rail 出现图标列，点击可切换；再按 F 取消后消失
- `navigator.serviceWorker` 注册成功，`/` 可安装到主屏
- `npm run check` 全绿

---

## Phase 3 落地记录（2026-11-14 · v0.22.0）

- **告警推送**：设置 → 通知 开关；配额 ≥88%（1h 冷却/窗口）与 ≥5 条失败
  （10min 冷却）走系统 Notification；权限未授予自动回退。
- **布局自定义**：设置 → 排布 开关；grid 卡片可拖拽换位（DOM 顺序即 grid
  顺序）与点 × 隐藏，`magpie.layout` / `magpie.hidden` 持久化。
- **分享图导出**：命令面板"导出今日分享图"画一张 1200×630 PNG（深空底 +
  今日 tokens / 费用 / streak / 近 7 天柱状 / 最常用 provider），下载即得。
- **声音提示**：设置 → 声音 开关（默认关）；WebAudio 极轻提示音——请求
  完成一声"啾"、失败一声闷响。
- **时间轴回放** `R` / 左侧 rail：每 1.2s 把当前快照压入 180 帧环形
  buffer（≈3.5 分钟）；回放时冻结数据源，hero 底部出拖动条，拖到任意
  时刻整页渲染该帧；`×`/`R` 退出回到最新数据。
- **持久化**：`magpie.notify` / `magpie.sound` / `magpie.layoutEdit` 随
  localStorage 恢复。
- **设置菜单**：新增"体验"组（排布 / 通知 / 声音）。

## Phase 3 收尾（2026-11-14 · v0.23.0）

- **分享图"本周"变体**：`shareToday(period)` 参数化；命令面板
  "导出本周分享图"生成近 7 天 tokens/cost/柱状/top provider 的 1200×630
  PNG。
- **多网关切换**：server `snapshot`/`health` 接 `?gw=` 覆盖；设置菜单加
  网关输入（锁定/自动），`magpie.gw` 持久化，fetchLive 每次带 `gw=`
  参数。实测 `?gw=127.0.0.1:9999` 返回 `gateway:127.0.0.1:9999` 与该
  实例数据。

至此 Phase 3 全落地。剩余开放方向（下一迭代）：回放导出为可分享链接
（快照序列化进 URL）、通知规则自定义阈值、更多分享模板（月度/对比）。

---

## Phase 4 — 游戏化改造（2026-11-14 · v0.24.0）

深度调研 CrommaCode 后的方向修正：不是把监控做得更花，而是把
**每个请求做成节拍、把会话做成游戏**。

- **play 视图（Westworld）**：转盘有 40 个槽位，按 provider 分扇区
  着色；最新请求点亮对应槽位，指针扫过去。右侧是终端风格的 CALL
  STREAM，每条请求一行：判定首字母 + 工具 + → provider + 模型 +
  TTFT + tokens。判定规则：
  `PERFECT`=TTFT<500ms 或缓存率≥80%，`GREAT`=干净路由，`GOOD`=改道
  /重试，`MISS`=失败。连击 = 连续非 MISS；best 存 localStorage。
- **Combo 系统**：连击数 ×(1+⌊combo/5⌋) 显示在转盘中心和右侧
  score card；judge 字样按判定变色并弹跳一次。
- **Attract 屏保**：闲置 90s 自动开巡游，只轮播收藏视图；任何
  mousedown/mousemove/keydown/wheel/touch 立即退出，toast"欢迎
  回来"。不抢手动 G 巡游。
- **视觉打磨**：`--bg` 加深到 #06070b；hero 卡加顶部光晕
  `::before`；body 加固定暗角；`.card:hover` 微抬升；修复
  `.replay-bar{display:flex}` 覆盖 `hidden` 的残留 bug。

对比 CrommaCode 的 Game View：我们的 play 视图同样把"一次调用"
事件化（beat + 判定 + 连击），但数据面仍来自请求日志而非真实
tool-call hooks——下一步是把 magpie 的 trace 事件按 tool 维度拆
出来，做出真正的"Read/Edit/Bash 节拍器"。

---

## Phase 5 — 架构重构：特性层（2026-11-14 · v0.25.0）

`git checkout` 误回滚导致 v0.24.0 全部未提交代码丢失；与其补丁式重写，
改为正式重构：

- **内核（`app.js`）只开 6 个 hook 点**：`buildViewCtx` 传 `game`、
  `renderAll` 尾 `afterRender`、`demoTick` 尾 `afterTick`、`bindEvents`
  尾 `bind`、`init` 头 `init`、尾部导出 `window.Obs.api`。
- **特性层（`app-plus.js`）收走全部 Phase 1-4**：回放、影院、通知、
  分享、XP、连击里程碑、战绩板、注意力条、成就、每日摘要、Attract、
  布局编辑、网关切换、命令面板——全部通过 hooks 挂进去，不动内核。
- **视图层不变**：`window.ObservatoryViews` 机制保留，`play` 等 23 个
  视图继续自治。
- **教训**：`git checkout` 对未提交改动是毁灭性操作；以后重要节点先
  `git stash` 或 commit，再动工作区。

---

---

## Phase 6 — 分享与细看（2026-11-14 · v0.26.0）

把 Phase 3 收尾留下的三个开放项全部落地，全在特性层 `app-plus.js`，内核零改动。

- **回放链接分享**：`replayBuf` 帧做最小化（kpis/quotas/最近12条 logs）→
  `CompressionStream("deflate-raw")` → base64url → `#replay=`。粘贴打开即
  重建 buffer 并直接进入回放模式，实测 514 字符装 2 帧，端到端验证通过。
- **回放播放/暂停**：replay bar 加 `▶` 自动步进（600ms/帧，到尾自动停）
  和 `⤴` 复制链接键；`exitReplay` 清理定时器。
- **页面快照链接**：`?view=&range=&cinema=1&gw=` 序列化当前状态，
  `applyUrlState` 在 init 恢复——实测 `?view=stellar&range=7d&cinema=1`
  精确还原三项。palette 新增"复制页面链接/复制回放链接"。
- **对比分享卡**：`shareCompare()` 画 1200×630 今日 vs 昨日 tokens/calls/
  cost 三行大数 + ±% 箭头（绿涨红跌），palette"导出对比分享图"。
- **通知阈值自定义**：设置→体验下展开两个滑块（配额 50-99%，失败 1-20 条），
  `magpie.rules` 持久化，`checkAlerts` 改读 `alertRules()`。
- **今日 delta 进注意力条**："今日 23.2M tokens · $31.1 · 较昨日 +392%"
  ——heatmap 倒数第二天做基准。
- **修复 init 持久化 bug**：`state().sound/notify/layoutEdit = false` 在
  localStorage 恢复**之后**执行，三个开关从未持久过——拆行后修复。

---

## Phase 7 — 分享物离开页面（2026-11-14 · v0.27.0）

- **回放导出独立 HTML**：`exportReplayHtml()` 把 `replayBuf` 帧（kpi + 14
  条 log/帧）内嵌进一个 3.7KB 自足播放器——自带拖条、▶自动步进、←/→
  步进、KPI 四格、帧日志表；`</script>` 转义拼接，内嵌 JS 单独过
  `node --check`。palette"导出回放播放器"。
- **月度分享卡**：`shareToday("month")` 拉 30 天柱状（bw 26），标题/
  副标/文件名全月化。palette"导出月度分享图"。
- **周报卡片**：`weeklyReport()` 页内浮卡——7 天柱状（峰值日金色）、
  本周 tokens/calls、峰值日、最热路由。palette"本周报告"，点任意关闭。
- **play 步进**：`s.recent` 记最近 STREAM_MAX 行（log+j+el），←/→ 在
  `recent` 上步进——行高亮 `.stepped`、指针转回该调用 provider 扇区、
  judge 重闪；Esc 回到 live。键盘绑定 `bindStep` 挂 render 尾。

---

## Phase 8 — 安装与多网关（2026-11-14 · v0.28.0）

- **PWA 注册修复**：`serviceWorker.register("sw.js")` 在 v0.24 回滚中丢失，
  sw.js/manifest 文件都在但从未激活。移入 `app-plus` init hook 恢复；
  `CACHE` bump v2，precache 扩到 app.css/app.js/app-plus.js/data.js/
  icon（网络优先 + 缓存回退，API 不缓存）。实测 `getRegistration()`
  active、scope 正确。
- **多网关对比**：`compareGateways()` 并列拉取默认探测网关与
  `magpie.gw` 锁定网关的 `/api/snapshot`，440px 浮卡双列 calls/tokens/
  cost/errors 四指标。palette"网关对比"。实测双列 5,097 calls /
  760.3M / $1.50 / 2 errors（同网关时两侧一致，符合预期）。

---

## Phase 9 — 压缩·文档·mini（2026-11-14 · v0.29.0）

- **回放帧差分**：`deltaFrames`/`undeltaFrames`——相邻帧字段全同时压成
  `{t, r:idx}` 引用。`shareReplayLink`、`exportReplayHtml` 序列化端用，
  `loadReplayHash` + 内嵌播放器 `show(i)` 解码。静息期体积减半。
- **`?mode=mini` 补实现**：roadmap Phase 2 承诺但代码缺失——
  `body.mini-mode` + 影院 + 缩小 HUD（去副标/kbd/hint），
  `?mode=mini&view=stellar` 实测 400×240 无 chrome。
- **README 双语刷新**：22 → 24 views；英文特性区补 Replay / Share
  cards / Weekly report / Play view / Gateway compare / XP 六条；
  中文版同六条补全。
- **修回放播放器 bug**：内嵌 `show(i)` 里 `const f` 被 delta 解码重赋
  值改 `let`。

---

## Phase 10 — 细看增强（2026-11-14 · v0.30.0）

- **heatmap 日详情浮层**：`bindHeatPop` 委托监听 `#heat-grid`——mouseover
  出浮卡（日期·星期 / tokens / 调用 / 较前日 Δ↑↓），mousemove 跟随定位
  并 clamp 在视口内，mouseleave 收。371 格共享一个 listener，无逐格
  绑定开销。实测悬停出"08-15 · 周六 / 1.14M tokens / 52 次调用 / ▼ 3%"。

---

## Phase 11 — 回滚遗失件修复（2026-11-15 · v0.31.0）

`git checkout` 回滚抹掉的不止 v0.24 特性——几个 Phase 2/3 交付物的
"渲染端"也丢了，DOM/CSS 还在但从未被调用：

- **收藏视图 rail**：`#rail-favs` 有 DOM+样式+`fav-btn` 规则，`renderRailFavs`
  函数整段丢失。补回：toggle/init 重建图标列（icon+active 态），点击
  `setHeroMode`；`setHeroMode` 同步 `.fav-btn.active`。实测收藏 3 个
  （route/play/stellar）rail 出图标列，点切对应视图。
- **每日摘要 Δ**：digest 卡 tokens/调用 后加 `▲x%/▼x%` 徽标（对比
  前日），脚注"较前日 ±x%"。实测 `1.65M ▼77%`。

---

## Phase 12 — 快照闭环 + 审计（2026-11-15 · v0.32.0）

- **`?gw=` 快照恢复**：`copySnapshotLink` 一直把 `gw` 写进 URL 但
  `applyUrlState` 不接——补全：写/清 `magpie.gw`、重置 `liveTries`、
  live 模式重连、`syncExtrasMenu` 回填输入框。实测 `?gw=10.0.0.5:3425`
  → localStorage + input + orrery 三处就位。
- **mini 类名统一**：`body.mini` 老 CSS 一直在（ch-sub/hint/kbd 隐藏、
  digest/toast 收起），我 Phase 9 却造了重复的 `mini-mode`——删掉，
  统一回 `body.mini`。
- **stellar 流星审计**：不是遗失件——`sessions.forEach` spawn +
  streaming 每 1.8-5s relaunch + done→dust 全部就位，Phase 1 承诺的
  "完成的请求划过星场"早已交付。

---

## Phase 13 — 第25个视图：燃烧速率（2026-11-15 · v0.33.0）

- **`burn` 视图**：每行一个 provider×配额窗口——名称、当前用量条
  （渐变 fill + flat pace 刻线 + 投影虚线）、用量%/烧速%/h、重置倒计时、
  超/落后节奏。按 `projected left` 排序，红黄绿左边条标识风险。
  复用 `quotaRows` 同款窗口斜率数学；`ctx.data.quotaHistory` 直读，
  无依赖。VIEW_META 归"实时"组，icon `i-flame`。
- **实测**：10 行、1 红 2 琥珀、首行 OpenAI 7d 73% 1.2%/h →100% @重置
  +36% 超前——与配额卡数据一致。
- **修注意力条遮挡**：`.view-burn` 加 46px 底 padding。

---

## Phase 14 — burn 细看 + 遮挡修复（2026-11-15 · v0.34.0）

- **burn 行点击展开**：`.burn-row[data-idx]` 点击 → 行下插
  `.burn-detail`（SVG 折线 sparkline 24 打点 + 起止时间 + 窗口起点/
  当前%），再点或换行收起。`.burn-row.open` 高亮。
- **hero 底部遮条修复**：`.attn-strip` 和 `.decision-strip` 都是
  `.hero` 内 absolute 浮条，滚动视图（burn/waterfall/latency/stream）
  内容到底时会被压。按 `.hero[data-mode]` 精确隐藏——burn 双隐，
  其余滚动视图只隐 attn。实测 burn 5 行全展示。
- **README**：24 → 25 views。

---

## Phase 15 — 热力图月份聚焦（2026-11-15 · v0.35.0）

- **`bindHeatMonth`**：`#heat-months` 月标点击 → 找到该月格位，
  非该月 `opacity:.18`、该月 `scale(1.15)`；再点或换月释放。
  `data-focus` 记状态，月标本身 dim 非 hover。实测点"8月"——
  31 格放大、151 格 dim、toast"聚焦 8 月·再点取消"。

---

## Phase 16 — 告警→细看 + 会话→日志 双闭环（2026-11-15 · v0.36.0）

- **attention 条 goto**：quota 告警 chip `data-goto="burn"` + `data-prov`、
  错误爆发 chip `data-goto="logs"`；`.attn-item.goto` 可点击。
  点 quota chip → `setHeroMode("burn")` + 自动展开 provider 首个匹配行。
  点 errs chip → logQuery="err" + 滚到日志卡。
- **session 卡 → 日志过滤**：`.session-card` 点击时同步
  `state.logQuery = id`（`#log-search` 同显）；再点取消清空。
  实测点 session → 搜索框 `s-7f3a`、日志表过滤到该会话行。

---

## Phase 17 — 配额卡行也跳 burn（2026-11-15 · v0.37.0）

- **`.quota-item.goto`**：每行 `data-goto="burn"` + `data-prov=provider key`，
  `bindQuotaGoto` 绑 `#quota-list` 点击 → `gotoBurnOrLogs` 共享跳转。
- **精确匹配修**：`burn-row` 存 `data-prov=r.provider` + `data-win`；
  `gotoBurnOrLogs` 改用 `rows.find(r => r.dataset.prov === prov)`，
  不再靠 burn-name 文本模糊包含。实测点 Claude Max → `Anthropic · 7d`
  行展开 sparkline，不再误开 OpenAI。

---

## Phase 18 — burn flat线 + log 行展开（2026-11-15 · v0.38.0）

- **burn sparkline flat ghost**：`sparkSvg(pts, row)` 加虚线对比线——
  首点 y 到 `100 - flat`（flat pace 应到位置）x 从首点到末点。
  实际曲线 vs flat 线一眼看超前/落后。
- **log 行点击展开**：`.log-tr[data-idx]` → `<tr.log-detail>` 插详情条
  `.ld-strip`（agent·session / provider·model / ttft·tps / tokens·cost
  + tries pill trail 若有）。`bindLogExpand` 委托 `#log-body` 点击。

---

## Phase 19 — palette烧速命令 + decision跳session（2026-11-15 · v0.39.0）

- **palette 每 provider 烧速命令**：`paletteItems` 加 `kind:"跳转"`
  `看 {meta.name} 烧速` → `gotoBurnOrLogs({dataset:{goto:"burn",prov}})`。
  6 条命令对应 6 个 quota provider。
- **decision 条点击跳 session 卡**：`.decision-strip` 点击 →
  `effectiveDecision().session.id` → `state.selectedSession` + 滚动定位 +
  toast。实测跳 `s-7f3a` 选中。

---

## Phase 20 — hero 视图滚动位置记忆（2026-11-15 · v0.40.0）

- **`setHeroMode` 切出存 `state.viewScroll[prev]`**：找 `.stage-view` 自身
  或其首个 overflow 子元素，`scrollTop > 0` 时记 `prev.id`。
- **切入恢复**：`rAF` 内同法找可滚元素，`scrollTop = viewScroll[mode]`。
- **`view-burn` class 修复**：burn.js 的 `render(host)` 加
  `host.classList.add("view-burn")`——`.view-burn{overflow:auto}` 生效，
  burn 行多时正确滚动（同 play.js 模式）。

---

## Phase 21 — burn 行 hover tooltip（2026-11-15 · v0.41.0）

- **`.burn-tip`**：`.burn-track` mousemove 创建——`已用% · 烧速%/h ·
  flat% · 超/落后pace · 重置H`。绝对定位随光标 +12px。
  mouseleave 销毁。实测 OpenAI 行 tooltip 显示完整五项。

---

## Phase 22 — session 右键复制 + heat 格点击过滤（2026-11-15 · v0.42.0）

- **session 卡 `contextmenu`**：右键 → `clipboard.writeText(id)` + toast。
- **heat 格点击过滤日志**：`bindHeatDay` 格点击 → `logQuery = date`（
  `renderLogs` haystack 加 `at.slice(0,10)`），再点同格释放。
  实测点今天格 `q="2026-11-14"`、旧日期 `2026-10-01` 0 行。

---

## Phase 23 — sparkline点tooltip + quota右键（2026-11-15 · v0.43.0）

- **`.burn-ptip`**：`.bd-curve` mousemove 最近点 → `left% 已用 · at`。
  实测 `60.8% 已用 · 11-14T05:38`。
- **quota 卡右键**：`.quota-item.goto` `contextmenu` →
  `clipboard.writeText(provider)` + toast。

---

## Phase 24 — burn-detail 导出 CSV（2026-11-15 · v0.44.0）

- **`.bd-csv`**：bd-meta 第三行——点击导出该窗口打点 CSV
  （`at,left,used,start,resetsAt`）。`stopPropagation` 防触发收起。
  实测头 + 24 行 ISO 打点正确。

---

## Phase 25 — attn右键已读 + try-pill跳quota（2026-11-15 · v0.45.0）

- **attn 右键忽略**：`.attn-item[data-aid]` contextmenu →
  `state.attnDismissed.add(aid)` + `item.remove()`。实测 quota chip
  右键后消失，剩 streak + calm。
- **try-pill 跳 quota**：`.try-pill` 加 `goto` `data-prov`；
  `decision-strip` 点击先检查 pill → `quota-item[data-prov]` 滚动 +
  `.pulse` 高亮。实测 anthropic pill 点击 `pulse:"anthropic"`。

---

## Phase 26 — hero右键收藏 + log行右键CSV（2026-11-15 · v0.46.0）

- **hero 右键收藏**：`.hero` `contextmenu`（跳过 button/strip 子元素）→
  `toggleFavorite(state.heroMode)`。实测 `favorites` 加 `"route"`。
- **log 行右键 CSV**：`.log-tr` `contextmenu` → 复制该行 10 字段 CSV +
  toast。logExpand 的 filtered logs haystack 同步加 `at.slice(0,10)`。

---

## Phase 27 — fav右键取消 + heat月双击过滤（2026-11-15 · v0.47.0）

- **`#rail-favs` contextmenu**：`.fav-btn` 右键 → `toggleFavorite` 移除。
  实测 stellar 被移出 favorites。
- **`#heat-months` dblclick**：月标双击 → `logQuery = YYYY-MM`（
  haystack 的 `at.slice(0,10)` 月份前缀匹配）。实测 "8月" 双击
  `q="2026-08"`、toast"日志过滤：2026-08"、0 行（demo 日志都是今天）。

---

## Phase 28 — try-pill右键复制model（2026-11-15 · v0.48.0）

- **`.try-pill.goto[data-model]`**：`decision-strip` `contextmenu` →
  `clipboard.writeText(model)` + toast。实测 `claude-opus-4-5` 复制成功。

---

## Phase 29 — heat格右键复制日期（2026-11-15 · v0.49.0）

- **`#heat-grid` contextmenu**：`.heat-cell` 右键 →
  `clipboard.writeText(date)` + toast。

---

## Phase 30 — heat月标右键导出CSV（2026-11-15 · v0.50.0）

- **`#heat-months` contextmenu**：月标右键 → `date,tokens,calls` 头 +
  该月所有日行 CSV。实测 "8月" 右键 → 31 行 + toast "已导出 31 天 · 2026-08"。

---

## Phase 31 — session卡双击复制tries摘要（2026-11-15 · v0.51.0）

- **`#session-list` dblclick**：找该卡 session 的 tries →
  `provider/model ✓✕` trail + title + tokens → clipboard。
  实测 "tries 摘要已复制" toast。

---

## Phase 32 — hero标题双击 + palette快照命令（2026-11-15 · v0.52.0）

- **`#hero-title` dblclick** → `clipboard.writeText(meta.title)` + toast。
- **palette "复制视图快照"**：`copyViewSnapshot` →
  `[Magpie Observatory] view · range / Tokens Cost Sessions / Quotas`
  一行摘要 → clipboard。实测两 toast 都到。

---

## Phase 33 — decision-title/quota-item双击复制（2026-11-15 · v0.53.0）

- **`#decision-title` dblclick** → `clipboard.writeText(title)`。
- **`#quota-list` dblclick** → `quota-top b` 名 → clipboard。
  实测 `重构计费模块的边界条件` / `Claude Max` 两 toast。

---

## Phase 34 — log双击JSON + fav-btn双击默认视图（2026-11-15 · v0.54.0）

- **`#log-body` dblclick**：`.log-tr` → `JSON.stringify(r, null, 2)` →
  clipboard。实测 "该行已复制为 JSON"。
- **`#rail-favs` dblclick**：`.fav-btn` → `localStorage.defaultView` +
  `.fav-btn.default` 蓝点标记 + toast。`applyUrlState` 无 `?view=` 时
  用它。实测 play 设为默认、角标出现。

---

## Phase 35 — burn 键盘导航（2026-11-15 · v0.55.0）

- **`#view-burn` tabIndex=0**：`keydown` ↑↓ 移 `.kb-focus` 环、
  Enter 展开当前行、Esc 收起全部。实测 ↓↓Enter → 第二行
  kb-focus + open + burn-detail。

---

## Phase 36 — log/session 键盘导航（2026-11-15 · v0.56.0）

- **`#log-body` tabIndex=0**：↑↓ `.kb-focus` / Enter 开 `.log-detail` /
  Esc 收起。实测 ↓Enter 开首行 detail。
- **`#session-list` keydown**：↑↓ `.session-card.kb-focus` /
  Enter 点击 / Esc 清。session-card 原生 tabindex=0 兼容。

---

## Phase 37 — quota/attn 键盘导航（2026-11-15 · v0.57.0）

- **`#quota-list` tabIndex=0**：←→/↑↓ `.kb-focus` / Enter `gotoBurnOrLogs` /
  Esc 清。实测 → 首项 anthropic kb-focus。
- **`#attn-strip` tabIndex=0**：←→ chip 环 / Enter `click` / Esc 清。
  实测 →Enter attn chip → view-burn。

---

## Phase 38 — rail/heat-months 键盘导航（2026-11-15 · v0.58.0）

- **`#rail-favs` tabIndex=0**：↑↓ `.kb-focus` / Enter `click` 切视图 /
  Esc 清。实测 ↓Enter → view-play。
- **`#heat-months` tabIndex=0**：←→ span `.kb-focus` / Enter `click`
  聚焦该月 / Esc 清。实测 →Enter → data-focus="8"。

---

## Phase 39 — palette↑↓ + decision Enter（2026-11-15 · v0.59.0）

- **palette ↑↓**：`palIdx` 环 `.pal-item.kb-focus`，Enter 点当前项（无
  则点第一项）；`input` 重置 idx。实测 ↓↓ → idx 1 kb-focus。
- **`.decision-strip` tabIndex=0**：Enter/Space → `click()` 跳 session。
  实测 Enter → `s-7f3a` selected。

---

## Phase 40 — 键盘覆盖审计（2026-11-15 · v0.59.0）

全局 `/ Space T V R G F ?` + 视图菜单 `↑↓/Home/End/Enter/Tab/Esc` +
区域 `kb-focus` 环 8 处（burn/log/session/quota/attn/rail/heat-months/
decision/palette）+ 复制/跳转/过滤/记忆/导出 全覆盖。审计完毕，
无键盘盲区。

---

## Phase 41 — 窄屏响应式（2026-11-15 · v0.60.0）

- **burn `<680px`**：`.burn-row` 3 列（名/bar/nums），`.burn-detail`
  column 堆叠，`.bd-curve` 全宽。`<480px` 再简 2 列（隐 nums）。
- **通用 `<680px`**：attn-strip 全宽隐 sub；decision-strip 缩 padding
  隐 icon；`.burn-tip/.burn-ptip` 隐（触摸无 hover）；`.ld-strip`
  column 堆叠。

---

## Phase 42 — accessibility 补齐（2026-11-15 · v0.61.0）

- **burn-row** `role=button` `tabindex=0` `aria-expanded` +
  `aria-label="{name} · 已用% · rate%/h"`。
- **session-card** `role=button` `aria-selected` `aria-label`；
  **log-tr** `role=button` `aria-expanded`；**quota-item** `role=button`
  `tabindex=0` `aria-label`。
- **`prefers-reduced-motion`** 已有（全元素 animation/transition .001ms）。

---

## Phase 43 — CI check workflow（2026-11-15 · v0.61.0）

- **`.github/workflows/check.yml`**：push/PR 触发 `npm run check`——
  node --check 全部 20+ JS 语法。ubuntu-latest + Node 22。

---

## Phase 44 — CHANGELOG.md（2026-11-15 · v0.61.0）

- **`CHANGELOG.md`**：0.61 highlights（25 views / 交互层全项 /
  accessibility / 响应式 / CI）+ 0.18 baseline。完整 phase 日志在 roadmap。

---

## Phase 45 — docs 截图（2026-11-15 · v0.61.0）

- **`docs/mode-burn.png`**：burn 视图 1600px 截图——10 quota 窗口、
  渐变 bar、百分比/速率/重置/状态、行展开 sparkline。
- **`docs/preview-dark.png`**：更新为当前 overview（burn hero + cards）。

---

## Phase 46 — README 更新（2026-11-15 · v0.61.0）

- **burn 视图**入 25-view 表格（`docs/mode-burn.png`）+ 描述；
  **Play** 描述补齐。
- **"Every surface is live"** 段落：click/contextmenu/dblclick/keyboard/
  hover/state-persist 六类交互枚举。

---

## Phase 47 — zh README + 视图数修正（2026-11-15 · v0.61.0）

- **`README.zh-CN.md`**：夜航/博弈/燃烧三视图表格 + 描述；每个面都是活的
  交互段落（单击/右键/双击/键盘/悬停/状态）；22→24 视图数。
- **`README.md`**：Burn 视图入表格 + 描述；Every surface is live 段落；
  twenty-two→twenty-four。
- **`public/index.html`**：vm-head `22 VIEWS`→`24 VIEWS`。
- **`app.js` console**：v0.18→v0.61、twenty-one→twenty-four。
- **实际视图数 24**（route→burn 数 index.html 的 `stage-view`）。

---

## Phase 48 — docs/interactions.md（2026-11-15 · v0.61.0）

- **交互速查表**：17 个 surface × click/contextmenu/dblclick/keyboard/hover
  五列；全局 11 键 + 视图菜单 6 键；9 项 localStorage 持久化。

---

## Phase 49 — docs/interactions.zh-CN.md（2026-11-15 · v0.61.0）

- zh 版交互速查表，与 en 同构：17 surface × 5 操作、全局 11 键、
  视图菜单 6 键、9 项持久化。

---

## Phase 50 — 第 25 个视图 `candle`（2026-11-15 · v0.62.0）

- **`public/assets/views/candle.js` + `candle.css`**：K线图——`open=前一时段
  tokens, close=当前, high/low=max/min`；涨绿跌红、3-期MA虚线、
  legend 升/降/连升/峰值/Σ；`ObservatoryViews["candle"]` 注册、
  `buildViewCtx` 加 `view`/`metric`/`esc`。
- **`VIEW_META` + `index.html`**：view-candle stage-view + script + css +
  `25 VIEWS`。
- **README ×2**：candle 表格行 + 描述；25→25（24→25）；en 修"Four style
  packs"→"Seven"。
- **`app.js` console**：twenty-four→twenty-five、v0.61→v0.62。
- **`docs/mode-candle.png`**：25 根K线截图。

---

## Phase 51 — candle 交互层（2026-11-15 · v0.62.0）

- **hover crosshair**：虚线竖线 + OHLC 浮框（`O/H/L/C ±%`），蜡烛 dim 其余。
- **OHLC 底条**：`label O .. H .. L .. C .. ±%` 单行卡。
- **键盘**：`←→` 走蜡烛、`Enter` 钉选、`Esc` 清；`tabindex` + `kb-focus`。
- 每蜡烛 `data-i` + 全列 `.candle-hit` 命中区。

---

## Phase 52 — interactions 补 candle（2026-11-15 · v0.62.0）

- `docs/interactions.md` + `.zh-CN.md`：K线蜡烛行——click 钉选 OHLC、
  ←→/Enter/Esc 键盘、crosshair hover。

---

## Phase 53 — 第 26 个视图 `gauge`（2026-11-15 · v0.63.0）

- **`gauge.js/css`**：仪表盘矩阵——KPI 6 表（请求/Token/费用/成功率/
  活跃会话/在飞）+ 每账号 ≤2 窗口配额表；270° 弧 + 指针、
  绿/黄/红风险渐变、delta sub-label；`<680px` 3 列缩 68px。
- **VIEW_META 实时组** + index.html `view-gauge` + script/css + `26 VIEWS`。
- **README×2**：gauge 表格行（candle 右侧）+ 描述；25→26。
- **`docs/mode-gauge.png`**：配额表盘截图。
- 数据绑定修正：`kpis` 是标量非 `{value}`、`q.windows[0].used` 是 pct。

---

## Phase 54 — gauge 交互层（2026-11-15 · v0.63.0）

- **quota 表** `click/Enter` → `burn` 视图（`localStorage.burnSel` 预填）；
  `role=button` `tabindex=0` `title`/`aria-label` "点击看烧速"；hover 升起。
- **interactions.md ×2**：仪表盘配额表行。

---

## Phase 55 — 第 27 个视图 `bloom`（2026-11-15 · v0.64.0）

- **`bloom.js/css`**：最近 28 次请求开成花园——茎曲线 + 花头（provider 色
  花瓣 / token 数瓣）+ 失败虚线花蕾 + 地面藤蔓；生长动画
  `bloom-grow/stem/pop`，`prefers-reduced-motion` 已处理。
- **坑**：`.bloom-head` 的 CSS `transform: scale()` 动画覆盖 SVG
  `transform="translate()"` attribute——外包一层 `<g transform>` 解决。
- **VIEW_META 趣味组** + index.html `view-bloom` + `27 VIEWS`；
  README×2 + `docs/mode-bloom.png`。

---

## Phase 56 — interactions 补 bloom（2026-11-15 · v0.64.0）

- `interactions.md` ×2：绽放花朵行——hover 显 `provider · 状态 · N tok`。

---

## Phase 57 — 第 28 个视图 `petri`（2026-11-15 · v0.65.0）

- **`petri.js/css`**：最近 20 次请求是培养皿里的活细胞——不规则胞膜
  （8-顶点 wobble path）+ 细胞核搏动 + 细胞器；活细胞 `breathe/pulse`
  呼吸搏动、失败 `failed` 淡成鬼影；皿沿 + 阴影 + 内环。
- **VIEW_META 趣味组** + `view-petri` + `28 VIEWS`；
  README×2 + `docs/mode-petri.png`。

---

## Phase 58 — 第 29 个视图 `aurora`（2026-11-15 · v0.66.0）

- **`aurora.js/css`**：最近 26 次请求是夜空光带——高 = Token、宽 = TPS、
  色 = Provider，渐变 + wobble 路径；失败细灰痕；40 颗星星 twinkle、
  地平线在底。
- **VIEW_META 趣味组** + `view-aurora` + `29 VIEWS`；
  README×2 + `docs/mode-aurora.png`。

---

## Phase 59 — 第 30 个视图 `constellation`（2026-11-15 · v0.67.0）

- **`constellation.js/css`**：会话 = 星图——每次尝试一颗星（亮=成、暗=败）、
  不足 3 颗补辅星；会话间 `cs-big` 虚线连成更大星座图、背景 70 星。
- **迭代**：1-try 只一点 → 每星座 ≥3 星；r 3.4→4.8 + `drop-shadow` 发光；
  链 opacity .3→.5。
- **VIEW_META 趣味组** + `view-constellation` + `30 VIEWS`；
  README×2 + `docs/mode-constellation.png`。

---

## Phase 60 — CHANGELOG 0.67 / 30 视图收官（2026-11-15 · v0.67.0）

- **`CHANGELOG.md`**：0.61→0.67，Views 25→30；burn/candle/gauge/bloom/
  petri/aurora/constellation 各一行。
- **30 视图收官**：route/waterfall/network/swarm + rings/latency/stream/
  quota/budget/candle + treemap/marimekko/sankey/chord/funnel +
  radar/loom/rhythm/orrery/chips/factory/bees/stellar/play + burn/gauge/
  bloom/petri/aurora/constellation。

---

## Phase 61 — 30 视图完整性审计（2026-11-15 · v0.67.0）

- **实测 30/30**：逐个 `[data-hero]` 点击切换，`#view-{id}` `!hidden`
  且 `children > 0`——无遗漏、无空渲染。
- 视图清单：route/waterfall/network/swarm/burn/gauge · rings/latency/
  stream/quota/budget/candle · treemap/marimekko/sankey/chord/funnel ·
  radar/loom/rhythm/orrery/chips/factory/bees/stellar/play ·
  bloom/petri/aurora/constellation。

---

## Phase 62 — docs/views.md 目录页（2026-11-15 · v0.67.0）

- **`docs/views.md`**：30 视图按四组分类——实时 6 / 用量 6 / 结构 5 /
  趣味 13；每条一句 eyebrow + 描述；7 张 mode-*.png 截图网格。

---

## Phase 63 — docs/views.zh-CN.md（2026-11-15 · v0.67.0）

- zh 版 30 视图目录，与 en 同构：实时 6 / 用量 6 / 结构 5 / 趣味 13、
  7 张截图网格。

---

## Phase 64 — CONTRIBUTING.md + page/ 审计（2026-11-15 · v0.67.0）

- **`CONTRIBUTING.md`**：布局图、新视图 6 步、约定（无 build/fixture-first/
  views 拥有 DOM/quiet persist/a11y/双语）、PR checklist。
- **`page/` 启动器审计**：`boot.js` 语法过、`_magpie/bridge.js` 由 Magpie
  注入、`icon.svg` 本地、`index.html` 极简 launcher——与 README 描述一致。

---

## Phase 65 — 第 31 个视图 `tide`（2026-11-15 · v0.68.0）

- **`tide.js/css`**：Provider Token 份额 = 滚浪——正弦波幅=份额、相位漂移、
  浪头泡沫 + 月亮拉最大道；岸线 + legend 份额。
- **providerMeta 函数坑**：`ctx.providerMeta` 是函数非 map——所有新视图
  统一 `metaOf(k)`；constellation `agentMeta` 同。改后 Google/OpenRouter/
  OpenAI/DeepSeek 四色分明。
- **VIEW_META 用量组** + `view-tide` + `31 VIEWS`；
  README×2 + `docs/mode-tide.png`。

---

## Phase 66 — 第 32 个视图 `prism`（2026-11-15 · v0.69.0）

- **`prism.js/css`**：白光入 + 玻璃三角 + Provider 份额扇出——
  宽=Token、色=Provider、角=次序；`prism-ray` 伸缩动画、
  `prism-dot` 端点、`prism-shine` 白光扫入。
- **VIEW_META 结构组** + `view-prism` + `32 VIEWS`；
  README×2 + `docs/mode-prism.png`。

---

## Phase 67 — 第 33 个视图 `terrarium`（2026-11-15 · v0.70.0）

- **`terrarium.js/css`**：密封玻璃缸——每会话一株植物（高=Token、
  色=Agent），土上苔藓、失败=蕈、玻璃水滴；盖+软木封口。
- **`terr-grow` 生长、`terr-bud` 脉动、`terr-pop` 蕈弹出、`terr-drip` 水滴滴落。**
- **VIEW_META 趣味组** + `view-terrarium` + `33 VIEWS`；
  README×2 + `docs/mode-terrarium.png`。

---

## Phase 68 — 第 34 个视图 `echo`（2026-11-15 · v0.71.0）

- **`echo.js/css`**：会话滴水——环=Token、色=Agent、虚线=失败；
  `echo-ring` 扩散、`echo-core` 弹出、`echo-ch` 十字标。
- **VIEW_META 趣味组** + `view-echo` + `34 VIEWS`；
  README×2 + `docs/mode-echo.png`。

---

## Phase 69 — 第 35 个视图 `mosaic`（2026-11-15 · v0.72.0）

- **`mosaic.js/css`**：墙砖拼贴——格=Token、色=Agent、裂纹=失败；
  `mos-in` 弹入、行间勾缝线。
- **VIEW_META 用量组** + `view-mosaic` + `35 VIEWS`；
  README×2 + `docs/mode-mosaic.png`。

---

## Phase 70 — 第 36 个视图 `origami`（2026-11-15 · v0.73.0）

- **`origami.js/css`**：枝头纸鹤——大=Token、色=Agent、
  虚线折痕；失败=低垂 `droop`。`ori-swing` 轻摇、`ori-droop` 下垂。
- **VIEW_META 趣味组** + `view-origami` + `36 VIEWS`；
  README×2 + `docs/mode-origami.png`。

---

## Phase 71 — 第 37 个视图 `firefly`（2026-11-15 · v0.74.0）

- **`firefly.js/css`**：夜空萤火虫——亮=Token、色=Agent、
  `ff-drift` 漂浮、`ff-blink` 呼吸、`ff-twinkle` 星星、`ff-moon` 月亮。
- **VIEW_META 趣味组** + `view-firefly` + `37 VIEWS`；
  README×2 + `docs/mode-firefly.png`。

---

## Phase 72 — 第 38 个视图 `mandala`（2026-11-15 · v0.75.0）

- **`mandala.js/css`**：radial 曼陀罗——瓣=会话（长=Token、色=Agent、
  坏=碎），环=尝试；bindu 核心 + 3 虚线环。
- **坑**：`transform-box: fill-box` 在 `g` 上 + `scale(0)` 动画盖 `rotate`；
  `s.tries` undefined → `ry="NaN"`。修：`Number()||1` + fade 动画。
- **VIEW_META 趣味组** + `view-mandala` + `38 VIEWS`；
  README×2 + `docs/mode-mandala.png`。

---

## Phase 73 — 第 39 个视图 `quilt`（2026-11-15 · v0.76.0）

- **`quilt.js/css`**：拼布被子——布块=会话（大=Token、色=Agent、
  虚线缝线=失败），缝边 `q-border`。`q-in` 弹入、`q-stitch` 缝。
- **VIEW_META 用量组** + `view-quilt` + `39 VIEWS`；
  README×2 + `docs/mode-quilt.png`。

---

## Phase 74 — 第 40 个视图 `vortex`（2026-11-15 · v0.77.0）

- **`vortex.js/css`**：对数螺旋——粒子=会话（大=Token、色=Agent、
  转=尝试），失败吸中心；`vx-fade`/`vx-spin`/`vx-suck`/`vx-breath`/`vx-dash`。
- **坑**：`vx-in` `scale(0)` 盖 `translate`；`animateTransform` 干扰 g→CSS 自旋。
- **VIEW_META 趣味组** + `view-vortex` + `40 VIEWS`；
  README×2 + `docs/mode-vortex.png`。

---

## Phase 75 — 第 41 个视图 `kaleido`（2026-11-15 · v0.78.0）

- **`kaleido.js/css`**：12 折万花筒——楔=会话（长=Token、色=Agent、
  淡=失败），六边形框 + 2 虚线环 + 核心。
- **VIEW_META 趣味组** + `view-kaleido` + `41 VIEWS`；
  README×2 + `docs/mode-kaleido.png`。

---

## Phase 76 — 接通死 UI + 导出 PNG（2026-11-15 · v0.79.0）

- **发现**：`app-plus.js`（1364 行）已实现 cinema/attn/replay/palette/
  layout-edit/notify/sound——但 `data-extra` 按钮点击委托到 app.js 的
  settings handler（只认 layout/density/motion/tour），extras 从未绑定。
- **接通**：`#extras-seg` 在 app-plus bind hook 里自绑 `data-extra` →
  `applyExtra`；`#export-png` 按钮 + `i-download` symbol + `E` 键 +
  帮助条目；`exportPNG()` 在 app-plus（canvas 直接 `toDataURL`，
  SVG 克隆 + 内联全部 stylesheet + 2× rasterize + `--bg` 底）。
- **验证**：cinema O/Esc ✓、sound 开 + `magpie.sound=1` ✓、
  layout-edit 拖 + `.slot-x` ✓、导出 `magpie-kaleido-2026-11-14.png` 387KB ✓。

---

## Phase 77 — app-plus 全量实测 + 收尾（2026-11-15 · v0.79.0）

- **全绿**：cinema ✓、⌘K palette 56 项搜索 ✓、replay 帧缓冲 + scrub ✓、
  attn-strip 3 项（配额/错误/今日）✓、layout-edit 拖 + × 隐藏 +
  `magpie.hidden` 持久 ✓、notify 权限 denied 正确拒绝 ✓。
- **修**：palette Esc 只在 input 聚焦时关——全局 keydown 兜底
  `!pal.hidden → closePalette()`。
- **复盘**：`app-plus.js` 1364 行早已实现全部"死按钮"——真缺口只有
  `#extras-seg` 未绑 `data-extra`。教训：查死代码先查 hook/委托链，
  别看 `#id` 无 grep 命中就下结论。

---

## Phase 78 — 第 42 个视图 `orbit`（2026-11-15 · v0.80.0）

- **`orbit.js/css`**：彗星椭圆轨道——头=会话（大=Token、色=Agent、
  `animateTransform` 绕圈）、尾=弧迹、碎=失败；中央 Provider 日群。
- **VIEW_META 趣味组** + `view-orbit` + `42 VIEWS`；
  README×2 + `docs/mode-orbit.png`。

---

## Phase 79 — 第 43 个视图 `rain`（2026-11-15 · v0.81.0）

- **`rain.js/css`**：雨幕——滴=会话（长=Token、色=Agent、红=失败）、
  `rn-fall` 无限循环、`rn-splash` 落地涟漪、`rn-cloud` 云。
- **坑**：`both` 定格屏外→`infinite`；SMIL splash→CSS `scale(0)→scale(1)`。
- **VIEW_META 趣味组** + `view-rain` + `43 VIEWS`；
  README×2 + `docs/mode-rain.png`。

---

## Phase 80 — 第 44 个视图 `bubbles`（2026-11-15 · v0.82.0）

- **`bubbles.js/css`**：气泡上浮——泡=会话（大=Token、色=Agent、
  摇摆=相位、沉=失败）、焦散光、水面线。
- **坑**：`transform` attr 被 CSS `transform` 盖——改用 `cx`/`cy` 绝对坐标 +
  `translateX`/`translateY` 只动画位移；`both` 回底→`infinite`。
- **VIEW_META 趣味组** + `view-bubbles` + `44 VIEWS`；
  README×2 + `docs/mode-bubbles.png`。

---

## Phase 81 — 第 45 个视图 `spectrum`（2026-11-15 · v0.83.0）

- **`spectrum.js/css`**：频峰——高=Token、色=Agent、宽=尝试；
  下方镜像、`sp-bounce` 弹跳、`sp-dash` 节拍线。
- **坑**：`tries` undefined→`width="NaN"`；`sp-bounce` 起 `scaleY(.85)` 太小→`scaleY(0)`。
- **VIEW_META 用量组** + `view-spectrum` + `45 VIEWS`；
  README×2 + `docs/mode-spectrum.png`。

---

## Phase 82 — 第 46 个视图 `wave`（2026-11-15 · v0.84.0）

- **`wave.js/css`**：双轨波形——上波=Token 峰（色=Agent）、
  下波=回声镜像、扫描光标、失败=刺。`wv-slide`/`wv-scan`/`wv-pop`/`wv-blink`。
- **VIEW_META 用量组** + `view-wave` + `46 VIEWS`；
  README×2 + `docs/mode-wave.png`。

---

## Phase 83 — 第 47 个视图 `galaxy`（2026-11-15 · v0.85.0）

- **`galaxy.js/css`**：双臂螺旋星系——星=会话（大=Token、色=Agent、
  飘=失败）、亮核 + 星野底、`gx-twinkle`/`gx-drift`/`gx-breath`。
- **坑**：`g` `transform` attr vs CSS `transform`——改用 `cx`/`cy` 绝对坐标。
- **VIEW_META 趣味组** + `view-galaxy` + `47 VIEWS`；
  README×2 + `docs/mode-galaxy.png`。

---

## Phase 84 — 第 48 个视图 `dna`（2026-11-15 · v0.86.0）

- **`dna.js/css`**：双螺旋——链=紫/青正弦（dash 流动）、
  对=会话（宽=Token、色=Agent、断=失败）。`dn-dash`/`dn-pulse`/`dn-spark`。
- **VIEW_META 趣味组** + `view-dna` + `48 VIEWS`；
  README×2 + `docs/mode-dna.png`。

---

## Phase 85 — 第 49 个视图 `nebula`（2026-11-15 · v0.87.0）

- **`nebula.js/css`**：彩色星云——云团=会话（大=Token、色=Agent、
  淡=失败）+ 丝状光 + 尘埃、`feGaussianBlur` 柔焦。
- **VIEW_META 趣味组** + `view-nebula` + `49 VIEWS`；
  README×2 + `docs/mode-nebula.png`。

---

## Phase 86 — 第 50 个视图 `tide`（2026-11-15 · v0.88.0）

- **`tide.js/css`**：潮汐——海面=今日 Token 占软顶、
  浮标=会话、暗=失败、月亮牵引；`td-sway`/`td-roll`/`td-bob`/`td-sink`。
- **VIEW_META 趣味组** + `view-tide` + `50 VIEWS`；
  README×2 + `docs/mode-tide.png`。

---

## Phase 87 — 第 51 个视图 `maze`（2026-11-15 · v0.89.0）

- **`maze.js/css`**：蛇行走廊——段=会话（长=Token、色=Agent、
  死=失败）、竖连下折、迷宫网格底；`mz-draw`/`mz-pop`/`mz-blink`。
- **VIEW_META 趣味组** + `view-maze` + `51 VIEWS`；
  README×2 + `docs/mode-maze.png`。

---

## Phase 88 — 第 52 个视图 `quartz`（2026-11-15 · v0.90.0）

- **`quartz.js/css`**：晶簇——柱=会话（高=Token、色=Agent、
  裂=失败）、棱面高光、基座 + 闪烁星；`qz-rise`/`qz-shiver`/`qz-spark`。
- **VIEW_META 趣味组** + `view-quartz` + `52 VIEWS`；
  README×2 + `docs/mode-quartz.png`。

---

## Phase 89 — 第 53 个视图 `ripple`（2026-11-15 · v0.91.0）

- **`ripple.js/css`**：涟漪——滴=会话（大=Token、色=Agent、
  断环=失败）、三环错开扩散、水面虚线。
- **VIEW_META 趣味组** + `view-ripple` + `53 VIEWS`；
  README×2 + `docs/mode-ripple.png`。

---

## Phase 90 — 第 54 个视图 `lantern`（2026-11-15 · v0.92.0）

- **`lantern.js/css`**：天灯——灯=会话（大=Token、色=Agent、
  歪=失败）+ 火苗 + 星夜；`lt-float`/`lt-fall`/`lt-flick`。
- **坑**：`g` transform attr vs CSS 动画——拆双层 g。
- **VIEW_META 趣味组** + `view-lantern` + `54 VIEWS`；
  README×2 + `docs/mode-lantern.png`。

---

## Phase 91 — 第 55 个视图 `pinwheel`（2026-11-15 · v0.93.0）

- **`pinwheel.js/css`**：风车——轮=会话（叶展=Token、色=Agent、
  反转=失败）、园边竖杆；`pw-spin`/`pw-pulse`。
- **VIEW_META 趣味组** + `view-pinwheel` + `55 VIEWS`；
  README×2 + `docs/mode-pinwheel.png`。

---

## Phase 92 — 第 56 个视图 `chime`（2026-11-15 · v0.94.0）

- **`chime.js/css`**：风铃——管=会话（长=Token、色=Agent、
  裂=失败）+ 槌 + 顶梁；`ch-sway`/`ch-shiver`/`ch-clap`。
- **VIEW_META 趣味组** + `view-chime` + `56 VIEWS`；
  README×2 + `docs/mode-chime.png`。

---

## Phase 93 — 第 57 个视图 `firework`（2026-11-15 · v0.95.0）

- **`firework.js/css`**：烟花——爆=会话（径/辐=Token、色=Agent、
  哑=失败）+ 上升轨迹；双层 g 解决缩放中心；`fw-burst`/`fw-launch`/`fw-pop`。
- **VIEW_META 趣味组** + `view-firework` + `57 VIEWS`；
  README×2 + `docs/mode-firework.png`。

---

## Phase 94 — 第 58 个视图 `fountain`（2026-11-15 · v0.96.0）

- **`fountain.js/css`**：喷泉——弧=会话（高=Token、色=Agent、
  溅=失败）+ 水滴 + 水盆涟漪；双 C 贝塞尔开口弧；`ft-flow`/`ft-fall`/`ft-sput`。
- **VIEW_META 趣味组** + `view-fountain` + `58 VIEWS`；
  README×2 + `docs/mode-fountain.png`。

---

## Phase 95 — 第 59 个视图 `pendulum`（2026-11-15 · v0.97.0）

- **`pendulum.js/css`**：摆锤——摆=会话（杆长/摆弧=Token、色=Agent、
  停=失败）+ 顶梁；CSS 变量 `--amp` 控摆幅；`pd-swing`/`pd-still`/`pd-glow`。
- **VIEW_META 趣味组** + `view-pendulum` + `59 VIEWS`；
  README×2 + `docs/mode-pendulum.png`。

---

## Phase 96 — 第 60 个视图 `aurora2`（2026-11-15 · v0.98.0）

- **`aurora2.js/css`**：极光幕——幕=会话（高=Token、色=Agent、
  闪=失败）+ 星野 + 地平虚线；`feGaussianBlur` 柔焦；
  `a2-sway`/`a2-flicker`（skewX+scaleY 摇曳）。
- **VIEW_META 趣味组** + `view-aurora2` + `60 VIEWS`；
  README×2 + `docs/mode-aurora2.png`。

---

## Phase 97 — 第 61 个视图 `beehive`（2026-11-15 · v0.99.0）

- **`beehive.js/css`**：蜂巢——格=会话（满=Token、色=Agent、
  裂=失败）+ 错位行网格 + 小蜂椭圆轨道；`bh-pop`/`bh-hum`/`bh-orbit`。
- **VIEW_META 趣味组** + `view-beehive` + `61 VIEWS`；
  README×2 + `docs/mode-beehive.png`。

---

## Phase 98 — 第 62 个视图 `vine` · **v1.0.0**（2026-11-15）

- **`vine.js/css`**：藤蔓——茎=S 曲线生长、叶=会话（大=Token、
  色=Agent、枯=失败）、顶端卷须；`vn-grow`/`vn-unfurl`/`vn-wilt`/`vn-curl`。
- **VIEW_META 趣味组** + `view-vine` + `62 VIEWS`；
  README×2 + `docs/mode-vine.png`。
- **里程碑**：v0.18 → v1.0.0，98 phase、62 视图。


---

## Phase 180–190 — v1.7.x 场景组爆发 + 陪伴彩蛋（2026-11-15 · v1.7.25）

**115 视图**（63→115，+52 场景/生态组）+ 陪伴机制。

### 新增视图（每图一隐喻：配额窗=实体、用量=尺寸/状态、会话=活物）

| 版本 | id | 隐喻 | 实体 |
|---|---|---|---|
| v1.7.7 | pond | 荷塘 | 莲=配额窗 漪=用量 蛙=会话 |
| v1.7.10 | metro | 地铁图 | 线=配额窗 宽=拥挤 车=会话 |
| v1.7.12 | glacier | 冰川 | 冰=配额窗 高=用量 鹅=会话 |
| v1.7.15 | volcano | 火山 | 锥=配额窗 烟=用量 鸟=会话 |
| v1.7.16 | canyon | 峡谷 | 层=配额窗 深=用量 客=会话 |
| v1.7.18 | lake | 湖泊 | 莲=配额窗 沉=用量 黾=会话 |
| v1.7.20 | harvest2 | 麦田 | 垄=配额窗 穗=用量 农=会话 |
| v1.7.23 | marina | 码头 | 船=配额窗 桅=用量 鸥=会话 |

### 陪伴/好玩

- **台鹊 mascot**：单击叽喳（记鹊缘 localStorage）/双击绕场一周/新会话到达自动跳（`mascot-hop`）/配额热 `.mascot-alert`/流量中 `.mascot-fly`。
- **彩蛋**：session-list 任意位置 650ms 内点 5 次 → 台鹊飞出。
- **成就新增**：`view-50` 百景图（切 50 视图）/`cinema-1h` 影院常客（累计 1h）/`fav-5` 收藏家/`magpie-50/200` 鹊缘/鹊上眉梢。
- **KPI 连击火苗**：请求数卡 ≥2 天连击显示 `🔥N`。

### 好用

- **分享状态链接**：`?view&range&cinema` 一键复制（⌘S / palette"复制状态链接"）。
- **默认视图**：vm-menu"默认视图"按钮/palette/rail-fav 双击——`magpie.defaultView` 落地。
- **请求表排序**：`th[data-sort]` at/model/status/tokens/ttft/tps/cost 升降序，箭头显示方向。
- **快捷键面板** 补 `⌘S`/`⌘E`/双击星/右键行。
- **motion soft** 覆盖 ghost-magpie。

### Bug 修复

- **`app.js` 粒子循环 `length` 浮点**（`for (let i = 0; i < s.tokens / 400; i++)` → 每次渲染多 1 粒子直至爆内存）→ `Math.ceil`。
- **index.html 11 个重复 `stage-view` id**（desert/fortune/grove/pond/metro/glacier/volcano/rain/tank/camp/harbor 各 2-3 份）→ 去重。
- **volcano 嵌套三元引号解析**（`fill="...${hot ? "var(--red)" : "var(--line-2)"}"` 内双引号触发 parser 误读）→ 换单引号。

### 埋点

- `magpie.viewCount`（视图切换总数）
- `magpie.cinemaMs`（影院累计毫秒）
- `magpie.clicks`（台鹊点击数）
- `magpie.badges`（成就包）
- `magpie.viewHeat`/`viewRecent`（热度/最近）

---

## 下轮候选（v1.7.26+）

1. **场景视图**：`river`（川=配额、鱼=会话）、`forest`（树=配额、鸟=会话）、`beach`（浪=配额、蟹=会话）、`village`（屋=配额、烟=会话）。
2. **"今日 vs 昨日" 对比条** 显式进 hero 而非只在 attn-strip。
3. **session-card 长按/右键** 二级动作（复制 tries、过滤 agent 已有，可加"钉到 quota 卡"）。
4. **设置"动效"第 4 档** `bokeh`（慢 2.4×、几乎静态）。
5. **palette 加"按组过滤"** — `group:场景` 列出场景组所有视图。
6. **KPI 卡片拖到手记栏** → 一键把当前 token/cost 钉进自定义便签卡。
7. **成就**：`view-all` 看过全部 115 / `quota-watch` 单窗 ≥95% 触发过 / `night-owl-2` 凌晨 ≥3 天。

## 下轮候选 v2（2026-11-15 · 700 视图后）

上批候选已全部落地：组筛选芯片行（持久 magpie.vmGroup、random/tour 尊重组）、trophies +5 徽章、session 右键"钉到配额"、动效第 4 档 bokeh 静景、KPI 拖钉便签卡、成就 quota-watch/night-owl-2、`.vm-item[hidden]` 搜索过滤修复、`.vm-row` content-visibility。

1. **hero 空态/首启引导**：数据为空或新装时 hero 区的引导态（随机视图推荐 + 收藏种子）。
2. **vs 卡升级**：加本周/上周第三条轨迹 + 峰值时刻标注。
3. **palette 命令补全**：`group:` 前缀已有芯片行替代，可加 `fav:`/`unseen:`/`hot:` 前缀语法到搜索框。
4. **tour 收藏池**：巡游只走收藏视图（tourPool 已支持，缺 UI 入口）。
5. **digest 报告扩展**：昨日报告加"最耗时 provider"/"错误聚类"两行。
6. **性能**：700 视图菜单首开的 DOM 构建时间测量与分批渲染（buildViewMenu 目前一次性 innerHTML）。

## 下轮候选 v3（2026-11-15 · v2 全部落地后）

v2 已落地：hero 空态引导（random/tour/views 入口）、vs 卡本周轨迹、fav:/unseen:/hot:/group: 搜索前缀、巡游收藏按钮（tourPool=fav）、digest 错误聚类格、菜单首开 ~140ms/702 项（content-visibility 兜底，无需分批）。

1. **组筛选与 hero 切换一致性**：vmGroup 选中时 setHeroMode 切到组外视图，菜单再开时高亮仍指向旧组——可自动跟随 heroMode 所在组或给出"跳组"提示。
2. **digest 周报可分享**：weeklyReport 已有 PNG 导出位，可把 digest-card 做成一键复制 markdown 摘要。
3. **便签卡进化**：note-chip 支持双击编辑文本/拖到 session 卡关联（sessionNotes 已有基础设施）。
4. **quota-pop 历史迷你图**：配额悬停卡加最近 N 点 sparkline（quotaHistory 数据已有）。
5. **成就补齐**：trophies 与 app-plus ACHIEVEMENTS 双轨尚有差异项（如 cinema-1h/magpie-50 未进 trophies 架）。

## 下轮候选 v4（2026-11-15 · v3 全部落地后）

v3 已落地：heroMode 组跟随、quota-pop remaining% 历史 sparkline、digest 复制MD、便签chip双击编辑、trophies+4 徽章对齐 app-plus（21 徽章）。

1. **深度分享**：`?view&range&cinema` 扩展 `&group=` 恢复组筛选 + `&fav=` 分享收藏集。
2. **视图对比模式**：双 hero 并排（两视图同屏对照，布局模式新档）。
3. **数据回放增强**：replay-bar 加速度档（1×/2×/4×）与跳时间点。
4. **移动端手势**：view-menu 下滑关闭、hero 左右滑切视图。
5. **无障碍**：view-menu 全键盘流程审查 + aria-live 切换公告完善。

## 下轮候选 v5（2026-11-15 · v4 全部落地后）

v4 已落地：share `&group=`、hero 左右滑切视图（组作用域）、replay 1×/2×/4× 速度档、view-menu 下滑关闭、视图切换 aria-live 公告、对比视图浮动面板（palette 命令）。

1. **对比面板进化**：固定选择视图（非随机）+ 并排 KPI 差异列 + 同步刷新。
2. **手势补全**：live-panel 左右滑切 sessionTab、quota-list 长按复制窗口详情。
3. **性能再压**：700 视图菜单首开 innerHTML 换成 DocumentFragment + 分批 chunk（目前 ~140ms 可接受但仍有提升空间）。
4. **离线壳**：PWA manifest + sw 缓存静态资源（serve 静态文件可注册）。
5. **视图收藏分组**：收藏按组聚合显示在 rail-favs。

## 下轮候选 v6（2026-11-15 · v5 全部落地后）

v5 已落地：对比面板用 viewRecent 次近项、quota 长按复制详情、live-panel 滑切 tab、PWA 确认完整（manifest+sw+离线缓存）、rail-favs 组色左边框。

1. **深度联动**：digest 引用 magpie.badges 做"昨日解锁"播报；digest-md 含错误聚类行。
2. **多网关**：quota/compare 支持并行拉两个网关快照对比（compareGateways 基础设施已有）。
3. **视图快捷设置**：hero 区右键菜单（非仅收星）——随机/巡游/对比/导出入口。
4. **session 分组**：live-panel 按 group 或 provider 分节显示（长列表可读性）。
5. **KPI 自定义**：KPI 行可选卡（隐藏/重排持久化，与 layoutEdit 不同粒度）。

## 下轮候选 v7（2026-11-15 · v6 部分落地后）

v6 已落地：digest 昨日解锁播报、digest-md 错误行、hero 右键快捷菜单(6项)、recent 会话按 provider 分节。跳过：PWA(已有)、菜单分批(收益低)。

1. **多网关并行对比**：server 支持多 endpoint 注册，palette 命令已有 compareGateways，扩展为真实双网关。
2. **KPI 自定义卡**：KPI 行可隐藏/重排（粒度比 layoutEdit 细），存 magpie.kpiOrder。
3. **session 卡片二级**：点开卡片→内联 tries/subagents 明细(现需右键+popover)。
4. **hero 空态智能**：route 空时按热力推荐"可能喜欢的视图"(viewHeat top)。
5. **数据导出扩展**：digest/weekly 可复制 PNG 截图(dom-to-image 或 screenshot API)。

## 下轮候选 v8（2026-11-15 · v7 部分落地后）

v7 已落地：选中 session 内联 tries 明细(顺带修 fmtMs 渲染崩溃 bug)、hero 空态热力推荐、KPI 右键隐藏+恢复 chip。

1. **多网关并行**：server.mjs 支持多 endpoint 池,palette compareGateways 用真实双快照而非单点回放。工作量在 server 注册 + client 并行 fetch。
2. **PNG 导出**:dom-to-image 抓 hero/digest 为 PNG 下载(需内联依赖或自绘 canvas)。
3. **session 卡展开持久**:selectedSession 内联明细已有,可扩展为 pin 态也展开。
4. **trace 增时间轴**:hero-mode=route 时右下角 session 区也画 ttft/ttl 横向条。
5. **便签卡导出**:便签内容一键复制为 markdown。

## 下轮候选 v9（2026-11-15 · v8 全部落地后）

v8 已落地/确认：多网关并行对比(compareGateways 双快照)、PNG 导出(按钮+E 键,实测下载)、便签复制 MD 表格、tries 时间轴横条、KPI 右键隐藏+恢复。pin 态不常开展示(保持可扫性,设计决定)。

1. **视图快照跨设备**:share link 已含 view/range/cinema/group/gw;补 localStorage 清单(收藏/便签/pin/KPI 隐藏)编码进 URL(?state=base64)。
2. **digest 推送**:digest 出现时同时发 Web Notification(通知权限已有)。
3. **session 时间轴聚合**:所有 tries 汇成一条泳道(不止选中卡),放 decision-strip 下。
4. **view-menu 粘性组头**:滚动时当前组头吸顶。
5. **更多触控**:heatmap 长按复制当日 tokens/calls;digest 滑走关闭。

## 下轮候选 v10（2026-11-15 · v9 部分落地后）

v9 已落地：heatmap 长按复制、digest 横滑关闭+Web Notification、view-menu 粘性组头(已有)、hero 菜单 4 死项修复(randViewId/share-link/report-copy)。

1. **完整状态链接** `?st=`:base64 编码 收藏/便签/pin/KPI隐藏/视图书签 进 URL,applyUrlState 还原(跨设备快照)。
2. **session 时间轴聚合泳道**:所有会话 tries 汇成单条泳道(不止选中卡),decision-strip 下。
3. **digest 历史**:digest 出现后存 magpie.digestLog(7条),可回看历史摘要。
4. **KPI 卡双击**:除隐藏外,双击复制单卡值到剪贴板。
5. **session 卡键盘展开**:选中后按 Enter/Space 切 tries 明细显隐(非仅点击重渲)。

## 下轮候选 v11（2026-11-15 · v10 基本落地后）

v10 已落地：?st= 跨设备完整状态链接、KPI 双击复制、digestLog 7条历史、键盘Enter展开tries(已由select覆盖)。跳过：聚合泳道(与tries轴+瀑布视图重复)。

1. **视图性能预算**:每视图渲染计时(performance.mark),慢视图在view-menu标注。
2. **session 卡片时间轴展开**:tries-detail 纵向甘特(每try一根bar按实际时间定位,非等宽占比)。
3. **夜间自适应**:本地时间 19-7 点自动切 dark+低动效(可关)。
4. **digest 周报链**:digest 含"上周vs本周"箭头对比(已有周报卡,补digest内联)。
5. **离线 replay 回放链接**:回放链接含 st,对方打开即同视野+回放数据(需 st 含 replay 帧——太大,改共享 HTML 已有)。

## 下轮候选 v12（2026-11-15 · v11 基本落地后）

v11 已落地：夜间自适应(19-7 auto dark+soft,手动戳覆盖至次日黎明)、digest周环比、视图渲染计时+菜单标慢。跳过：digest内嵌周报链(已有周报卡按钮)。

1. **tries 纵向甘特**:tries-detail 各try按真实起止时间纵向排条(非等宽占比),需 tries 含起始偏移——数据层只有 ms,近似以累加 offset。
2. **replay 帧导出 JSON**:回放帧下载为 .json(除 HTML 外多一种)。
3. **digestLog 回看 UI**:palette 命令"历史摘要"列出 7 条 digestLog。
4. **view-menu 最近使用置顶**:vm-recent 区可折叠+显示次序号。
5. **性能门**:viewPerf 平均>50ms 的视图自动建议降档动效提示。

## 下轮候选 v13（2026-11-15 · v12 基本落地后）

v12 已落地：回放帧导出JSON、palette历史摘要浮卡、view-menu组头全折叠。跳过：vm-recent序号(价值低)。

1. **tries 纵向甘特**:tries-detail 各try按累加offset纵向排条,标相对起点(仅ms可近似)。
2. **性能门提示**:某视图 viewPerf 均值>50ms 时菜单标出"建议轻柔动效"。
3. **session 卡虚拟化**:recent>50 条时 IntersectionObserver 分块渲染。
4. **digestLog 导出**:历史摘要卡加"复制全部"按钮。
5. **多时区**:digest/heat date 显示同时区切换(local/UTC)。

## 下轮候选 v14（2026-11-15 · v13 落地后）

v13 已落地：digestLog复制全部、视图>50ms"重"门、时钟点击切local/UTC。跳过：session虚拟化(数据<50条)、tries纵向甘特(ms近似失真)。

1. **错误聚类下钻**:digest "错误聚类" 点击→跳转到该provider的日志过滤视图。
2. **digest 首次问候语**:首次/连击里程碑(7/30天)digest 文案变体。
3. **session 卡右滑收藏**:触控右滑→置顶(等同pin按钮)。
4. **view-menu 键盘搜索**:打开时自动聚焦搜索框(验证/补)。
5. **回放步进**:replay-range 加 ←→ 帧步进键盘。

## 下轮候选 v15（2026-11-15 · v14 全部落地后）

v14 已落地：回放←→帧步进、digest首访/里程碑问候、digest错误聚类下钻、session右滑置顶、vm搜索聚焦(已有)。

1. **digest 周报对比图**:digest 内嵌 7天柱状迷你图(canvas/SVG spark)。
2. **session 左滑操作**:左滑→复制ID(与右滑置顶对称)。
3. **错误聚类下钻加固**:下钻时同设 logFilterModel=ep 的 model(若有单model聚类)。
4. **view-menu 尺寸**:大屏下 menu 列数改 3(目前 2 列 700 项滚动长)。
5. **回放自动循环**:回放到底自动回头(可关)。

## 下轮候选 v16（2026-11-15 · v15 全部落地后）

v15 已落地：session左滑复制ID、view-menu大屏3列、digest 7天迷你柱状、回放循环(右键speed)。

1. **digest 会话展开**:digest 卡点击会话区→展开为完整面板(非仅toast)。
2. **st 链接二维码**:shareStateLink 生成时显示 QR(canvas自绘或外联,~80行)。
3. **view-menu 行高自适应**:按viewport密度调 vm-row padding。
4. **session 卡批量**:多选模式(长按进多选,批量pin/复制)。
5. **回放共享帧**:replay st链接含首帧预览图(URL过长则跳过)。

## 下轮候选 v17（2026-11-15 · v16 消化后）

v16 已落地：session 多选 Shift+click+批量条(置顶/复制/清除)、heat-cell点击过滤(发现已有855行+右键复制日期)。
跳过：st QR码(需外链/违背local-first)、digest会话展开(已在digest内)、vm行高(密度档已有)。

1. **多选持久 + 浮动条完善**:multiSel 渲染时保持(sig check 会清 .multi class——需在 renderSessions 后重标)。
2. **digestLog 回看含趋势图**:历史摘要浮卡加 mini bar。
3. **view-menu 列数自适应**:1700px 3列已有,补 2200px+ 4列。
4. **回放书签**:回放中按 B 标记当前帧,加 magpie.replayMarks。
5. **KPI 右键菜单**:单击跳/右键隐藏已有,补 palette 列出隐藏项。

## 下轮候选 v18（2026-11-15 · v17 部分落地后）

v17 已落地：session多选+批量条、.multi跨tick持久、回放B帧书签、vm 4列、heat-cell日期过滤确认。

1. **digestLog 趋势 mini bar**:历史摘要浮卡加 7 天柱状。
2. **palette 列隐藏 KPI**:命令"已隐藏 N 个 KPI · 恢复"进 paletteItems。
3. **session 卡片右键扩展**:现有5项,补"复制标题+模型"格式串。
4. **回放书签跳转**:palette 列 replayMarks 点击跳帧。
5. **digest 声音**:digest 出现时低声提示音(与 beep 复用,可关)。

## 下轮候选 v19（2026-11-15 · v18 全部落地后）

v18 已落地：digestLog mini bar、palette恢复隐藏KPI、session右键复制标题+模型、回放书签跳转(marks已有)、digest beep音。

1. **回放书签跳转**:palette 命令列出 replayMarks,点击 scrubReplay 跳帧。
2. **session 卡 hover 记忆**:recent 卡里"上次看过时间" 小字(viewSeenAt 复用模式)。
3. **digest 同类日志合并**:digest错误聚类超过3类时显示 top2+其余。
4. **便签卡拖拽排序**:note-chip 上下拖动重排(已有拖拽进出,补内部排序)。
5. **view-menu 关闭动画**:打开已有 vmItemIn,补关闭 transition。

## 下轮候选 v20（2026-11-15 · v19 基本落地后）

v19 已落地：回放书签跳帧、vm关闭动画、便签chip拖拽排序(顺带修host未定义)、digest beep。跳过：session看过时间(视图维度)、digest top2合并。

1. **回放标记可视化**:replay-range 下方一条 tick 条,标 marks 位置(可点跳)。
2. **session 卡标记 icon**:ctxSess.agent 彩色小点在卡右上(已知有 --s-c,补显式 marker)。
3. **digest 触发快捷键**:palette/键盘 D 强制重显 digest(清 magpie.digest 标记)。
4. **session 卡多选拖拽**:multiSel 可整组拖到便签卡(批量钉值)。
5. **view-menu 粘性搜索**:vm-filters chips 吸顶(与组头 sticky 一致)。

## 下轮候选 v21（2026-11-15 · v20 全部落地后）

v20 已落地：Shift+D重显digest、回放marks刻度条、vm-filters吸顶、multiSel拖到便签卡批量钉。跳过：session agent marker(--s-c已有)。

1. **回放时间轴会话标记**:range 下再加 sessions 完成点(蓝点,非仅B书签)。
2. **digest 昨日top provider**:digest 卡点击"最常用"格→过滤该provider会话。
3. **session 卡子代理展开**:subagents>0 的卡加展开指示(已有subagent-row,补▾点击切)。
4. **view-menu 空态**:搜索无结果时显示图鉴进度+随机视图按钮。
5. **回放标记导出**:replay-marks 一键复制为 JSON。

## 下轮候选 v22（2026-11-15 · v21 全落地后）

v21 已落地：digest最常用点击过滤、子代理计数badge、回放书签JSON导出、view-menu空态(图鉴进度+🎲随机视图)。跳过：replay时间轴session完成点(需比对log时间↔帧)。

1. **回放时间轴会话点**:replay-range下叠加sessions完成点(按时间归一到帧)。
2. **便签卡mini导出**:note-card加"复制JSON"按钮。
3. **session卡改道明细**:fallbacks chip点击→显示tries列表(triesDetail已有,补非selected也能看)。
4. **view-menu随机键**:打开后按 G 随机切视图(lucky按钮的键版)。
5. **digest子代理汇总**:digest加"昨日top子代理"格。

## 下轮候选 v23（2026-11-15 · v22 落地后）

v22 已落地：g菜单内随机视图、便签右键复制JSON、改道chip点击展开tries、回放书签JSON导出。跳过：回放session完成点(需时间↔帧映射)、digest top子代理。

1. **回放时间轴会话完成点**:replay-marks 条下叠加 sessions 完成帧点。
2. **digest 昨日top子代理格**:subagents 计数聚合。
3. **vm 菜单最近常按分组**:组排序按近用次数。
4. **session卡hover预览模型路由**:triesDetail已有,补hover延时展开。
5. **palette视图跳转+预览**:选中视图项按→显示6字描述。

## 下轮候选 v24（2026-11-15 · v23 落地后）

v23 已落地：palette →预览、digest top子代理格、回放range会话起始点。跳过：vm组近用排序(组数恒定意义小)、session hover延时展开(已有chip点击)。

1. **session卡tries明细可点击**:try-row点击→过滤到该provider。
2. **digest连续使用格点击**:dayStreak格→显示近30天打卡迷你图。
3. **view-menu近用分组**:vm组顺序按magpie.viewRecent重排。
4. **palette最近执行区**:items顶部加"上次执行"快捷重跑(localStorage.lastCmd)。
5. **回放速度档**:palette加 0.5×/1×/2× 回放速度切换。

## 下轮候选 v25（2026-11-15 · v24 落地后）

v24 已落地：palette lastCmd重跑、回放速度palette项、try-row点击过滤。跳过：vm组近用排序(静态顺序够用)、digest打卡迷你图(已单格)。

1. **回放range hover预览帧**:鼠标悬停range→tooltip显示该帧tps/err。
2. **session卡tries可点已有**→chip加"N次尝试"微标。
3. **palette视图分组标题**:items按kind分段(视图/跳转/动作)视觉分组。
4. **digest复制CSV**:digest-md旁加CSV按钮。
5. **回放循环palette项**:replayLoop切换进palette。

## 下轮候选 v26（2026-11-15 · v25 落地后）

v25 已落地：palette回放循环、digest复制CSV、palette按kind分段。跳过：回放range hover预览(需帧tooltip叠加)、tries计数chip(amber chip已含数字)。

1. **回放range悬停帧预览**:range hover→tooltip该帧tps/tokens。
2. **session卡tries计数chip**:fallbacks旁"N tries"。
3. **palette视图缩略图hover放大**:pal-thumb hover→lightbox缩略预览。
4. **digest错误率格**:errs/calls百分比格。
5. **回放帧跳转±10**:range旁«»按钮跳10帧。

## 下轮候选 v27（2026-11-15 · v26 全落地后）

v26 已落地：回放±10帧+悬停预览、digest错误率格、tries计数chip。全部 5 项消化。

1. **palette pal-kind吸顶**:分段标签sticky(与vm-filters一致)。
2. **digest可复制JSON**:digest-csv旁加JSON按钮。
3. **session卡模型点击**:model名点击→logQuery=该模型。
4. **回放首/末帧键**:replay中按 Home/End跳帧。
5. **vm-lucky未看优先**:🎲偏向magpie.viewSeen外视图。

## 下轮候选 v28（2026-11-15 · v27 全落地后）

v27 已落地：pal-kind吸顶、session模型点击过滤日志、回放Home/End、lucky未看偏、digest复制JSON。全部 5 项消化。

1. **session卡路由点击**:route chip点击→过滤该group。
2. **回放帧错误标记**:range下红点=该帧errors>0。
3. **digest周环比格点击**:wk格→heatmap切7天视图。
4. **palette历史区**:items加"最近5个执行"块。
5. **回放帧导出PNG**:当前帧hero截图为PNG。

## 下轮候选 v29（2026-11-15 · v28 落地后）

v28 已落地：回放错误红点、session路由chip过滤group(matchFilter补group型)、digest周环比点击滚热度、palette最近5执行。跳过：回放帧PNG截图(需canvas序列化,工作量大)。

1. **回放帧导出PNG**:html2canvas不可用,改为复制当前帧JSON摘要。
2. **session卡状态点击**:state chip点击→按status过滤(active/done)。
3. **digest格点击通用化**:tokens格→heat;调用格→log列表。
4. **palette视图热键提示**:常用视图项显示"按数字N直达"。
5. **回放帧差分**:相邻帧tokens差值标记在strip。

## 下轮候选 v30（2026-11-15 · v29 全落地后）

v29 已落地：session状态chip过滤、palette⌘数字、回放tokens差分点、digest tok/call格点击。全部消化。

1. **session卡shift+click range选**:multiSel区间选择(上一次点击到当前)。
2. **digest图鉴格点击**:→打开view-menu。
3. **回放帧tps曲线**:strip上加mini tps sparkline。
4. **palette空态**:无结果时显示"试试⌘1-9/→预览"提示。
5. **session卡双击标题**:→复制title+model。

## 下轮候选 v31（2026-11-15 · v30 全落地后）

v30 已落地：shift区间多选、digest图鉴格点击开菜单、回放tps sparkline、palette空态。全部消化。

1. **回放帧连续使用标记**:strip上加当前帧streak刻度。
2. **session卡tps点击**:tps格→按tps排序会话。
3. **digest子代理格点击**:→过滤该subagent会话(需subagent过滤型)。
4. **palette视图项右键**:→设为默认视图。
5. **回放帧成本**:strip显示累计cost小字。

## 下轮候选 v32（2026-11-15 · v31 落地后）

v31 已落地：tps排序、palette右键默认视图、回放cost小字、子代理格过滤。跳过：回放streak刻度(streak是日维非帧维)。

1. **session卡agent icon点击**:→过滤该agent(已有ctxMenu,补单击路径)。
2. **回放帧区间标记**:B键marks两两之间画区间段。
3. **digest错误率格点击**:→过滤err日志。
4. **palette视图项中键**:→新视图不关闭菜单(连续浏览)。
5. **session卡右键菜单加"过滤此agent"**:ctxMenu补项。

## 下轮候选 v33（2026-11-15 · v32 落地+fix后）

v32 已落地：agent icon过滤、错误率格→err日志、marks区间段+作用域fix。跳过：中键连续浏览(auxclick复杂)。

1. **session卡标题点击复制**:title点击→copy title(不选中卡)。
2. **回放strip悬停坐标**:range+strip同步竖线游标。
3. **digest streak格点击**:→显示连续打卡明细toast。
4. **palette视图项长按**:→直接进cinema。
5. **session卡右上角时间hover**:fmtAge→完整时间戳title。

## 下轮候选 v34（2026-11-15 · v33 落地后）

v33 已落地：age全时间戳、streak格明细、回放strip游标。跳过：标题点击复制(主交互冲突)、视图长按cinema(手势复杂)。

1. **session卡pin长按**:pin星长按→pin+设为选中。
2. **回放strip当前帧游标**:replay.idx位置常显竖线(非仅hover)。
3. **digest格统一样式**:可点格加微下划线提示。
4. **palette视图项徽标**:常用视图显示"hot"角标。
5. **session卡双击**:→复制会话JSON。

## 下轮候选 v35（2026-11-15 · v34 落地后）

v34 已落地：alt+dblclick JSON、回放当前帧游标、palette hot角标。跳过：pin长按(pin已是单击,长按增复杂度)、digest格统一样式(各格已cursor:pointer)。

1. **回放区间A-B循环**:长按mark设A,再按设B,区间循环播放。
2. **session卡右键菜单tries数**:ctxMenu补"N次尝试"行。
3. **digest格未看数**:图鉴格旁加"今日新看N"。
4. **palette视图按字母**:视图项按标题首字分组(非kind)。
5. **session卡subagent行点击**:→过滤该subagent。

## 下轮候选 v36（2026-11-15 · v35 落地后）

v35 已落地：ctxMenu tries统计、subagent行过滤、图鉴今日新看、回放A-B循环。跳过：字母分组(kind分段已够)。

1. **回放AB区间高亮**:strip上AB段画红色带。
2. **session卡拖拽到compare-pane**:拖会话进对比区。
3. **digest调用格点击改**:→log卡片高亮今日行。
4. **palette视图热键1-9**:展示序号角标(非⌘)。
5. **session卡swipe左**:→复制ID(触摸)。

## 下轮候选 v37（2026-11-15 · v36 落地后）

v36 已落地：AB段红带+右键即画、pal序号角标。跳过：拖会话进对比(布局冲突)、swipe复制ID(右滑已是pin)。

1. **回放导出GIF说明**:exportReplayHtml已有,补"可录屏"提示。
2. **session卡hover显示首条try**:title里加firstTry摘要。
3. **digest周环比格明细**:wk格title显示两周值。
4. **palette动作图标统一**:动作项图标按类别(cinema/replay/share)。
5. **session卡未看标记**:未选中过的卡加微弱边框。

## 下轮候选 v38（2026-11-15 · v37 落地+伪元素fix后）

v37 已落地：title首try摘要、wk明细、unseen卡标记(::after避开色条)。跳过：回放GIF提示(无GIF能力)、动作图标统一(已分组)。

1. **unseen卡数汇总**:session列表头加"N新"标。
2. **回放AB循环palette项**:AB切换+显示区间。
3. **digest格未看日期**:图鉴格title显示最近新增视图名。
4. **palette视图热区**:pal-thumb hover放大thumb。
5. **session卡multisel拖拽**:multi卡拖到某卡→两卡并列选中(扩展range)。

## 下轮候选 v39（2026-11-15 · v38 落地+thumb fix后）

v38 已落地：unseen计数、dig-dex新增名、thumb放大+pointer-events fix。跳过：回放AB palette(右键已够)、multi拖并列(拖拽语义已乱)。

1. **unseen卡点开即消**:点击卡→unseen标记清(重渲染时)。
2. **回放AB调色**:AB带用amber非红(红=错误混淆)。
3. **digest格图鉴趋**:图鉴格加本周增势箭头。
4. **palette视图首字跳**:输入视图id前缀直达。
5. **session卡多选bar操作**:multi bar加"过滤所选provider"。

## 下轮候选 v40（2026-11-15 · v39 落地后·里程碑轮）

v39 已落地：multiBar provider过滤、AB带amber、图鉴周趋势。跳过：unseen即消(已随selected记)、id前缀直达(搜索已模糊)。

里程碑批——做一条有体量的:
1. **回放帧对比模式**:标记A帧,再标B帧→并排两帧的KPI差表。
2. **session卡quick-peek**:hover卡片边缘浮出tries+quota迷你摘要(不选中)。
3. **digest周图曲线**:digest-bars改成sparkline而非柱状。
4. **palette视图按组**:视图分段加组头分组(非kind混合)。
5. **session卡时间轴**:卡底细线=该会话在24h位置。

## 下轮候选 v41（2026-11-15 · v40 里程碑落地后）

v40 已落地：回放帧对比(AB两帧KPI差表)、digest sparkline。跳过：quick-peek(悬停卡冲突)、视图组头分段(kind分段已足)、session时间轴线(坐标语义弱)。

1. **回放帧对比键盘**:replay中按 C 直接开对比(有AB时)。
2. **session卡首try状态点**:卡上加首个try的ok/fail点。
3. **digest格点击度**:可点格加微底纹。
4. **palette视图进度**:视图项sub加"已看N次"。
5. **回放帧导航**:strip加首/末帧快捷点。

## 下轮候选 v42（2026-11-15 · v41 落地后）

v41 已落地:C键帧对比、strip首末边、首try色点。跳过:digest可点底纹(cursor:pointer已)、视图热度sub(viewMeta.title已带)。

1. **回放帧对比URL**:对比结果可复制为 ?cmp=a,b 链接。
2. **session卡provider首色**:色点chip换 provider 品牌色而非状态色。
3. **digest格sparkline提示**:曲线点 hover title已有->加最末点高亮。
4. **palette视图分kind顺序**:视图>页面>会话>动作排序固定。
5. **回放帧导出对比**:compareReplayFrames加"复制对比"钮。

## 下轮候选 v43（2026-11-15 · v42 落地后）

v42 已落地：对比卡复制钮、sparkline末点。跳过：对比URL(复制钮已导出)、provider首色(状态色更关键)、kind固定排序(search已分组)。

1. **回放帧对比palette**:palette动作组加"最近对比"显示上次AB。
2. **session卡首try provider**:色点chip title已含->加provider名文本。
3. **digest格键盘**:digest卡 Tab 可聚焦各格回车跳。
4. **palette视图未看数**:视图分段头加"N未看"。
5. **回放AB导出**:AB区间帧导出为JSON片段。

## 下轮候选 v44（2026-11-15 · v43 落地后）

v43 已落地:chip provider名、导出AB区间。跳过:palette最近对比(回放卡已显AB)、digest键盘(格少)、视图未看数(密度卡已显)。

1. **回放帧对比跳帧**:对比卡内A/B值点击跳到该帧。
2. **session卡try链**:多try卡hover显示完整provider链。
3. **digest格图鉴详情**:图鉴格点击展开最近5个新增视图列表。
4. **palette视图常用置顶**:viewHeat>3的视图排组首。
5. **回放strip帧号轴**:strip底加3个帧号刻度。

## 下轮候选 v45（2026-11-15 · v44 落地后）

v44 已落地：try链title、帧号刻度、对比卡去A/B。跳过：图鉴格展开(view菜单已列)、常用置顶(heat圆点已标)。

1. **回放strip拖拽**:拖strip直接改A-B区间(非右键mark)。
2. **session卡tries箭头**:卡右缘加细链图(try顺序色点连线)。
3. **digest格周视图**:图鉴格旁加本周新增缩略名。
4. **palette视图最近**:视图项按viewHeat desc重排。
5. **回放AB快速设**:回放中按 A 设当前帧为A,B设B(替代右键)。

## 下轮候选 v46（2026-11-15 · v45 落地+即时重绘fix后）

v45 已落地：A/B键设循环+即时重绘。跳过：strip拖拽改AB(键设已快)、try链右缘图(chip已足)、视图heat重排(search已分组)。

1. **回放键位help**:回放条加 ? 标提示 A/B/C/Home/End。
2. **session卡tries图**:tries链 title 升级为小SVG链(hover popover)。
3. **digest格历史**:digest卡加"昨天同时段对比"小字。
4. **palette项热度**:动作项也加 pal-hot(按点击次数)。
5. **回放AB持久**:replayAB存localStorage跨重开。

## 下轮候选 v47（2026-11-15 · v46 落地后）

v46 已落地：AB持久化+恢复、键位提示条。跳过:tries SVG链(title已链)、昨日同时段(数据无小时)、动作热度(视图已标)。

1. **回放键位条X**:hint旁加退出钮(回放中无显退点)。
2. **session卡tries时序**:try title加ms耗时链。
3. **digest格刷新**:digest卡点击格刷新该格数据。
4. **palette项首字母**:pal-item显示kind首字标(角标已有数字)。
5. **回放AB拖动**:拖rep-ab带两端调区间。

## 下轮候选 v48（2026-11-15 · v47 落地后）

v47 已落地：try链耗时。撤回:rep-exit(replay-x已有)。跳过:AB拖两端(键设+右键已多径)、digest格刷新(整卡一渲染)、kind角标(数字已)。

1. **回放AB shift微调**:Shift+A/B步进端点±1帧。
2. **session卡model首行**:卡title旁加model简名(截断)。
3. **digest格目标**:dig-goal格加达成进度条。
4. **palette分组折叠**:pal-kind头点击折叠该组。
5. **回放帧步幅**:Shift+←→步10帧。

## 下轮候选 v49（2026-11-15 · v48 落地后）

v48 已落地：Shift10帧、Shift微调、分组折叠。跳过：model首行(标题旁已有agent)、目标条(attn-goal-bar已有)。

1. **回放键位提示**:?键位条 hover 直接展开 tooltip 卡。
2. **session卡tokens条**:卡底tokens加相对条(占max比)。
3. **digest格目标态**:dig-goal点击格→切目标档位(attn已做同键)。
4. **palette折叠记忆**:折叠组存localStorage跨开。
5. **回放AB循环播**:循环开时播放只在AB内回绕(现有?)。

## 下轮候选 v50（2026-11-15 · v49 落地后·半百轮）

v49 已落地：折叠持久、tokens相对条。跳过：键位tooltip卡(title已含)、digest格切档(attn已做)、AB循环(已内建)。

半百轮——一条有体量的:
1. **回放diff模式**:回放中按 D → 当前帧 vs 首帧KPI差浮条(一直显示)。
2. **session卡hover浮层**:卡片右缘浮tries+quota(不选中,延迟350ms)。
3. **digest周格点击**:sparkline点点击→滚到该日热度。
4. **palette分组跳转**:Tab键在分组间跳。
5. **回放帧缩略**:strip帧标点击弹出该帧KPI卡。

## 下轮候选 v51（2026-11-15 · v50 落地+exit清diff后）

v50 已落地：D键diff模式+scrub更新+exit清理。跳过:hover浮层(选中卡已展开)、sparkline点击(格滚到已)、Tab组跳(ArrowDown已)、帧缩略(点标已跳)。

1. **回放diff持久**:D模式跨帧显示改为vs A帧(有AB时)。
2. **session卡tokens条色**:tokbar色按agent品牌色。
3. **digest格昨日同时**:卡底加"昨日此时 N tok"。
4. **palette预览回车**:→键预览后回车直接开该视图。
5. **回放AB导出diff**:AB对比卡加"导出diff"。

## 下轮候选 v52（2026-11-15 · v51 落地后）

v51 已落地：diff vs A帧、?键帧KPI。跳过:tokbar品牌色(agent边已有)、昨日同时(数据无)、预览回车(→已展开)。

1. **回放帧KPI浮卡**:?弹出卡定位到strip上方而非中央。
2. **session卡首try tooltip**:首try chip title含why。
3. **digest格图鉴排序**:图鉴格title加最近3新增。
4. **palette项热键**:Ctrl+数字→组内跳(现仅全局)。
5. **回放帧号tooltip**:strip刻度点hover显帧号+KPI。

## 下轮候选 v53（2026-11-15 · v52 落地后）

v52 已落地：帧卡定位回放条上、首try why。跳过：图鉴3新增(1个已)、Ctrl组内跳(数字已够)、刻度hover帧号(title已)。

1. **回放键位help卡**:?键位hint点击→开全键位卡。
2. **session卡模型tooltip**:model chip title含provider+model。
3. **digest格图鉴全名**:图鉴格title列全新增名。
4. **palette预览框**:→键预览帧号+KPtitle。
5. **回放strip帧号hover**:刻度点title显帧号。

## 下轮候选 v54（2026-11-15 · v53 落地后）

v53 已落地：model provider回退、刻度帧号title。跳过：键位卡(?hint已)、图鉴全名(单个已)、预览帧号(→已展开视图)。

1. **回放条时间range**:回放条加 "HH:MM-HH:MM" 帧时间窗。
2. **session卡子代理tooltip**:子代理chip title列名。
3. **digest格目标环比**:dig-goal加今日vs昨日目标达成。
4. **palette折叠计数**:pal-kind头折叠后显"(N)"。
5. **回放strip光标帧号**:rep-now cursor title=当前帧号。

## 下轮候选 v55（2026-11-15 · v54 落地后）

v54 已落地：帧窗span、光标帧号、折叠(N)计数、子代理名。跳过：dig-goal环比(attn delta已)。

1. **回放AB端点标**:strip上A/B帧位加小A/B字标。
2. **session卡pin原因**:pin title含置顶时间。
3. **digest格图鉴热区**:图鉴格旁加本日新视图id标。
4. **palette数字直达**:⌘数字->打开第N个视图(非组内)。
5. **回放strip标记密度**:mark>10时收拢为小点簇。

## 下轮候选 v56（2026-11-15 · v55 落地后）

v55 已落地：A/B字标、mark密集收拢。跳过：pin时间(无戳)、图鉴日id(密度卡已)、⌘视图直达(数字已是)。

1. **回放AB消键**:X键清AB循环(比重设省一步)。
2. **session卡tries色**:try链色点行按state上/下排。
3. **digest格目标数**:dig-goal显N/M目标档位名。
4. **palette空态**:无匹配给"试试 视图名/agent/命令"提示扩。
5. **回放strip帧密度**:帧标过高时hover放大tick。

## 下轮候选 v57（2026-11-15 · v56 落地后）

v56 已落地:X键清AB、空态扩提示。跳过:try色排(chip已)、dig-goal档(attn条已)、帧标放大(title已跳帧)。

1. **回放键位卡**:?键位hint点击→弹键位列表卡。
2. **session卡时间条**:卡底tokbar hover显帧号位置。
3. **digest格图鉴名**:图鉴格title加最近视图id。
4. **palette首字母**:pal-item显示kind色点。
5. **回放strip mark hover**:tick hover放大1.4x。

## 下轮候选 v58（2026-11-15 · v57 落地后）

v57 已落地：kind色点、键位卡。跳过：tokbar帧号(无帧域)、图鉴id(title已)、tick放大(密集已收)。

1. **回放键位卡定位**:keys-card定位回放条上方(同帧卡)。
2. **session卡tries悬停**:try链chip hover高亮。
3. **digest格spike标**:sparkline超均值2倍点加红标。
4. **palette视图热度**:视图项sub加"看过N次"。
5. **回放AB区间加签**:AB带内显"A-B"居中字。

## 下轮候选 v59（2026-11-15 · v58 落地后）

v58 已落地：keys-card定位、spike红标。跳过:try悬停高亮(chip小)、视图热度(hotDot已)、AB带内字(端标已)。

1. **回放AB拖动边**:拖A/B字标调整端点(光标ew-resize)。
2. **session卡行号**:卡左缘加序数(隐式rank)。
3. **digest格spike文**:尖峰日title加"尖峰·超均值2x"。
4. **palette预览锁**:→预览后Esc回列表。
5. **回放strip斑马**:偶数10帧段加微底纹。

## 下轮候选 v60（2026-11-15 · v59 落地后·六十轮）

v59 已落地：strip斑马、spike倍率title。跳过：AB拖边(键设+右键已多径)、卡行号(卡密)、预览Esc(Esc已关palette)。

里程碑批:
1. **回放帧导出GIF化**:回放中按 G → 当前帧序列导出HTML帧集(可录屏)。
2. **session卡hover浮详情**:卡片右上缘浮tries链SVG。
3. **digest格周柱**:sparkline改回柱+线混合(柱高+趋势线)。
4. **palette多选模式**:Space键标记项,回车批量执行动作。
5. **回放AB对比导PNG**:对比卡加"导PNG"用canvas渲染表。

## 下轮候选 v61（2026-11-15 · v60 里程碑落地后）

v60 已落地：digest柱线混合。跳过:G帧集导出(播放器已)、多选批量(Space占输入)、对比PNG(复制文本已)。

1. **回放帧缩略提示**:strip tick hover显帧号+时间。
2. **session卡tries排序**:try链chip按ms降序排列显示。
3. **digest格月链**:digest卡底加"本月累计"。
4. **palette视图次数**:视图sub加"看过N次"。
5. **回放AB循环导出**:AB区间存share-link(非JSON下载)。

## 下轮候选 v62（2026-11-15 · v61 落地后）

v61 已落地：tick时间、本月累计。跳过:try排序(原序关键)、视图N次(heat点已)、AB share-link(JSON已)。

1. **回放strip帧号点**:刻度下加小tick点每10帧。
2. **session卡首try色**:chip provider名按品牌色。
3. **digest格本月bar**:本月累计加微进度条(月中位)。
4. **palette视图热区**:pal-thumb旁加viewHeat数。
5. **回放AB存name**:AB区间可命名存多组。

## 下轮候选 v63（2026-11-15 · v62 落地后）

v62 已落地：10帧tick、本月进度条。跳过:chip品牌色(状态色优先)、heat数(hotDot已)、AB命名(单一区间已)。

1. **回放AB拖拽调**:A/B字标可拖(cursor:ew-resize)。
2. **session卡tps峰**:tps chip title显峰值tps。
3. **digest格季链**:加本季累计。
4. **palette分组数字**:pal-kind头加组内项数。
5. **回放帧戳**:strip刻度hover显该帧时刻。

## 下轮候选 v64（2026-11-15 · v63 落地后）

v63 已落地：AB拖端点、本季累计。跳过:tps峰值(无峰值域)、组内数((N)已)、刻度时刻(title已)。

1. **回放AB重置**:双击AB带→清循环(比X多一条径)。
2. **session卡状态色边**:卡左边宽按状态(ok绿/fail红/streaming脉动)。
3. **digest格年链**:加本年累计。
4. **palette视图热度条**:视图项sub前加heat进度点。
5. **回放帧自动循**:播放到底自动loop=AB(若设)。

## 下轮候选 v65（2026-11-15 · v64 落地后）

v64 已落地：状态边色、双击清AB。跳过：年累计(季已够)、heat点(hotDot已)、auto-loop(手动已)。

1. **回放AB反转**:I键交换A/B端(反向循环)。
2. **session卡multi色**:multi卡加淡青底纹。
3. **digest格波动**:sparkline加环比箭头。
4. **palette视图入口**:视图kind改"视图"+小缩略图标。
5. **回放strip缩放**:滚轮缩strip宽度(帧密度)。

## 下轮候选 v66（2026-11-15 · v65 落地后）

v65 已落地：multi底纹。撤回:I交换(播放只前进,交换无义)。跳过:环比箭头(dTok已)、视图缩略(pal-thumb已)、strip缩放(斑马已密)。

1. **回放AB持续**:diff条显AB区间长度(已有?)。
2. **session卡tps色**:tps chip值>50高亮。
3. **digest格连续**:streak加"最佳连续"对照。
4. **palette视图热区**:视图缩略thumb旁显heat数。
5. **回放AB存储**:AB+marks一起存(现分开)。

## 下轮候选 v67（2026-11-15 · v66 落地后）

v66 已落地:tps阈值50、最佳连续。跳过:AB区间长(title已)、heat数(hotDot已)、AB+marks合并(分开也持久)。

1. **回放键位?项**:?键位提示text加 X/I/Shift。
2. **session卡pin色**:pin星pinned态加amber光晕。
3. **digest格SPARK**:streak加本周活性条(5天格)。
4. **palette项归类**:重跑项kind改"重跑"(独立组)。
5. **回放strip亮度**:mark tick高亮hover态。

## 下轮候选 v68（2026-11-15 · v67 落地后）

v67 已落地：键位提示、pin光晕。跳过:5天活性格(sparkline已)、重跑kind(已是)、tick hover(title已)。

1. **回放键位卡I**:keys-card加 X/Shift 键。
2. **session卡pin title**:pin title含时间。
3. **digest格streak条**:streak加5格周活性块。
4. **palette热区icon**:视图kind点换缩略图标。
5. **回放strip帧标**:tick hover放大1.3x。

## 下轮候选 v69（2026-11-15 · v68 落地后）

v68 已落地：14键卡、5格活性。跳过：pin时间(无戳)、缩略icon(dot已)、tick放大(密集已)。

1. **回放AB存组**:AB区间命名存localStorage(多组下拉)。
2. **session卡tps图**:tps chip旁加3点迷你sparkline。
3. **digest格达标**:今日达标状态徽章。
4. **palette视图ID**:视图项sub加id。
5. **回放帧快照**:?帧卡加"存快照到digest"钮。

## 下轮候选 v70（2026-11-15 · v69 落地后·七十轮）

v69 已落地：帧快照存/查、视图id title。跳过:AB命名组(单区间已)、tps sparkline(卡密)、达标徽章(dTok已)。

里程碑批——回放工具链闭环已全,转向体验层:
1. **回放帧导出缩略**:帧快照项行加存PNG缩略。
2. **session卡浮层**:hover卡->浮完整tries链(不选中)。
3. **digest格周对比**:digest卡加"本周vs上周"双柱。
4. **palette搜索热**:无匹配时给"常搜"建议。
5. **回放帧链**:帧快照卡行间加时间差列。

## 下轮候选 v71（2026-11-15 · v70 落地后）

v70 已落地：快照时间差。跳过:PNG缩略(canvas开销)、浮层tries(chip链已)、周双柱(sparkline已)、常搜(空态已)。

1. **回放快照清空**:snaps卡加"清空"钮。
2. **session卡tokens阈值**:tokbar>80%加粗。
3. **digest格图鉴渐**:图鉴格加今日数角标。
4. **palette组计数**:pal-kind非折叠也显(N)。
5. **回放帧标记色**:mark tick按帧时染色(早冷晚热)。
