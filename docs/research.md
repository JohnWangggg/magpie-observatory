# Magpie 监看面板 · 调研与设计稿

[English](research.en.md) · **简体中文**

> 调研对象：`bowenliang123/dsh-context`、`smallcat2333/magpie-hud`、Magpie 官方
> Gateway / Routing / Usage / Quotas 界面，以及 12 个相邻项目。
>
> 结论先说：**不要做第二个 Magpie 管理后台，做一个“控制室”**。Magpie 已经负责
> 配置、供应商、账号和路由规则；监看面板只回答三个问题：
>
> 1. **现在谁在跑？**（请求、会话、子 Agent、实时路由）
> 2. **钱和 Token 花在哪？**（模型、服务商、账号、时间）
> 3. **额度还能撑多久？**（窗口、重置倒计时、改道与冷却）
>
> 本仓库的 `public/index.html` 是可运行的视觉原型；本文是它的依据、数据契约和落地路线。
> 文中的截图与账号均为演示数据（`demo-…@example.com`）。

---

## 0. 三个参考项目，各自解决什么

| 项目 | 形态 | 最值得借鉴的部分 | 不适合直接照搬的部分 |
| --- | --- | --- | --- |
| `dsh-context` | DeepSeek Harness 插件（TypeScript / React） | 信息架构、KPI 条、7 天双柱图、8 周热力图、组成环图、会话卡片、空状态与下钻 | 它绑定 DSH 的 session projection / host 插件模型，不能直接用于 Magpie |
| `magpie-hud` | Tauri 2 + Rust + 原生 WebView 的桌面浮窗 | 真实数据源接入、实时路由的叙事方式、额度侧栏、横竖自适应、性能隔离、离线回退 | 它是“悬浮窗”而不是“全屏面板”；布局和交互需要放大 |
| Magpie 官方 UI | Go + 原生 Web UI（无框架） | 路由舞台（Agent → magpie → 账号）、实时/历史切换、Usage 页的完整指标、品牌图标体系、主题与色盲配色 | 它是管理界面，信息密度高；监看面板应更聚焦、更可扫读 |

---

## 1. `dsh-context`：把“上下文”讲成一个可下钻的故事

### 1.1 它做了什么

`dsh-context` 是 DeepSeek Harness 的上下文洞察插件，提供五个入口：

- **Context Insights 页面**：跨会话总览，一级侧边栏面板。
- **Context 标签页**：单个会话的统计、组成、趋势、事件、消息、命令执行。
- **Fleet 标签页**：当前 Agent、父级、子 Agent 的实时网络。
- **Context 侧边栏面板**：聊天旁打开同一套仪表板。
- **`/context` 命令**：聊天中的居中弹窗。

它的核心不是“画图”，而是把上下文拆成可解释的层次：
系统提示词、工具定义、用户消息、注入上下文、技能注入、工具调用、推理、回答；
并按请求、轮次、步骤、会话、Agent 家族逐级聚合。

### 1.2 值得借鉴的页面结构

| 区块 | 作用 | 对 Magpie 的映射 |
| --- | --- | --- |
| KPI 栏 | Token、成本、缓存命中率、轮次 | 请求、Token、费用、缓存命中、TPS、活跃会话 |
| 7 天双柱图 | 每天 Token + 成本成对展示 | 24h / 7d / 30d 的 Token + 费用组合图 |
| 活动热力图 | 最近 8 周每天的 Token；点击筛选当天 | 12 周请求/Token 热力图；点击筛选日期 |
| 组成环图 | 计费 Token 花在哪几类 | 模型 / 服务商 / Agent 的占比环图 |
| 会话卡片 | 组成环、Token、轮次、成本、工作区；可排序/搜索/分组 | 会话卡片：模型、路由组、Token、TPS、改道次数 |
| 空状态 / 骨架屏 | 首次加载、无数据、读取中 | 网关离线、额度不可用、历史未加载 |

### 1.3 工程上值得学的点

- **宿主侧聚合，客户端只渲染**：`src/host/` 里做 fold、aggregate、cache、pricing、
  attribution；`src/client/` 只拿投影后的数据。监看面板也应把聚合放在服务端/代理层，
  浏览器不做重计算。
- **官方计量投影优先**：上下文占用和组成读取官方 `contextPressure` /
  `contextBreakdown`，保证与聊天输入框的环图一致。对应到 Magpie：优先用
  `/v1/magpie/quotas`、`/v1/magpie/usage` 的官方口径，不要自己用日志拼费用。
- **每个数字都能解释**：悬停提示写清公式、分母、排除项（例如内部 routing 调用）。
- **空状态是产品的一部分**：不是只画一个 `—`，而是说明“为什么没有”和“怎么才有”。
- **组件粒度**：`overviewUsage.tsx`、`overviewPanel.tsx`、`donut.tsx`、
  `stackedBar.tsx`、`trendChart.tsx`、`pulseTimeline.tsx` 都是独立可复用件。

### 1.4 设计语言

- 深色底、低饱和卡片、单一强调色；数字用 tabular numerals。
- 图表以“面积 + 细线”为主，避免粗柱和高饱和色块。
- 卡片标题小、eyebrow 大写、说明文字弱化；信息层级靠字重和留白，而不是靠边框。
- 交互以“点击下钻”为主：KPI → 过滤后的会话；热力图某天 → 当天会话；模型 → 请求。

---

## 2. `magpie-hud`：真实 Magpie 数据的“实时叙事”

### 2.1 它是什么

Tauri 2 桌面浮窗，读取：

- 完成用量：`~/.config/magpie/usage.jsonl`
- 进行中状态：网关 `/v1/magpie/trace`、`/v1/magpie/concurrency`
- 额度：`/v1/magpie/quotas?kept=1`
- 费用：`/v1/magpie/usage?period=today`

它不修改 Magpie、不读模型调用密钥；远端模式通过独立的 HUD Server + 查看密钥。

### 2.2 数据刷新节奏（很有参考价值）

| 数据 | 频率 | 说明 |
| --- | --- | --- |
| `usage.jsonl` | 文件监听 + 1s 轮询兜底；完成记录 ≤500ms 刷新 | 请求结束后写入 |
| `/v1/magpie/trace` | 长轮询，`after=<seq>&wait=<s>` | 增量路由快照；`ids` 是保留集合 |
| `/v1/magpie/concurrency` | 1s | 当前在飞请求、排队、工具调用 |
| `/v1/magpie/quotas?kept=1` | 启动立即 + 每 60s；完成后 2s 内补刷 | 不等待供应商读取 |
| `/v1/magpie/usage?period=today` | 5s | 官方 USD 估值与小时序列 |

### 2.3 路由可视化的关键决策

- **一条会话只显示一张主卡**：多条主请求同时活跃时，显示路由 ID 最新的一条；
  全部结束后显示后端标记的当前完成记录；子 Agent 挂在主卡下方。
- **路由路径按已确认的组链展示**：宽度不足时从前面逐级折叠，保留
  `… → 最后一级组 → 模型`；悬停看完整路径。
- **连线状态有语义**：
  - 蓝青色流动线 = 活跃请求。
  - 15 秒没有首字依据 → 黄色（仅表示“首字未确认”，不是失败）。
  - 已确认经过的连线先亮至少 1 秒光点，再转绿色实线。
  - 未确认部分保持浅灰。
- **耗时在连线上方**：<1s 绿、1–2s 黄、≥2s 红。
- **改道/重试**：`tries>1` 或失败后成功显示“完成”，保留重试与恢复说明。
- **状态与强度固定列宽**：横窗 48px / 60px，避免数字跳动导致布局抖动。

### 2.4 额度侧栏

- 每个账号只显示**最短的一个窗口**（同时有 5h 和周时只显示 5h）。
- 自动分流时，外层分组供应商不参与额度匹配；实际选中的供应商和完整账号才显示。
- 保留上次读数，不为“正在选择账号”画空进度条。
- 5h / 周等窗口没有模型限定时属于账号共享额度。

### 2.5 视觉与性能

- 主背景 50% 不透明度 + Windows Acrylic / macOS HUD 磨砂；文字保持清晰。
- 横窗来源 ≤2 个时与 Magpie 纵向排列；竖窗并排；≤420px 高度收为 28px 单行。
- **性能经验（1.0.33）**：把 SVG 连线隔离到独立绘制层，流动虚线每秒 30 步亚像素更新；
  WebView CPU 中位数 152.325% → 87.00%（-42.89%，Windows Release，10 卡/6 活跃请求）。
- 图标本地打包，运行时不联网；来自 LobeHub Icons，保留 MIT 许可。

### 2.6 可直接借鉴的交互

1. 路由主卡 + 子 Agent 缩进行。
2. 额度卡显示“账号 + 重置倒计时 + 最短窗口”。
3. 失败/改道用真实 HTTP 状态，不用笼统“出错”。
4. 窄窗时优先保留状态、强度和 TPS，名称和模型可省略。
5. 顶部“Agent 筛选 + 会话选择 + 账号打码 + 置顶 + 连接设置”的工具条。

---

## 3. Magpie 官方界面：真正的数据契约

### 3.1 页面地图

官方 App 的导航分组是 **Work / Models / Insights / Extend**，与监看相关的是：

- **Gateway**：网关地址、最近调用、脱敏、浏览器访问、远端 magpie。
- **Routing**：实时路由舞台 + 历史 + 路由组 + 规则 + 账号与密钥。
- **Usage**：Overview / Requests / Sessions / Quotas（以及 Context 卡）。
- **Sessions**：会话列表、会话详情、工具调用、文件活动。
- **Providers / Agents**：供应商、账号、模型、Agent 绑定。

### 3.2 Routing 页

**实时舞台**（`internal/gui/assets/plugins/routing/routing.css`）：

- 三列：Agent 来源 → magpie 中枢 → 账号/密钥列表。
- 连线用 `stroke-dasharray` + `stroke-dashoffset` 动画；流动层单独一个 SVG，
  避免每帧重绘静止连线。
- 请求和回答用“喜鹊”形状的 packet 沿路径飞；请求实心、回答描边、失败红描边。
- 账号行显示：provider 图标、账号、plan、模型、状态、额度条、失败标签。
- 页面文案强调“live, as the gateway decides”“Every request an agent sends to
  magpie shows up here, routed for real.”
- 支持 **Back to live**、按会话查看、按请求查看历史；历史保留 30 天，
  超过 200MB 的旧日期会清理。

**路由解释**：

- `asked`（Agent 点名的模型）
- `group` / `rule`（命中的规则与判定模型选择）
- `model` / `effort`（当前尝试的成员与推理强度）
- `tries[]`（每次尝试；失败的 `fail` 是 fallback）
- `done` / `status` / `served`（结束后）

对应 API：

```
GET /v1/magpie/route?session=<id>
GET /v1/magpie/route?session=<id>&after=<seq>&wait=<seconds>
GET /v1/magpie/trace?after=<seq>
GET /v1/magpie/concurrency
```

### 3.3 Usage 页

官方 Usage 页的指标非常完整，值得作为“数据字典”：

- **KPI / Totals**：calls、errors、retried、canceled、input、output、cache_read、
  cache_write、reasoning、cost、unpriced、credits、timed、ttft_ms、decode_ms、
  decode_out 等。
- **Series**：按 hour/day/week 分桶，`by` 里可以按 provider / agent / model 堆叠。
- **Breakdown**：agents、models、accounts、providerKeys、callerKeys、sessions。
- **Requests**：逐请求表，支持 period、day、agent、provider、model、account、
  callerKey、purpose、failed、retried、q、via、computer 过滤；`limit` 最大 500。
- **增量账本**：`?cursor=start&limit=500` → `rows`、`deleted`、`next_cursor`、
  `has_more`；按 `id` upsert，`seq` 更高则替换。
- **Heatmap**：GUI 的 `/api/usage/heatmap`，返回 `{from,to,days:[{date,calls,tokens,cost}]}`，
  官方是 53 周。
- **Quotas**：`/v1/magpie/quotas`、`?kept=1`、`/quotas/history`、`/quotas/cards`、
  `POST /quotas/refresh`、`POST /quotas/codex-reset`。
  每个窗口有 `used`、`remaining`、`resetsAt`、`holds`（整窗估算）、`holdsWhy`。

### 3.4 官方视觉体系

从 `internal/gui/assets/app.css` 提取的设计 token：

| Token | Light | Dark |
| --- | --- | --- |
| 背景 | `#f4f4f6` | `#1a1a1e` |
| 卡片 | `#ffffff` | `#232327` |
| 卡片次级 | `#f9f9fb` | `#1f1f23` |
| 边框 | `#e3e3e8` | `#333339` |
| 主文字 | `#1c1c21` | `#ededf1` |
| 次文字 | `#4b4b53` | `#b9b9c1` |
| 弱文字 | `#85858d` | `#8b8b94` |
| 强调色 | `#4f46e5` | `#a5b4fc` |
| 成功 / 警告 / 错误 | `#189a58` / `#b45309` / `#d64545` | `#6fd99b` / `#f2b544` / `#f28b82` |

- 图表色板使用 **Okabe–Ito** 定性色（色盲友好），并提供 `data-colorblind="1"` 切换。
- 失败状态不仅用红色，还用 `x` 形状标记，保证灰度/色盲可读。
- 212 个品牌 SVG 图标本地打包，按 provider / agent / model 映射；未知来源用通用图标。
- 不使用框架：`app.js` 一个状态对象 + 局部视图文件，靠 `//go:embed` 发布。
- 动效只在有意义的地方：实时路由、刷新转圈、按压反馈、主题切换。

### 3.5 官方 API 对监看面板的意义

| 需求 | 官方接口 | 备注 |
| --- | --- | --- |
| 实时路由 | `/v1/magpie/trace` | 长轮询增量；`ids` 用于淘汰 |
| 单会话路由 | `/v1/magpie/route?session=` | 状态栏/单会话面板 |
| 并发 | `/v1/magpie/concurrency` | active[] + lanes + waiting |
| 额度 | `/v1/magpie/quotas?kept=1` | 不等待供应商 |
| 用量汇总 | `/v1/magpie/usage?period=` | 官方 USD 估值 |
| 请求明细 | `/v1/magpie/usage/requests` | 过滤 + cursor |
| 热力图 | `/api/usage/heatmap` | 仅 GUI / `magpie web` |
| 成本序列 | `/v1/magpie/usage` 的 `series` | 已含内部 routing |
| 网关密钥限额 | `/v1/magpie/limit` | 共享网关时用 |

---

## 4. 还能参考哪些项目

> 下面这些不是“照抄对象”，而是各自解决一个子问题。做 Magpie 面板时，
> 建议每个子问题选一个参考，不要把所有交互都塞进一屏。

### 4.1 Agent 用量与状态线

| 项目 | 链接 | 可借鉴 |
| --- | --- | --- |
| `jarrodwatts/claude-hud` | https://github.com/jarrodwatts/claude-hud | 状态线 HUD：上下文占用、活跃工具、运行中的 Agent、todo 进度；把“Agent 正在做什么”压缩成一行 |
| `tt-a1i/tokenmeter` | https://github.com/tt-a1i/tokenmeter | Go 本地 Dashboard；15 个本地数据源；Live event stream（Unix socket → SSE）；预算告警、预测、热力图、工具错误分析 |
| `ryoppippi/ccusage` | https://github.com/ryoppippi/ccusage | 5 小时 block 视角、日/月/会话报表；适合做“计费窗口”而不是“实时面板” |
| `Nihondo/AgentLimits` | https://github.com/Nihondo/AgentLimits | macOS Widget：额度环、Token/费用/热力图；适合做菜单栏/小组件形态 |
| `philipecomputacao/claude-llm-quota-bar` | https://github.com/philipecomputacao/claude-llm-quota-bar | 多 provider 额度适配、burn rate（🧊/⚡/🔥）、上下文百分比；适合做状态线扩展 |

### 4.2 网关与费用管理

| 项目 | 链接 | 可借鉴 |
| --- | --- | --- |
| `BerriAI/litellm` | https://github.com/BerriAI/litellm | Spend Logs / Analytics UI、虚拟 Key、预算、模型/Key 维度拆分、Prometheus + Grafana |
| `Calcium-Ion/new-api` | https://github.com/Calcium-Ion/new-api | 多渠道/多模型管理、额度与倍率、日志与仪表盘；中文管理后台的信息密度参考 |
| `musistudio/claude-code-router` | https://github.com/musistudio/claude-code-router | 请求路由到不同 provider/model 的配置与状态线；适合理解“路由规则”的产品化 |
| `magpie-community/plugins` | https://github.com/magpie-community/plugins | Magpie 插件生态；未来把监看做成插件而不是外挂 |

### 4.3 可观测性与 Trace

| 项目 | 链接 | 可借鉴 |
| --- | --- | --- |
| `Helicone` | https://github.com/Helicone/helicone | 请求瀑布、成本/延迟、缓存命中、会话回放；把一次请求讲成时间线 |
| `Langfuse` | https://github.com/langfuse/langfuse | Trace / Session / Generation 层级、成本、评分与数据集 |
| `Arize Phoenix` | https://github.com/Arize-ai/phoenix | OpenTelemetry 原生 trace、LLM/Agent 评估；适合后期接 OTel |
| `Grafana` + OTel GenAI | https://github.com/BerriAI/litellm/pull/35159 | 指标落地：`gen_ai.request.model`、token usage、latency histogram；长期存储与告警 |
| OpenRouter Activity | https://openrouter.ai/activity | 按模型/供应商/时间的消费视图；聚合器的账单体感 |

### 4.4 图标与视觉资产

| 项目 | 链接 | 可借鉴 |
| --- | --- | --- |
| `lobehub/lobe-icons` | https://github.com/lobehub/lobe-icons | `magpie-hud` 使用的静态品牌图标；MIT；按 provider/agent 映射，保留原色 |
| `simple-icons` | https://github.com/simple-icons/simple-icons | 更全的品牌单色图标；适合作为 fallback |
| Radix / shadcn 风格 | — | 不是要引入依赖，而是借鉴“低对比边框 + 单一强调色 + 小字号 eyebrow”的克制 |

> 结论：**图标不要在线拉 CDN**。把 20–40 个常用 provider/agent SVG 本地打包，
> 未知来源回退到 Magpie 标志或首字母块；这样离线、无闪烁、可控尺寸和颜色。

---

## 5. 产品定义：Magpie Observatory

### 5.1 一句话

> 一块屏，看到所有 Agent 的请求正在经过 Magpie 的哪条路、花掉多少钱、
> 以及下一个账号额度什么时候恢复。

### 5.2 一屏信息架构

```
┌──────────────────────────────────────────────────────────────────────┐
│ rail │ topbar: 实时状态 · 数据源 · 今天/7天/30天 · 暂停 · 主题        │
│      ├──────────────────────────────────────┬───────────────────────┤
│      │ 实时路由舞台                          │ 实时会话               │
│      │ Agent → magpie → Provider/Account     │ 活跃 / 最近            │
│      │ 决策条：组 · 规则 · 分类 · tries       │ 主卡 + 子 Agent        │
│      ├──────────────────────────────────────┴───────────────────────┤
│      │ KPI × 6：请求 · Token · 费用 · 缓存 · TPS · 活跃              │
│      ├──────────────────────┬───────────────┬───────────────────────┤
│      │ 24h / 7d / 30d 趋势   │ 账号额度       │ 模型占比               │
│      ├──────────────────────┴───────────────┴───────────────────────┤
│      │ 活跃热力（12 周）                    │ 最近请求表              │
│      └──────────────────────────────────────┴───────────────────────┘
│ statusbar: 网关 · usage.jsonl · 事件数 · 刷新节奏 · 时钟              │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.3 视觉方向

**关键词：控制室、低噪、真实品牌色、只有路由在动。**

- 背景：近黑蓝 `#07080c` + 两处极淡的紫/青径向光，不铺满。
- 卡片：`#0e1118`，1px `#1d2431` 边框，16px 圆角，轻微顶部高光。
- 强调：紫 `#8b7cf6`；实时/成功用青绿；改道用琥珀；错误用珊瑚红。
- 字体：Inter / SF Pro + PingFang SC；数字 tabular；模型名用 mono。
- 字号：标题 14–16，正文 10–11，辅助 8.5–9.5；不靠大字号制造层级。
- 图标：16/20/26px 三档；provider 原色，agent 原色，UI 图标单色描边。
- 圆环：额度用 conic-gradient；模型占比用 SVG donut；不用 3D、不用阴影堆叠。

### 5.4 组件清单

| 组件 | 数据 | 交互 |
| --- | --- | --- |
| `AgentNode` | agent、活跃数、组、Token 负载 | 点击筛选该 Agent |
| `HubNode` | 活跃会话、并发、路由模式 | 点击回总览 |
| `ProviderNode` | provider、当前模型、账号 chip、额度、状态 | 点击筛选该 Provider |
| `RouteWire` | agent→hub、hub→provider | 流动虚线 + 双向喜鹊；失败/改道变色 |
| `DecisionStrip` | group、rule、intent、confidence、tries | 悬停看完整叙事 |
| `SessionCard` | 标题、Agent、模型、组、状态、Token、TPS、改道 | 点击锁定该会话的路由 |
| `QuotaRing` | provider、账号、窗口 used、resetsAt | 悬停看窗口详情 |
| `TrendChart` | series（tokens/cost） | 切换指标；十字线 tooltip |
| `ModelDonut` | model tokens | 悬停高亮；点击过滤请求表 |
| `Heatmap` | date/tokens/calls | 悬停日期；点击过滤 |
| `RequestTable` | time、agent、session、model、status、tokens、ttft、tps、cost | 搜索、导出 CSV |

### 5.5 双向喜鹊动效（v2 实现）

第一版用官方 Routing 页的 `FLIER` 路径 + SMIL `animateMotion`，效果不理想：

- 在 20–30px 时轮廓偏细，像小鱼/箭头；
- WebKit 对 `mpath` + `keyPoints="1;0"` 的支持不稳定，回程鸟会堆在 SVG 原点；
- `begin` 未到时间的鸟也会先画在 `(0,0)`，形成“幽灵鸟”。

v2 改成：

- **用 Magpie 品牌剪影**（`assets/icons/magpie.svg`）作为飞鸟，30px/25px 两档，
  白色腹部在深浅主题都清晰。
- **每个活跃会话一对**：实心鸟带消息点飞向 provider；镜像的描边鸟带回回答。
  只取前 3 个活跃会话（6 只），避免中枢被鸟群淹没。
- **自己算路径**：用 `requestAnimationFrame` + `path.getPointAtLength()`，
  30fps 设置 `transform="translate(x y)"`；不依赖 SMIL，也没有起点的幽灵鸟。
- **回程用单独的反向 path**，而不是 `keyPoints`；兼容性最好。
- 路径从 Agent 右缘穿过 hub 上方/下方约 30px，再到 Provider 左缘；
  鸟不会压住 “magpie” 字标。
- `prefers-reduced-motion` 时固定在路径 50% 处，不播放。
- 性能：6 只鸟 × 30fps 的 `getPointAtLength` + `transform`，只重绘不重排；
  路由 DOM 只在 Agent/Provider/状态变化时重建（token 计数不触发重建）。

### 5.6 自适应：一屏 vs 滚动

“占满屏幕”和“不裁切”在 1366×768 / 1280×800 上是冲突的。取舍：

| 条件 | 行为 |
| --- | --- |
| ≥ 901px 高 | 固定四行 grid：`1.45fr / auto / .72fr / .72fr`；`body` 不滚动；卡片内部滚动 |
| ≤ 900px 高 | 放弃硬塞，`body` 可滚动；卡片恢复自然高度，保留全部账号/请求 |
| ≥ 1700px 宽 | 53 周热力图；额度三列 |
| 1401–1700px | 53 周热力图（格子变窄）；额度三列 |
| 981–1400px | 53 周热力图（继续压缩）；额度两列；图表/额度各 6 列 |
| ≤ 980px 宽 | 路由与会话上下叠；隐藏连线与飞鸟；热力图/表格全宽 |
| ≤ 680px 宽 | 单列；KPI 两列；额度单列；53 周热力图压缩到可读下限 |

热力图当前始终画满 53 周（371 天），靠 `minmax(0, 1fr)` 压缩格子；如果以后
需要更大的手机格子，再按断点只取最后 26/13 周。其他固定高度区域
（`hero`、`live-panel`、`quota-list`、`table-scroll`）都有
`min-height: 0` + 内部滚动，避免把行高撑破；图表高度按容器 `clientHeight`
重算。短屏优先保证可读性，而不是强行一屏。

### 5.7 额度卡的可读性（v3）

第一版 2 列 × 3 行 + 环形图 + 双进度条 + 百分比 + 倒计时，信息过载；
第二版改成 2 列 40px 行，仍然偏挤。v3：

- **宽屏 3 列、≤1400px 2 列、手机 1 列**；每张卡 66px，留出呼吸。
- 每张卡：34/38px 环形仪表（内含 provider 图标）、账号名 + plan、
  **一条**最短窗口进度条、邮箱 + 窗口/重置、右侧大号百分比。
- 其余窗口不画第二根条，放在 `title` 里；避免同一张卡出现 3 个数字。
- 百分比颜色：<70 品牌色、70–88 琥珀、≥88 红；余额不伪造百分比。
- 1920×1080 下 6 个账号 3×2 一屏可见；1500 宽仍 3×2；
  1280×800 下 2×3，页面可滚动；手机 1 列。

### 5.8 Cromma Game View 与更多呈现形式

[CrommaCode](https://cromma.ai/code) 把 Agent 的每次 tool call 变成“可看的一拍”：

- **Westworld**：一个巨大的仪表盘，指针转向当前工具，并在 Agent 工作的地方喷出轨迹。
- **Loom**：每次调用织成一行，整场会话是一块挂毯。
- **Factory**：调用像包裹一样在传送带上经过工位。
- **Chips**：每次调用是一张牌，chips × multiplier 计分。
- **Rhythm**：调用是落在轨道上的音符，判定 PERFECT / GREAT / GOOD。
- **Bees**：并行子 Agent 像蜂群，各自有自己的 worktree 和分支。

它真正值得学的不是“游戏皮”，而是四条原则：

1. **一次调用只出现一次**：所有视图共享同一份事件流，不在多个地方重复计数。
2. **每个视觉元素都对应真实数据**：指针角度 = 当前 provider，织机行 = 一次请求，
   音符 = 一次调用；不是为了动而动。
3. **历史是材料**：文件树、Git 图、织机都是把历史重新编排，而不是只显示“最新一条”。
4. **好玩但不妨碍读**：默认仍是终端/列表，Game View 是可切换的第二层。

可借鉴的其他呈现形式：

| 形式 | 适合表达 | 在 Magpie 里的映射 |
| --- | --- | --- |
| Sankey / 地铁图 | 请求从 Agent 到 Provider 的流向 | 路由舞台、组链、改道 |
| 雷达 / 星座 | 当前 provider、额度、活跃会话 | **已实现：路由雷达** |
| 织机 / 挂毯 | 一段时间内的请求密度与颜色 | **已实现：请求织机** |
| 示波器 / 音轨 | TPS、TTFT、延迟节拍 | Rhythm：provider 轨道 + 音符 |
| 火焰图 | 时间花在模型、工具、排队、首字 | 请求详情的时间条 |
| 工厂传送带 | 排队 → 路由 → 流式 → 完成 | Factory：请求包裹 |
| 卡牌 / 计分 | 缓存命中、改道、TPS 组合 | Chips：combo × multiplier |
| 蜂群 / 轨道 | 子 Agent、并行会话 | Bees：每个子 Agent 一只蜂 |

本次原型实现二十一种视图，共用同一份数据（更多候选形式见
[`visual-forms.md`](visual-forms.md)）：

- **路由**：Agent → magpie → Provider 的双向喜鹊。
- **雷达**：中心 magpie，provider 在环上，外圈额度；左右是 in-flight 与 quota 面板。
- **织机**：最近 16 次请求织成彩色横带，颜色 = provider，亮度 = token 密度，
  右侧是模型/Token/状态，顶部是 cache 命中。
- **节奏**：每个 provider 一条轨道，请求是落在 16 个节拍格上的音符；
  播放头循环扫过，底部显示 combo / cache，失败音符变红。
- **年轮**：最近 26 周铺成极坐标日历；7 个同心圆是周一到周日，一列是一周；
  点大小 = Token，颜色 = 活跃级别，今天有绿色描边。
- **额度**：账号 × 窗口的燃尽线 + 重置点外推；绿/琥珀/红三档风险，
  侧栏列出每窗口的燃速与重置时预计剩余。
- **瀑布**：每个会话一行甘特；浅色首字段 + 深色流式段，失败斜纹，
  点击会话聚焦。
- **蜂群**：每个 provider 一条 TTFT 轨道，P50/P90 线，点大小 = Token；
  缺少首字样本的请求标为估计值。
- **成本**：provider → 模型的面积树图，面积 = Token；点击 provider 下钻。
- **流向**：agent → provider → 模型三列 alluvial，带宽 = Token，
  悬停高亮整条链路。
- **漏斗**：发出 → 未取消 → 首字 → 成功，标出每级流失量、成功率和改道数。
- **热力**：时间 × 延迟区间热力图，页面打开期间累积快照，侧栏给 P50/P90
  与最热区间。
- **星图**：Provider 作为行星分布在椭圆轨道，行星大小 = 活跃会话，
  外圈弧 = 额度使用，卫星 = 活跃会话。
- **预算**：每个账号窗口一条 bullet；70/88 阈值、历史配速三角、预计期末值。
- **结构**：Marimekko，列宽 = Provider 占比，带高 = 模型占比；点击展开。
- **和弦**：Agent 左弧、Provider 右弧的 chord 图，彩带面积 = Token。
- **网络**：Agent → Provider → 模型的力导向关系图，节点大小 = Token。
- **河流**：Provider Token 增量的 streamgraph / horizon 双模式。
- **连击**：游戏化卡牌视图，combo、倍率与分数来自真实账本。
- **工厂**：会话作为包裹经过排队 → 流式 → 完成，错误进返工道。
- **蜂巢**：Provider 是蜂巢、会话是蜜蜂，子 Agent 是更小的蜜蜂。

后续可以继续做 **Factory**（排队/流式包裹）和 **Chips**（combo × multiplier），
但不应同时堆在一屏；用模式切换保留“默认路由视图”的可读性。

### 5.9 风格系统：明暗 × 风格

“明暗”和“风格”是两个独立维度：

- `data-theme="light|dark"`：昼夜模式。
- `data-style="control|pixel|paper|neon"`：艺术方向。

四套风格共用同一 DOM、同一布局和同一份数据，只改 CSS token 与少量纹理：

| 风格 | 语言 | 明暗 |
| --- | --- | --- |
| Control | 玻璃卡片、紫/青、细边框、柔和阴影 | 两版 |
| Pixel | 硬边框、4px 硬阴影、等宽字、扫描线、Game Boy 绿 | 两版 |
| Paper | 米白、衬线、棕色强调、纸张纹理、报告感 | 两版 |
| Neon | 黑底、品红/青色辉光、雷达优先 | 两版 |

实现要点：

- 风格变量挂在 `:root[data-style=...]`，明暗变体用 `[data-style][data-theme]` 覆盖；
  不复制页面、不复制组件。
- Pixel 用 `body::before` 叠加扫描线，卡片用 `box-shadow: 4px 4px 0`，
  所有圆角归零；鸟、图表、热力图保持同一数据但换成像素语言。
- Paper 用衬线字体与纸张渐变，图表加 `sepia` 滤镜，热力图换成棕阶。
- Neon 用高饱和强调色与 glow，适合夜间大屏和雷达视图。
- 风格选择写入 `localStorage`，与明暗模式分开记忆。

风格切换只调用一次 `renderAll()`，之后由 CSS 变量接管；不会重建数据或丢会话。

设置面板把“空间”也做成可选项：

- **布局**：`auto`（大屏一屏/小屏滚动）、`fit`（≥1200×900 强制一屏，内部滚动）、
  `comfort`（始终自然高度）。
- **密度**：`compact` / `cozy` / `spacious`，改间距、内边距和额度/会话行高。
- **动效**：`full` / `soft` / `off`；`off` 时鸟固定在路径中点，雷达扫描、
  织机梭子、节奏播放头停止。
- 这三个维度与明暗、风格正交；`data-layout`、`data-density`、`data-motion`
  分别挂在 `<html>` 上，CSS 只做覆盖，不改数据。

“一屏”不是无条件缩放：小屏强行塞会牺牲可读性，所以在 <1200×900 时自动回退到
滚动，并提示当前尺寸。这样“内容更多的监控墙”和“舒服阅读”可以并存。

---

## 6. 数据契约：把 Magpie 的字段翻译成 UI 字段

### 6.1 快照聚合

浏览器不直接访问 Magpie（避免 CORS、避免把 key 放进页面）。由插件服务 `server.mjs` 聚合并缓存：

```json
{
  "ok": true,
  "gateway": "127.0.0.1:3425",
  "fetchedAt": 1763021234567,
  "period": "today",
  "data": {
    "trace": { "seq": 123, "ids": [], "routes": [] },
    "quotas": { "data": [] },
    "usage": { "totals": {}, "series": [], "models": [] },
    "concurrency": { "active": [] },
    "requests": { "rows": [] },
    "heatmap": { "days": [] }
  },
  "errors": {}
}
```

### 6.2 字段映射

| UI 字段 | 来源 | 备注 |
| --- | --- | --- |
| `sessions[].id` | `trace.routes[].session` | 没有 session 时用 `id` |
| `sessions[].agent` | `routes[].agent` | 映射到 `AGENTS` |
| `sessions[].title` | 本地 session title / `folder` | 官方 trace 的 `folder` 只有最后两级 |
| `sessions[].group` | `routes[].group.ref/id/name` | 精确匹配，不按名字猜 |
| `sessions[].rule` | `routes[].rule.n/use/pick` | `n=0` 表示未命中 |
| `sessions[].intent` | `rule.classified.intent` | `fallback=previous` 要标注“沿用” |
| `sessions[].tries[]` | `routes[].tries[]` | `done/status/firstText/served` |
| `sessions[].provider` | 最后一个成功 try 的 provider | 不是第一个失败的 |
| `sessions[].model` | 最后一个成功 try 的 model / `served` | “实际服务模型” |
| `sessions[].status` | `done` + `status` + `concurrency.active` | 200–299 成功；499 取消；其他失败 |
| `kpis.tokens` | `usage.totals.input+output+cache_read` | 与官方 Usage 口径一致 |
| `kpis.cache` | `cache_read / (input + cache_read)` | 官方 `cache_unknown` 要排除 |
| `kpis.tps` | `decode_out / (decode_ms/1000)` | 官方 `decode_ms` 是流式输出窗口 |
| `quotas[].windows[].used` | `used`（0–1 或 0–100） | 统一成百分比 |
| `quotas[].windows[].resetsIn` | `resetsAt - now` | 本地倒计时 |
| `logs[]` | `usage/requests.rows` | `in/out/cache_read`、`ttft_ms`、`decode_*` |
| `heatmap[]` | `/api/usage/heatmap.days` | 仅 GUI / `magpie web` |

### 6.3 刷新策略

| 数据 | 建议频率 | 失败处理 |
| --- | --- | --- |
| trace | 1s 长轮询（`after=seq&wait=1`） | 保留最后快照，标“可能过期” |
| concurrency | 1s | 保留最后快照 |
| usage | 5s | 保留最后费用，标 `stale` |
| quotas | 60s + 完成事件后 2s 补刷 | 保留上次读数 |
| requests | 10s 或手动 | 分页/游标 |
| heatmap | 5min | 空状态 |
| usage.jsonl | 文件监听 + 1s 兜底 | 半行留到完整 |

### 6.4 实时路由的两种实现

**方案 A：轮询快照（原型采用）**

- 每 2.5s 拉一次 `/api/snapshot`，服务端并行请求 6 个源。
- 优点：简单、跨浏览器、无需 SSE。
- 缺点：路由动画会重置；请求量大。
- 缓解：前端做 diff，只有路由集合变化才重建 SVG；用 CSS/SMIL 让动画持续。

**方案 B：SSE / 长轮询（生产推荐）**

- 服务端维护 trace 的 `after` 游标，增量推给浏览器：
  `event: route` / `event: quota` / `event: usage`。
- 前端只更新变化的卡片；SVG 连线按 `routeId` 复用 DOM。
- 断线重连后从最后一个 `seq` 继续；`ids` 用于删除已淘汰路由。

---

## 7. 关键交互细节

### 7.1 路由舞台

- **不要画所有历史请求**。只画当前活跃 + 最近 10 条；历史在表格里。
- Agent 节点按活跃数排序；Provider 节点按“回答中 > 排队 > 已改道 > 待命”排序。
- 失败尝试保留在 provider 行上，标“已改道”，不要从画面消失。
- 连线颜色：Agent 色 → Provider 色；失败段用红色虚线。
- 悬停 Agent/Provider 时，相关连线加粗，其他降到 12% 透明度。
- 点击 Agent/Provider 过滤会话列表；再次点击取消。
- 选中会话时，只高亮该会话的路径，决策条显示它的 rule/tries。

### 7.2 会话卡

- 一行只放一个主请求；子 Agent 用 `↳` 缩进。
- 状态：运行中（绿）、排队（琥珀）、完成（灰）、失败（红）。
- Token / TPS 用 tabular numerals；TPS 颜色分档：<30 红、30–60 黄、60–120 蓝、≥120 绿。
- 改道次数用琥珀 chip，不要用红色（改道不是错误）。
- 卡片高度固定，长标题省略；悬停看完整标题和路由。

### 7.3 额度

- 每个账号只显示最短窗口；其余窗口放在 tooltip。
- 百分比颜色：<70 品牌色、70–88 琥珀、≥88 红。
- 余额型账号（OpenRouter / DeepSeek）显示余额，不伪造百分比。
- 重置倒计时每分钟更新；过期显示“即将重置”。
- 旧读数标 `stale`，不要清零。

### 7.4 图表

- 24h 用面积 + 细线；7d/30d 用同样的视觉语言，不换图表类型。
- Token 与费用共享 x 轴，但各自归一化；图例写清“费用为虚线”。
- Tooltip 固定显示：时间、Token、费用；可选 calls。
- 热力图 12 周 × 7 天；今天用青色描边；级别用 5 档，不要用连续渐变。
- 模型占比环图最多 6 段；其余合并为“其他”。

---

## 8. 性能与可访问性

### 8.1 性能

- **不要把整页放在一个 React state 里每秒重渲染**。按区域订阅：
  KPI、sessions、route stage、charts 各自更新。
- SVG 分两层：静止连线层 + 流动层；流动层只更新 `stroke-dashoffset` 或 packet 位置。
- 路由卡使用 `content-visibility: auto` + `contain-intrinsic-size`，大量账号时不布局屏外行。
- 表格只渲染可视窗口（原型限制 22 行；生产用虚拟列表）。
- 图表数据按像素宽度降采样；24h 最多 24 点，30d 最多 30 点，不需要每秒重算。
- 所有数字 `font-variant-numeric: tabular-nums`，避免布局抖动。
- 图标本地 SVG，`width/height` 固定，避免加载闪烁。

### 8.2 可访问性

- 颜色之外还有形状/文字：失败用 `x`，改道用“已改道”，状态有文字。
- 提供 `prefers-reduced-motion`：停止流动、停止 sheen、停止转圈。
- 键盘：`/` 聚焦搜索、空格暂停、`T` 切换主题；卡片可 Tab 聚焦、Enter 打开。
- Tooltip 不只靠 hover；焦点也能触发。
- 对比度：正文 ≥4.5:1；弱文字只用于辅助信息。
- 支持浅色主题；图表色板在浅色下保持可读。

---

## 9. 落地路线

### Phase 0 · 视觉原型（本仓库已完成）

- 静态 HTML/CSS/JS，无构建。
- Mock 数据 + 实时模拟；24h/7d/30d、热力图、环图、额度、请求表。
- `server.mjs` 只读代理，支持真实 Magpie；无 Magpie 时回退演示。

### Phase 1 · 真实数据接入（1–2 天）

- 用插件宿主或 `server.mjs` 跑通 `/v1/magpie/*`。
- 把 `data.js` 的 `normalizeLive()` 对齐真实字段；补 `usage/requests` 和
  `/api/usage/heatmap`。
- 处理错误/过期/空状态；把轮询改成 SSE。

### Phase 2 · 路由动画与历史（3–5 天）

- 用 `routeId` 复用 DOM；增量更新。
- 历史路由按 `seq` 回放；支持“回到实时”。
- 增加“按会话/按请求”切换；保留 30 天。

### Phase 3 · 桌面化（1 周）

- Tauri 2 或纯 Web + `magpie web`。
- 托盘/菜单栏、置顶、透明磨砂、多屏、快捷键。
- 本地配置文件、远端 HUD Server、查看密钥。

### Phase 4 · 深度与生态（持续）

- 费用预测、预算告警、Webhook。
- 工具调用/文件活动/子 Agent 时间线。
- 插件化：把面板做成 Magpie 插件，跟随官方 UI 主题与图标。
- OTel / Prometheus 导出，接 Grafana。

---

## 10. 原型文件与运行

```
.
├── public/
│   ├── index.html          # 一屏 Dashboard
│   └── assets/
│       ├── app.css         # 设计 token、布局、动画、响应式
│       ├── app.js          # 渲染、交互、模拟、实时适配
│       ├── data.js         # Mock 数据 + Magpie 字段归一化
│       └── icons/          # 本地 provider/agent SVG（MIT）
├── page/                   # Magpie 插件启动页
├── index.mjs               # Magpie 插件入口，启动本地服务
├── server.mjs              # 零依赖静态服务 + 只读 Magpie 代理
├── preview.mjs             # 独立预览
├── docs/
│   ├── research.md         # 本文（中文）
│   ├── research.en.md      # English edition
│   ├── publishing.md       # 发布与商店 topics
│   └── preview-*.png       # 截图（演示数据）
└── README.md
```

```bash
# 独立预览（Node 18+）
node preview.mjs
# http://127.0.0.1:8777

# 连接本机 Magpie
MAGPIE_URL=http://127.0.0.1:3425 node preview.mjs

# 共享网关需要 key 时
MAGPIE_KEY=... node preview.mjs
```

打开页面后点右上角“演示数据”可切换实时；连不上会回退演示并提示。

---

## 11. 参考链接

**核心**

- https://github.com/bowenliang123/dsh-context
- https://github.com/smallcat2333/magpie-hud
- https://github.com/yetone/magpie
- https://usemagpie.ai/docs/zh/start
- https://github.com/yetone/magpie/blob/main/docs/reference.md
- https://github.com/yetone/magpie/blob/main/docs/integrating.md

**相邻项目**

- https://github.com/jarrodwatts/claude-hud
- https://github.com/tt-a1i/tokenmeter
- https://github.com/ryoppippi/ccusage
- https://github.com/BerriAI/litellm
- https://github.com/Calcium-Ion/new-api
- https://github.com/musistudio/claude-code-router
- https://github.com/Helicone/helicone
- https://github.com/langfuse/langfuse
- https://github.com/Arize-ai/phoenix
- https://github.com/Nihondo/AgentLimits
- https://github.com/philipecomputacao/claude-llm-quota-bar
- https://github.com/lobehub/lobe-icons
- https://github.com/simple-icons/simple-icons
- https://github.com/magpie-community/plugins

---

## 12. 一句话总结

`dsh-context` 教你把数据讲成故事，`magpie-hud` 教你用真实数据讲实时故事，
Magpie 官方 UI 给了你完整的数据字典和品牌资产。**把它们合成一个控制室：
路由是主角，额度是约束，费用是结果，图标和动效只服务于“现在发生了什么”。**
