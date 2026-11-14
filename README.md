# Magpie Observatory

**A live monitoring cockpit for [Magpie](https://github.com/yetone/magpie).**
Two-way magpies carry requests to providers and answers back; quotas, usage,
sessions and a 53-week rhythm sit around them.

[简体中文](README.zh-CN.md) · **English** · [Changelog](CHANGELOG.md)

![Magpie Observatory](docs/preview-dark.png)

## What it is

Magpie already knows which provider, account and model every request uses.
Observatory turns that stream into something you can *watch*:

- **Live routing** — Agent → Magpie → Provider/Account, with a filled magpie
  carrying the request out and a mirrored outlined magpie bringing the answer
  back. Failed attempts stay visible as “rerouted”.
- **Ninety-seven views** — one for routing, sixty-one ways to look at the
  same data: charts, games, ambient fields.
- **Seven style packs** — `Control`, `Pixel`, `Paper`, `Neon`, `Terminal`,
  `Blueprint`, `Zine`; each with a light and dark variant. Light/dark and
  style are independent.
- **Layout settings** — Auto / One screen / Comfort, density Compact / Standard /
  Spacious, motion Full / Soft / Off.
- **Quotas** — the shortest window per account in a 3-column ring-card grid
  (2 columns below 1400 px, 1 on phones), with reset countdowns and balances.
- **Usage** — 24h/7d/30d Token + cost, model donut, a 53-week heatmap that
  compresses on narrow screens, and a searchable request ledger.
- **Sessions** — active requests, subagents, TPS and reroute counts; recent
  completed requests stay in the rail.
- **Responsive** — one screen at desktop sizes, a single column with a compact
  rail on phones; the same data, no separate mobile build.
- **Cinema mode** — `O` fills the window with the current view behind a slim
  HUD; pair with `G` for a rotating ambient screen on a spare monitor.
- **Command palette** — `⌘K` jumps to any view, style or action in one box.
- **Daily digest** — the first open of the day shows yesterday's tokens,
  calls, streak and top agent; dismissed dates are remembered.
- **Achievements** — eight badges (streak days, 1M/10M token days, parallel
  sessions, night owl) unlock with a toast and persist in localStorage.
- **Attention strip** — a quiet chip rail over the hero's lower edge: quota
  burn ≥80%, error bursts, your streak and a one-line "today".
- **Favorites rail** — starred views (`F`) become permanent icons on the left
  rail, one click to switch.
- **Mini mode** — `?mode=mini&view=stellar` shrinks the page into a
  picture-in-picture-ready widget.
- **PWA** — installable to the home screen via `manifest.webmanifest` +
  a minimal service worker (network-first, API uncached).
- **Replay** — `R` freezes the feed into a 3-minute scrubbable timeline;
  `▶` auto-plays, `⤴` copies a `#replay=` link, and the palette exports a
  standalone HTML player with the frames embedded.
- **Share cards** — `⌘K` → 1200×630 PNG exports for today, this week,
  30 days, and a today-vs-yesterday compare card; `⌘K` → copy a page link
  that restores view/range/cinema on open.
- **Weekly report** — `⌘K` → 本周报告 drops a 7-day card with bars,
  peak day and hottest route.
- **Play view** — a Westworld dial where every request is a beat:
  PERFECT/GREAT/GOOD/MISS judgements, combo ×multiplier, `←`/`→` steps
  through the call stream.
- **Gateway compare** — `⌘K` → 网关对比 pulls two `/api/snapshot`s
  (auto-detected vs locked `magpie.gw`) side by side.
- **XP & achievements** — requests earn XP into a topbar level chip;
  eight badges + personal records persist across sessions.

## The mark

<img src="docs/icon.png" width="88" alt="Magpie Observatory icon">

A magpie in orbit: the white bird is the request/response pair, the dashed ring
is the observatory, and the cyan eye is the live gateway.

## Install as a Magpie plugin

Requires a recent Magpie build with **plugin pages** and **page services**
(`magpie.page.service`). Then:

```bash
magpie plugin add github:JohnWangggg/magpie-observatory
```

Or in Magpie: **Plugins → Add plugin**, paste the GitHub URL or search for
**Magpie Observatory**. Enable it under **Plugins → Installed**; an
**Observatory** tab appears in the sidebar's Plugins group.

The plugin starts a local read-only service on `127.0.0.1:3488` (configurable in
the plugin's options). The Magpie page is a launcher; the dashboard is served by
that service so it can read all of Magpie's live APIs without relaxing the
page's `connect-src 'none'` sandbox. Magpie frames the launched page with
`sandbox="allow-scripts"`, so the service answers the frame's `Origin: null`
with CORS plus a per-run token that only the HTML it served carries; other
pages get nothing.

### Install from a local checkout

```bash
git clone https://github.com/JohnWangggg/magpie-observatory.git
magpie plugin add ./magpie-observatory
```

### Discovery

`package.json` declares the page (`magpie.page.file` → `page/index.html`), so
an installed copy is a page in Magpie (`magpie plugin list` says `page`). The
**Plugins market card** comes from the community registry
(`magpie-community/plugins/registry.json`, `"kind": "page"`); this repository
is not listed there yet and cannot be until the package is on npm. See
[`docs/community-listing.md`](docs/community-listing.md) for the exact entry
and the pull request steps. The repository deliberately does **not** carry
GitHub's **`magpie-plugin`** topic: that topic feeds the provider half of
Discover, and a page that runs a local service (it needs `main`/`exports`)
would be shown there as a provider.

## Preview without Magpie

Node.js 18+:

```bash
node preview.mjs
# → http://127.0.0.1:8777
```

The dashboard starts in demo mode. Click **演示数据 / 实时连接** to try the local
Magpie gateway (`http://127.0.0.1:3425`). Override it with:

```bash
MAGPIE_URL=http://127.0.0.1:3425 MAGPIE_KEY=... node preview.mjs
```

The preview is for development only; the plugin uses the same service internally.

## The ninety-seven views

| Route · two-way magpies | Radar · provider ring and quotas |
| --- | --- |
| ![route](docs/preview-dark.png) | ![radar](docs/mode-radar.png) |

| Loom · requests woven into bands | Rhythm · provider lanes and beats |
| --- | --- |
| ![loom](docs/mode-loom.png) | ![rhythm](docs/mode-rhythm.png) |

| Rings · half a year as a polar calendar | Quota · burn-down and pace |
| --- | --- |
| ![rings](docs/mode-rings.png) | ![quota](docs/mode-quota.png) |

| Waterfall · sessions on a time axis | Swarm · TTFT per provider |
| --- | --- |
| ![waterfall](docs/mode-waterfall.png) | ![swarm](docs/mode-swarm.png) |

| Treemap · cost by provider and model | Sankey · agent → provider → model flow |
| --- | --- |
| ![treemap](docs/mode-treemap.png) | ![sankey](docs/mode-sankey.png) |

| Funnel · requests to success | Latency · time × bucket |
| --- | --- |
| ![funnel](docs/mode-funnel.png) | ![latency](docs/mode-latency.png) |

![Orrery · providers, quotas and sessions in orbit](docs/mode-orrery.png)

| Budget · thresholds and pace | Marimekko · provider × model mosaic |
| --- | --- |
| ![budget](docs/mode-budget.png) | ![marimekko](docs/mode-marimekko.png) |

![Chord · agent ↔ provider ribbons](docs/mode-chord.png)

| Network · agent ↔ provider graph | Stream · provider flow over time |
| --- | --- |
| ![network](docs/mode-network.png) | ![stream](docs/mode-stream.png) |

![Chips · combo cards](docs/mode-chips.png)

| Factory · queued → streaming → done | Bees · sessions around provider hives |
| --- | --- |
| ![factory](docs/mode-factory.png) | ![bees](docs/mode-bees.png) |

| Stellar · providers as stars, requests as meteors | Burn · quota windows at pace |
| --- | --- |
| ![stellar](docs/mode-stellar.png) | ![burn](docs/mode-burn.png) |

| Candle · hourly throughput as OHLC | Gauge · KPI and quota dials |
| --- | --- |
| ![candle](docs/mode-candle.png) | ![gauge](docs/mode-gauge.png) |

| Bloom · requests grow as flowers | Petri · requests as living cells |
| --- | --- |
| ![bloom](docs/mode-bloom.png) | ![petri](docs/mode-petri.png) |

| Aurora · requests as light-curtains | Constellation · sessions as star-maps |
| --- | --- |
| ![aurora](docs/mode-aurora.png) | ![constellation](docs/mode-constellation.png) |

| Tide · provider waves on a shore | Prism · the stream split by provider |
| --- | --- |
| ![tide](docs/mode-tide.png) | ![prism](docs/mode-prism.png) |

| Terrarium · sessions as a glass ecosystem | Echo · ripples on a pond |
| --- | --- |
| ![terrarium](docs/mode-terrarium.png) | ![echo](docs/mode-echo.png) |

| Mosaic · requests as wall tiles | Origami · sessions as paper birds |
| --- | --- |
| ![mosaic](docs/mode-mosaic.png) | ![origami](docs/mode-origami.png) |

| Firefly · sessions as glowing dots at night | Mandala · sessions as petals |
| --- | --- |
| ![firefly](docs/mode-firefly.png) | ![mandala](docs/mode-mandala.png) |

| Quilt · sessions as fabric patches | Vortex · sessions on a spiral |
| --- | --- |
| ![quilt](docs/mode-quilt.png) | ![vortex](docs/mode-vortex.png) |

| Kaleido · sessions as 12-fold wedges | Orbit · sessions as comets |
| --- | --- |
| ![kaleido](docs/mode-kaleido.png) | ![orbit](docs/mode-orbit.png) |

| Rain · requests as raindrops on a puddle | Bubbles · sessions rising |
| --- | --- |
| ![rain](docs/mode-rain.png) | ![bubbles](docs/mode-bubbles.png) |

| Spectrum · tokens as a frequency band | Wave · dual-track waveform |
| --- | --- |
| ![spectrum](docs/mode-spectrum.png) | ![wave](docs/mode-wave.png) |

| Galaxy · requests as a two-arm spiral | DNA · sessions as base pairs |
| --- | --- |
| ![galaxy](docs/mode-galaxy.png) | ![dna](docs/mode-dna.png) |

| Nebula · sessions as a colour cloud | Tide · quota as a rising sea |
| --- | --- |
| ![nebula](docs/mode-nebula.png) | ![tide](docs/mode-tide.png) |

| Maze · requests as a snaking corridor | Quartz · sessions as crystals |
| --- | --- |
| ![maze](docs/mode-maze.png) | ![quartz](docs/mode-quartz.png) |

| Ripple · raindrops on still water | Lantern · sessions as sky lanterns |
| --- | --- |
| ![ripple](docs/mode-ripple.png) | ![lantern](docs/mode-lantern.png) |

| Pinwheel · sessions as spinning wheels | Chime · sessions as wind chimes |
| --- | --- |
| ![pinwheel](docs/mode-pinwheel.png) | ![chime](docs/mode-chime.png) |

| Firework · sessions as bursts | Fountain · sessions as water jets |
| --- | --- |
| ![firework](docs/mode-firework.png) | ![fountain](docs/mode-fountain.png) |

| Pendulum · sessions as swinging bobs | Aurora2 · sessions as curtains |
| --- | --- |
| ![pendulum](docs/mode-pendulum.png) | ![aurora2](docs/mode-aurora2.png) |

| Beehive · sessions as honeycomb | Vine · sessions as leaves |
| --- | --- |
| ![beehive](docs/mode-beehive.png) | ![vine](docs/mode-vine.png) |

- **Route**: the default. Magpies fly the whole `Agent → Magpie → Provider`
  path; failures remain visible.
- **Radar**: providers on a dial, quota rings, in-flight sessions on the left,
  quota and cache on the right.
- **Loom**: the last requests become coloured bands — colour is provider,
  brightness is token density, the shuttle moves down the weave.
- **Rhythm**: each provider gets a lane; requests land on a 16-step grid, a
  playhead sweeps through, and the footer keeps the combo / cache.
- **Rings**: the last 26 weeks as a polar calendar — seven weekday rings, one
  column per week; bead size and colour carry token volume, and today keeps a
  green ring.
- **Quota**: each account's window as a burn-down line with a projected left at
  reset; green/amber/red risk, reset markers and a `QUOTA PACE` side list.
- **Waterfall**: sessions as Gantt rows; pale first-token segment plus a
  streaming segment, failure hatching, click a session to focus it.
- **Swarm**: one lane per provider, TTFT points with P50/P90 lines, dot size =
  tokens; missing first-token samples are marked as estimated.
- **Treemap**: provider → model area by tokens; click a provider to drill into
  its models.
- **Sankey**: agent → provider → model flow; link width = tokens, provider
  colours, hover highlights the whole route.
- **Funnel**: calls → uncanceled → first token → success, with drop-off counts,
  success/error rate and an amber reroute chip.
- **Latency**: a time × latency-bucket heatmap that accumulates while the page
  is open, with P50/P90 and the hottest bucket.
- **Orrery**: providers as planets on elliptical orbits; planet size = active
  sessions, the arc = quota used, moons = active sessions.
- **Budget**: a bullet chart per account window; 70/88 thresholds, a pace marker
  from quota history, and a projected end.
- **Marimekko**: column width = provider share, band height = model share; click
  a provider to expand its column.
- **Chord**: agents on one arc, providers on the other; ribbon area = tokens;
  hover highlights the flow and side panel lists the top routes.
- **Network**: a force-directed agent → provider → model graph; node size =
  tokens, hover/focus highlights neighbours.
- **Stream**: provider token deltas over buffered snapshots as a streamgraph,
  with a Horizon toggle for a compact per-provider reading.
- **Chips**: an optional game-like view; each request is a card, consecutive
  successes build a combo, and score/multipliers come from the real ledger.
- **Factory**: sessions as parcels moving through queued → streaming → done,
  with a reject lane for errors; the belt and parcels animate, the counts are real.
- **Bees**: providers as hives and sessions as bees; subagents become smaller
  bees, size follows tokens, and hovering a hive highlights its bees.
- **Play**: a Westworld dial where every request is a beat — rounds arc the
  token mix, the rim flashes on errors, streaks grow toward an "obsessed" ring.
- **Candle**: every period as a candlestick — `open` is the previous period's
  tokens, `close` is this one; green when throughput rose, red when it fell,
  a dashed MA line, and up/down/streak/peak stats in the legend.
- **Gauge**: every KPI and quota window as a 270° dial — requests, tokens,
  cost, success rate, active sessions, in-flight, then one gauge per account
  window (≤2 per account), needle + arc, green/amber/red risk.
- **Bloom**: the last requests as a garden — provider = petal colour,
  tokens = petal count, position = time; failures are buds that never open,
  a vine trails along the ground.
- **Petri**: the last requests as cells in a dish — provider = cytoplasm
  colour, tokens = cell size, live cells pulse and breathe, failures fade to
  ghosts; newest cluster near the dish centre.
- **Aurora**: the last requests as light-curtains in a night sky — height =
  tokens, width = tps, colour = provider; failures are thin grey streaks
  above the horizon line, stars twinkle behind.
- **Constellation**: each session as a small star-pattern — one star per try
  (bright on success, dim on failure), ≥3 stars padded with aux points;
  sessions link into a larger constellation map, colour = agent.
- **Tide**: provider token share as rolling waves — amplitude = share,
  phase drifts, foam on the biggest crest, a moon pulls it.
- **Prism**: the request stream enters as one white beam; the glass triangle
  splits it into each provider's ray — width = tokens, colour = provider,
  angle = its order.
- **Terrarium**: sessions as plants in a sealed jar — height = tokens,
  colour = agent, moss on the soil, a mushroom per failed request,
  droplets on the glass.
- **Echo**: sessions drop onto a pond — rings = tokens, colour = agent,
  dashed rings = failed, faded = older.
- **Mosaic**: every request is a tile in a wall — size = tokens,
  colour = agent, cracked = failed, grout lines between rows.
- **Origami**: each session is a folded paper bird on a branch —
  size = tokens, colour = agent, dashed crease = the fold;
  failed requests droop lower.
- **Firefly**: sessions drift as fireflies — glow = tokens, colour = agent,
  blink = breathing; a faint moon + stars hang above.
- **Mandala**: sessions bloom as petals around a bindu — length = tokens,
  colour = agent, try-rings = attempts; a dashed mandala behind.
- **Quilt**: sessions are fabric patches on a quilt — size = tokens,
  colour = agent, dashed stitch = failed; a stitched border frames it.
- **Vortex**: sessions ride a logarithmic spiral — size = tokens,
  colour = agent, spin speed = recency; failed requests fall inward.
- **Kaleido**: each session is a coloured wedge mirrored 12× around a
  hexagonal frame — length = tokens, colour = agent, faded = failed.
- **Orbit**: sessions are comets on tilted elliptical lanes around a
  provider sun-cluster — head = tokens, tail = arc, debris = failed.
- **Rain**: every request is a raindrop — length = tokens, colour = agent,
  splash rings the puddle when it lands; red = failed.
- **Bubbles**: sessions rise as air bubbles — size = tokens, colour = agent,
  wobble = phase; failed ones sink.
- **Spectrum**: the token stream as a frequency spectrum — height = tokens,
  colour = agent, width = tries; a mirrored bass-echo below.
- **Wave**: the request stream as two layered waveforms — peak = tokens,
  colour = agent, spike = failed; a scan cursor sweeps.
- **Galaxy**: sessions as stars on a two-arm spiral — size = tokens,
  colour = agent, drift = failed; a bright core at the hub.
- **DNA**: the request stream as a double helix — rung = session,
  width = tokens, colour = agent, broken = failed.
- **Nebula**: sessions as a soft colour cloud — size = tokens,
  hue = agent, dim = failed; filaments and dust fill the field.
- **Tide**: today's tokens as a rising tide — level = share of a soft
  cap, buoys = sessions, dim = failed; a moon pulls the sea.
- **Maze**: the request stream as a snaking corridor — segment = session,
  length = tokens, colour = agent, dead end = failed.
- **Quartz**: the session set as a crystal cluster — prism = session,
  height = tokens, colour = agent, cracked = failed.
- **Ripple**: requests as raindrops on still water — rings shed outward,
  radius = tokens, colour = agent, broken ring = failed.
- **Lantern**: sessions as sky lanterns — size = tokens, colour = agent,
  tilt = failed; flames flicker against the night.
- **Pinwheel**: sessions as paper pinwheels — blade span = tokens,
  colour = agent, reverse spin = failed; sticks on a garden edge.
- **Chime**: sessions as hanging wind chimes — length = tokens,
  colour = agent, cracked = failed; tubes sway in the breeze.
- **Firework**: sessions as fireworks — burst radius and spokes = tokens,
  colour = agent, sputter = failed; trails streak upward.
- **Fountain**: sessions as water jets — arc height = tokens, colour =
  agent, sputter = failed; droplets fall back into the basin.
- **Pendulum**: sessions as swinging pendulums — rod length and arc =
  tokens, colour = agent, still = failed.
- **Aurora2**: sessions as aurora curtains — height = tokens, colour =
  agent, flicker = failed; soft focus under stars.
- **Beehive**: sessions as a honeycomb — fill = tokens, colour = agent,
  cracked = failed; bees orbit the comb.
- **Vine**: the request stream as a climbing vine — leaf = session,
  size = tokens, colour = agent, wilted = failed; tendrils curl.
- **Galton**: sessions drop as balls through a staggered pin field into
  per-provider bins — colour = agent, size = tokens, landing bin = routing
  share; bottom bins rank by burn.

- **Burn**: every account window as a pace bar — fill shows used %, tick
  marks flat pace, a dashed notch projects end-of-window; click a row for the
  window's sparkline, `↑↓/Enter` keyboard nav, and a CSV export per window.

## Switching views

The hero header has a view picker instead of a wall of tabs. Press **V** (or
click it), type to filter by name / eyebrow / group, press Enter to switch, or
hit **随机一个** for a random view. The 97 views are grouped into eight sections —
`实时` / `用量` / `结构` / `趣味` / `天象` / `生态` / `几何` / `场景`, and the hero accent follows the group.
**G** starts or stops an auto tour (5 / 10 / 30-second interval in settings),
**R** picks a random view, **F** stars the current view (favourites pin to the
top of the picker and survive reloads), **?** opens the shortcut sheet, and
**Esc** closes the picker.
Press **O** for **cinema mode**: the hero expands to fill the whole window
with only a floating HUD (view name, live tokens/cost, Esc hint) — pair it
with **G** for a rotating ambient screen on a spare monitor or tablet.
**⌘K** opens a command palette that jumps to any view, any style pack, or
toggles cinema/tour/theme in one keystroke. A quiet **attention strip** sits
above the hero: quota burn warnings, error bursts, your daily streak and a
one-line "today" summary, so the first glance tells you where to look.

| View picker | Keyboard shortcuts |
| --- | --- |
| ![view menu](docs/view-menu.png) | ![shortcuts](docs/help.png) |

## Every surface is live

Beyond switching views, the cards themselves are wired:

- **Click** — burn rows expand a sparkline, session cards select and filter the
  log, heatmap cells filter by day, attention chips jump to their view.
- **Right-click** — dismiss chips, copy ids / model names / CSV exports, un-fav
  rail icons, favourite a view from its hero.
- **Double-click** — copy session tries, copy provider key, filter by month,
  set a rail icon as the default view, copy the view name.
- **Keyboard** — `↑↓`/`←→` walk every list (burn rows, sessions, log, quotas,
  favs, palette), `Enter` activates, `Esc` collapses; `/` focuses the log search.
- **Hover** — sparklines show `left% · at`, burn bars show the pace tooltip,
  quota items flip to `已用/剩余`, heatmap cells show `N 次 · Tok`.
- **State** — scroll position per view, log query, burn selection, favourites,
  and the default view all persist across reloads.

## Styles and themes

| Control | Pixel |
| --- | --- |
| ![control](docs/preview-dark.png) | ![pixel](docs/style-pixel.png) |

| Paper | Neon |
| --- | --- |
| ![paper](docs/style-paper.png) | ![neon](docs/style-neon.png) |

| Terminal | Blueprint |
| --- | --- |
| ![terminal](docs/style-terminal.png) | ![blueprint](docs/style-blueprint.png) |

| Zine | Game Boy (pixel light) |
| --- | --- |
| ![zine](docs/style-zine.png) | ![game boy](docs/style-pixel-light.png) |

- **Control**: glass cards, iris/cyan accents, balanced density.
- **Pixel**: 8-bit console — 2 px frames, offset block shadows, dither pattern,
  segmented meters, uppercase mono, heavy CRT raster; the light variant is a
  Game Boy DMG screen.
- **Paper**: cream, serif, brown ink, paper grain; a report-like dark variant.
- **Neon**: cyberpunk black glass — magenta/cyan split lighting, HUD corner
  brackets, a perspective grid floor and chromatic-aberration titles.
- **Terminal**: phosphor CRT — green bloom on numbers, block cursor on card
  heads, hard raster, monospace everywhere; light variant is a day terminal.
- **Blueprint**: drafting table — navy vellum, 24 px graph grid, dashed inner
  frames, ruler ticks, no glow; light variant is a day print.
- **Zine**: risograph cut-out — newsprint with halftone dots, 2 px ink borders,
  hard offset shadows, one spot red, highlighter titles; dark variant is
  black-ink newsprint.

Use the **明暗** button for light/dark and the **风格** button for a pack. Both
choices persist separately.

The same Control pack in light mode:

![Control light](docs/preview-light.png)

| Style menu | Layout & motion |
| --- | --- |
| ![style menu](docs/style-menu.png) | ![layout settings](docs/settings-menu.png) |

## Layout and motion

The **设置** button opens:

| Setting | Options |
| --- | --- |
| Layout | `Auto` · `One screen` · `Comfort` |
| Density | `Compact` · `Standard` · `Spacious` |
| Motion | `Full` · `Soft` · `Off` |
| Tour | `5s` · `10s` · `30s` |
| Accent | `Aurora` · `Ember` · `Mint` · `Rose` · `Mono` |

One-screen mode forces the whole dashboard into the viewport at ≥1200×900, with
lists scrolling inside their cards. Smaller windows fall back to scrolling and
say so. Comfort always uses natural heights. **Accent** swaps only the accent
colour — Ember tints every line, heat cell, sparkline, achievement and
particle amber without touching the style pack. Motion off leaves the magpies
at the midpoint of their paths and stops radar sweep, loom shuttle, the
rhythm playhead and the ambient starfield.

An **ambient particle layer** drifts behind the whole page: ~20–160 motes
climb slowly, their density follows the live-session count and their colour
follows the accent; the canvas pauses when the tab is hidden.

## On a phone

Below 680 px the rail becomes icon-only, the quota cards stack, the request
ledger drops secondary columns and the hero views reflow vertically. The
dashboard is still the same document; there is no separate mobile app.

![Mobile layout](docs/preview-mobile.png)

## Data sources

The local service proxies only documented read APIs:

| Magpie endpoint | Used for |
| --- | --- |
| `GET /v1/magpie/trace?after=0` | routes, attempts, rules, sessions |
| `GET /v1/magpie/quotas?kept=1` | account windows and balances |
| `GET /v1/magpie/usage?period=…` | USD estimate, series, models |
| `GET /v1/magpie/concurrency` | in-flight and queued requests |
| `GET /v1/magpie/usage/requests?period=…` | request ledger |
| `GET /api/usage/heatmap?period=all` | heatmap (GUI / `magpie web` only) |

When the GUI heatmap route is absent (a headless/tray gateway answers 404), the
service builds the same day cells from `/v1/magpie/usage?period=all` and caches
them for five minutes. No prompt or response body is read.

No prompts, replies, credentials or model-call keys are stored. The service
listens on loopback; the plugin page reaches it through its own origin.

Steady-state polling is incremental: after the first snapshot, the service sends
only the new trace routes, the new ledger rows and a quota-history hash, so a
2.5-second poll is ~23 KB instead of ~150 KB.

### Privacy

- **Screenshots use demo data.** Every account shown in this README is
  synthetic (`demo-…@example.com`); no provider account, key or personal email
  is published.
- **Read-only by design.** The service only issues `GET` requests to the six
  documented endpoints above. It never writes to Magpie or to provider APIs.
- **No prompt storage.** Requests, responses, model-call keys and gateway keys
  pass through Magpie; Observatory keeps only the counters and metadata it
  renders.
- **Loopback only.** The service binds `127.0.0.1`, and the plugin page is
  served from that same origin.

## Project layout

```text
index.mjs              plugin entry; starts the local service
server.mjs             read-only Magpie proxy + static server
preview.mjs            standalone preview (node preview.mjs)
page/index.html        Magpie plugin launcher page
page/boot.js           reads magpie.service / port and navigates the frame
page/icon.svg          plugin icon
public/                the dashboard (index.html, assets/)
public/assets/views/   standalone hero-view modules
docs/research.md       research & design notes (简体中文)
docs/research.en.md    research & design notes (English)
docs/publishing.md     GitHub release + Magpie store topics
docs/visual-forms.md   visual-form research (中文)
docs/visual-forms.en.md visual-form research (English)
scripts/               publish helper
```

## Development

```bash
npm run check          # node --check on entry, server and browser scripts
node preview.mjs        # demo + optional live gateway
```

The dashboard is plain HTML/CSS/JS — no build step, no runtime dependencies.
The plugin host runs it on Bun; the preview runs on Node 18+.

## Links

- Magpie: https://github.com/yetone/magpie
- Plugin docs: https://github.com/yetone/magpie/blob/main/docs/subsystems/plugin-runtime.md
- Research notes: [`docs/research.md`](docs/research.md) (中文) ·
  [`docs/research.en.md`](docs/research.en.md) (English)
- Visual forms research: [`docs/visual-forms.md`](docs/visual-forms.md) (中文) ·
  [`docs/visual-forms.en.md`](docs/visual-forms.en.md) (English)
- Publishing & store topics: [`docs/publishing.md`](docs/publishing.md)
- Issues: https://github.com/JohnWangggg/magpie-observatory/issues

## License

MIT © 2026 JohnWangggg. Icons are bundled from Magpie and LobeHub Icons (MIT);
see [`public/assets/icons/LICENSE`](public/assets/icons/LICENSE).
