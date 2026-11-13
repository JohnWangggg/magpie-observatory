# 数据展现形式调研 · Visual Forms

> 接在路由 / 雷达 / 织机 / 节奏 / 年轮五种视图之后：**还有哪些既好看、
> 又和 Magpie 数据对得上的可视化？**
>
> 调研对象：Langfuse / Helicone / LangSmith / Braintrust / Datadog / Grafana +
> OTel 的 LLM 观测界面，Data Viz Project、Visualizing.JP、Dataviz Inspiration 等
> 图表目录，以及 Magpie 社区里的 `magpie-agent-office`、`busy-magpie`、
> `tokenmeter`、`ccusage`、`magpie-chat` 等面板插件。
>
> 结论：**先做“额度燃尽 + 配速”，再做“会话瀑布”，然后才是成本树图与延迟分布。**
> 年轮（极坐标日历）已经作为第五种视图落地，见 `docs/mode-rings.png`。

---

## 0. 我们手里到底有什么数据

调研任何形式之前，先看数据边界。`server.mjs` 目前只读这些接口：

| 接口 | 粒度 | 可支撑的形式 |
| --- | --- | --- |
| `/v1/magpie/trace` | 路由 / 尝试 / 组 / affinity / 并发 | 流向、路径、改道叙事 |
| `/v1/magpie/concurrency` | 当前 in-flight、队列、lane | 实时脉冲、Gantt、仪表 |
| `/v1/magpie/quotas?kept=1` | 账号 × 窗口 × used/remaining/resetsAt | 额度环、进度条、燃尽 |
| `/v1/magpie/quotas/history` | 账号 × 窗口 × `at/left/start/resetsAt` 序列 | **燃尽曲线、配速、预测** |
| `/v1/magpie/quotas/cards` | 卡片元数据、错误、via | 账号状态、失败原因 |
| `/v1/magpie/usage?period=` | totals + hour/day series + agents/models/accounts/providerKeys/sessions 聚合 | 趋势、树图、占比、排行 |
| `/v1/magpie/usage/requests` | 逐请求：in/out/cache/cost/ms/ttft/status/agent/provider/model/session/stop/ep | 瀑布、分布、散点、表格 |
| `/api/usage/heatmap`（仅 GUI） | 53 周 × 天 | 热力图、年轮、螺旋 |

**缺什么：**

- 没有 span 树 / tool 调用嵌套 → 火焰图的 y 轴数据不足；
- `usage` 的 time series 只有总量，没有 `by=provider/model/agent` 的堆叠 →
  想做 streamgraph / horizon，需要自己按时间窗聚合 `requests` 或加服务端缓存；
- 没有延迟直方图 → 蜂群图/山脊图只能用最近 80–500 条请求当样本；
- 没有 prompt/回复正文 → 所有形式只能基于计数、耗时、费用、状态。

---

## 1. 形式清单与判断

| 形式 | 回答什么问题 | 需要的字段 | 实现成本 | 适配度 |
| --- | --- | --- | --- | --- |
| **额度燃尽 + 配速** | 这个窗口会不会提前用完？ | `quotas/history` 的 `left/start/resetsAt` | 中 | ★★★ |
| **会话瀑布 / Gantt** | 一次会话里谁先谁后、并发几路？ | `requests` 的 `session/t/ms/ttft` | 中 | ★★★ |
| **延迟蜂群 / 山脊** | 哪个 provider 的 TTFT/TPS 分布最差？ | `requests` 的 `ttft_ms/ms/out` | 低-中 | ★★ |
| **成本树图 / 旭日** | 钱花在 provider → 账号 → 模型哪一层？ | `usage` 的 models/accounts/agents 聚合 | 低 | ★★ |
| **流向图（Sankey / 冲积）** | Agent → 组 → Provider → 模型的流量 | `requests` 最近 500 条 + trace 组链 | 中 | ★★ |
| **极坐标日历（年轮）** | 半年里哪几天、星期几最忙？ | `heatmap` 日粒度 | 已实现 | ★★★ |
| **螺旋时间轴** | 一整年的节奏与密度 | `heatmap` 日粒度 | 中 | ★★ |
| **星图 / 太阳系（Orrery）** | 现在谁在绕谁转？额度是燃料 | `sessions` + `quotas` | 中-高 | ★★ |
| **延迟热力（time × bucket）** | 延迟在哪些小时扎堆？ | 延迟直方图（需缓冲最近请求） | 中 | ★★ |
| **漏斗** | 请求 → 首字 → 完成 → 成功，漏在哪？ | `usage` totals：calls/timed/canceled/errors | 低 | ★★ |
| **bullet / 子弹图** | 额度 vs 配速 vs 阈值 | `quotas` + history | 低 | ★★ |
| **Marimekko / 马赛克** | provider × 模型的花费结构 | `usage.models` + provider | 低 | ★ |
| **Chord 弦图** | Agent ↔ Provider 双向流量 | `requests` 聚合 | 中 | ★（可读性差） |
| **网络力导向图** | Agent ↔ 组 ↔ Provider 关系 | `requests` + trace | 中-高 | ★（布局不稳） |
| **Streamgraph / Horizon** | 各 provider 的份额随时间变化 | 需要 time × dimension | 高（需聚合层） | ★★ |
| **火焰图** | 一次会话/请求的时间都花在哪 | 需要 span 嵌套 | 高（数据不足） | ★（未来） |
| **Candlestick / OHLC** | 每小时价格/延迟的极值 | `usage.series` | 低 | ✕（语义弱） |
| **3D / 等距办公室** | Agent 在干嘛的沉浸感 | 会话状态（社区插件已做） | 高 | ★★（好玩） |
| **声音 / 节拍** | 节奏与密度 | `requests` | 中 | ★（已有节奏视图） |
| **雷达 / 蜘蛛** | 多 provider 多指标对比 | `usage` 聚合 | 低 | ★ |
| **树图 / 旭日** | 同上，层级更强 | `usage` 聚合 | 低 | ★★ |

---

## 2. 为什么第一名是“额度燃尽 + 配速”

Magpie 的额度数据有独特的 `history`：

```json
{ "provider": "opencode-go", "user": "…",
  "lines": [{ "name": "5h", "points": [
    { "at": "…", "left": 76.25, "start": "…", "resetsAt": "…" } ] }] }
```

它天然适合画一张**燃尽图**：

- x = 时间，y = 剩余额度；
- 每个窗口是一条阶梯线，重置点画垂直虚线；
- 用最近几个点算 `burn rate`，外推一条虚线到 `resetsAt`：
  - 在重置前触底 → 红色“会提前用完”；
  - 留有余量 → 绿色“能撑到重置”；
- 头像/图标用现有 provider 图标，阈值用 70/88% 的既有色阶。

这是五个视图都没有回答的第三个问题：**额度还能撑多久？**
它不需要新的采集，只需要服务端把 `/quotas/history` 带进 snapshot，
前端加一张卡或一个视图。

---

## 3. 第二名：会话瀑布 / Gantt

`requests` 每行都有 `t`、`ms`、`ttft_ms`、`session`、`agent`、`provider`。
把最近 N 条按 `session` 分组，就能画：

- 每行一个会话，横轴是时间；
- 每段请求是一条 bar：浅色部分 = 排队/首字，深色部分 = 流式输出；
- 颜色 = provider，红描边 = 失败/改道，hover 显示 model/tokens/TPS；
- 并发高的地方自然叠出“并行窗口”。

它等价于 trace waterfall，但用的是我们已经有的账本数据；
和“织机”不同：织机看的是密度，瀑布看的是**单会话的因果与并发**。

---

## 4. 第三名：成本树图 / 旭日

`usage` 已经返回四层聚合：

```
provider → account → model → agent
```

树图/旭日把面积 = 花费或 Token，一次看完“钱花在哪”。
实现成本低（纯前端、已有数据），缺点是和现有模型环图定位接近，
适合做成环图卡片的“展开”而不是第六个视图。

---

## 5. 第四名：延迟蜂群 / 山脊

最近 80–500 条请求的 `ttft_ms`、`ms`、`out/ms` 足以画：

- 每个 provider 一条水平带；
- 每个请求一个点（x = TTFT，y = provider 抖动分布）；
- 中位数、P90 用细线标出；离群点一眼可见。

它比“平均 TPS”诚实，也比表格更容易发现某条线路突然变慢。
样本量有限，适合做成卡片级的小图，而不是全屏视图。

---

## 6. 已落地的第五种视图：年轮

`docs/mode-rings.png` 是这次调研的产物：

- 最近 **26 周**铺成极坐标日历；
- 7 个同心圆 = 周一到周日（内圈周一，外圈周日）；
- 26 列 = 26 周；每个点是一天；
- 点大小 = Token 量，颜色 = 五档活跃级别；
- 今天有绿色描边；外圈是月份标签；
- 右侧统计：总 Token、最忙一天、今日、连续活跃、近 6 个月；
- 明暗/四套风格自动继承 CSS 变量；`prefers-reduced-motion`/动效关闭时不做入场动画。

为什么不是 53 周：hero 高度约 280–420px，53 周 × 7 天会让点小到看不清；
53 周的矩形热力图已经存在，年轮专门看**最近半年的星期节律**。
如果以后 hero 获得更高的一屏配额，可以把 `RINGS_WEEKS` 调到 53。

---

## 7. 实施状态（2026-11）

已从本文候选落地为 hero 视图：

| 形式 | 状态 | 位置 |
| --- | --- | --- |
| 年轮（极坐标日历） | ✅ v0.7.0 | `#view-rings` |
| 额度燃尽 + 配速 | ✅ v0.8.0 | `#view-quota` |
| 会话瀑布 / Gantt | ✅ v0.8.0 | `#view-waterfall` |
| 延迟蜂群 / 山脊 | ✅ v0.8.0 | `#view-swarm` |
| 成本树图 | ✅ v0.8.0 | `#view-treemap` |
| Agent → Provider → 模型流向 | ✅ v0.8.0 | `#view-sankey` |
| 漏斗（calls → 首字 → 成功） | ✅ v0.9.0 | `#view-funnel` |
| 延迟热力（time × bucket） | ✅ v0.9.0 | `#view-latency` |
| 星图 / Orrery | ✅ v0.9.0 | `#view-orrery` |
| bullet / 预算阈值 | ✅ v0.10.0 | `#view-budget` |
| Marimekko / 马赛克 | ✅ v0.10.0 | `#view-marimekko` |
| Chord / 弦图 | ✅ v0.10.0 | `#view-chord` |

仍未实现、值得继续做的：

- **力导向网络**——Agent ↔ Provider 关系，但布局稳定性一般；
- **火焰图 / streamgraph / horizon**——等 Magpie 开放 span 嵌套或
  `usage?by=provider` 的堆叠序列；
- **Factory / Chips / Bees** 等游戏化形式——更适合作为可选主题，而不是默认监控视图。

## 8. 推荐路线

已完成：额度燃尽、会话瀑布、延迟蜂群、成本树图、流向、漏斗、延迟热力、星图、预算、结构、和弦。

下一步：

1. **力导向网络**：Agent ↔ Provider 的关系图，适合探索而非默认视图；
2. **未来**：如果 Magpie 开放 span/tool 调用或 `usage?by=provider` 的堆叠序列，
   再上火焰图、streamgraph、horizon；
3. **游戏化**：Factory / Chips / Bees 作为可选主题。

---

## 9. 参考

- Langfuse Custom Dashboards: https://langfuse.com/docs/metrics/features/custom-dashboards
- Langfuse flame graph issue #16219: https://github.com/langfuse/langfuse/issues/16219
- Datadog Trace View (flame / waterfall / map): https://docs.datadoghq.com/tracing/trace_explorer/trace_view/
- Helicone: https://github.com/Helicone/helicone
- Arize Phoenix: https://github.com/Arize-ai/phoenix
- Grafana + OTel GenAI: https://github.com/BerriAI/litellm/pull/35159
- Data Viz Project: https://datavizproject.com/
- Visualizing.JP Chart Catalogue: https://visualizing.jp/catalogue/
- spiralize（螺旋时间序列）: https://jokergoo.github.io/spiralize_vignettes/spiralize.html
- tokenmeter: https://github.com/tt-a1i/tokenmeter
- ccusage: https://github.com/ryoppippi/ccusage
- magpie-agent-office: https://github.com/QingJ01/magpie-agent-office
- CrommaCode Game View: https://cromma.ai/code
