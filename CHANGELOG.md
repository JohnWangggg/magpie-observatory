# Changelog

All notable changes to Magpie Observatory. The project follows a "dead-code
first" cadence: surface what was built but never wired, then layer new
delight on top.

## [1.1.2] — 2026-11-15

### Added

- **Ambient particle layer** — a fixed canvas of ~20–160 drifting motes
  behind every card; density tracks the live-session count, hue re-reads
  `--accent` every 3 s so it follows the accent picker, and it pauses on
  `document.hidden` or `data-motion="off"`.

## [1.1.1] — 2026-11-15

### Added

- **Accent picker** — 主色 group in 设置 with five swatches (极光/熔金/薄荷/
  蔷薇/石墨). `data-accent` overrides `--accent`, `--accent-strong` and
  `--accent-soft` so every style pack keeps its identity while the colour
  story changes.

### Fixed

- A nesting bug in `settings-menu` left by an earlier edit — `div` balance
  is now 19/19 inside the panel.

## [1.1.0] — 2026-11-15

### Added

- **KPI cards jump to their view** — every `.kpi` article is a button:
  tps → latency, active → orrery, tokens → trend; requests/cost/cache
  scroll the relevant panel card into view.

## [1.0.9] — 2026-11-15

### Added

- **Session-card hover popover** — 350 ms hover opens a 260 px fixed
  panel with the tries chain and four quick stats; closes on leave,
  scroll, or a click outside.

## [1.0.8] — 2026-11-15

### Added

- **Hot-view flames** — view picker marks views opened ≥3× with 🔥;
  the menu rebuilds on every open so counts stay fresh.

### Fixed

- TDZ error in `openViewMenu` left behind by a previous edit — the
  `styleMenu`/`settings` declarations are back.

## [1.0.7] — 2026-11-15

### Added

- **Daily-goal ring** — the tokens KPI carries an 18 px progress ring
  against yesterday's heatmap total; hover spells out the numbers.

## [1.0.6] — 2026-11-15

### Added

- **Palette learns your habits** — `setHeroMode` bumps `magpie.viewHeat`;
  the ⌘K 视图 section sorts by open count and tags frequent views
  `· 常用`.

## [1.0.5] — 2026-11-15

### Added

- **Achievement wall** — ⌘K → 个人战绩 now embeds all eight badges with
  lock/medal state, unlock condition and date.

## [1.0.4] — 2026-11-15

### Fixed

- `?mode=mini` only shrank the cinema HUD; views like orrery still
  rendered their provider table, which destroyed the 320×180 PiP
  promise. `body.mini` now collapses every view's `.side/.stats/.legend/.tip`
  and re-flows `*-board` grids to a single column.

## [1.0.3] — 2026-11-15

### Added

- **Removable filter chip** — a badge sits above the session list while a
  legend filter is on; × clears it. Visibility is re-synced on every
  `renderSessions` pass, including short-circuited ones.

## [1.0.2] — 2026-11-15

### Added

- **Provider legend filtering** — the route-stage delegate now honours
  `data-provider` chips too (prism's legend is provider-based).

### Fixed

- `legend-on` moved into `renderCustomView` so the active chip survives
  async re-renders — the previous `requestAnimationFrame` tag raced the
  view's own rebuild and stayed dark.
- `prism.js` legend used `data-agent` on provider rows — fixed to
  `data-provider`.
- Renamed the new view `beehive` → 蜂房 to clear a ⌘K palette title
  clash with `bees` 蜂巢.

## [1.0.1] — 2026-11-15

### Changed

- **De-duplicated dead-UI wiring** — `app-plus.js` already implemented
  cinema (with HUD stats), exportPNG (canvas + CSS-inlined SVG) and the
  ⌘K palette; the copies added in `app.js` were removed so O/E/⌘K stop
  double-toggling. `app-plus` now exports `toggleCinema`, `setCinema`
  and `exportPNG` on `window.Obs` for the core keyboard layer.

### Added

- `data-agent` legend chips in 30 custom views route through a
  route-stage click delegate — clicking an agent swatch filters the
  session list, clicking again clears it.
- `←`/`→` cycle through views (skips the current one).

## [1.0.0] — 2026-11-15

The 62-view, 8-style, full-lifecycle release: every README promise wired,
verified in a real browser, and screenshotted.
