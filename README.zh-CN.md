# Magpie Observatory · 喜鹊观测台

**Magpie 的实时监看驾驶舱。** 双向喜鹊把请求带向供应商、再把回答带回来；
周围是额度、用量、会话和 53 周节奏。

[English](README.md) · **简体中文** · [更新日志](CHANGELOG.md)

![Magpie Observatory](docs/preview-dark.png)

## 是什么

Magpie 已经知道每个请求走的是哪个 provider、账号和模型。Observatory 把这股
数据流变成可以“看”的东西：

- **实时路由**：Agent → Magpie → Provider/Account；实心喜鹊带请求飞出去，
  镜像描边喜鹊带回答飞回来；失败改道保留“已改道”标记。
- **八种视图**：路由、会话、延迟、漏斗、额度、用量、构成、年轮。原先分开的图收成同一视图里的标签。
- **七套风格**：`控制室` / `像素` / `纸感` / `霓虹` / `终端` / `蓝图` / `拼贴`，
  每套都有明暗两版；明暗和风格互相独立。
- **布局设置**：自动 / 一屏 / 舒展；密度 紧凑 / 标准 / 宽松；动效 全部 / 轻柔 / 关闭。
- **额度**：每个账号的最短窗口，3 列环形卡片（≤1400px 两列，手机单列），
  带重置倒计时和余额。
- **用量**：24h/7d/30d Token + 费用、模型环图、53 周热力图（窄屏压缩）、可搜索请求账本。
- **会话**：活跃请求、子 Agent、TPS、改道次数；最近完成的会话留在侧栏。
- **响应式**：桌面一屏，手机单列 + 紧凑侧栏；同一份数据，没有单独的移动端构建。
- **影院模式**：`O` 让当前视图占满全屏，只留一条漂浮 HUD；配合 `G` 巡游
  就是一块可以挂在副屏上的氛围屏。
- **命令面板**：`⌘K` 一个搜索框跳转任意视图、风格或动作。
- **每日摘要**：每天首次打开出昨日报告（tokens / 调用 / 连续天数 / 最常用
  Agent），关闭当日不再弹。
- **成就系统**：8 枚徽章（连续天数 / 单日 1M、10M tokens / 三路并发 /
  夜航人），解锁时 toast，localStorage 记达成日期。
- **注意力条**：英雄卡左下角一排安静的小胶囊：配额告急、错误突增、
  连续天数、今日一句话。
- **收藏夹常驻**：收藏的视图（F）变成左侧 rail 的常驻图标，一点即切。
- **Mini 模式**：`?mode=mini&view=burn` 把页面缩成画中画可用的挂件。
- **PWA**：`manifest.webmanifest` + 最小 service worker，可安装到主屏；
  网络优先、API 不缓存。
- **回放**：`R` 冻结成 3 分钟可拖时间轴；`▶` 自动播放、`⤴` 复制
  `#replay=` 链接，命令面板可导出自足 HTML 播放器（帧内嵌）。
- **分享卡**：`⌘K` 导出 1200×630 PNG——今日 / 本周 / 近30天 / 今日vs昨日
  对比；`⌘K` 复制页面链接（恢复视图/区间/影院）。
- **周报卡**：`⌘K` → 本周报告出 7 天柱状 + 峰值日 + 最热路由。
- **网关对比**：`⌘K` → 网关对比并列默认与锁定网关的四指标。
- **等级与成就**：请求攒 XP 进顶栏等级胶囊；8 枚徽章 + 个人战绩跨
  会话持久。

## 图标

<img src="docs/icon.png" width="88" alt="Magpie Observatory 图标">

一只在轨道上的喜鹊：白色鸟身是请求/回答的双向路径，虚线环是观测台，
青色眼睛代表实时网关。

## 作为 Magpie 插件安装

需要较新的 Magpie，支持 **plugin page** 和 **page service**
（`magpie.page.service`）：

```bash
magpie plugin add github:JohnWangggg/magpie-observatory
```

或在 Magpie 中打开 **Plugins → Add plugin**，粘贴 GitHub 地址或搜索
**Magpie Observatory**。在 **Plugins → Installed** 打开后，侧边栏 Plugins
组会出现 **观测台 / Observatory** 标签。

插件会在 `127.0.0.1:3488` 启动一个只读本地服务（可在插件设置里改端口）。
Magpie 里看到的页面只是启动器；真正的仪表板由这个服务提供，因此可以读取
Magpie 的实时接口，而不需要放宽页面的 `connect-src 'none'` 沙箱。Magpie
用 `sandbox="allow-scripts"` 装载页面，因此服务会对框架的 `Origin: null`
返回 CORS 和一个每次运行生成的口令（只有它发出的 HTML 里才有）；其他页面
读不到数据。

### 从本地目录安装

```bash
git clone https://github.com/JohnWangggg/magpie-observatory.git
magpie plugin add ./magpie-observatory
```

### 商店发现

`package.json` 声明了页面（`magpie.page.file` → `page/index.html`），安装后
在 Magpie 里就是页面类型（`magpie plugin list` 显示 `page`）。**插件市场的
卡片**来自社区注册表（`magpie-community/plugins/registry.json`，`"kind":
"page"`）；本仓库尚未列入，且需要先发布到 npm 才能提交。具体条目和 PR 步骤
见 [`docs/community-listing.md`](docs/community-listing.md)。仓库刻意不带
GitHub 的 **`magpie-plugin`** 主题：该主题供 Discover 的「供应商」半边使用，
而带本地服务（需要 `main`/`exports`）的页面会因此被标成供应商。

列表文案来自 `magpie.name` 与 `magpie.summary.en` / `.zh`；搜索关键词在
`package.json`，主题列表和发布命令见 [`docs/publishing.md`](docs/publishing.md)。

## 不装 Magpie 也能预览

需要 Node.js 18+：

```bash
node preview.mjs
# → http://127.0.0.1:8777
```

默认是演示模式。点右上角 **演示数据 / 实时连接** 可以尝试连接本机 Magpie
（`http://127.0.0.1:3425`）：

```bash
MAGPIE_URL=http://127.0.0.1:3425 MAGPIE_KEY=... node preview.mjs
```

预览只用于开发；插件内部使用同一个服务。

## 视图

八种。相关的图是同一视图里的标签，不再各占一个菜单项。

| 路由 · 双向喜鹊 | 雷达 · Provider 环与额度 |
| --- | --- |
| ![route](docs/preview-dark.png) | ![radar](docs/mode-radar.png) |

| 织机 · 请求织成条带 | 节奏 · Provider 分轨 |
| --- | --- |
| ![loom](docs/mode-loom.png) | ![rhythm](docs/mode-rhythm.png) |

| 年轮 · 半年极坐标 | 额度 · 燃尽与配速 |
| --- | --- |
| ![rings](docs/mode-rings.png) | ![quota](docs/mode-quota.png) |

| 瀑布 · 会话在时间轴上 | 蜂群 · 各 Provider 的 TTFT |
| --- | --- |
| ![waterfall](docs/mode-waterfall.png) | ![swarm](docs/mode-swarm.png) |

| 成本 · Provider 与模型 | 流向 · Agent → Provider → 模型 |
| --- | --- |
| ![treemap](docs/mode-treemap.png) | ![sankey](docs/mode-sankey.png) |

| 漏斗 · 请求到成功 | 热力 · 时间 × 延迟 |
| --- | --- |
| ![funnel](docs/mode-funnel.png) | ![latency](docs/mode-latency.png) |

| 预算 · 阈值与配速 | 结构 · Provider × 模型 |
| --- | --- |
| ![budget](docs/mode-budget.png) | ![marimekko](docs/mode-marimekko.png) |

![和弦 · Agent ↔ Provider](docs/mode-chord.png)

| 网络 · Agent ↔ Provider | 河流 · Provider 流量随时间 |
| --- | --- |
| ![network](docs/mode-network.png) | ![stream](docs/mode-stream.png) |

| 燃烧 · 配额窗口配速 | K线 · 每小时吞吐 |
| --- | --- |
| ![burn](docs/mode-burn.png) | ![candle](docs/mode-candle.png) |

![仪表盘 · KPI 与配额表盘](docs/mode-gauge.png)

## 切换视图

英雄卡头部不再是平铺按钮，而是一个视图选择器。按 **V**（或点击）打开，
输入名称 / 英文 eyebrow / 分组即可过滤，Enter 切换；也可以点 **随机一个**。
8 个视图按用途分组，英雄卡强调色跟着分组变化。
**G** 开启/停止巡游（间隔在设置里可选 5 / 10 / 30 秒），**R** 随机视图，
**F** 收藏当前视图（收藏会置顶并跨刷新保留），**?** 打开快捷键表，**Esc** 关闭。
按 **O** 进入**影院模式**：英雄视图占满整个窗口，只留漂浮 HUD（视图名、
实时 tokens/费用、Esc 提示）——配合 **G** 巡游就是一块可以挂着看的氛围屏。
**⌘K** 打开命令面板，一键跳转任意视图、任意风格、开关影院/巡游/明暗。
英雄卡左下角还有一条**注意力条**：配额告急、错误突增、连续使用天数、
今日一句话摘要——第一眼就知道该看哪里。

| 视图选择器 | 快捷键 |
| --- | --- |
| ![view menu](docs/view-menu.png) | ![shortcuts](docs/help.png) |

## 每个面都是活的

除了切视图，卡片本身全是交互：

- **单击**——燃烧行展开 sparkline、会话卡选中并过滤日志、热力格按日过滤、
  注意力条跳对应视图。
- **右键**——消除 chip、复制 id / 模型名 / CSV、取消收藏轨、在英雄卡收藏视图。
- **双击**——复制会话尝试摘要、复制 Provider key、按月过滤日志、
  把收藏设为默认视图、复制视图名。
- **键盘**——↑↓/←→ 走每条列表（燃烧行/会话/日志/配额/收藏/面板），
  Enter 激活、Esc 收起；`/` 聚焦日志搜索。
- **悬停**——sparkline 显 `left% · at`、燃烧 bar 显配速 tooltip、
  配额项翻面显 `已用/剩余`、热力格显 `N 次 · Tok`。
- **状态**——每视图滚动位置、日志查询、燃烧选中、收藏、默认视图全部跨刷新保留。

## 风格与明暗

| 控制室 | 像素 |
| --- | --- |
| ![control](docs/preview-dark.png) | ![pixel](docs/style-pixel.png) |

| 纸感 | 霓虹 |
| --- | --- |
| ![paper](docs/style-paper.png) | ![neon](docs/style-neon.png) |

| 终端 | 蓝图 |
| --- | --- |
| ![terminal](docs/style-terminal.png) | ![blueprint](docs/style-blueprint.png) |

| 拼贴 | Game Boy（像素浅色） |
| --- | --- |
| ![zine](docs/style-zine.png) | ![game boy](docs/style-pixel-light.png) |

- **控制室**：玻璃卡片、紫青强调，密度和可读性最均衡。
- **像素**：8-bit 主机感——2px 粗框、硬偏移阴影、抖动网点、分段仪表、
  全大写等宽字、重扫描线；浅色版是 Game Boy DMG 屏幕。
- **纸感**：米白、衬线、棕色墨迹、纸张纹理；深色版是午夜纸张。
- **霓虹**：赛博朋克黑玻璃——品红/青色对切光、HUD 角标、透视网格地面、
  色差标题。
- **终端**：磷光 CRT——数字辉光、卡片标题块光标、重栅格、全等宽；
  浅色版是白天终端。
- **蓝图**：制图桌——深蓝图纸、24px 方格、虚线内框、刻度尺、无辉光；
  浅色版是晒白图。
- **拼贴**：丝网印剪贴——新闻纸网点、2px 墨框、硬投影、单一红色、
  荧光笔标题；深色版是黑墨新闻纸。

左侧栏 **明暗** 切昼夜，**风格** 切七套艺术方向；两项分别记忆。

同一套「控制室」的浅色版：

![控制室浅色](docs/preview-light.png)

| 风格菜单 | 布局与动效 |
| --- | --- |
| ![style menu](docs/style-menu.png) | ![layout settings](docs/settings-menu.png) |

## 布局与动效

点左侧栏 **设置**：

| 设置 | 选项 |
| --- | --- |
| 布局 | `自动` · `一屏` · `舒展` |
| 密度 | `紧凑` · `标准` · `宽松` |
| 动效 | `全部` · `轻柔` · `关闭` |
| 巡游 | `5 秒` · `10 秒` · `30 秒` |
| 主色 | `极光` · `熔金` · `薄荷` · `蔷薇` · `石墨` |

**一屏** 在 ≥1200×900 时把整个面板压进视口，列表在卡片内部滚动；
更小的窗口自动回退到滚动并提示。**舒展** 始终使用自然高度。
**主色** 只换强调色不动风格包——熔金会把折线、热力、火花线、成就、
粒子全部调成琥珀。关闭动效后，喜鹊停在路径中点，雷达扫描、织机梭子、
节奏播放头和背景星尘全部停止。

桌面右下角还有一层**环境粒子**：~20–160 粒光点缓慢上浮，密度跟着活跃
会话数走、颜色跟主色走；页面切后台自动暂停。

## 手机上的样子

宽度小于 680px 时，侧栏只留图标，额度卡改为单列，请求账本隐藏次要列，
四种路由视图纵向重排。仍然是同一份 HTML，没有单独的移动端应用。

![手机布局](docs/preview-mobile.png)

## 数据来源

本地服务只代理 Magpie 文档里的只读接口：

| Magpie 接口 | 用途 |
| --- | --- |
| `GET /v1/magpie/trace?after=0` | 路由、尝试、规则、会话 |
| `GET /v1/magpie/quotas?kept=1` | 账号额度窗口和余额 |
| `GET /v1/magpie/usage?period=…` | USD 估值、序列、模型 |
| `GET /v1/magpie/concurrency` | 在飞/排队请求 |
| `GET /v1/magpie/usage/requests?period=…` | 请求账本 |
| `GET /api/usage/heatmap?period=all` | 热力图（GUI / `magpie web`） |

如果 GUI 的热力图路由不存在（headless / tray 网关会返回 404），服务会用
`/v1/magpie/usage?period=all` 的每日序列补齐同样的日期格子，并缓存 5 分钟；
不读取 prompt 或回复正文。

不保存 prompt、回复、凭据或模型调用密钥。服务只监听 loopback；插件页面通过
自己的 origin 访问它。

实时轮询是增量的：首帧之后，服务只发新增的 trace 路由、新增的请求行和配额历史的哈希，
2.5 秒一次轮询约 23 KB，而不是 150 KB。

### 隐私

- **截图全部使用演示数据。** README 里的账号都是合成的
  （`demo-…@example.com`），不包含真实 provider 账号、密钥或个人邮箱。
- **只读。** 服务只对上面六个文档化接口发 `GET`，不写 Magpie，也不写供应商 API。
- **不留 prompt。** 请求、回复、模型调用密钥和网关密钥只经过 Magpie；
  Observatory 只保留它渲染所需的计数和元数据。
- **只绑 loopback。** 服务监听 `127.0.0.1`，插件页面也从同一 origin 提供。

## 项目结构

```text
index.mjs              Magpie 插件入口；启动本地服务
server.mjs             只读 Magpie 代理 + 静态服务
preview.mjs            独立预览（node preview.mjs）
page/index.html        Magpie 插件启动页
page/boot.js           读取 magpie.service / port 并导航
page/icon.svg          插件图标
public/                仪表板（index.html、assets/）
public/assets/views/   独立 hero 视图模块
docs/research.md       调研与设计（简体中文）
docs/research.en.md    调研与设计（English）
docs/publishing.md     GitHub 发布 + Magpie 商店 topics
docs/visual-forms.md   展现形式调研（中文）
docs/visual-forms.en.md 展现形式调研（English）
scripts/               发布脚本
```

## 开发

```bash
npm run check          # node --check 入口、服务和浏览器脚本
node preview.mjs        # 演示 + 可选真实网关
```

仪表板是纯 HTML/CSS/JS，没有构建步骤，也没有运行时依赖；插件宿主用 Bun 运行，
预览用 Node 18+。

## 链接

- Magpie: https://github.com/yetone/magpie
- 插件文档: https://github.com/yetone/magpie/blob/main/docs/subsystems/plugin-runtime.md
- 调研笔记: [`docs/research.md`](docs/research.md)（中文）·
  [`docs/research.en.md`](docs/research.en.md)（English）
- 展现形式调研: [`docs/visual-forms.md`](docs/visual-forms.md)（中文）·
  [`docs/visual-forms.en.md`](docs/visual-forms.en.md)（English）
- 发布与商店 topics: [`docs/publishing.md`](docs/publishing.md)
- Issues: https://github.com/JohnWangggg/magpie-observatory/issues

## 许可

MIT © 2026 JohnWangggg。图标来自 Magpie 与 LobeHub Icons（MIT）；
见 [`public/assets/icons/LICENSE`](public/assets/icons/LICENSE)。
