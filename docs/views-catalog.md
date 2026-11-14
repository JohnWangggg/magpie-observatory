# Magpie Observatory · 视图图鉴 (336)

按分组列出每个视图的名称、eyebrow 与一句话描述。视图目录由 `public/assets/app.js` 的 `VIEW_META` 维护；
运行时 `window.ObservatoryManifest` + `document.write` 自动加载 `views/*.js/.css`。

| 分组 | 数量 |
|---|---|
| 实时 | 9 |
| 用量 | 12 |
| 结构 | 6 |
| 几何 | 11 |
| 场景 | 231 |
| 趣味 | 6 |
| 生态 | 31 |
| 天象 | 16 |
| 配额 | 4 |
| 洞察 | 9 |
| 抽象 | 1 |

---

## 实时 (9)

| id | 标题 | eyebrow | 说明 |
|---|---|---|---|
| `route` | 实时路由 | LIVE ROUTING | Agent → Provider |
| `waterfall` | 会话瀑布 | SESSION WATERFALL | 一次会话的时间轴 |
| `network` | 关系网络 | RELATION GRAPH | Agent / Provider / 模型 |
| `swarm` | 延迟蜂群 | LATENCY SWARM | TTFT 分布 |
| `burn` | 燃烧速率 | BURN RATE | 配额窗口烧速 / 预测重置 |
| `gauge` | 仪表盘 | GAUGE MATRIX | KPI/配额仪表 |
| `pinboard` | 钉板 | PINBOARD | KPI/配额/会话钉上墙 |
| `lighthouse` | 灯塔 | LIGHTHOUSE | 塔=配额 光束=会话 |
| `harbor` | 港口 | HARBOR | 船=agent 箱=tries 浮标=配额 |

## 用量 (12)

| id | 标题 | eyebrow | 说明 |
|---|---|---|---|
| `rings` | Token 年轮 | YEAR IN RINGS | 26 周极坐标日历 |
| `latency` | 延迟热力 | LATENCY HEATMAP | 时间 × 延迟 |
| `stream` | 流量河流 | STREAMGRAPH | Provider 增量 |
| `quota` | 额度燃尽 | QUOTA PACE | 窗口燃尽与预测 |
| `budget` | 额度预算 | BUDGET BULLETS | 阈值与配速 |
| `candle` | K线吞吐 | CANDLE THROUGHPUT | OHLC·涨跌K线 |
| `mosaic` | 马赛克 | MOSAIC | 每请求一块砖 |
| `quilt` | 拼布 | QUILT | 每会话一块布 |
| `spectrum` | 频谱 | SPECTRUM | 峰=会话 高=Token |
| `wave` | 波浪线 | WAVE | 双轨波形 |
| `tidepool` | 潮汐池 | TIDEPOOL | 水位=配额 浪=TPS |
| `cascade` | 阶瀑 | CASCADE | 级=模型 宽=份额 滴=会话 |

## 结构 (6)

| id | 标题 | eyebrow | 说明 |
|---|---|---|---|
| `treemap` | 成本结构 | COST TREEMAP | Provider → 模型 |
| `marimekko` | 结构马赛克 | MARIMEKKO | 列宽 / 带高 |
| `sankey` | 路由流向 | ROUTING FLOW | Agent → Provider |
| `chord` | 流向和弦 | CHORD | 左右弧彩带 |
| `funnel` | 请求漏斗 | REQUEST FUNNEL | 发出 → 成功 |
| `prism` | 棱镜 | PRISM | 白光分成Provider份额 |

## 几何 (11)

| id | 标题 | eyebrow | 说明 |
|---|---|---|---|
| `radar` | 路由雷达 | RADAR SCAN | Provider 环 |
| `loom` | 请求织机 | REQUEST LOOM | 请求织成彩带 |
| `rhythm` | 请求节奏 | RHYTHM | 16 步节拍 |
| `origami` | 折纸 | ORIGAMI | 纸鹤=会话 |
| `mandala` | 曼陀罗 | MANDALA | 瓣=会话 环=尝试 |
| `vortex` | 漩涡 | VORTEX | 螺旋=会话 |
| `kaleido` | 万花筒 | KALEIDO | 楔=会话 12折 |
| `dna` | DNA | DNA | 对=会话 宽=Token |
| `quartz` | 晶簇 | QUARTZ | 晶=会话 高=Token |
| `ripple` | 涟漪 | RIPPLE | 滴=会话 大=Token |
| `pendulum` | 摆锤 | PENDULUM | 摆=会话 长=Token |

## 场景 (231)

| id | 标题 | eyebrow | 说明 |
|---|---|---|---|
| `orrery` | 轨道星图 | ORRERY | 行星与卫星 |
| `factory` | 请求工厂 | REQUEST FACTORY | 排队 → 完成 |
| `bakery` | 面包房 | BAKERY | 炉=agent 包=会话 计=配额 |
| `carnival` | 嘉年华 | CARNIVAL | 帐=配额窗 灯=热度 球=会话 |
| `studio` | 画室 | STUDIO | 架=配额窗 笔=会话 罐=provider |
| `dojo` | 道场 | DOJO | 桩=agent 痕=tries 卷=配额 |
| `library` | 图书馆 | LIBRARY | 架=配额窗 书=余量 桌=会话 |
| `arcade` | 电玩厅 | ARCADE | 机=配额窗 灯=热度 杆=会话 |
| `castle` | 城堡 | CASTLE | 塔=配额窗 旗=热度 卫=会话 |
| `observatory` | 天文台 | OBSERVATORY | 穹=配额窗 镜=会话 缝=用量 |
| `station` | 车站 | STATION | 灯=配额窗 车=会话 钟=当前 |
| `circus` | 马戏团 | CIRCUS | 索=会话 杆=token 球=配额 |
| `subway` | 地铁图 | SUBWAY | 站=配额窗 车=会话 |
| `windmill` | 风车塔 | WINDMILL | 塔=配额窗 叶=热度 鸟=会话 |
| `orchestra` | 管弦乐 | ORCHESTRA | 环=配额窗 音符=会话 |
| `harvest` | 麦田 | HARVEST | 穗=配额窗 机=会话 高=余量 |
| `hotpot` | 火锅店 | HOTPOT | 锅=配额窗 料=会话 火=热度 |
| `racing` | 赛道 | RACING | 门=配额窗 车=会话 灯=热度 |
| `forge` | 铁匠铺 | FORGE | 炉=配额窗 件=会话 火=热度 |
| `tavern` | 酒馆 | TAVERN | 桶=配额窗 客=会话 酒=余量 |
| `rodeo` | 牧场 | RODEO | 栏=配额窗 骑=会话 门=用量 |
| `depot` | 分拣站 | DEPOT | 架=配额窗 件=会话 位=余量 |
| `laundry` | 洗衣房 | LAUNDRY | 筒=配额窗 衣=会话 位=余量 |
| `temple` | 神社 | TEMPLE | 居=配额窗 客=会话 灯=热度 |
| `market` | 市集 | MARKET | 摊=配额窗 客=会话 货=余量 |
| `gallery` | 美术馆 | GALLERY | 画=配额窗 客=会话 色=用量 |
| `zen` | 枯山水 | ZEN | 石=配额窗 纹=用量 叶=会话 |
| `sakura` | 樱道 | SAKURA | 树=配额窗 花=用量 瓣=会话 |
| `rain2` | 雨窗 | RAIN | 格=配额窗 雨=用量 痕=会话 |
| `tank` | 水族馆 | TANK | 缸=配额窗 水=用量 鱼=会话 |
| `camp` | 营地 | CAMP | 火=配额窗 焰=用量 帐=会话 |
| `harbor2` | 灯塔港 | HARBOR | 塔=配额窗 扫=用量 船=会话 |
| `metro` | 地下铁 | METRO | 线=配额窗 宽=拥挤 车=会话 |
| `volcano` | 火山 | VOLCANO | 锥=配额窗 烟=用量 鸟=会话 |
| `canyon` | 峡谷 | CANYON | 层=配额窗 深=用量 客=会话 |
| `lake` | 湖泊 | LAKE | 莲=配额窗 沉=用量 黾=会话 |
| `harvest2` | 麦浪 | HARVEST | 垄=配额窗 穗=用量 农=会话 |
| `marina` | 码头 | MARINA | 船=配额窗 桅=用量 鸥=会话 |
| `river` | 河流 | RIVER | 湾=配额窗 宽=用量 鱼=会话 |
| `forest` | 森林 | FOREST | 树=配额窗 高=用量 鸟=会话 |
| `village` | 村落 | VILLAGE | 屋=配额窗 烟=用量 人=会话 |
| `beach` | 海滩 | BEACH | 浪=配额窗 高=用量 蟹=会话 |
| `skyline` | 天际线 | SKYLINE | 楼=配额窗 高=用量 星=会话 |
| `pasture` | 草场 | PASTURE | 坡=配额窗 高=用量 畜=会话 |
| `fjord` | 峡湾 | FJORD | 崖=配额窗 水=用量 舟=会话 |
| `atoll` | 环礁 | ATOLL | 环=配额窗 礁=用量 帆=会话 |
| `dune` | 沙丘海 | DUNE | 丘=配额窗 脊=用量 舟=会话 |
| `lagoon` | 环礁湖 | LAGOON | 岛=配额窗 环=用量 鹬=会话 |
| `oasis` | 绿洲 | OASIS | 泉=配额窗 涌=用量 驼=会话 |
| `delta` | 河口 | DELTA | 汊=配额窗 流=用量 艇=会话 |
| `steppe` | 草原 | STEPPE | 浪=配额窗 高=用量 马=会话 |
| `pampa` | 潘帕斯 | PAMPA | 草=配额窗 径=用量 仔=会话 |
| `mesa` | 台地 | MESA | 台=配额窗 壁=用量 鹫=会话 |
| `terrace` | 梯田 | TERRACE | 田=配额窗 水=用量 农=会话 |
| `prairie` | 大草原 | PRAIRIE | 丛=配额窗 穗=用量 羚=会话 |
| `geyser` | 间歇泉 | GEYSER | 泉=配额窗 柱=用量 客=会话 |
| `meteor` | 流星雨 | METEOR | 雨=配额窗 尾=用量 卫=会话 |
| `cavern` | 溶洞 | CAVERN | 钟乳=配额窗 长=用量 蝠=会话 |
| `karst` | 喀斯特 | KARST | 峰=配额窗 高=用量 猴=会话 |
| `badlands` | 恶地 | BADLANDS | 柱=配额窗 高=用量 羊=会话 |
| `cove` | 海湾 | COVE | 柱=配额窗 高=用量 豹=会话 |
| `islet` | 小岛 | ISLET | 椰=配额窗 冠=用量 蟹=会话 |
| `dell` | 幽谷 | DELL | 铃兰=配额窗 高=用量 兔=会话 |
| `sierra` | 山岭 | SIERRA | 雪岭=配额窗 峰高=用量 山羊=会话 |
| `basin` | 盆地 | BASIN | 盐柱=配额窗 高=用量 羚=会话 |
| `outcrop` | 裸岩 | OUTCROP | 岩柱=配额窗 高=用量 蜥=会话 |
| `plateau` | 台原 | PLATEAU | 台原=配额窗 缘高=用量 鹰=会话 |
| `ridge` | 山脊 | RIDGE | 山脊=配额窗 峰高=用量 隼=会话 |
| `escarp` | 断崖 | ESCARP | 断崖=配额窗 壁高=用量 岩鸽=会话 |
| `bluff` | 峭壁 | BLUFF | 峭壁=配额窗 壁高=用量 燕=会话 |
| `crag` | 崖顶 | CRAG | 崖顶=配额窗 高=用量 秃鹫=会话 |
| `inlet` | 入湾 | INLET | 浮标=配额窗 深=用量 鸥=会话 |
| `loch` | 湖心 | LOCH | 深标=配额窗 深=用量 天鹅=会话 |
| `cape` | 海角 | CAPE | 海岬=配额窗 高=用量 鸥=会话 |
| `headland` | 岬头 | HEADLAND | 岬头=配额窗 高=用量 信天翁=会话 |
| `sound` | 海峡 | SOUND | 深标=配额窗 深=用量 鸬鹚=会话 |
| `creek` | 溪流 | CREEK | 溪石=配额窗 高=用量 鲑=会话 |
| `point` | 海角尖 | POINT | 灯塔=配额窗 光程=用量 海鸟=会话 |
| `abyss` | 深渊 | ABYSS | 热泉口=配额窗 烟柱=用量 深海鱼=会话 |
| `grotto` | 岩洞 | GROTTO | 钟乳石=配额窗 长=用量 蝙蝠=会话 |
| `hollow` | 洼地 | HOLLOW | 洼坑=配额窗 深=用量 萤火虫=会话 |
| `savanna` | 草原 | SAVANNA | 金合欢=配额窗 冠宽=用量 角马=会话 |
| `jungle` | 雨林 | JUNGLE | 藤蔓=配额窗 垂长=用量 鹦鹉=会话 |
| `moor` | 荒野 | MOOR | 石堆=配额窗 高=用量 羊=会话 |
| `vale` | 幽谷 | VALE | 雾团=配额窗 浓=用量 鹿=会话 |
| `understory` | 林下 | UNDERSTORY | 幼树=配额窗 冠密=用量 松鼠=会话 |
| `butte` | 孤丘 | BUTTE | 岩柱=配额窗 高=用量 鹰=会话 |
| `pinnacle` | 石柱 | PINNACLE | 石尖=配额窗 高=用量 鹰=会话 |
| `rainforest` | 雨层林 | RAINFOREST | 雨团=配额窗 雨强=用量 树懒=会话 |
| `shoal` | 浅滩 | SHOAL | 沙洲=配额窗 大=用量 海豚=会话 |
| `estuary` | 河口 | ESTUARY | 沙嘴=配额窗 长=用量 翠鸟=会话 |
| `arch` | 拱门 | ARCH | 石拱=配额窗 跨度=用量 海燕=会话 |
| `hoodoos` | 蘑菇岩 | HOODOOS | 蘑菇岩=配额窗 高=用量 乌鸦=会话 |
| `domes` | 穹顶 | DOMES | 穹顶=配额窗 半径=用量 攀岩者=会话 |
| `tors` | 岩山 | TORS | 岩山=配额窗 高=用量 小马=会话 |
| `needles` | 石针 | NEEDLES | 石针=配额窗 高=用量 雨燕=会话 |
| `spires` | 尖塔 | SPIRES | 尖塔=配额窗 高=用量 蝙蝠=会话 |
| `monoliths` | 巨石 | MONOLITHS | 巨石=配额窗 高=用量 蜥蜴=会话 |
| `towers` | 塔楼 | TOWERS | 塔楼=配额窗 高=用量 海鸥=会话 |
| `crags` | 峭壁 | CRAGS | 峭壁=配额窗 高=用量 海燕=会话 |
| `mesas` | 平顶山 | MESAS | 平顶山=配额窗 顶宽=用量 兀鹫=会话 |
| `dunes` | 沙丘 | DUNES | 沙山=配额窗 高=用量 甲虫=会话 |
| `outcrops` | 露头 | OUTCROPS | 露头=配额窗 宽=用量 旱獭=会话 |
| `pinnacles` | 石针群 | PINNACLES | 石针群=配额窗 高=用量 雨燕=会话 |
| `summits` | 群峰 | SUMMITS | 群峰=配额窗 高=用量 攀登者=会话 |
| `chimneys` | 烟囱 | CHIMNEYS | 烟囱=配额窗 高=用量 麻雀=会话 |
| `arches` | 拱门群 | ARCHES | 石拱=配额窗 跨度=用量 雨燕=会话 |
| `lighthouses` | 灯塔群 | LIGHTHOUSES | 灯塔=配额窗 光程=用量 海鸥=会话 |
| `castles` | 城堡群 | CASTLES | 城堡=配额窗 高=用量 骑士=会话 |
| `ridges` | 山脊群 | RIDGES | 山脊=配额窗 高=用量 徒步者=会话 |
| `terraces` | 梯田 | TERRACES | 梯田=配额窗 水宽=用量 白鹭=会话 |
| `waterwheels` | 水车群 | WATERWHEELS | 水车=配额窗 直径=用量 游鱼=会话 |
| `pagodas` | 宝塔群 | PAGODAS | 宝塔=配额窗 层数=用量 燕子=会话 |
| `oceans` | 海洋 | OCEANS | 浪=配额窗 浪高=用量 信天翁=会话 |
| `moorland` | 荒原 | MOORLAND | 荒原=配额窗 丘高=用量 野兔=会话 |
| `vineyards` | 葡萄园 | VINEYARDS | 葡园=配额窗 架高=用量 麻雀=会话 |
| `orchards` | 果园 | ORCHARDS | 果树=配额窗 冠幅=用量 蜜蜂=会话 |
| `hedges` | 绿篱 | HEDGES | 绿篱=配额窗 篱高=用量 瓢虫=会话 |
| `crofts` | 石屋 | CROFTS | 石屋=配额窗 烟囱=用量 羊群=会话 |
| `paddocks` | 围场 | PADDOCKS | 围场=配额窗 栏长=用量 小马=会话 |
| `gardens` | 花坛 | GARDENS | 花坛=配额窗 花量=用量 蝴蝶=会话 |
| `groves` | 橄榄林 | GROVES | 橄树=配额窗 冠幅=用量 雀=会话 |
| `harbours` | 渔港 | HARBOURS | 船=配额窗 桅高=用量 鸥=会话 |
| `fjords` | 峡湾 | FJORDS | 峡壁=配额窗 高=用量 鹰=会话 |
| `lochs` | 湖群 | LOCHS | 岛=配额窗 树高=用量 水獭=会话 |
| `geysers` | 间歇泉 | GEYSERS | 泉=配额窗 柱高=用量 蜻蜓=会话 |
| `bayous` | 沼泽 | BAYOUS | 柏=配额窗 干高=用量 鹭=会话 |
| `tarns` | 冰斗湖 | TARNS | 冰斗湖=配额窗 深=用量 鼠兔=会话 |
| `meres` | 湖沼 | MERES | 苇床=配额窗 高=用量 骨顶鸡=会话 |
| `springs` | 山泉 | SPRINGS | 泉=配额窗 弧高=用量 鹡鸰=会话 |
| `brooks` | 溪流 | BROOKS | 石=配额窗 石径=用量 河乌=会话 |
| `fords` | 浅滩 | FORDS | 石=配额窗 石宽=用量 牛=会话 |
| `inlets` | 入海岬 | INLETS | 岬=配额窗 高=用量 鸬鹚=会话 |
| `creeks` | 潮沟 | CREEKS | 潮沟=配额窗 宽=用量 鹬=会话 |
| `sloughs` | 池沼 | SLOUGHS | 沼=配额窗 宽=用量 红翅鹂=会话 |
| `deltas` | 三角洲 | DELTAS | 汊道=配额窗 宽=用量 鹈鹕=会话 |
| `atolls` | 环礁 | ATOLLS | 礁环=配额窗 环径=用量 燕鸥=会话 |
| `reefs` | 礁脉 | REEFS | 珊瑚=配额窗 高=用量 鱼群=会话 |
| `lagoons` | 泻湖 | LAGOONS | 澙湖=配额窗 池径=用量 火烈鸟=会话 |
| `shoals` | 浅洲 | SHOALS | 浅洲=配额窗 丘高=用量 燕鸥=会话 |
| `sandbars` | 沙洲 | SANDBARS | 沙洲=配额窗 长=用量 蛎鹬=会话 |
| `breakers` | 碎浪 | BREAKERS | 浪=配额窗 卷高=用量 冲浪者=会话 |
| `icebergs` | 冰山群 | ICEBERGS | 冰山=配额窗 帆高=用量 海豹=会话 |
| `floes` | 浮冰 | FLOES | 浮冰=配额窗 面积=用量 北极熊=会话 |
| `nunataks` | 岛峰 | NUNATAKS | 岛峰=配额窗 露高=用量 雪鹀=会话 |
| `moraines` | 冰碛 | MORAINES | 冰碛=配额窗 丘高=用量 旱獭=会话 |
| `crevasses` | 冰裂隙 | CREVASSES | 裂隙=配额窗 深=用量 登山者=会话 |
| `eskers` | 蛇丘 | ESKERS | 蛇丘=配额窗 长=用量 雷鸟=会话 |
| `cirques` | 冰斗 | CIRQUES | 冰斗=配额窗 斗深=用量 山羊=会话 |
| `drumlins` | 鼓丘 | DRUMLINS | 鼓丘=配额窗 长=用量 野兔=会话 |
| `kames` | 冰砾阜 | KAMES | 砾阜=配额窗 陡=用量 松鸡=会话 |
| `seracs` | 冰塔 | SERACS | 冰塔=配额窗 倾角=用量 渡鸦=会话 |
| `buttes` | 孤丘 | BUTTES | 孤丘=配额窗 帽岩宽=用量 叉角羚=会话 |
| `fins` | 石鳍 | FINS | 石鳍=配额窗 高=用量 雨燕=会话 |
| `yardangs` | 雅丹 | YARDANGS | 雅丹=配额窗 流线=用量 耳廓狐=会话 |
| `playas` | 干盐湖 | PLAYAS | 干盐裂=配额窗 块大=用量 帆石=会话 |
| `wadis` | 干河谷 | WADIS | 干河谷=配额窗 辫宽=用量 骆驼=会话 |
| `hamadas` | 石漠 | HAMADAS | 石漠=配额窗 嶙峋=用量 跳鼠=会话 |
| `onsen` | 温泉 | ONSEN | 汤池=配额窗 水位=用量 蒸汽=过热 浴客=会话 |
| `nightmarket` | 夜市 | NIGHTMARKET | 摊位=配额窗 灯牌=用量 提灯客=会话 |
| `bonfire` | 篝火 | BONFIRE | 木石=配额窗 炭头=用量 中央火=平均 火星=会话 |
| `workshop` | 工坊 | WORKSHOP | 工位=配额窗 摆臂=用量 吊灯=过热 工人=会话 |
| `stadium` | 体育场 | STADIUM | 跑道=配额窗 弧长=用量 跑者=会话 |
| `theater` | 剧场 | THEATER | 聚光=配额窗 锥度=用量 演员=会话 |
| `arena` | 竞技场 | ARENA | 旌旗=配额窗 满度=用量 斗士=会话 |
| `vineyard` | 葡萄园 | VINEYARD | 藤架=配额窗 果串=用量 采摘工=会话 |
| `kitchen` | 厨房 | KITCHEN | 灶台=配额窗 汽泡=用量 火焰=过热 厨师=会话 |
| `hangar` | 机库 | HANGAR | 停机位=配额窗 尾焰=用量 地勤=会话 |
| `planetarium` | 天象馆 | PLANETARIUM | 轨道=配额窗 行星=用量 彗星=会话 |
| `museum` | 博物馆 | MUSEUM | 展柜=配额窗 满度=用量 观众=会话 |
| `conservatory` | 温室 | CONSERVATORY | 花盆=配额窗 株高=用量 园丁=会话 |
| `atrium` | 中庭 | ATRIUM | 花台=配额窗 垂蔓=用量 廊客=会话 |
| `kiln` | 窑炉 | KILN | 窑体=配额窗 窑火=用量 烟囱=过热 陶工=会话 |
| `igloo` | 冰屋 | IGLOO | 冰屋=配额窗 门光=用量 旅人=会话 |
| `apiary` | 蜂场 | APIARY | 蜂箱=配额窗 巢脾=用量 工蜂=会话 |
| `avalanche` | 雪崩 | AVALANCHE | 雪檐=配额窗 裂崩=用量 滑手=会话 |
| `arboretum` | 树木园 | ARBORETUM | 标本树=配额窗 冠幅=用量 策展人=会话 |
| `brewery` | 酿酒坊 | BREWERY | 铜釜=配额窗 泡沫=用量 蒸汽=过热 酿酒师=会话 |
| `distillery` | 蒸馏厂 | DISTILLERY | 蒸馏柱=配额窗 汽柱=用量 冷凝=过热 技师=会话 |
| `mill` | 磨坊 | MILL | 磨坊=配额窗 轮速=用量 轮毂=过热 磨工=会话 |
| `foundry` | 铸造厂 | FOUNDRY | 熔炉=配额窗 熔液=用量 出渣=过热 铸工=会话 |
| `smithy` | 铁匠铺 | SMITHY | 铁砧=配额窗 锻件=用量 火花=过热 铁匠=会话 |
| `tannery` | 鞣革坊 | TANNERY | 鞣池=配额窗 液位=用量 泡腾=过热 鞣工=会话 |
| `glassworks` | 玻璃厂 | GLASSWORKS | 窑口=配额窗 泡团=用量 吹工=会话 |
| `shipyard` | 造船厂 | SHIPYARD | 船台=配额窗 船体=用量 吊钩=过热 船匠=会话 |
| `sawmill` | 锯木厂 | SAWMILL | 圆锯=配额窗 转速=用量 锯屑=过热 锯工=会话 |
| `printshop` | 印刷坊 | PRINTSHOP | 印刷机=配额窗 压印=用量 墨辊=过热 印刷工=会话 |
| `cooperage` | 箍桶坊 | COOPERAGE | 木桶=配额窗 板缝=用量 桶箍=过热 箍匠=会话 |
| `saddler` | 鞍具坊 | SADDLER | 鞍架=配额窗 镫长=用量 鞍扣=过热 鞍匠=会话 |
| `cobbler` | 鞋匠铺 | COBBLER | 鞋楦=配额窗 鞋跟=用量 鞋头=过热 鞋匠=会话 |
| `fletcher` | 箭匠坊 | FLETCHER | 箭束=配额窗 展羽=用量 箭簇=过热 箭匠=会话 |
| `bowyer` | 弓匠坊 | BOWYER | 弓架=配额窗 弧弯=用量 弦扣=过热 弓匠=会话 |
| `goldsmith` | 金匠坊 | GOLDSMITH | 金环=配额窗 弧光=用量 宝托=过热 金匠=会话 |
| `silversmith` | 银匠坊 | SILVERSMITH | 银杯=配额窗 碗光=用量 锤点=过热 银匠=会话 |
| `locksmith` | 锁匠坊 | LOCKSMITH | 挂锁=配额窗 拱梁=用量 匙孔=过热 锁匠=会话 |
| `terminal` | 终点站 | TERMINAL | 站台=配额窗 告牌=用量 蒸汽=过热 搬运工=会话 |
| `etching` | 蚀刻坊 | ETCHING | 铜版=配额窗 线深=用量 划痕=过热 蚀刻师=会话 |
| `monotype` | 单版印 | MONOTYPE | 单版=配额窗 墨厚=用量 鬼影=过热 印工=会话 |
| `bazaar` | 大巴扎 | BAZAAR | 摊位=配额窗 篷纹=用量 灯笼=过热 商贩=会话 |
| `telescope` | 观星台 | TELESCOPE | 星标=配额窗 星等=用量 十字丝=过热 观星者=会话 |
| `seaport` | 海埠 | SEAPORT | 泊位=配额窗 货垛=用量 桅旗=过热 搬运工=会话 |
| `laboratory` | 实验室 | LABORATORY | 器皿=配额窗 液位=用量 冷凝=过热 实验员=会话 |
| `checkpoint` | 哨卡 | CHECKPOINT | 岗亭=配额窗 杆角=用量 号灯=过热 哨兵=会话 |
| `gatehouse` | 门楼 | GATEHOUSE | 门洞=配额窗 栅深=用量 火盆=过热 守门=会话 |
| `tollbooth` | 收费站 | TOLLBOOTH | 篮=配额窗 币堆=用量 帜=过热 收税=会话 |
| `caravanserai` | 商队驿 | CARAVAN | 窑洞=配额窗 挂灯=用量 火盆=过热 驼夫=会话 |
| `ranch2` | 牧场二号 | RANCH II | 牛=配额窗 耳标=用量 烙烟=过热 牛仔=会话 |
| `paddock` | 围场 | PADDOCK | 驹=配额窗 草堆=用量 水槽=过热 马夫=会话 |
| `corral` | 畜栏 | CORRAL | 烈马=配额窗 蹄尘=用量 门柱=过热 驯马=会话 |
| `pasture2` | 草场二号 | PASTURE II | 羊=配额窗 绒深=用量 舔石=过热 牧人=会话 |
| `atelier` | 画室 | ATELIER | 画布=配额窗 彩点=用量 调色刀=过热 画工=会话 |
| `studio2` | 工坊二号 | STUDIO II | 轮盘=配额窗 泥堆=用量 窥孔=过热 陶工=会话 |
| `workshop2` | 车间二号 | WORKSHOP II | 车床=配额窗 卡盘=用量 刀尖=过热 机工=会话 |
| `vivarium` | 生态缸 | VIVARIUM | 缸=配额窗 叶展=用量 湿灯=过热 保育员=会话 |
| `waypoint` | 航点 | WAYPOINT | 石堆=配额窗 路标=用量 顶旗=过热 行客=会话 |
| `crossroads` | 十字路口 | CROSSROADS | 路牌=配额窗 臂长=用量 角灯=过热 马车=会话 |
| `junction2` | 枢纽二号 | JUNCTION II | 转辙=配额窗 灯=用量 尖轨=过热 扳道=会话 |
| `interchange` | 立交桥 | INTERCHANGE | 匝道=配额窗 墩高=用量 灯=过热 车流=会话 |
| `garden2` | 园囿二号 | GARDEN II | 苗床=配额窗 垄=用量 晷针=过热 园丁=会话 |
| `orchard2` | 果园二号 | ORCHARD II | 树=配额窗 果=用量 蜂=过热 摘手=会话 |
| `vineyard2` | 葡萄园二号 | VINEYARD II | 藤行=配额窗 叶冠=用量 穗=过热 剪工=会话 |
| `grove2` | 树丛二号 | GROVE II | 丛=配额窗 条=用量 篮=过热 砍柴=会话 |
| `souk` | 露天集 | SOUK | 毯摊=配额窗 纹密=用量 香炉=过热 商贩=会话 |
| `fair2` | 市集二号 | FAIR II | 帐篷=配额窗 条纹=用量 炬=过热 摊主=会话 |
| `market2` | 市场二号 | MARKET II | 货摊=配额窗 堆=用量 秤=过热 摊贩=会话 |
| `meadow2` | 草甸二号 | MEADOW II | 草垛=配额窗 草茎=用量 叉=过热 割草=会话 |
| `threshold2` | 阈界二号 | THRESHOLD II | 门=配额窗 雾=用量 钥=过热 越客=会话 |
| `roundabout` | 环岛 | ROUNDABOUT | 入口=配额窗 斑马=用量 岛心=过热 骑行=会话 |
| `oasis2` | 绿洲二号 | OASIS II | 椰=配额窗 叶展=用量 蜃=过热 驼客=会话 |
| `reserve2` | 保护区二号 | RESERVE II | 观测=配额窗 隙=用量 栖枝=过热 守护=会话 |
| `desert` | 沙丘 | DESERT | 丘=配额窗 高=用量 驼=会话 |

## 趣味 (6)

| id | 标题 | eyebrow | 说明 |
|---|---|---|---|
| `chips` | 连击卡牌 | COMBO CHIPS | 游戏化连击 |
| `orbit` | 彗星轨道 | ORBIT | 彗=会话 尾=弧 |
| `maze` | 迷宫 | MAZE | 段=会话 长=Token |
| `galton` | 豆袋机 | GALTON | 球=会话 落=Provider |
| `fortune` | 每日签 | FORTUNE | 宜忌运数 · 真实数据抽签 |
| `play` | 开局 | PLAY · EVERY CALL IS A BEAT | 转盘 + 判定 + 连击 |

## 生态 (31)

| id | 标题 | eyebrow | 说明 |
|---|---|---|---|
| `bees` | 蜂巢 | BEEHIVE | 会话绕着 Provider |
| `bloom` | 绽放 | REQUEST BLOOM | 请求开花·藤蔓生长 |
| `petri` | 培养皿 | PETRI DISH | 请求=活细胞 |
| `terrarium` | 玻璃缸 | TERRARIUM | 会话=植物生态 |
| `firefly` | 萤火虫 | FIREFLY | 萤火=会话 |
| `bubbles` | 气泡 | BUBBLES | 泡=会话 沉=失败 |
| `pinwheel` | 风车 | PINWHEEL | 轮=会话 大=Token |
| `beehive` | 蜂房 | BEEHIVE | 格=会话 满=Token |
| `aviary` | 鸟舍 | AVIARY | 巢=agent 蛋=会话 果=配额 |
| `greenhouse` | 温室 | GREENHOUSE | 架=agent 盆=会话 温度计=配额 |
| `campfire` | 篝火 | CAMPFIRE | 火=会话 石=agent 柴=配额余 |
| `aquarium` | 水族箱 | AQUARIUM | 泡=agent 鱼=会话 水线=配额 |
| `reef` | 珊瑚礁 | REEF | 瑚=配额窗 鱼=会话 高=余量 |
| `wetland` | 湿地 | WETLAND | 泽=配额窗 深=用量 鹭=会话 |
| `garden` | 庭院 | GARDEN | 坛=配额窗 茂=用量 蝶=会话 |
| `vine` | 藤蔓 | VINE | 蔓=请求流 叶=会话 枯=失败 |
| `meadow` | 草甸 | MEADOW | 丛=配额窗 茂=用量 蝶=会话 |
| `tundra` | 苔原 | TUNDRA | 丘=配额窗 雪=用量 羚=会话 |
| `mangrove` | 红树林 | MANGROVE | 树=配额窗 根=用量 鱼=会话 |
| `heath` | 石楠原 | HEATH | 丛=配额窗 铃=用量 蜂=会话 |
| `kelp` | 海藻林 | KELP | 藻=配额窗 高=用量 獭=会话 |
| `taiga` | 针叶林 | TAIGA | 杉=配额窗 雪=用量 鹿=会话 |
| `bayou` | 沼泽 | BAYOU | 柏=配额窗 苔=用量 萤=会话 |
| `fen` | 泥沼 | FEN | 棉草=配额窗 高=用量 蜻=会话 |
| `bog` | 酸沼 | BOG | 捕虫笼=配额窗 高=用量 蛙=会话 |
| `marsh` | 芦苇荡 | MARSH | 蒲=配额窗 高=用量 鹭=会话 |
| `veldt` | 稀树草原 | VELDT | 金合欢=配额窗 冠=用量 象=会话 |
| `chaparral` | 灌丛 | CHAPARRAL | 灌=配额窗 高=用量 狼=会话 |
| `glade` | 林间空地 | GLADE | 蕨=配额窗 高=用量 鹿=会话 |
| `grove` | 果园 | GROVE | 树=配额窗 果=用量 人=会话 |
| `pond` | 荷塘 | POND | 莲=配额窗 漪=用量 蛙=会话 |

## 天象 (16)

| id | 标题 | eyebrow | 说明 |
|---|---|---|---|
| `stellar` | 夜航 | STELLAR DRIFT | 星空与流星 · 陪伴首选 |
| `aurora` | 极光 | AURORA | 请求=天空光带 |
| `constellation` | 星座 | CONSTELLATION | 会话=星图 |
| `echo` | 回声 | ECHO | 涟漪=Token |
| `rain` | 雨幕 | RAIN | 滴=会话 红=失败 |
| `galaxy` | 星系 | GALAXY | 星=会话 双臂 |
| `nebula` | 星云 | NEBULA | 云=会话 大=Token |
| `tide` | 潮汐 | TIDE | 潮=今日量 |
| `lantern` | 天灯 | LANTERN | 灯=会话 大=Token |
| `chime` | 风铃 | CHIME | 管=会话 长=Token |
| `firework` | 烟花 | FIREWORK | 爆=会话 径=Token |
| `fountain` | 喷泉 | FOUNTAIN | 喷=会话 高=Token |
| `aurora2` | 极光幕 | AURORA2 | 幕=会话 高=Token |
| `glacier` | 冰川 | GLACIER | 冰=配额窗 高=用量 鹅=会话 |
| `monsoon` | 雨季 | MONSOON | 云=配额窗 雨=用量 伞=会话 |
| `solarwind` | 太阳风 | SOLAR WIND | 冕=配额窗 珥=用量 粒=会话 |

## 配额 (4)

| id | 标题 | eyebrow | 说明 |
|---|---|---|---|
| `rosetta` | 罗塞塔 | ROSETTA | 环带=配额 刻痕=会话 |
| `eclipse` | 日蚀 | ECLIPSE | 暗盘=量 冕=会话 沿=窗 |
| `tapestry` | 织锦 | TAPESTRY | 经=配额 纬=会话 |
| `winery` | 酒庄 | WINERY | 桶=配额窗 滴=会话 |

## 洞察 (9)

| id | 标题 | eyebrow | 说明 |
|---|---|---|---|
| `forecast` | 预测 | FORECAST | 烧线+虚线投影 · ⚠=重置前耗尽 |
| `trophies` | 成就 | TROPHIES | 徽章架 · 环=解锁进度 |
| `burnrate` | 燃尽 | BURNRATE | 本月每日成本 · 虚线=月末预测 |
| `scorecard` | 计分卡 | SCORECARD | 弧=成功率 针=延迟 V=回退 |
| `latrank` | 延迟榜 | LATRANK | 粗=TTFT 细=TPS · 奖牌/蜗牛 |
| `league` | 联赛 | LEAGUE | 模型份额榜 · ↺=掉包率 |
| `versus` | 对决 | VERSUS | Agent 对阵 · 粗=tokens 细=时长 |
| `accounts` | 账户 | ACCOUNTS | 账户卡 · 配额条+余额 · 琥珀=热窗 |
| `vaults` | 金库 | VAULTS | 保管箱=配额窗 满度=用量 推车=会话 |

## 抽象 (1)

| id | 标题 | eyebrow | 说明 |
|---|---|---|---|
| `kaleidoscope` | 万花筒 | KALEIDO | 瓣=配额窗 镜线=用量 核=过热 彩尘=会话 |
