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

