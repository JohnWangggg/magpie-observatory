# Magpie Observatory · 视图图鉴 (624)

按分组列出每个视图的名称、eyebrow 与一句话描述。视图目录由 `public/assets/app.js` 的 `VIEW_META` 维护；
运行时 `window.ObservatoryManifest` + `document.write` 自动加载 `views/*.js/.css`。

| 分组 | 数量 |
|---|---|
| [实时](#实时) | 16 |
| [配额](#配额) | 55 |
| [延迟](#延迟) | 2 |
| [氛围](#氛围) | 3 |
| [场景](#场景) | 233 |
| [用量](#用量) | 233 |
| [天象](#天象) | 17 |
| [洞察](#洞察) | 10 |
| [结构](#结构) | 6 |
| [几何](#几何) | 11 |
| [趣味](#趣味) | 6 |
| [生态](#生态) | 31 |
| [抽象](#抽象) | 1 |

---

## 实时 (16)

| id | 标题 | eyebrow | 说明 | 预览 |
|---|---|---|---|---|
| `route` | 实时路由 | LIVE ROUTING | Agent → Provider | ![route](../public/shots/route.png) |
| `waterfall` | 会话瀑布 | SESSION WATERFALL | 一次会话的时间轴 | ![waterfall](../public/shots/waterfall.png) |
| `network` | 关系网络 | RELATION GRAPH | Agent / Provider / 模型 | ![network](../public/shots/network.png) |
| `swarm` | 延迟蜂群 | LATENCY SWARM | TTFT 分布 | ![swarm](../public/shots/swarm.png) |
| `pulse` | 脉搏 | PULSE MONITOR | 会话 ECG · 每行一个心跳 | ![pulse](../public/shots/pulse.png) |
| `sonar` | 声呐 | PROVIDER SONAR | provider=接触点 扫线转 | ![sonar](../public/shots/sonar.png) |
| `metronome` | 节拍器 | REQUEST METRONOME | 摆频=请求率 | ![metronome](../public/shots/metronome.png) |
| `weathervane` | 风向标 | PROVIDER VANE | 箭=最热provider 摆 | ![weathervane](../public/shots/weathervane.png) |
| `dockyard` | 船坞 | AGENT DOCKYARD | 船=agent 舱=token 旗=provider | ![dockyard](../public/shots/dockyard.png) |
| `flotilla` | 船队 | AGENT FLOTILLA | 船=agent 舷=token 帆=provider 红帆=错 | ![flotilla](../public/shots/flotilla.png) |
| `tramway` | 缆车 | PROVIDER TRAMWAY | 索=provider 车=会话 断=错 | ![tramway](../public/shots/tramway.png) |
| `burn` | 燃烧速率 | BURN RATE | 配额窗口烧速 / 预测重置 | ![burn](../public/shots/burn.png) |
| `gauge` | 仪表盘 | GAUGE MATRIX | KPI/配额仪表 | ![gauge](../public/shots/gauge.png) |
| `pinboard` | 钉板 | PINBOARD | KPI/配额/会话钉上墙 | ![pinboard](../public/shots/pinboard.png) |
| `lighthouse` | 灯塔 | LIGHTHOUSE | 塔=配额 光束=会话 | ![lighthouse](../public/shots/lighthouse.png) |
| `harbor` | 港口 | HARBOR | 船=agent 箱=tries 浮标=配额 | ![harbor](../public/shots/harbor.png) |

## 配额 (55)

| id | 标题 | eyebrow | 说明 | 预览 |
|---|---|---|---|---|
| `compass` | 罗盘 | QUOTA COMPASS | 窗=表盘 针=燃速 环=余量 | ![compass](../public/shots/compass.png) |
| `barometer` | 气压计 | BURN BAROMETER | 燃速=气压 错=风暴 | ![barometer](../public/shots/barometer.png) |
| `clocktower` | 钟楼 | QUOTA CLOCKTOWER | 盘=配额窗 针=燃速 铃=临近重置 | ![clocktower](../public/shots/clocktower.png) |
| `belltower` | 钟楼铃 | QUOTA BELLS | 铃=配额窗 摆速=燃速 | ![belltower](../public/shots/belltower.png) |
| `cottage` | 小屋 | QUOTA COTTAGE | 窗=配额窗 灯=会话 烟=错 园=余量 | ![cottage](../public/shots/cottage.png) |
| `bellfoundry` | 铸钟坊 | BELL FOUNDRY | 炉=配额窗 水=燃速 铃=会话 火=错 | ![bellfoundry](../public/shots/bellfoundry.png) |
| `atlas` | 图集 | QUOTA ATLAS | 页=配额窗 岛=用量 旗=会话 | ![atlas](../public/shots/atlas.png) |
| `manor` | 庄园 | PROVIDER MANOR | 翼=配额窗 灯=会话 园=余量 烟=错 | ![manor](../public/shots/manor.png) |
| `portcullis` | 闸门 | PORTCULLIS | 闸=燃速 人=会话 炬=错 | ![portcullis](../public/shots/portcullis.png) |
| `strand` | 海岸 | QUOTA STRAND | 湾=配额窗 水=余量 鸥=会话 旗=错 | ![strand](../public/shots/strand.png) |
| `ember` | 余烬 | QUOTA EMBERS | 炭=配额窗 光=燃速 灰=余量 火=会话 | ![ember](../public/shots/ember.png) |
| `stargate` | 星门 | QUOTA STARGATE | 环=配额窗 收缩=余量 光=会话 红=错 | ![stargate](../public/shots/stargate.png) |
| `fresco` | 湿壁画 | QUOTA FRESCO | 板=配额窗 涂=用量 湿=会话 裂=过热 | ![fresco](../public/shots/fresco.png) |
| `pharos` | 灯塔 | QUOTA PHAROS | 塔=配额窗 高=用量 光=会话 旗=错 | ![pharos](../public/shots/pharos.png) |
| `warren` | 兔穴 | QUOTA WARREN | 丘=配额窗 兔=会话 迹=错 | ![warren](../public/shots/warren.png) |
| `gnomon` | 晷针 | QUOTA GNOMON | 盘=配额窗 影=用量 鸟=会话 线=错 | ![gnomon](../public/shots/gnomon.png) |
| `cistern` | 蓄水池 | QUOTA CISTERN | 拱=配额窗 水=余量 滴=会话 痕=错 | ![cistern](../public/shots/cistern.png) |
| `amphora` | 双耳瓶 | PROVIDER AMPHORA | 瓮=配额窗 酒=余量 绘=会话 倾=错 | ![amphora](../public/shots/amphora.png) |
| `semaphore` | 旗语 | QUOTA SEMAPHORE | 塔=配额窗 臂=用量 灯=会话 闪=错 | ![semaphore](../public/shots/semaphore.png) |
| `fireescape` | 消防梯 | QUOTA FIREESCAPE | 梯=配额窗 段=用量 人=会话 红=错 | ![fireescape](../public/shots/fireescape.png) |
| `catacomb` | 墓窟 | QUOTA CATACOMB | 龛=配额窗 深=用量 烛=会话 髅=错 | ![catacomb](../public/shots/catacomb.png) |
| `oast` | 烘麦窑 | QUOTA OAST | 窑=配额窗 锥=用量 风=会话 环=错 | ![oast](../public/shots/oast.png) |
| `croft` | 小农场 | QUOTA CROFT | 垄=配额窗 沟=用量 羊=会话 云=错 | ![croft](../public/shots/croft.png) |
| `tidemill` | 潮汐磨坊 | QUOTA TIDEMILL | 轮=配额窗 速=用量 鱼=会话 | ![tidemill](../public/shots/tidemill.png) |
| `cadence` | 节奏 | QUOTA CADENCE | 钟=配额窗 摆=用量 亮=会话 裂=错 | ![cadence](../public/shots/cadence.png) |
| `crucible` | 熔杯 | QUOTA CRUCIBLE | 杯=配额窗 液=余量 勺=会话 裂=错 | ![crucible](../public/shots/crucible.png) |
| `sheaf` | 麦捆 | QUOTA SHEAF | 捆=配额窗 高=用量 镰=会话 折=错 | ![sheaf](../public/shots/sheaf.png) |
| `doocot` | 鸽舍 | QUOTA DOOCOT | 舍=配额窗 巢=余量 鸽=会话 瓦=错 | ![doocot](../public/shots/doocot.png) |
| `vault` | 金库 | QUOTA VAULT | 门=配额窗 开=余量 锭=用量 锁=会话 钻=错 | ![vault](../public/shots/vault.png) |
| `ferry` | 渡口 | QUOTA FERRY | 渡=配额窗 程=用量 客=会话 绳=错 | ![ferry](../public/shots/ferry.png) |
| `shottower` | 弹塔 | QUOTA SHOTTOWER | 塔=配额窗 高=用量 丸=会话 裂=错 | ![shottower](../public/shots/shottower.png) |
| `lockgate` | 船闸 | QUOTA LOCKGATE | 闸=配额窗 水=余量 船=会话 闸=错 | ![lockgate](../public/shots/lockgate.png) |
| `pergola` | 藤架 | QUOTA PERGOLA | 拱=配额窗 藤=用量 凳=会话 折=错 | ![pergola](../public/shots/pergola.png) |
| `rigging` | 索具 | QUOTA RIGGING | 桅=配额窗 帆=用量 旗=会话 绳=错 | ![rigging](../public/shots/rigging.png) |
| `papermill` | 抄纸坊 | QUOTA PAPERMILL | 槽=配额窗 浆=余量 纸=会话 裂=错 | ![papermill](../public/shots/papermill.png) |
| `menagerie` | 兽苑 | QUOTA MENAGERIE | 笼=配额窗 兽=用量 守=会话 崩=错 | ![menagerie](../public/shots/menagerie.png) |
| `aqueduct` | 渡槽 | QUOTA AQUEDUCT | 拱=配额窗 水=余量 桶=会话 裂=错 | ![aqueduct](../public/shots/aqueduct.png) |
| `curriery` | 鞣坑 | QUOTA CURRIERY | 坑=配额窗 浆=余量 革=会话 裂=错 | ![curriery](../public/shots/curriery.png) |
| `herringweir` | 鱼堰 | QUOTA HERRINGWEIR | 桩=配额窗 网=用量 鱼=会话 断=错 | ![herringweir](../public/shots/herringweir.png) |
| `cheesery` | 奶酪坊 | QUOTA CHEESERY | 压=配额窗 凝=余量 乳=会话 裂=错 | ![cheesery](../public/shots/cheesery.png) |
| `drydock` | 干船坞 | QUOTA DRYDOCK | 坞=配额窗 线=余量 架=会话 裂=错 | ![drydock](../public/shots/drydock.png) |
| `caskhouse` | 酒桶 | QUOTA CASKHOUSE | 桶=配额窗 箍=余量 滴=会话 崩=错 | ![caskhouse](../public/shots/caskhouse.png) |
| `clough` | 闸阀 | QUOTA CLOUGH | 闸=配额窗 水=余量 板=用量 桨=会话 翘=错 | ![clough](../public/shots/clough.png) |
| `headgear` | 井架 | QUOTA HEADGEAR | 塔=配额窗 罐=余量 笼=会话 脱=错 | ![headgear](../public/shots/headgear.png) |
| `saltern` | 盐田 | QUOTA SALTERN | 池=配额窗 盐=余量 耙=会话 决=错 | ![saltern](../public/shots/saltern.png) |
| `dewpond` | 露池 | QUOTA DEWPOND | 池=配额窗 水=余量 羊=会话 裂=错 | ![dewpond](../public/shots/dewpond.png) |
| `icehouse` | 冰窖 | QUOTA ICEHOUSE | 窖=配额窗 冰=余量 夫=会话 融=错 | ![icehouse](../public/shots/icehouse.png) |
| `qanat` | 坎儿井 | QUOTA QANAT | 井=配额窗 水=余量 夫=会话 塌=错 | ![qanat](../public/shots/qanat.png) |
| `watertower` | 水塔 | QUOTA WATERTOWER | 罐=配额窗 水=余量 阀=会话 爆=错 | ![watertower](../public/shots/watertower.png) |
| `nilometer` | 尼罗水位计 | QUOTA NILOMETER | 井=配额窗 水=余量 读=会话 淤=错 | ![nilometer](../public/shots/nilometer.png) |
| `jackwell` | 取水井 | QUOTA JACKWELL | 井=配额窗 水=余量 泵=会话 塞=错 | ![jackwell](../public/shots/jackwell.png) |
| `rosetta` | 罗塞塔 | ROSETTA | 环带=配额 刻痕=会话 | ![rosetta](../public/shots/rosetta.png) |
| `eclipse` | 日蚀 | ECLIPSE | 暗盘=量 冕=会话 沿=窗 | ![eclipse](../public/shots/eclipse.png) |
| `tapestry` | 织锦 | TAPESTRY | 经=配额 纬=会话 | ![tapestry](../public/shots/tapestry.png) |
| `winery` | 酒庄 | WINERY | 桶=配额窗 滴=会话 | ![winery](../public/shots/winery.png) |

## 延迟 (2)

| id | 标题 | eyebrow | 说明 | 预览 |
|---|---|---|---|---|
| `sextant` | 六分仪 | LATITUDE OF LATENCY | 慢=高角 快=贴地平线 | ![sextant](../public/shots/sextant.png) |
| `astrolabe` | 星盘 | ASTROLABE | model=纬圈 provider=指针 | ![astrolabe](../public/shots/astrolabe.png) |

## 氛围 (3)

| id | 标题 | eyebrow | 说明 | 预览 |
|---|---|---|---|---|
| `darkroom` | 暗房 | DARKROOM | 聚光灯跟手 照亮日志 | ![darkroom](../public/shots/darkroom.png) |
| `plankton` | 浮游群 | LOG PLANKTON | 点=日志 色=provider 漂 | ![plankton](../public/shots/plankton.png) |
| `newsreel` | 新闻片 | LOG NEWSREEL | 日志=老电影帧 底片 | ![newsreel](../public/shots/newsreel.png) |

## 场景 (233)

| id | 标题 | eyebrow | 说明 | 预览 |
|---|---|---|---|---|
| `neighborhood` | 街坊 | PROVIDER BLOCK | 房=provider 灯=会话 烟=错 | ![neighborhood](../public/shots/neighborhood.png) |
| `beacon` | 烽火台 | SIGNAL BEACONS | 火=provider 焰=会话 烟=用量 | ![beacon](../public/shots/beacon.png) |
| `orrery` | 轨道星图 | ORRERY | 行星与卫星 | ![orrery](../public/shots/orrery.png) |
| `factory` | 请求工厂 | REQUEST FACTORY | 排队 → 完成 | ![factory](../public/shots/factory.png) |
| `bakery` | 面包房 | BAKERY | 炉=agent 包=会话 计=配额 | ![bakery](../public/shots/bakery.png) |
| `carnival` | 嘉年华 | CARNIVAL | 帐=配额窗 灯=热度 球=会话 | ![carnival](../public/shots/carnival.png) |
| `studio` | 画室 | STUDIO | 架=配额窗 笔=会话 罐=provider | ![studio](../public/shots/studio.png) |
| `dojo` | 道场 | DOJO | 桩=agent 痕=tries 卷=配额 | ![dojo](../public/shots/dojo.png) |
| `library` | 图书馆 | LIBRARY | 架=配额窗 书=余量 桌=会话 | ![library](../public/shots/library.png) |
| `arcade` | 电玩厅 | ARCADE | 机=配额窗 灯=热度 杆=会话 | ![arcade](../public/shots/arcade.png) |
| `castle` | 城堡 | CASTLE | 塔=配额窗 旗=热度 卫=会话 | ![castle](../public/shots/castle.png) |
| `observatory` | 天文台 | OBSERVATORY | 穹=配额窗 镜=会话 缝=用量 | ![observatory](../public/shots/observatory.png) |
| `station` | 车站 | STATION | 灯=配额窗 车=会话 钟=当前 | ![station](../public/shots/station.png) |
| `circus` | 马戏团 | CIRCUS | 索=会话 杆=token 球=配额 | ![circus](../public/shots/circus.png) |
| `subway` | 地铁图 | SUBWAY | 站=配额窗 车=会话 | ![subway](../public/shots/subway.png) |
| `windmill` | 风车塔 | WINDMILL | 塔=配额窗 叶=热度 鸟=会话 | ![windmill](../public/shots/windmill.png) |
| `orchestra` | 管弦乐 | ORCHESTRA | 环=配额窗 音符=会话 | ![orchestra](../public/shots/orchestra.png) |
| `harvest` | 麦田 | HARVEST | 穗=配额窗 机=会话 高=余量 | ![harvest](../public/shots/harvest.png) |
| `hotpot` | 火锅店 | HOTPOT | 锅=配额窗 料=会话 火=热度 | ![hotpot](../public/shots/hotpot.png) |
| `racing` | 赛道 | RACING | 门=配额窗 车=会话 灯=热度 | ![racing](../public/shots/racing.png) |
| `forge` | 铁匠铺 | FORGE | 炉=配额窗 件=会话 火=热度 | ![forge](../public/shots/forge.png) |
| `tavern` | 酒馆 | TAVERN | 桶=配额窗 客=会话 酒=余量 | ![tavern](../public/shots/tavern.png) |
| `rodeo` | 牧场 | RODEO | 栏=配额窗 骑=会话 门=用量 | ![rodeo](../public/shots/rodeo.png) |
| `depot` | 分拣站 | DEPOT | 架=配额窗 件=会话 位=余量 | ![depot](../public/shots/depot.png) |
| `laundry` | 洗衣房 | LAUNDRY | 筒=配额窗 衣=会话 位=余量 | ![laundry](../public/shots/laundry.png) |
| `temple` | 神社 | TEMPLE | 居=配额窗 客=会话 灯=热度 | ![temple](../public/shots/temple.png) |
| `market` | 市集 | MARKET | 摊=配额窗 客=会话 货=余量 | ![market](../public/shots/market.png) |
| `gallery` | 美术馆 | GALLERY | 画=配额窗 客=会话 色=用量 | ![gallery](../public/shots/gallery.png) |
| `zen` | 枯山水 | ZEN | 石=配额窗 纹=用量 叶=会话 | ![zen](../public/shots/zen.png) |
| `sakura` | 樱道 | SAKURA | 树=配额窗 花=用量 瓣=会话 | ![sakura](../public/shots/sakura.png) |
| `rain2` | 雨窗 | RAIN | 格=配额窗 雨=用量 痕=会话 | ![rain2](../public/shots/rain2.png) |
| `tank` | 水族馆 | TANK | 缸=配额窗 水=用量 鱼=会话 | ![tank](../public/shots/tank.png) |
| `camp` | 营地 | CAMP | 火=配额窗 焰=用量 帐=会话 | ![camp](../public/shots/camp.png) |
| `harbor2` | 灯塔港 | HARBOR | 塔=配额窗 扫=用量 船=会话 | ![harbor2](../public/shots/harbor2.png) |
| `metro` | 地下铁 | METRO | 线=配额窗 宽=拥挤 车=会话 | ![metro](../public/shots/metro.png) |
| `volcano` | 火山 | VOLCANO | 锥=配额窗 烟=用量 鸟=会话 | ![volcano](../public/shots/volcano.png) |
| `canyon` | 峡谷 | CANYON | 层=配额窗 深=用量 客=会话 | ![canyon](../public/shots/canyon.png) |
| `lake` | 湖泊 | LAKE | 莲=配额窗 沉=用量 黾=会话 | ![lake](../public/shots/lake.png) |
| `harvest2` | 麦浪 | HARVEST | 垄=配额窗 穗=用量 农=会话 | ![harvest2](../public/shots/harvest2.png) |
| `marina` | 码头 | MARINA | 船=配额窗 桅=用量 鸥=会话 | ![marina](../public/shots/marina.png) |
| `river` | 河流 | RIVER | 湾=配额窗 宽=用量 鱼=会话 | ![river](../public/shots/river.png) |
| `forest` | 森林 | FOREST | 树=配额窗 高=用量 鸟=会话 | ![forest](../public/shots/forest.png) |
| `village` | 村落 | VILLAGE | 屋=配额窗 烟=用量 人=会话 | ![village](../public/shots/village.png) |
| `beach` | 海滩 | BEACH | 浪=配额窗 高=用量 蟹=会话 | ![beach](../public/shots/beach.png) |
| `skyline` | 天际线 | SKYLINE | 楼=配额窗 高=用量 星=会话 | ![skyline](../public/shots/skyline.png) |
| `pasture` | 草场 | PASTURE | 坡=配额窗 高=用量 畜=会话 | ![pasture](../public/shots/pasture.png) |
| `fjord` | 峡湾 | FJORD | 崖=配额窗 水=用量 舟=会话 | ![fjord](../public/shots/fjord.png) |
| `atoll` | 环礁 | ATOLL | 环=配额窗 礁=用量 帆=会话 | ![atoll](../public/shots/atoll.png) |
| `dune` | 沙丘海 | DUNE | 丘=配额窗 脊=用量 舟=会话 | ![dune](../public/shots/dune.png) |
| `lagoon` | 环礁湖 | LAGOON | 岛=配额窗 环=用量 鹬=会话 | ![lagoon](../public/shots/lagoon.png) |
| `oasis` | 绿洲 | OASIS | 泉=配额窗 涌=用量 驼=会话 | ![oasis](../public/shots/oasis.png) |
| `delta` | 河口 | DELTA | 汊=配额窗 流=用量 艇=会话 | ![delta](../public/shots/delta.png) |
| `steppe` | 草原 | STEPPE | 浪=配额窗 高=用量 马=会话 | ![steppe](../public/shots/steppe.png) |
| `pampa` | 潘帕斯 | PAMPA | 草=配额窗 径=用量 仔=会话 | ![pampa](../public/shots/pampa.png) |
| `mesa` | 台地 | MESA | 台=配额窗 壁=用量 鹫=会话 | ![mesa](../public/shots/mesa.png) |
| `terrace` | 梯田 | TERRACE | 田=配额窗 水=用量 农=会话 | ![terrace](../public/shots/terrace.png) |
| `prairie` | 大草原 | PRAIRIE | 丛=配额窗 穗=用量 羚=会话 | ![prairie](../public/shots/prairie.png) |
| `geyser` | 间歇泉 | GEYSER | 泉=配额窗 柱=用量 客=会话 | ![geyser](../public/shots/geyser.png) |
| `meteor` | 流星雨 | METEOR | 雨=配额窗 尾=用量 卫=会话 | ![meteor](../public/shots/meteor.png) |
| `cavern` | 溶洞 | CAVERN | 钟乳=配额窗 长=用量 蝠=会话 | ![cavern](../public/shots/cavern.png) |
| `karst` | 喀斯特 | KARST | 峰=配额窗 高=用量 猴=会话 | ![karst](../public/shots/karst.png) |
| `badlands` | 恶地 | BADLANDS | 柱=配额窗 高=用量 羊=会话 | ![badlands](../public/shots/badlands.png) |
| `cove` | 海湾 | COVE | 柱=配额窗 高=用量 豹=会话 | ![cove](../public/shots/cove.png) |
| `islet` | 小岛 | ISLET | 椰=配额窗 冠=用量 蟹=会话 | ![islet](../public/shots/islet.png) |
| `dell` | 幽谷 | DELL | 铃兰=配额窗 高=用量 兔=会话 | ![dell](../public/shots/dell.png) |
| `sierra` | 山岭 | SIERRA | 雪岭=配额窗 峰高=用量 山羊=会话 | ![sierra](../public/shots/sierra.png) |
| `basin` | 盆地 | BASIN | 盐柱=配额窗 高=用量 羚=会话 | ![basin](../public/shots/basin.png) |
| `outcrop` | 裸岩 | OUTCROP | 岩柱=配额窗 高=用量 蜥=会话 | ![outcrop](../public/shots/outcrop.png) |
| `plateau` | 台原 | PLATEAU | 台原=配额窗 缘高=用量 鹰=会话 | ![plateau](../public/shots/plateau.png) |
| `ridge` | 山脊 | RIDGE | 山脊=配额窗 峰高=用量 隼=会话 | ![ridge](../public/shots/ridge.png) |
| `escarp` | 断崖 | ESCARP | 断崖=配额窗 壁高=用量 岩鸽=会话 | ![escarp](../public/shots/escarp.png) |
| `bluff` | 峭壁 | BLUFF | 峭壁=配额窗 壁高=用量 燕=会话 | ![bluff](../public/shots/bluff.png) |
| `crag` | 崖顶 | CRAG | 崖顶=配额窗 高=用量 秃鹫=会话 | ![crag](../public/shots/crag.png) |
| `inlet` | 入湾 | INLET | 浮标=配额窗 深=用量 鸥=会话 | ![inlet](../public/shots/inlet.png) |
| `loch` | 湖心 | LOCH | 深标=配额窗 深=用量 天鹅=会话 | ![loch](../public/shots/loch.png) |
| `cape` | 海角 | CAPE | 海岬=配额窗 高=用量 鸥=会话 | ![cape](../public/shots/cape.png) |
| `headland` | 岬头 | HEADLAND | 岬头=配额窗 高=用量 信天翁=会话 | ![headland](../public/shots/headland.png) |
| `sound` | 海峡 | SOUND | 深标=配额窗 深=用量 鸬鹚=会话 | ![sound](../public/shots/sound.png) |
| `creek` | 溪流 | CREEK | 溪石=配额窗 高=用量 鲑=会话 | ![creek](../public/shots/creek.png) |
| `point` | 海角尖 | POINT | 灯塔=配额窗 光程=用量 海鸟=会话 | ![point](../public/shots/point.png) |
| `abyss` | 深渊 | ABYSS | 热泉口=配额窗 烟柱=用量 深海鱼=会话 | ![abyss](../public/shots/abyss.png) |
| `grotto` | 岩洞 | GROTTO | 钟乳石=配额窗 长=用量 蝙蝠=会话 | ![grotto](../public/shots/grotto.png) |
| `hollow` | 洼地 | HOLLOW | 洼坑=配额窗 深=用量 萤火虫=会话 | ![hollow](../public/shots/hollow.png) |
| `savanna` | 草原 | SAVANNA | 金合欢=配额窗 冠宽=用量 角马=会话 | ![savanna](../public/shots/savanna.png) |
| `jungle` | 雨林 | JUNGLE | 藤蔓=配额窗 垂长=用量 鹦鹉=会话 | ![jungle](../public/shots/jungle.png) |
| `moor` | 荒野 | MOOR | 石堆=配额窗 高=用量 羊=会话 | ![moor](../public/shots/moor.png) |
| `vale` | 幽谷 | VALE | 雾团=配额窗 浓=用量 鹿=会话 | ![vale](../public/shots/vale.png) |
| `understory` | 林下 | UNDERSTORY | 幼树=配额窗 冠密=用量 松鼠=会话 | ![understory](../public/shots/understory.png) |
| `butte` | 孤丘 | BUTTE | 岩柱=配额窗 高=用量 鹰=会话 | ![butte](../public/shots/butte.png) |
| `pinnacle` | 石柱 | PINNACLE | 石尖=配额窗 高=用量 鹰=会话 | ![pinnacle](../public/shots/pinnacle.png) |
| `rainforest` | 雨层林 | RAINFOREST | 雨团=配额窗 雨强=用量 树懒=会话 | ![rainforest](../public/shots/rainforest.png) |
| `shoal` | 浅滩 | SHOAL | 沙洲=配额窗 大=用量 海豚=会话 | ![shoal](../public/shots/shoal.png) |
| `estuary` | 河口 | ESTUARY | 沙嘴=配额窗 长=用量 翠鸟=会话 | ![estuary](../public/shots/estuary.png) |
| `arch` | 拱门 | ARCH | 石拱=配额窗 跨度=用量 海燕=会话 | ![arch](../public/shots/arch.png) |
| `hoodoos` | 蘑菇岩 | HOODOOS | 蘑菇岩=配额窗 高=用量 乌鸦=会话 | ![hoodoos](../public/shots/hoodoos.png) |
| `domes` | 穹顶 | DOMES | 穹顶=配额窗 半径=用量 攀岩者=会话 | ![domes](../public/shots/domes.png) |
| `tors` | 岩山 | TORS | 岩山=配额窗 高=用量 小马=会话 | ![tors](../public/shots/tors.png) |
| `needles` | 石针 | NEEDLES | 石针=配额窗 高=用量 雨燕=会话 | ![needles](../public/shots/needles.png) |
| `spires` | 尖塔 | SPIRES | 尖塔=配额窗 高=用量 蝙蝠=会话 | ![spires](../public/shots/spires.png) |
| `monoliths` | 巨石 | MONOLITHS | 巨石=配额窗 高=用量 蜥蜴=会话 | ![monoliths](../public/shots/monoliths.png) |
| `towers` | 塔楼 | TOWERS | 塔楼=配额窗 高=用量 海鸥=会话 | ![towers](../public/shots/towers.png) |
| `crags` | 峭壁 | CRAGS | 峭壁=配额窗 高=用量 海燕=会话 | ![crags](../public/shots/crags.png) |
| `mesas` | 平顶山 | MESAS | 平顶山=配额窗 顶宽=用量 兀鹫=会话 | ![mesas](../public/shots/mesas.png) |
| `dunes` | 沙丘 | DUNES | 沙山=配额窗 高=用量 甲虫=会话 | ![dunes](../public/shots/dunes.png) |
| `outcrops` | 露头 | OUTCROPS | 露头=配额窗 宽=用量 旱獭=会话 | ![outcrops](../public/shots/outcrops.png) |
| `pinnacles` | 石针群 | PINNACLES | 石针群=配额窗 高=用量 雨燕=会话 | ![pinnacles](../public/shots/pinnacles.png) |
| `summits` | 群峰 | SUMMITS | 群峰=配额窗 高=用量 攀登者=会话 | ![summits](../public/shots/summits.png) |
| `chimneys` | 烟囱 | CHIMNEYS | 烟囱=配额窗 高=用量 麻雀=会话 | ![chimneys](../public/shots/chimneys.png) |
| `arches` | 拱门群 | ARCHES | 石拱=配额窗 跨度=用量 雨燕=会话 | ![arches](../public/shots/arches.png) |
| `lighthouses` | 灯塔群 | LIGHTHOUSES | 灯塔=配额窗 光程=用量 海鸥=会话 | ![lighthouses](../public/shots/lighthouses.png) |
| `castles` | 城堡群 | CASTLES | 城堡=配额窗 高=用量 骑士=会话 | ![castles](../public/shots/castles.png) |
| `ridges` | 山脊群 | RIDGES | 山脊=配额窗 高=用量 徒步者=会话 | ![ridges](../public/shots/ridges.png) |
| `terraces` | 梯田 | TERRACES | 梯田=配额窗 水宽=用量 白鹭=会话 | ![terraces](../public/shots/terraces.png) |
| `waterwheels` | 水车群 | WATERWHEELS | 水车=配额窗 直径=用量 游鱼=会话 | ![waterwheels](../public/shots/waterwheels.png) |
| `pagodas` | 宝塔群 | PAGODAS | 宝塔=配额窗 层数=用量 燕子=会话 | ![pagodas](../public/shots/pagodas.png) |
| `oceans` | 海洋 | OCEANS | 浪=配额窗 浪高=用量 信天翁=会话 | ![oceans](../public/shots/oceans.png) |
| `moorland` | 荒原 | MOORLAND | 荒原=配额窗 丘高=用量 野兔=会话 | ![moorland](../public/shots/moorland.png) |
| `vineyards` | 葡萄园 | VINEYARDS | 葡园=配额窗 架高=用量 麻雀=会话 | ![vineyards](../public/shots/vineyards.png) |
| `orchards` | 果园 | ORCHARDS | 果树=配额窗 冠幅=用量 蜜蜂=会话 | ![orchards](../public/shots/orchards.png) |
| `hedges` | 绿篱 | HEDGES | 绿篱=配额窗 篱高=用量 瓢虫=会话 | ![hedges](../public/shots/hedges.png) |
| `crofts` | 石屋 | CROFTS | 石屋=配额窗 烟囱=用量 羊群=会话 | ![crofts](../public/shots/crofts.png) |
| `paddocks` | 围场 | PADDOCKS | 围场=配额窗 栏长=用量 小马=会话 | ![paddocks](../public/shots/paddocks.png) |
| `gardens` | 花坛 | GARDENS | 花坛=配额窗 花量=用量 蝴蝶=会话 | ![gardens](../public/shots/gardens.png) |
| `groves` | 橄榄林 | GROVES | 橄树=配额窗 冠幅=用量 雀=会话 | ![groves](../public/shots/groves.png) |
| `harbours` | 渔港 | HARBOURS | 船=配额窗 桅高=用量 鸥=会话 | ![harbours](../public/shots/harbours.png) |
| `fjords` | 峡湾 | FJORDS | 峡壁=配额窗 高=用量 鹰=会话 | ![fjords](../public/shots/fjords.png) |
| `lochs` | 湖群 | LOCHS | 岛=配额窗 树高=用量 水獭=会话 | ![lochs](../public/shots/lochs.png) |
| `geysers` | 间歇泉 | GEYSERS | 泉=配额窗 柱高=用量 蜻蜓=会话 | ![geysers](../public/shots/geysers.png) |
| `bayous` | 沼泽 | BAYOUS | 柏=配额窗 干高=用量 鹭=会话 | ![bayous](../public/shots/bayous.png) |
| `tarns` | 冰斗湖 | TARNS | 冰斗湖=配额窗 深=用量 鼠兔=会话 | ![tarns](../public/shots/tarns.png) |
| `meres` | 湖沼 | MERES | 苇床=配额窗 高=用量 骨顶鸡=会话 | ![meres](../public/shots/meres.png) |
| `springs` | 山泉 | SPRINGS | 泉=配额窗 弧高=用量 鹡鸰=会话 | ![springs](../public/shots/springs.png) |
| `brooks` | 溪流 | BROOKS | 石=配额窗 石径=用量 河乌=会话 | ![brooks](../public/shots/brooks.png) |
| `fords` | 浅滩 | FORDS | 石=配额窗 石宽=用量 牛=会话 | ![fords](../public/shots/fords.png) |
| `inlets` | 入海岬 | INLETS | 岬=配额窗 高=用量 鸬鹚=会话 | ![inlets](../public/shots/inlets.png) |
| `creeks` | 潮沟 | CREEKS | 潮沟=配额窗 宽=用量 鹬=会话 | ![creeks](../public/shots/creeks.png) |
| `sloughs` | 池沼 | SLOUGHS | 沼=配额窗 宽=用量 红翅鹂=会话 | ![sloughs](../public/shots/sloughs.png) |
| `deltas` | 三角洲 | DELTAS | 汊道=配额窗 宽=用量 鹈鹕=会话 | ![deltas](../public/shots/deltas.png) |
| `atolls` | 环礁 | ATOLLS | 礁环=配额窗 环径=用量 燕鸥=会话 | ![atolls](../public/shots/atolls.png) |
| `reefs` | 礁脉 | REEFS | 珊瑚=配额窗 高=用量 鱼群=会话 | ![reefs](../public/shots/reefs.png) |
| `lagoons` | 泻湖 | LAGOONS | 澙湖=配额窗 池径=用量 火烈鸟=会话 | ![lagoons](../public/shots/lagoons.png) |
| `shoals` | 浅洲 | SHOALS | 浅洲=配额窗 丘高=用量 燕鸥=会话 | ![shoals](../public/shots/shoals.png) |
| `sandbars` | 沙洲 | SANDBARS | 沙洲=配额窗 长=用量 蛎鹬=会话 | ![sandbars](../public/shots/sandbars.png) |
| `breakers` | 碎浪 | BREAKERS | 浪=配额窗 卷高=用量 冲浪者=会话 | ![breakers](../public/shots/breakers.png) |
| `icebergs` | 冰山群 | ICEBERGS | 冰山=配额窗 帆高=用量 海豹=会话 | ![icebergs](../public/shots/icebergs.png) |
| `floes` | 浮冰 | FLOES | 浮冰=配额窗 面积=用量 北极熊=会话 | ![floes](../public/shots/floes.png) |
| `nunataks` | 岛峰 | NUNATAKS | 岛峰=配额窗 露高=用量 雪鹀=会话 | ![nunataks](../public/shots/nunataks.png) |
| `moraines` | 冰碛 | MORAINES | 冰碛=配额窗 丘高=用量 旱獭=会话 | ![moraines](../public/shots/moraines.png) |
| `crevasses` | 冰裂隙 | CREVASSES | 裂隙=配额窗 深=用量 登山者=会话 | ![crevasses](../public/shots/crevasses.png) |
| `eskers` | 蛇丘 | ESKERS | 蛇丘=配额窗 长=用量 雷鸟=会话 | ![eskers](../public/shots/eskers.png) |
| `cirques` | 冰斗 | CIRQUES | 冰斗=配额窗 斗深=用量 山羊=会话 | ![cirques](../public/shots/cirques.png) |
| `drumlins` | 鼓丘 | DRUMLINS | 鼓丘=配额窗 长=用量 野兔=会话 | ![drumlins](../public/shots/drumlins.png) |
| `kames` | 冰砾阜 | KAMES | 砾阜=配额窗 陡=用量 松鸡=会话 | ![kames](../public/shots/kames.png) |
| `seracs` | 冰塔 | SERACS | 冰塔=配额窗 倾角=用量 渡鸦=会话 | ![seracs](../public/shots/seracs.png) |
| `buttes` | 孤丘 | BUTTES | 孤丘=配额窗 帽岩宽=用量 叉角羚=会话 | ![buttes](../public/shots/buttes.png) |
| `fins` | 石鳍 | FINS | 石鳍=配额窗 高=用量 雨燕=会话 | ![fins](../public/shots/fins.png) |
| `yardangs` | 雅丹 | YARDANGS | 雅丹=配额窗 流线=用量 耳廓狐=会话 | ![yardangs](../public/shots/yardangs.png) |
| `playas` | 干盐湖 | PLAYAS | 干盐裂=配额窗 块大=用量 帆石=会话 | ![playas](../public/shots/playas.png) |
| `wadis` | 干河谷 | WADIS | 干河谷=配额窗 辫宽=用量 骆驼=会话 | ![wadis](../public/shots/wadis.png) |
| `hamadas` | 石漠 | HAMADAS | 石漠=配额窗 嶙峋=用量 跳鼠=会话 | ![hamadas](../public/shots/hamadas.png) |
| `onsen` | 温泉 | ONSEN | 汤池=配额窗 水位=用量 蒸汽=过热 浴客=会话 | ![onsen](../public/shots/onsen.png) |
| `nightmarket` | 夜市 | NIGHTMARKET | 摊位=配额窗 灯牌=用量 提灯客=会话 | ![nightmarket](../public/shots/nightmarket.png) |
| `bonfire` | 篝火 | BONFIRE | 木石=配额窗 炭头=用量 中央火=平均 火星=会话 | ![bonfire](../public/shots/bonfire.png) |
| `workshop` | 工坊 | WORKSHOP | 工位=配额窗 摆臂=用量 吊灯=过热 工人=会话 | ![workshop](../public/shots/workshop.png) |
| `stadium` | 体育场 | STADIUM | 跑道=配额窗 弧长=用量 跑者=会话 | ![stadium](../public/shots/stadium.png) |
| `theater` | 剧场 | THEATER | 聚光=配额窗 锥度=用量 演员=会话 | ![theater](../public/shots/theater.png) |
| `arena` | 竞技场 | ARENA | 旌旗=配额窗 满度=用量 斗士=会话 | ![arena](../public/shots/arena.png) |
| `vineyard` | 葡萄园 | VINEYARD | 藤架=配额窗 果串=用量 采摘工=会话 | ![vineyard](../public/shots/vineyard.png) |
| `kitchen` | 厨房 | KITCHEN | 灶台=配额窗 汽泡=用量 火焰=过热 厨师=会话 | ![kitchen](../public/shots/kitchen.png) |
| `hangar` | 机库 | HANGAR | 停机位=配额窗 尾焰=用量 地勤=会话 | ![hangar](../public/shots/hangar.png) |
| `planetarium` | 天象馆 | PLANETARIUM | 轨道=配额窗 行星=用量 彗星=会话 | ![planetarium](../public/shots/planetarium.png) |
| `museum` | 博物馆 | MUSEUM | 展柜=配额窗 满度=用量 观众=会话 | ![museum](../public/shots/museum.png) |
| `conservatory` | 温室 | CONSERVATORY | 花盆=配额窗 株高=用量 园丁=会话 | ![conservatory](../public/shots/conservatory.png) |
| `atrium` | 中庭 | ATRIUM | 花台=配额窗 垂蔓=用量 廊客=会话 | ![atrium](../public/shots/atrium.png) |
| `kiln` | 窑炉 | KILN | 窑体=配额窗 窑火=用量 烟囱=过热 陶工=会话 | ![kiln](../public/shots/kiln.png) |
| `igloo` | 冰屋 | IGLOO | 冰屋=配额窗 门光=用量 旅人=会话 | ![igloo](../public/shots/igloo.png) |
| `apiary` | 蜂场 | APIARY | 蜂箱=配额窗 巢脾=用量 工蜂=会话 | ![apiary](../public/shots/apiary.png) |
| `avalanche` | 雪崩 | AVALANCHE | 雪檐=配额窗 裂崩=用量 滑手=会话 | ![avalanche](../public/shots/avalanche.png) |
| `arboretum` | 树木园 | ARBORETUM | 标本树=配额窗 冠幅=用量 策展人=会话 | ![arboretum](../public/shots/arboretum.png) |
| `brewery` | 酿酒坊 | BREWERY | 铜釜=配额窗 泡沫=用量 蒸汽=过热 酿酒师=会话 | ![brewery](../public/shots/brewery.png) |
| `distillery` | 蒸馏厂 | DISTILLERY | 蒸馏柱=配额窗 汽柱=用量 冷凝=过热 技师=会话 | ![distillery](../public/shots/distillery.png) |
| `mill` | 磨坊 | MILL | 磨坊=配额窗 轮速=用量 轮毂=过热 磨工=会话 | ![mill](../public/shots/mill.png) |
| `foundry` | 铸造厂 | FOUNDRY | 熔炉=配额窗 熔液=用量 出渣=过热 铸工=会话 | ![foundry](../public/shots/foundry.png) |
| `smithy` | 铁匠铺 | SMITHY | 铁砧=配额窗 锻件=用量 火花=过热 铁匠=会话 | ![smithy](../public/shots/smithy.png) |
| `tannery` | 鞣革坊 | TANNERY | 鞣池=配额窗 液位=用量 泡腾=过热 鞣工=会话 | ![tannery](../public/shots/tannery.png) |
| `glassworks` | 玻璃厂 | GLASSWORKS | 窑口=配额窗 泡团=用量 吹工=会话 | ![glassworks](../public/shots/glassworks.png) |
| `shipyard` | 造船厂 | SHIPYARD | 船台=配额窗 船体=用量 吊钩=过热 船匠=会话 | ![shipyard](../public/shots/shipyard.png) |
| `sawmill` | 锯木厂 | SAWMILL | 圆锯=配额窗 转速=用量 锯屑=过热 锯工=会话 | ![sawmill](../public/shots/sawmill.png) |
| `printshop` | 印刷坊 | PRINTSHOP | 印刷机=配额窗 压印=用量 墨辊=过热 印刷工=会话 | ![printshop](../public/shots/printshop.png) |
| `cooperage` | 箍桶坊 | COOPERAGE | 木桶=配额窗 板缝=用量 桶箍=过热 箍匠=会话 | ![cooperage](../public/shots/cooperage.png) |
| `saddler` | 鞍具坊 | SADDLER | 鞍架=配额窗 镫长=用量 鞍扣=过热 鞍匠=会话 | ![saddler](../public/shots/saddler.png) |
| `cobbler` | 鞋匠铺 | COBBLER | 鞋楦=配额窗 鞋跟=用量 鞋头=过热 鞋匠=会话 | ![cobbler](../public/shots/cobbler.png) |
| `fletcher` | 箭匠坊 | FLETCHER | 箭束=配额窗 展羽=用量 箭簇=过热 箭匠=会话 | ![fletcher](../public/shots/fletcher.png) |
| `bowyer` | 弓匠坊 | BOWYER | 弓架=配额窗 弧弯=用量 弦扣=过热 弓匠=会话 | ![bowyer](../public/shots/bowyer.png) |
| `goldsmith` | 金匠坊 | GOLDSMITH | 金环=配额窗 弧光=用量 宝托=过热 金匠=会话 | ![goldsmith](../public/shots/goldsmith.png) |
| `silversmith` | 银匠坊 | SILVERSMITH | 银杯=配额窗 碗光=用量 锤点=过热 银匠=会话 | ![silversmith](../public/shots/silversmith.png) |
| `locksmith` | 锁匠坊 | LOCKSMITH | 挂锁=配额窗 拱梁=用量 匙孔=过热 锁匠=会话 | ![locksmith](../public/shots/locksmith.png) |
| `terminal` | 终点站 | TERMINAL | 站台=配额窗 告牌=用量 蒸汽=过热 搬运工=会话 | ![terminal](../public/shots/terminal.png) |
| `etching` | 蚀刻坊 | ETCHING | 铜版=配额窗 线深=用量 划痕=过热 蚀刻师=会话 | ![etching](../public/shots/etching.png) |
| `monotype` | 单版印 | MONOTYPE | 单版=配额窗 墨厚=用量 鬼影=过热 印工=会话 | ![monotype](../public/shots/monotype.png) |
| `bazaar` | 大巴扎 | BAZAAR | 摊位=配额窗 篷纹=用量 灯笼=过热 商贩=会话 | ![bazaar](../public/shots/bazaar.png) |
| `telescope` | 观星台 | TELESCOPE | 星标=配额窗 星等=用量 十字丝=过热 观星者=会话 | ![telescope](../public/shots/telescope.png) |
| `seaport` | 海埠 | SEAPORT | 泊位=配额窗 货垛=用量 桅旗=过热 搬运工=会话 | ![seaport](../public/shots/seaport.png) |
| `laboratory` | 实验室 | LABORATORY | 器皿=配额窗 液位=用量 冷凝=过热 实验员=会话 | ![laboratory](../public/shots/laboratory.png) |
| `checkpoint` | 哨卡 | CHECKPOINT | 岗亭=配额窗 杆角=用量 号灯=过热 哨兵=会话 | ![checkpoint](../public/shots/checkpoint.png) |
| `gatehouse` | 门楼 | GATEHOUSE | 门洞=配额窗 栅深=用量 火盆=过热 守门=会话 | ![gatehouse](../public/shots/gatehouse.png) |
| `tollbooth` | 收费站 | TOLLBOOTH | 篮=配额窗 币堆=用量 帜=过热 收税=会话 | ![tollbooth](../public/shots/tollbooth.png) |
| `caravanserai` | 商队驿 | CARAVAN | 窑洞=配额窗 挂灯=用量 火盆=过热 驼夫=会话 | ![caravanserai](../public/shots/caravanserai.png) |
| `ranch2` | 牧场二号 | RANCH II | 牛=配额窗 耳标=用量 烙烟=过热 牛仔=会话 | ![ranch2](../public/shots/ranch2.png) |
| `paddock` | 围场 | PADDOCK | 驹=配额窗 草堆=用量 水槽=过热 马夫=会话 | ![paddock](../public/shots/paddock.png) |
| `corral` | 畜栏 | CORRAL | 烈马=配额窗 蹄尘=用量 门柱=过热 驯马=会话 | ![corral](../public/shots/corral.png) |
| `pasture2` | 草场二号 | PASTURE II | 羊=配额窗 绒深=用量 舔石=过热 牧人=会话 | ![pasture2](../public/shots/pasture2.png) |
| `atelier` | 画室 | ATELIER | 画布=配额窗 彩点=用量 调色刀=过热 画工=会话 | ![atelier](../public/shots/atelier.png) |
| `studio2` | 工坊二号 | STUDIO II | 轮盘=配额窗 泥堆=用量 窥孔=过热 陶工=会话 | ![studio2](../public/shots/studio2.png) |
| `workshop2` | 车间二号 | WORKSHOP II | 车床=配额窗 卡盘=用量 刀尖=过热 机工=会话 | ![workshop2](../public/shots/workshop2.png) |
| `vivarium` | 生态缸 | VIVARIUM | 缸=配额窗 叶展=用量 湿灯=过热 保育员=会话 | ![vivarium](../public/shots/vivarium.png) |
| `waypoint` | 航点 | WAYPOINT | 石堆=配额窗 路标=用量 顶旗=过热 行客=会话 | ![waypoint](../public/shots/waypoint.png) |
| `crossroads` | 十字路口 | CROSSROADS | 路牌=配额窗 臂长=用量 角灯=过热 马车=会话 | ![crossroads](../public/shots/crossroads.png) |
| `junction2` | 枢纽二号 | JUNCTION II | 转辙=配额窗 灯=用量 尖轨=过热 扳道=会话 | ![junction2](../public/shots/junction2.png) |
| `interchange` | 立交桥 | INTERCHANGE | 匝道=配额窗 墩高=用量 灯=过热 车流=会话 | ![interchange](../public/shots/interchange.png) |
| `garden2` | 园囿二号 | GARDEN II | 苗床=配额窗 垄=用量 晷针=过热 园丁=会话 | ![garden2](../public/shots/garden2.png) |
| `orchard2` | 果园二号 | ORCHARD II | 树=配额窗 果=用量 蜂=过热 摘手=会话 | ![orchard2](../public/shots/orchard2.png) |
| `vineyard2` | 葡萄园二号 | VINEYARD II | 藤行=配额窗 叶冠=用量 穗=过热 剪工=会话 | ![vineyard2](../public/shots/vineyard2.png) |
| `grove2` | 树丛二号 | GROVE II | 丛=配额窗 条=用量 篮=过热 砍柴=会话 | ![grove2](../public/shots/grove2.png) |
| `souk` | 露天集 | SOUK | 毯摊=配额窗 纹密=用量 香炉=过热 商贩=会话 | ![souk](../public/shots/souk.png) |
| `fair2` | 市集二号 | FAIR II | 帐篷=配额窗 条纹=用量 炬=过热 摊主=会话 | ![fair2](../public/shots/fair2.png) |
| `market2` | 市场二号 | MARKET II | 货摊=配额窗 堆=用量 秤=过热 摊贩=会话 | ![market2](../public/shots/market2.png) |
| `meadow2` | 草甸二号 | MEADOW II | 草垛=配额窗 草茎=用量 叉=过热 割草=会话 | ![meadow2](../public/shots/meadow2.png) |
| `threshold2` | 阈界二号 | THRESHOLD II | 门=配额窗 雾=用量 钥=过热 越客=会话 | ![threshold2](../public/shots/threshold2.png) |
| `roundabout` | 环岛 | ROUNDABOUT | 入口=配额窗 斑马=用量 岛心=过热 骑行=会话 | ![roundabout](../public/shots/roundabout.png) |
| `oasis2` | 绿洲二号 | OASIS II | 椰=配额窗 叶展=用量 蜃=过热 驼客=会话 | ![oasis2](../public/shots/oasis2.png) |
| `reserve2` | 保护区二号 | RESERVE II | 观测=配额窗 隙=用量 栖枝=过热 守护=会话 | ![reserve2](../public/shots/reserve2.png) |
| `desert` | 沙丘 | DESERT | 丘=配额窗 高=用量 驼=会话 | ![desert](../public/shots/desert.png) |

## 用量 (233)

| id | 标题 | eyebrow | 说明 | 预览 |
|---|---|---|---|---|
| `warehouse` | 仓库 | TOKEN WAREHOUSE | 架=provider 箱=token 灯=会话 | ![warehouse](../public/shots/warehouse.png) |
| `cartographer` | 地图师 | USAGE CARTOGRAPHY | 峰=provider 等高线=token | ![cartographer](../public/shots/cartographer.png) |
| `flagstone` | 石板路 | LOG FLAGSTONES | 石=日志 宽=token 裂=错 | ![flagstone](../public/shots/flagstone.png) |
| `topography` | 地形 | PROVIDER TOPOGRAPHY | 峰=provider 高=token 旗=会话 崩=错 | ![topography](../public/shots/topography.png) |
| `geodesic` | 穹顶 | LOG GEODESIC | 面=日志 色=provider 裂=错 | ![geodesic](../public/shots/geodesic.png) |
| `topiary` | 修剪园 | PROVIDER TOPIARY | 冠=provider 高=token 鸟=会话 枯=错 | ![topiary](../public/shots/topiary.png) |
| `flotsam` | 漂流瓶 | LOG FLOTSAM | 瓶=日志 塞=token 裂=错 | ![flotsam](../public/shots/flotsam.png) |
| `clinker` | 烧结砖 | LOG CLINKER | 砖=日志 温=token 裂=错 | ![clinker](../public/shots/clinker.png) |
| `pitstop` | 维修站 | PROVIDER PITSTOP | 道=provider 车=token 胎=用量 旗=错 | ![pitstop](../public/shots/pitstop.png) |
| `belljar` | 钟形罩 | PROVIDER BELLJAR | 罩=provider 植=token 露=会话 裂=错 | ![belljar](../public/shots/belljar.png) |
| `driftline` | 雪脊 | PROVIDER DRIFTLINE | 堆=provider 高=token 粒=会话 裂=错 | ![driftline](../public/shots/driftline.png) |
| `windfarm` | 风电场 | PROVIDER WINDFARM | 塔=provider 叶=用量 条=错 | ![windfarm](../public/shots/windfarm.png) |
| `quarry` | 采石场 | PROVIDER QUARRY | 层=provider 深=token 车=会话 脉=错 | ![quarry](../public/shots/quarry.png) |
| `pier` | 防波堤 | PROVIDER PIER | 桩=provider 深=token 鸟=会话 斜=错 | ![pier](../public/shots/pier.png) |
| `faultline` | 断层 | PROVIDER FAULTLINE | 迹=provider 错=token 震=会话 带=错 | ![faultline](../public/shots/faultline.png) |
| `cloister` | 回廊 | PROVIDER CLOISTER | 拱=provider 深=token 烛=会话 坠=错 | ![cloister](../public/shots/cloister.png) |
| `sounder` | 测深锤 | PROVIDER SOUNDER | 坠=provider 深=token 溅=会话 断=错 | ![sounder](../public/shots/sounder.png) |
| `odeon` | 乐厅 | PROVIDER ODEON | 环=provider 座=token 炬=会话 | ![odeon](../public/shots/odeon.png) |
| `steelyard` | 杆秤 | PROVIDER STEELYARD | 杆=provider 砣=token 钩=会话 断=错 | ![steelyard](../public/shots/steelyard.png) |
| `orangery` | 橘温室 | PROVIDER ORANGERY | 树=provider 果=token 壶=会话 裂=错 | ![orangery](../public/shots/orangery.png) |
| `hammam` | 浴场 | PROVIDER HAMMAM | 池=provider 汽=token 巾=会话 裂=错 | ![hammam](../public/shots/hammam.png) |
| `battery` | 炮垒 | PROVIDER BATTERY | 位=provider 烟=token 长=会话 炸=错 | ![battery](../public/shots/battery.png) |
| `spinning` | 纺车 | PROVIDER SPINNING | 车=provider 线=token 踏=会话 断=错 | ![spinning](../public/shots/spinning.png) |
| `typecase` | 字盘 | PROVIDER TYPECASE | 盘=provider 铅=token 手=会话 裂=错 | ![typecase](../public/shots/typecase.png) |
| `tollhouse` | 收费站 | PROVIDER TOLLHOUSE | 亭=provider 铃=token 旅=会话 断=错 | ![tollhouse](../public/shots/tollhouse.png) |
| `fermentery` | 发酵坊 | PROVIDER FERMENTERY | 桶=provider 泡=token 管=会话 裂=错 | ![fermentery](../public/shots/fermentery.png) |
| `columbarium` | 龛堂 | PROVIDER COLUMBARIUM | 龛=provider 光=token 灯=会话 裂=错 | ![columbarium](../public/shots/columbarium.png) |
| `anatomy` | 解剖剧场 | PROVIDER ANATOMY | 座=provider 烛=token 指=会话 肋=错 | ![anatomy](../public/shots/anatomy.png) |
| `ropewalk` | 绳廊 | PROVIDER ROPEWALK | 道=provider 捻=token 转=会话 断=错 | ![ropewalk](../public/shots/ropewalk.png) |
| `brickyard` | 砖窑 | PROVIDER BRICKYARD | 窑=provider 烟=token 车=会话 裂=错 | ![brickyard](../public/shots/brickyard.png) |
| `overshot` | 水轮 | PROVIDER OVERSHOT | 轮=provider 斗=token 槽=会话 裂=错 | ![overshot](../public/shots/overshot.png) |
| `smokehouse` | 熏房 | PROVIDER SMOKEHOUSE | 房=provider 烟=token 挂=会话 裂=错 | ![smokehouse](../public/shots/smokehouse.png) |
| `serac` | 冰塔 | PROVIDER SERAC | 塔=provider 高=token 绳=会话 崩=错 | ![serac](../public/shots/serac.png) |
| `filature` | 缫丝 | PROVIDER FILATURE | 盆=provider 茧=token 丝=会话 裂=错 | ![filature](../public/shots/filature.png) |
| `malthouse` | 芽床 | PROVIDER MALTHOUSE | 床=provider 芽=token 铲=会话 焦=错 | ![malthouse](../public/shots/malthouse.png) |
| `kelpfarm` | 藻筏 | PROVIDER KELPFARM | 筏=provider 藻=token 船=会话 断=错 | ![kelpfarm](../public/shots/kelpfarm.png) |
| `sugarmill` | 糖坊 | PROVIDER SUGARMILL | 辊=provider 汁=token 蔗=会话 裂=错 | ![sugarmill](../public/shots/sugarmill.png) |
| `belfry` | 钟塔 | PROVIDER BELFRY | 塔=provider 摆=token 铃=会话 轭=错 | ![belfry](../public/shots/belfry.png) |
| `clothesline` | 晾衣绳 | PROVIDER CLOTHESLINE | 绳=provider 衣=token 风=会话 断=错 | ![clothesline](../public/shots/clothesline.png) |
| `incline` | 斜道 | PROVIDER INCLINE | 坡=provider 车=token 站=会话 翻=错 | ![incline](../public/shots/incline.png) |
| `pigeonry` | 鸽房 | PROVIDER PIGEONRY | 孔=provider 鸽=token 旋=会话 裂=错 | ![pigeonry](../public/shots/pigeonry.png) |
| `tenterfield` | 拉幅场 | PROVIDER TENTERFIELD | 架=provider 布=token 风=会话 撕=错 | ![tenterfield](../public/shots/tenterfield.png) |
| `fullery` | 缩绒坊 | PROVIDER FULLERY | 槽=provider 布=token 锤=会话 裂=错 | ![fullery](../public/shots/fullery.png) |
| `lapidary` | 宝石坊 | PROVIDER LAPIDARY | 盘=provider 石=token 臂=会话 崩=错 | ![lapidary](../public/shots/lapidary.png) |
| `sailloft` | 帆篷 | PROVIDER SAILLOFT | 帆=provider 板=token 匠=会话 撕=错 | ![sailloft](../public/shots/sailloft.png) |
| `limekiln` | 石灰窑 | PROVIDER LIMEKILN | 窑=provider 火=token 拱=会话 塌=错 | ![limekiln](../public/shots/limekiln.png) |
| `charcoalmeiler` | 炭堆 | PROVIDER CHARCOAL MEILER | 堆=provider 孔=token 匠=会话 喷=错 | ![charcoalmeiler](../public/shots/charcoalmeiler.png) |
| `cressbed` | 水芹床 | PROVIDER CRESSBED | 槽=provider 芹=token 采=会话 污=错 | ![cressbed](../public/shots/cressbed.png) |
| `glasshouse` | 玻璃坊 | PROVIDER GLASSHOUSE | 炉=provider 泡=token 匠=会话 裂=错 | ![glasshouse](../public/shots/glasshouse.png) |
| `mews` | 鹰房 | PROVIDER MEWS | 位=provider 鹰=token 扑=会话 失=错 | ![mews](../public/shots/mews.png) |
| `vinery` | 葡萄房 | PROVIDER VINERY | 架=provider 穗=token 剪=会话 裂=错 | ![vinery](../public/shots/vinery.png) |
| `bleachfield` | 漂场 | PROVIDER BLEACHFIELD | 场=provider 布=token 翻=会话 焦=错 | ![bleachfield](../public/shots/bleachfield.png) |
| `bloomery` | 块炼炉 | PROVIDER BLOOMERY | 炉=provider 团=token 鞴=会话 渣=错 | ![bloomery](../public/shots/bloomery.png) |
| `stewpond` | 鱼塘 | PROVIDER STEWPOND | 塘=provider 鱼=token 僧=会话 漏=错 | ![stewpond](../public/shots/stewpond.png) |
| `wheelwright` | 轮匠坊 | PROVIDER WHEELWRIGHT | 轮=provider 辐=token 匠=会话 裂=错 | ![wheelwright](../public/shots/wheelwright.png) |
| `dovecote` | 鸽楼 | PROVIDER DOVECOTE | 楼=provider 孔=token 旋=会话 破=错 | ![dovecote](../public/shots/dovecote.png) |
| `chandlery` | 蜡烛坊 | PROVIDER CHANDLERY | 架=provider 烛=token 匠=会话 泪=错 | ![chandlery](../public/shots/chandlery.png) |
| `letterpress` | 活版印坊 | PROVIDER LETTERPRESS | 机=provider 页=token 工=会话 卡=错 | ![letterpress](../public/shots/letterpress.png) |
| `potbank` | 陶窑厂 | PROVIDER POTBANK | 窑=provider 匣=token 工=会话 鼓=错 | ![potbank](../public/shots/potbank.png) |
| `blondin` | 缆索采场 | PROVIDER BLONDIN | 索=provider 板=token 车=会话 断=错 | ![blondin](../public/shots/blondin.png) |
| `transporter` | 运输桥 | PROVIDER TRANSPORTER | 塔=provider 车=token 渡=会话 索=错 | ![transporter](../public/shots/transporter.png) |
| `mailcoach` | 驿马车 | PROVIDER MAILCOACH | 车=provider 袋=token 骑=会话 轮=错 | ![mailcoach](../public/shots/mailcoach.png) |
| `puddling` | 搅炼炉 | PROVIDER PUDDLING | 炉=provider 球=token 搅=会话 冷=错 | ![puddling](../public/shots/puddling.png) |
| `implosion` | 定向爆破 | PROVIDER IMPLOSION | 楼=provider 药=token 手=会话 哑=错 | ![implosion](../public/shots/implosion.png) |
| `treadwheelcrane` | 踏轮吊 | PROVIDER TREADWHEEL CRANE | 吊=provider 包=token 人=会话 索=错 | ![treadwheelcrane](../public/shots/treadwheelcrane.png) |
| `tanpit` | 鞣皮坑 | PROVIDER TANPIT | 坑=provider 皮=token 匠=会话 腐=错 | ![tanpit](../public/shots/tanpit.png) |
| `lightship` | 灯船 | PROVIDER LIGHTSHIP | 船=provider 光=token 守=会话 熄=错 | ![lightship](../public/shots/lightship.png) |
| `lagar` | 踏酒槽 | PROVIDER LAGAR | 槽=provider 汁=token 人=会话 漏=错 | ![lagar](../public/shots/lagar.png) |
| `dragonbone` | 龙骨水车 | PROVIDER DRAGONBONE | 槽=provider 板=token 摇=会话 落=错 | ![dragonbone](../public/shots/dragonbone.png) |
| `pumpjack` | 磕头机 | PROVIDER PUMPJACK | 架=provider 冲=token 工=会话 齿=错 | ![pumpjack](../public/shots/pumpjack.png) |
| `ropeway` | 索道 | PROVIDER ROPEWAY | 架=provider 斗=token 工=会话 落=错 | ![ropeway](../public/shots/ropeway.png) |
| `canallock` | 船闸 | PROVIDER CANALLOCK | 室=provider 水=token 工=会话 漏=错 | ![canallock](../public/shots/canallock.png) |
| `bascule` | 开启桥 | PROVIDER BASCULE | 瓣=provider 角=token 工=会话 卡=错 | ![bascule](../public/shots/bascule.png) |
| `smokejack` | 烟轮 | PROVIDER SMOKEJACK | 囱=provider 轮=token 叉=会话 垢=错 | ![smokejack](../public/shots/smokejack.png) |
| `flapgate` | 潮闸 | PROVIDER FLAPGATE | 涵=provider 板=token 守=会话 卡=错 | ![flapgate](../public/shots/flapgate.png) |
| `blastfurnace` | 高炉 | PROVIDER BLAST FURNACE | 炉=provider 焰=token 工=会话 凝=错 | ![blastfurnace](../public/shots/blastfurnace.png) |
| `mashtun` | 糖化槽 | PROVIDER MASH TUN | 槽=provider 醪=token 工=会话 焦=错 | ![mashtun](../public/shots/mashtun.png) |
| `boxbellows` | 箱风箱 | PROVIDER BOX BELLOWS | 箱=provider 塞=token 工=会话 裂=错 | ![boxbellows](../public/shots/boxbellows.png) |
| `plateway` | 盘道 | PROVIDER PLATEWAY | 轨=provider 车=token 工=会话 断=错 | ![plateway](../public/shots/plateway.png) |
| `whimgin` | 马力绞盘 | PROVIDER WHIM GIN | 轮=provider 绳=token 马=会话 断=错 | ![whimgin](../public/shots/whimgin.png) |
| `woolshed` | 剪毛棚 | PROVIDER WOOLSHED | 棚=provider 垛=token 工=会话 污=错 | ![woolshed](../public/shots/woolshed.png) |
| `blockmaker` | 滑轮匠 | PROVIDER BLOCKMAKER | 轮=provider 槽=token 匠=会话 裂=错 | ![blockmaker](../public/shots/blockmaker.png) |
| `glassblow` | 玻璃吹炉 | PROVIDER GLASSBLOW | 炉=provider 泡=token 匠=会话 裂=错 | ![glassblow](../public/shots/glassblow.png) |
| `dyevat` | 染缸 | PROVIDER DYEVAT | 缸=provider 液=token 工=会话 漏=错 | ![dyevat](../public/shots/dyevat.png) |
| `meiler` | 炭堆 | PROVIDER MEILER | 堆=provider 烟=token 工=会话 陷=错 | ![meiler](../public/shots/meiler.png) |
| `alembic` | 蒸馏釜 | PROVIDER ALEMBIC | 釜=provider 滴=token 工=会话 裂=错 | ![alembic](../public/shots/alembic.png) |
| `sugarloaf` | 糖锥 | PROVIDER SUGARLOAF | 模=provider 滴=token 工=会话 裂=错 | ![sugarloaf](../public/shots/sugarloaf.png) |
| `sawpit` | 坑锯 | PROVIDER SAWPIT | 木=provider 板=token 工=会话 夹=错 | ![sawpit](../public/shots/sawpit.png) |
| `slipway` | 滑道船台 | PROVIDER SLIPWAY | 台=provider 肋=token 匠=会话 拱=错 | ![slipway](../public/shots/slipway.png) |
| `screwpress` | 压币机 | PROVIDER SCREWPRESS | 机=provider 币=token 工=会话 剪=错 | ![screwpress](../public/shots/screwpress.png) |
| `corning` | 腌肉坊 | PROVIDER CORNING | 桶=provider 肉=token 工=会话 漏=错 | ![corning](../public/shots/corning.png) |
| `fishweir` | 鱼梁 | PROVIDER FISHWEIR | 堰=provider 鱼=token 人=会话 断=错 | ![fishweir](../public/shots/fishweir.png) |
| `brinepan` | 煮盐盘 | PROVIDER BRINEPAN | 盘=provider 盐=token 人=会话 焦=错 | ![brinepan](../public/shots/brinepan.png) |
| `stampmill` | 捣矿磨 | PROVIDER STAMPMILL | 架=provider 锤=token 工=会话 脱=错 | ![stampmill](../public/shots/stampmill.png) |
| `leachpit` | 淋灰坑 | PROVIDER LEACHPIT | 斗=provider 碱=token 人=会话 漏=错 | ![leachpit](../public/shots/leachpit.png) |
| `netloft` | 织网楼 | PROVIDER NETLOFT | 网=provider 目=token 工=会话 破=错 | ![netloft](../public/shots/netloft.png) |
| `oilpress` | 油榨坊 | PROVIDER OILPRESS | 床=provider 油=token 人=会话 裂=错 | ![oilpress](../public/shots/oilpress.png) |
| `ashlaryard` | 琢石场 | PROVIDER ASHLARYARD | 台=provider 块=token 匠=会话 崩=错 | ![ashlaryard](../public/shots/ashlaryard.png) |
| `saggaryard` | 匣钵堆场 | PROVIDER SAGGARYARD | 堆=provider 坯=token 工=会话 裂=错 | ![saggaryard](../public/shots/saggaryard.png) |
| `dyehouse` | 染坊 | PROVIDER DYEHOUSE | 缸=provider 绞=token 工=会话 渍=错 | ![dyehouse](../public/shots/dyehouse.png) |
| `coopery` | 箍桶铺 | PROVIDER COOPERY | 桶=provider 板=token 匠=会话 脱=错 | ![coopery](../public/shots/coopery.png) |
| `waxhouse` | 蜡烛屋 | PROVIDER WAXHOUSE | 架=provider 烛=token 匠=会话 泪=错 | ![waxhouse](../public/shots/waxhouse.png) |
| `fishgarth` | 渔堰 | PROVIDER FISHGARTH | 堰=provider 鱼=token 人=会话 破=错 | ![fishgarth](../public/shots/fishgarth.png) |
| `turnery` | 车旋坊 | PROVIDER TURNERY | 床=provider 坯=token 匠=会话 裂=错 | ![turnery](../public/shots/turnery.png) |
| `smokery` | 熏坊 | PROVIDER SMOKERY | 架=provider 条=token 人=会话 坠=错 | ![smokery](../public/shots/smokery.png) |
| `ciderpress` | 苹果酒坊 | PROVIDER CIDERPRESS | 床=provider 汁=token 人=会话 散=错 | ![ciderpress](../public/shots/ciderpress.png) |
| `brickclamp` | 砖窑夹 | PROVIDER BRICKCLAMP | 堆=provider 砖=token 人=会话 焦=错 | ![brickclamp](../public/shots/brickclamp.png) |
| `limeburn` | 石灰窑 | PROVIDER LIMEBURN | 窑=provider 灰=token 工=会话 裂=错 | ![limeburn](../public/shots/limeburn.png) |
| `maltkiln` | 焙麦窑 | PROVIDER MALTKILN | 床=provider 麦=token 工=会话 焦=错 | ![maltkiln](../public/shots/maltkiln.png) |
| `saltcote` | 盐屋 | PROVIDER SALTCOTE | 槽=provider 盐=token 工=会话 浊=错 | ![saltcote](../public/shots/saltcote.png) |
| `tarkiln` | 沥青窑 | PROVIDER TARKILN | 釜=provider 漆=token 工=会话 溢=错 | ![tarkiln](../public/shots/tarkiln.png) |
| `barkhouse` | 鞣皮坊 | PROVIDER BARKHOUSE | 磨=provider 屑=token 工=会话 卡=错 | ![barkhouse](../public/shots/barkhouse.png) |
| `sugarhouse` | 糖坊 | PROVIDER SUGARHOUSE | 锅=provider 沸=token 工=会话 糊=错 | ![sugarhouse](../public/shots/sugarhouse.png) |
| `vinegarhouse` | 醋坊 | PROVIDER VINEGARHOUSE | 桶=provider 母=token 人=会话 腻=错 | ![vinegarhouse](../public/shots/vinegarhouse.png) |
| `brewhouse` | 酿酒坊 | PROVIDER BREWHOUSE | 槽=provider 帽=token 匠=会话 凝=错 | ![brewhouse](../public/shots/brewhouse.png) |
| `palmento` | 踩酒庄 | PROVIDER PALMENTO | 池=provider 帽=token 人=会话 酸=错 | ![palmento](../public/shots/palmento.png) |
| `cornloft` | 高架谷仓 | PROVIDER CORNLOFT | 仓=provider 谷=token 工=会话 蠹=错 | ![cornloft](../public/shots/cornloft.png) |
| `glasscone` | 玻璃窑 | PROVIDER GLASSCONE | 窑=provider 泡=token 匠=会话 霜=错 | ![glasscone](../public/shots/glasscone.png) |
| `yarnloft` | 绞线楼 | PROVIDER YARNLOFT | 轮=provider 绞=token 工=会话 缠=错 | ![yarnloft](../public/shots/yarnloft.png) |
| `gigmill` | 起绒机 | PROVIDER GIGMILL | 辊=provider 绒=token 工=会话 撕=错 | ![gigmill](../public/shots/gigmill.png) |
| `pinmill` | 制针坊 | PROVIDER PINMILL | 轮=provider 针=token 工=会话 折=错 | ![pinmill](../public/shots/pinmill.png) |
| `wirebench` | 拉丝台 | PROVIDER WIREBENCH | 台=provider 线=token 人=会话 断=错 | ![wirebench](../public/shots/wirebench.png) |
| `nailery` | 钉坊 | PROVIDER NAILERY | 砧=provider 钉=token 匠=会话 弯=错 | ![nailery](../public/shots/nailery.png) |
| `finery` | 精炼炉 | PROVIDER FINERY | 炉=provider 团=token 工=会话 冷=错 | ![finery](../public/shots/finery.png) |
| `slittingmill` | 纵剪机 | PROVIDER SLITTINGMILL | 辊=provider 条=token 人=会话 卡=错 | ![slittingmill](../public/shots/slittingmill.png) |
| `japanworks` | 涂漆坊 | PROVIDER JAPANWORKS | 架=provider 件=token 匠=会话 泡=错 | ![japanworks](../public/shots/japanworks.png) |
| `pressroom` | 印刷坊 | PROVIDER PRESSROOM | 机=provider 张=token 匠=会话 污=错 | ![pressroom](../public/shots/pressroom.png) |
| `bindery` | 装订坊 | PROVIDER BINDERY | 架=provider 帖=token 工=会话 散=错 | ![bindery](../public/shots/bindery.png) |
| `paperpress` | 压纸坊 | PROVIDER PAPERPRESS | 压=provider 帖=token 工=会话 皱=错 | ![paperpress](../public/shots/paperpress.png) |
| `bodger` | 绿木工 | PROVIDER BODGER | 马=provider 腿=token 工=会话 裂=错 | ![bodger](../public/shots/bodger.png) |
| `joinery` | 细木坊 | PROVIDER JOINERY | 台=provider 榫=token 工=会话 崩=错 | ![joinery](../public/shots/joinery.png) |
| `ripsaw` | 拉锯坊 | PROVIDER RIPSAW | 锯=provider 板=token 工=会话 卡=错 | ![ripsaw](../public/shots/ripsaw.png) |
| `steambend` | 蒸弯坊 | PROVIDER STEAMBEND | 箱=provider 条=token 工=会话 弹=错 | ![steambend](../public/shots/steambend.png) |
| `marquetry` | 镶嵌坊 | PROVIDER MARQUETRY | 板=provider 片=token 匠=会话 翘=错 | ![marquetry](../public/shots/marquetry.png) |
| `clockbench` | 钟表坊 | PROVIDER CLOCKBENCH | 轮=provider 齿=token 匠=会话 断=错 | ![clockbench](../public/shots/clockbench.png) |
| `lensgrinder` | 磨镜坊 | PROVIDER LENSGRINDER | 盘=provider 镜=token 匠=会话 干=错 | ![lensgrinder](../public/shots/lensgrinder.png) |
| `filer` | 锉匠坊 | PROVIDER FILER | 台=provider 件=token 工=会话 钝=错 | ![filer](../public/shots/filer.png) |
| `planer` | 刨床坊 | PROVIDER PLANER | 床=provider 屑=token 工=会话 撕=错 | ![planer](../public/shots/planer.png) |
| `cordwain` | 制鞋坊 | PROVIDER CORDWAIN | 楦=provider 鞋=token 匠=会话 裂=错 | ![cordwain](../public/shots/cordwain.png) |
| `harnessmaker` | 马具坊 | PROVIDER HARNESSMAKER | 轭=provider 套=token 匠=会话 松=错 | ![harnessmaker](../public/shots/harnessmaker.png) |
| `tinsmith` | 锡器坊 | PROVIDER TINSMITH | 卷=provider 壶=token 工=会话 裂=错 | ![tinsmith](../public/shots/tinsmith.png) |
| `pewterer` | 白镴坊 | PROVIDER PEWTERER | 埚=provider 罐=token 匠=会话 干=错 | ![pewterer](../public/shots/pewterer.png) |
| `cannonfoundry` | 铸炮坊 | PROVIDER CANNONFOUNDRY | 镗=provider 炮=token 匠=会话 砂=错 | ![cannonfoundry](../public/shots/cannonfoundry.png) |
| `farrier` | 蹄铁坊 | PROVIDER FARRIER | 箱=provider 蹄=token 匠=会话 偏=错 | ![farrier](../public/shots/farrier.png) |
| `knifegrinder` | 磨刀坊 | PROVIDER KNIFEGRINDER | 轮=provider 刀=token 工=会话 缺=错 | ![knifegrinder](../public/shots/knifegrinder.png) |
| `keysmith` | 锁匙坊 | PROVIDER KEYSMITH | 台=provider 匙=token 工=会话 偏=错 | ![keysmith](../public/shots/keysmith.png) |
| `riddle` | 筛坊 | PROVIDER RIDDLE | 筛=provider 粒=token 工=会话 破=错 | ![riddle](../public/shots/riddle.png) |
| `hooper` | 箍匠坊 | PROVIDER HOOPER | 桶=provider 箍=token 匠=会话 脱=错 | ![hooper](../public/shots/hooper.png) |
| `mint` | 铸币坊 | PROVIDER MINT | 压=provider 币=token 工=会话 裂=错 | ![mint](../public/shots/mint.png) |
| `litho` | 石印坊 | PROVIDER LITHO | 版=provider 印=token 工=会话 糊=错 | ![litho](../public/shots/litho.png) |
| `pottery` | 陶坊 | PROVIDER POTTERY | 轮=provider 坯=token 工=会话 塌=错 | ![pottery](../public/shots/pottery.png) |
| `warploom` | 立织机 | PROVIDER WARPLOOM | 机=provider 经=token 工=会话 断=错 | ![warploom](../public/shots/warploom.png) |
| `scriptorium` | 抄写坊 | PROVIDER SCRIPTORIUM | 案=provider 页=token 笔=会话 污=错 | ![scriptorium](../public/shots/scriptorium.png) |
| `whipcord` | 绞绳坊 | PROVIDER WHIPCORD | 架=provider 股=token 工=会话 扭=错 | ![whipcord](../public/shots/whipcord.png) |
| `tentmaker` | 帐幕坊 | PROVIDER TENTMAKER | 架=provider 幅=token 工=会话 撕=错 | ![tentmaker](../public/shots/tentmaker.png) |
| `horsegin` | 绞盘坊 | PROVIDER HORSEGIN | 盘=provider 桶=token 马=会话 卡=错 | ![horsegin](../public/shots/horsegin.png) |
| `cupola` | 冶炼坊 | PROVIDER CUPOLA | 炉=provider 锭=token 工=会话 凝=错 | ![cupola](../public/shots/cupola.png) |
| `assay` | 化验坊 | PROVIDER ASSAY | 秤=provider 码=token 师=会话 漂=错 | ![assay](../public/shots/assay.png) |
| `noria` | 链水车 | PROVIDER NORIA | 轮=provider 兜=token 工=会话 绞=错 | ![noria](../public/shots/noria.png) |
| `hollander` | 打浆坊 | PROVIDER HOLLANDER | 槽=provider 张=token 工=会话 裂=错 | ![hollander](../public/shots/hollander.png) |
| `trapetum` | 碾油坊 | PROVIDER TRAPETUM | 碾=provider 油=token 工=会话 裂=错 | ![trapetum](../public/shots/trapetum.png) |
| `fuller` | 漂洗坊 | PROVIDER FULLER | 槽=provider 匹=token 工=会话 裂=错 | ![fuller](../public/shots/fuller.png) |
| `brickfield` | 砖窑场 | PROVIDER BRICKFIELD | 窑=provider 砖=token 工=会话 塌=错 | ![brickfield](../public/shots/brickfield.png) |
| `gloryhole` | 吹制坊 | PROVIDER GLORYHOLE | 炉=provider 泡=token 工=会话 裂=错 | ![gloryhole](../public/shots/gloryhole.png) |
| `topcart` | 顶车坊 | PROVIDER TOPCART | 轮=provider 股=token 车=会话 绷=错 | ![topcart](../public/shots/topcart.png) |
| `hogshead` | 大桶坊 | PROVIDER HOGSHEAD | 桶=provider 箍=token 匠=会话 崩=错 | ![hogshead](../public/shots/hogshead.png) |
| `cordwood` | 柴炭场 | PROVIDER CORDWOOD | 堆=provider 捆=token 工=会话 塌=错 | ![cordwood](../public/shots/cordwood.png) |
| `triphammer` | 锤锻坊 | PROVIDER TRIPHAMMER | 锤=provider 锻=token 工=会话 落=错 | ![triphammer](../public/shots/triphammer.png) |
| `drawkiln` | 抽料窑 | PROVIDER DRAWKILN | 窑=provider 料=token 工=会话 堵=错 | ![drawkiln](../public/shots/drawkiln.png) |
| `bleachgreen` | 漂青场 | PROVIDER BLEACHGREEN | 场=provider 匹=token 工=会话 焦=错 | ![bleachgreen](../public/shots/bleachgreen.png) |
| `sailmaker` | 帆匠坊 | PROVIDER SAILMAKER | 台=provider 帆=token 匠=会话 撕=错 | ![sailmaker](../public/shots/sailmaker.png) |
| `nursery` | 苗圃 | PROVIDER NURSERY | 床=provider 苗=token 工=会话 蔫=错 | ![nursery](../public/shots/nursery.png) |
| `basketry` | 编篮坊 | PROVIDER BASKETRY | 框=provider 股=token 工=会话 折=错 | ![basketry](../public/shots/basketry.png) |
| `hopyard` | 啤酒花架 | PROVIDER HOPYARD | 架=provider 藤=token 工=会话 断=错 | ![hopyard](../public/shots/hopyard.png) |
| `gravelpit` | 采砾坑 | PROVIDER GRAVELPIT | 坑=provider 砾=token 工=会话 塌=错 | ![gravelpit](../public/shots/gravelpit.png) |
| `saltpan` | 晒盐池 | PROVIDER SALTPAN | 池=provider 晶=token 耙=会话 决=错 | ![saltpan](../public/shots/saltpan.png) |
| `tileworks` | 瓦作场 | PROVIDER TILEWORKS | 窑=provider 瓦=token 工=会话 裂=错 | ![tileworks](../public/shots/tileworks.png) |
| `wormtub` | 冷凝坊 | PROVIDER WORMTUB | 槽=provider 滴=token 工=会话 漏=错 | ![wormtub](../public/shots/wormtub.png) |
| `tallow` | 熬脂坊 | PROVIDER TALLOW | 锅=provider 块=token 工=会话 糊=错 | ![tallow](../public/shots/tallow.png) |
| `engraving` | 雕版坊 | PROVIDER ENGRAVING | 版=provider 线=token 工=会话 滑=错 | ![engraving](../public/shots/engraving.png) |
| `polelathe` | 杆车床 | PROVIDER POLELATHE | 床=provider 坯=token 工=会话 甩=错 | ![polelathe](../public/shots/polelathe.png) |
| `heckle` | 梳麻坊 | PROVIDER HECKLE | 台=provider 缕=token 工=会话 折=错 | ![heckle](../public/shots/heckle.png) |
| `inkworks` | 制墨坊 | PROVIDER INKWORKS | 锅=provider 锭=token 工=会话 裂=错 | ![inkworks](../public/shots/inkworks.png) |
| `oysterbed` | 牡蛎床 | PROVIDER OYSTERBED | 床=provider 蚝=token 舟=会话 碎=错 | ![oysterbed](../public/shots/oysterbed.png) |
| `granary` | 谷仓 | PROVIDER GRANARY | 仓=provider 袋=token 农=会话 爆=错 | ![granary](../public/shots/granary.png) |
| `creamery` | 乳酪坊 | PROVIDER CREAMERY | 搅=provider 酪=token 工=会话 裂=错 | ![creamery](../public/shots/creamery.png) |
| `goffering` | 褶熨坊 | PROVIDER GOFFERING | 筒=provider 褶=token 工=会话 焦=错 | ![goffering](../public/shots/goffering.png) |
| `starchery` | 浆纱坊 | PROVIDER STARCHERY | 槽=provider 匹=token 工=会话 霉=错 | ![starchery](../public/shots/starchery.png) |
| `glazier` | 镶玻璃坊 | PROVIDER GLAZIER | 窗=provider 格=token 工=会话 裂=错 | ![glazier](../public/shots/glazier.png) |
| `lampwright` | 灯具坊 | PROVIDER LAMPWRIGHT | 台=provider 焰=token 工=会话 熏=错 | ![lampwright](../public/shots/lampwright.png) |
| `luthier` | 提琴坊 | PROVIDER LUTHIER | 台=provider 琴=token 工=会话 裂=错 | ![luthier](../public/shots/luthier.png) |
| `watchmaker` | 钟表坊 | PROVIDER WATCHMAKER | 台=provider 轮=token 工=会话 弹=错 | ![watchmaker](../public/shots/watchmaker.png) |
| `illuminator` | 缮写坊 | PROVIDER ILLUMINATOR | 案=provider 彩=token 工=会话 污=错 | ![illuminator](../public/shots/illuminator.png) |
| `jacquard` | 提花织坊 | PROVIDER JACQUARD | 机=provider 纹=token 工=会话 断=错 | ![jacquard](../public/shots/jacquard.png) |
| `lacemaker` | 蕾丝坊 | PROVIDER LACEMAKER | 枕=provider 辫=token 工=会话 挂=错 | ![lacemaker](../public/shots/lacemaker.png) |
| `apothecary` | 药房 | PROVIDER APOTHECARY | 柜=provider 瓶=token 秤=会话 裂=错 | ![apothecary](../public/shots/apothecary.png) |
| `hatter` | 帽匠坊 | PROVIDER HATTER | 楦=provider 帽=token 工=会话 破=错 | ![hatter](../public/shots/hatter.png) |
| `milliner` | 女帽坊 | PROVIDER MILLINER | 架=provider 饰=token 工=会话 破=错 | ![milliner](../public/shots/milliner.png) |
| `haberdasher` | 杂货坊 | PROVIDER HABERDASHER | 柜=provider 卷=token 尺=会话 洒=错 | ![haberdasher](../public/shots/haberdasher.png) |
| `osier` | 柳编坊 | PROVIDER OSIER | 凳=provider 篮=token 条=会话 弹=错 | ![osier](../public/shots/osier.png) |
| `perfumery` | 调香坊 | PROVIDER PERFUMERY | 案=provider 瓶=token 工=会话 洒=错 | ![perfumery](../public/shots/perfumery.png) |
| `tinker` | 白铁匠 | PROVIDER TINKER | 炉=provider 壶=token 焊=会话 漏=错 | ![tinker](../public/shots/tinker.png) |
| `quern` | 手磨坊 | PROVIDER QUERN | 盘=provider 谷=token 转=会话 裂=错 | ![quern](../public/shots/quern.png) |
| `stillroom` | 蒸馏坊 | PROVIDER STILLROOM | 釜=provider 滴=token 工=会话 爆=错 | ![stillroom](../public/shots/stillroom.png) |
| `herbalist` | 草药坊 | PROVIDER HERBALIST | 架=provider 束=token 捆=会话 枯=错 | ![herbalist](../public/shots/herbalist.png) |
| `japanner` | 莳绘坊 | PROVIDER MAKI-E | 案=provider 层=token 工=会话 泡=错 | ![japanner](../public/shots/japanner.png) |
| `banker` | 石作台 | PROVIDER BANKER | 台=provider 石=token 锤=会话 裂=错 | ![banker](../public/shots/banker.png) |
| `enameler` | 珐琅坊 | PROVIDER ENAMELER | 窑=provider 层=token 绘=会话 泡=错 | ![enameler](../public/shots/enameler.png) |
| `salter` | 腌坊 | PROVIDER SALTER | 槽=provider 鱼=token 腌=会话 腐=错 | ![salter](../public/shots/salter.png) |
| `besom` | 扫帚坊 | PROVIDER BESOM | 凳=provider 帚=token 扎=会话 散=错 | ![besom](../public/shots/besom.png) |
| `confectioner` | 糖果坊 | PROVIDER CONFECTIONER | 案=provider 糖=token 拉=会话 焦=错 | ![confectioner](../public/shots/confectioner.png) |
| `organbuilder` | 管风琴坊 | PROVIDER ORGANBUILDER | 架=provider 管=token 校=会话 凹=错 | ![organbuilder](../public/shots/organbuilder.png) |
| `flutemaker` | 笛坊 | PROVIDER FLUTEMAKER | 床=provider 笛=token 铰=会话 裂=错 | ![flutemaker](../public/shots/flutemaker.png) |
| `harpmaker` | 竖琴坊 | PROVIDER HARPMAKER | 架=provider 弦=token 雕=会话 绷=错 | ![harpmaker](../public/shots/harpmaker.png) |
| `stevedore` | 码头坊 | PROVIDER STEVEDORE | 泊=provider 包=token 钩=会话 爆=错 | ![stevedore](../public/shots/stevedore.png) |
| `lighterman` | 驳船 | PROVIDER LIGHTERMAN | 船=provider 桶=token 篙=会话 沉=错 | ![lighterman](../public/shots/lighterman.png) |
| `ferryman` | 渡船 | PROVIDER FERRYMAN | 渡=provider 客=token 缆=会话 缠=错 | ![ferryman](../public/shots/ferryman.png) |
| `lockkeeper` | 闸房 | PROVIDER LOCKKEEPER | 室=provider 水=token 绞=会话 卡=错 | ![lockkeeper](../public/shots/lockkeeper.png) |
| `narrowboat` | 窄船 | PROVIDER NARROWBOAT | 舱=provider 箱=token 舵=会话 倾=错 | ![narrowboat](../public/shots/narrowboat.png) |
| `harbormaster` | 港务 | PROVIDER HARBORMASTER | 楼=provider 船=token 旗=会话 缠=错 | ![harbormaster](../public/shots/harbormaster.png) |
| `customshouse` | 关楼 | PROVIDER CUSTOMSHOUSE | 署=provider 包=token 戳=会话 锁=错 | — |
| `rings` | Token 年轮 | YEAR IN RINGS | 26 周极坐标日历 | ![rings](../public/shots/rings.png) |
| `latency` | 延迟热力 | LATENCY HEATMAP | 时间 × 延迟 | ![latency](../public/shots/latency.png) |
| `stream` | 流量河流 | STREAMGRAPH | Provider 增量 | ![stream](../public/shots/stream.png) |
| `quota` | 额度燃尽 | QUOTA PACE | 窗口燃尽与预测 | ![quota](../public/shots/quota.png) |
| `budget` | 额度预算 | BUDGET BULLETS | 阈值与配速 | ![budget](../public/shots/budget.png) |
| `candle` | K线吞吐 | CANDLE THROUGHPUT | OHLC·涨跌K线 | ![candle](../public/shots/candle.png) |
| `mosaic` | 马赛克 | MOSAIC | 每请求一块砖 | ![mosaic](../public/shots/mosaic.png) |
| `quilt` | 拼布 | QUILT | 每会话一块布 | ![quilt](../public/shots/quilt.png) |
| `spectrum` | 频谱 | SPECTRUM | 峰=会话 高=Token | ![spectrum](../public/shots/spectrum.png) |
| `wave` | 波浪线 | WAVE | 双轨波形 | ![wave](../public/shots/wave.png) |
| `tidepool` | 潮汐池 | TIDEPOOL | 水位=配额 浪=TPS | ![tidepool](../public/shots/tidepool.png) |
| `cascade` | 阶瀑 | CASCADE | 级=模型 宽=份额 滴=会话 | ![cascade](../public/shots/cascade.png) |

## 天象 (17)

| id | 标题 | eyebrow | 说明 | 预览 |
|---|---|---|---|---|
| `sundial` | 日晷 | HOUR SUNDIAL | 影=时刻 石=会话 刻=小时 | ![sundial](../public/shots/sundial.png) |
| `stellar` | 夜航 | STELLAR DRIFT | 星空与流星 · 陪伴首选 | ![stellar](../public/shots/stellar.png) |
| `aurora` | 极光 | AURORA | 请求=天空光带 | ![aurora](../public/shots/aurora.png) |
| `constellation` | 星座 | CONSTELLATION | 会话=星图 | ![constellation](../public/shots/constellation.png) |
| `echo` | 回声 | ECHO | 涟漪=Token | ![echo](../public/shots/echo.png) |
| `rain` | 雨幕 | RAIN | 滴=会话 红=失败 | ![rain](../public/shots/rain.png) |
| `galaxy` | 星系 | GALAXY | 星=会话 双臂 | ![galaxy](../public/shots/galaxy.png) |
| `nebula` | 星云 | NEBULA | 云=会话 大=Token | ![nebula](../public/shots/nebula.png) |
| `tide` | 潮汐 | TIDE | 潮=今日量 | ![tide](../public/shots/tide.png) |
| `lantern` | 天灯 | LANTERN | 灯=会话 大=Token | ![lantern](../public/shots/lantern.png) |
| `chime` | 风铃 | CHIME | 管=会话 长=Token | ![chime](../public/shots/chime.png) |
| `firework` | 烟花 | FIREWORK | 爆=会话 径=Token | ![firework](../public/shots/firework.png) |
| `fountain` | 喷泉 | FOUNTAIN | 喷=会话 高=Token | ![fountain](../public/shots/fountain.png) |
| `aurora2` | 极光幕 | AURORA2 | 幕=会话 高=Token | ![aurora2](../public/shots/aurora2.png) |
| `glacier` | 冰川 | GLACIER | 冰=配额窗 高=用量 鹅=会话 | ![glacier](../public/shots/glacier.png) |
| `monsoon` | 雨季 | MONSOON | 云=配额窗 雨=用量 伞=会话 | ![monsoon](../public/shots/monsoon.png) |
| `solarwind` | 太阳风 | SOLAR WIND | 冕=配额窗 珥=用量 粒=会话 | ![solarwind](../public/shots/solarwind.png) |

## 洞察 (10)

| id | 标题 | eyebrow | 说明 | 预览 |
|---|---|---|---|---|
| `ledger` | 账本 | PROVIDER LEDGER | 栏=provider 行=日志 Σ=token | ![ledger](../public/shots/ledger.png) |
| `forecast` | 预测 | FORECAST | 烧线+虚线投影 · ⚠=重置前耗尽 | ![forecast](../public/shots/forecast.png) |
| `trophies` | 成就 | TROPHIES | 徽章架 · 环=解锁进度 | ![trophies](../public/shots/trophies.png) |
| `burnrate` | 燃尽 | BURNRATE | 本月每日成本 · 虚线=月末预测 | ![burnrate](../public/shots/burnrate.png) |
| `scorecard` | 计分卡 | SCORECARD | 弧=成功率 针=延迟 V=回退 | ![scorecard](../public/shots/scorecard.png) |
| `latrank` | 延迟榜 | LATRANK | 粗=TTFT 细=TPS · 奖牌/蜗牛 | ![latrank](../public/shots/latrank.png) |
| `league` | 联赛 | LEAGUE | 模型份额榜 · ↺=掉包率 | ![league](../public/shots/league.png) |
| `versus` | 对决 | VERSUS | Agent 对阵 · 粗=tokens 细=时长 | ![versus](../public/shots/versus.png) |
| `accounts` | 账户 | ACCOUNTS | 账户卡 · 配额条+余额 · 琥珀=热窗 | ![accounts](../public/shots/accounts.png) |
| `vaults` | 金库 | VAULTS | 保管箱=配额窗 满度=用量 推车=会话 | ![vaults](../public/shots/vaults.png) |

## 结构 (6)

| id | 标题 | eyebrow | 说明 | 预览 |
|---|---|---|---|---|
| `treemap` | 成本结构 | COST TREEMAP | Provider → 模型 | ![treemap](../public/shots/treemap.png) |
| `marimekko` | 结构马赛克 | MARIMEKKO | 列宽 / 带高 | ![marimekko](../public/shots/marimekko.png) |
| `sankey` | 路由流向 | ROUTING FLOW | Agent → Provider | ![sankey](../public/shots/sankey.png) |
| `chord` | 流向和弦 | CHORD | 左右弧彩带 | ![chord](../public/shots/chord.png) |
| `funnel` | 请求漏斗 | REQUEST FUNNEL | 发出 → 成功 | ![funnel](../public/shots/funnel.png) |
| `prism` | 棱镜 | PRISM | 白光分成Provider份额 | ![prism](../public/shots/prism.png) |

## 几何 (11)

| id | 标题 | eyebrow | 说明 | 预览 |
|---|---|---|---|---|
| `radar` | 路由雷达 | RADAR SCAN | Provider 环 | ![radar](../public/shots/radar.png) |
| `loom` | 请求织机 | REQUEST LOOM | 请求织成彩带 | ![loom](../public/shots/loom.png) |
| `rhythm` | 请求节奏 | RHYTHM | 16 步节拍 | ![rhythm](../public/shots/rhythm.png) |
| `origami` | 折纸 | ORIGAMI | 纸鹤=会话 | ![origami](../public/shots/origami.png) |
| `mandala` | 曼陀罗 | MANDALA | 瓣=会话 环=尝试 | ![mandala](../public/shots/mandala.png) |
| `vortex` | 漩涡 | VORTEX | 螺旋=会话 | ![vortex](../public/shots/vortex.png) |
| `kaleido` | 万花筒 | KALEIDO | 楔=会话 12折 | ![kaleido](../public/shots/kaleido.png) |
| `dna` | DNA | DNA | 对=会话 宽=Token | ![dna](../public/shots/dna.png) |
| `quartz` | 晶簇 | QUARTZ | 晶=会话 高=Token | ![quartz](../public/shots/quartz.png) |
| `ripple` | 涟漪 | RIPPLE | 滴=会话 大=Token | ![ripple](../public/shots/ripple.png) |
| `pendulum` | 摆锤 | PENDULUM | 摆=会话 长=Token | ![pendulum](../public/shots/pendulum.png) |

## 趣味 (6)

| id | 标题 | eyebrow | 说明 | 预览 |
|---|---|---|---|---|
| `chips` | 连击卡牌 | COMBO CHIPS | 游戏化连击 | ![chips](../public/shots/chips.png) |
| `orbit` | 彗星轨道 | ORBIT | 彗=会话 尾=弧 | ![orbit](../public/shots/orbit.png) |
| `maze` | 迷宫 | MAZE | 段=会话 长=Token | ![maze](../public/shots/maze.png) |
| `galton` | 豆袋机 | GALTON | 球=会话 落=Provider | ![galton](../public/shots/galton.png) |
| `fortune` | 每日签 | FORTUNE | 宜忌运数 · 真实数据抽签 | ![fortune](../public/shots/fortune.png) |
| `play` | 开局 | PLAY · EVERY CALL IS A BEAT | 转盘 + 判定 + 连击 | ![play](../public/shots/play.png) |

## 生态 (31)

| id | 标题 | eyebrow | 说明 | 预览 |
|---|---|---|---|---|
| `bees` | 蜂巢 | BEEHIVE | 会话绕着 Provider | ![bees](../public/shots/bees.png) |
| `bloom` | 绽放 | REQUEST BLOOM | 请求开花·藤蔓生长 | ![bloom](../public/shots/bloom.png) |
| `petri` | 培养皿 | PETRI DISH | 请求=活细胞 | ![petri](../public/shots/petri.png) |
| `terrarium` | 玻璃缸 | TERRARIUM | 会话=植物生态 | ![terrarium](../public/shots/terrarium.png) |
| `firefly` | 萤火虫 | FIREFLY | 萤火=会话 | ![firefly](../public/shots/firefly.png) |
| `bubbles` | 气泡 | BUBBLES | 泡=会话 沉=失败 | ![bubbles](../public/shots/bubbles.png) |
| `pinwheel` | 风车 | PINWHEEL | 轮=会话 大=Token | ![pinwheel](../public/shots/pinwheel.png) |
| `beehive` | 蜂房 | BEEHIVE | 格=会话 满=Token | ![beehive](../public/shots/beehive.png) |
| `aviary` | 鸟舍 | AVIARY | 巢=agent 蛋=会话 果=配额 | ![aviary](../public/shots/aviary.png) |
| `greenhouse` | 温室 | GREENHOUSE | 架=agent 盆=会话 温度计=配额 | ![greenhouse](../public/shots/greenhouse.png) |
| `campfire` | 篝火 | CAMPFIRE | 火=会话 石=agent 柴=配额余 | ![campfire](../public/shots/campfire.png) |
| `aquarium` | 水族箱 | AQUARIUM | 泡=agent 鱼=会话 水线=配额 | ![aquarium](../public/shots/aquarium.png) |
| `reef` | 珊瑚礁 | REEF | 瑚=配额窗 鱼=会话 高=余量 | ![reef](../public/shots/reef.png) |
| `wetland` | 湿地 | WETLAND | 泽=配额窗 深=用量 鹭=会话 | ![wetland](../public/shots/wetland.png) |
| `garden` | 庭院 | GARDEN | 坛=配额窗 茂=用量 蝶=会话 | ![garden](../public/shots/garden.png) |
| `vine` | 藤蔓 | VINE | 蔓=请求流 叶=会话 枯=失败 | ![vine](../public/shots/vine.png) |
| `meadow` | 草甸 | MEADOW | 丛=配额窗 茂=用量 蝶=会话 | ![meadow](../public/shots/meadow.png) |
| `tundra` | 苔原 | TUNDRA | 丘=配额窗 雪=用量 羚=会话 | ![tundra](../public/shots/tundra.png) |
| `mangrove` | 红树林 | MANGROVE | 树=配额窗 根=用量 鱼=会话 | ![mangrove](../public/shots/mangrove.png) |
| `heath` | 石楠原 | HEATH | 丛=配额窗 铃=用量 蜂=会话 | ![heath](../public/shots/heath.png) |
| `kelp` | 海藻林 | KELP | 藻=配额窗 高=用量 獭=会话 | ![kelp](../public/shots/kelp.png) |
| `taiga` | 针叶林 | TAIGA | 杉=配额窗 雪=用量 鹿=会话 | ![taiga](../public/shots/taiga.png) |
| `bayou` | 沼泽 | BAYOU | 柏=配额窗 苔=用量 萤=会话 | ![bayou](../public/shots/bayou.png) |
| `fen` | 泥沼 | FEN | 棉草=配额窗 高=用量 蜻=会话 | ![fen](../public/shots/fen.png) |
| `bog` | 酸沼 | BOG | 捕虫笼=配额窗 高=用量 蛙=会话 | ![bog](../public/shots/bog.png) |
| `marsh` | 芦苇荡 | MARSH | 蒲=配额窗 高=用量 鹭=会话 | ![marsh](../public/shots/marsh.png) |
| `veldt` | 稀树草原 | VELDT | 金合欢=配额窗 冠=用量 象=会话 | ![veldt](../public/shots/veldt.png) |
| `chaparral` | 灌丛 | CHAPARRAL | 灌=配额窗 高=用量 狼=会话 | ![chaparral](../public/shots/chaparral.png) |
| `glade` | 林间空地 | GLADE | 蕨=配额窗 高=用量 鹿=会话 | ![glade](../public/shots/glade.png) |
| `grove` | 果园 | GROVE | 树=配额窗 果=用量 人=会话 | ![grove](../public/shots/grove.png) |
| `pond` | 荷塘 | POND | 莲=配额窗 漪=用量 蛙=会话 | ![pond](../public/shots/pond.png) |

## 抽象 (1)

| id | 标题 | eyebrow | 说明 | 预览 |
|---|---|---|---|---|
| `kaleidoscope` | 万花筒 | KALEIDO | 瓣=配额窗 镜线=用量 核=过热 彩尘=会话 | ![kaleidoscope](../public/shots/kaleidoscope.png) |
