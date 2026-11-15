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
- **Eight views** — route, sessions, latency, funnel, quota, usage, mix, and the year-in-rings. Related charts are tabs inside one view.
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
- **Mini mode** — `?mode=mini&view=burn` shrinks the page into a
  picture-in-picture-ready widget (see `docs/mode-mini.png`).
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

## Views

Eight views. Related charts are tabs on the same view, not separate menu entries.

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

| Treemap · cost by provider and model | Sankey · agent → provider → model |
| --- | --- |
| ![treemap](docs/mode-treemap.png) | ![sankey](docs/mode-sankey.png) |

| Funnel · requests to success | Latency · time × bucket |
| --- | --- |
| ![funnel](docs/mode-funnel.png) | ![latency](docs/mode-latency.png) |

| Budget · thresholds and pace | Marimekko · provider × model |
| --- | --- |
| ![budget](docs/mode-budget.png) | ![marimekko](docs/mode-marimekko.png) |

![Chord · agent ↔ provider ribbons](docs/mode-chord.png)

| Network · agent ↔ provider graph | Stream · provider flow over time |
| --- | --- |
| ![network](docs/mode-network.png) | ![stream](docs/mode-stream.png) |

| Burn · quota windows at pace | Candle · hourly throughput |
| --- | --- |
| ![burn](docs/mode-burn.png) | ![candle](docs/mode-candle.png) |

![Gauge · KPI and quota dials](docs/mode-gauge.png)

## Switching views

The hero header has a view picker instead of a wall of tabs. Press **V** (or
click it), type to filter by name / eyebrow / group, press Enter to switch, or
hit **随机一个** for a random view. The 8 views are grouped by what they answer, and the hero accent follows the group.
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

Hovering a row in the picker floats a **live thumbnail** of that view's hero card
(generated by `npm run thumbs` into `public/shots/`), so the remaining entries stay
navigable without leaving the menu. Hold the hover ~0.4 s and the thumbnail
grows for a closer look; click it to pop the full shot in a lightbox while the
view loads underneath. The same thumbnails ride the rail favourites, the ⌘K
palette rows and the picker button itself.


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
