# Changelog

All notable changes to Magpie Observatory.

## [2.0.1] — 2026-11-19

A page that sometimes did not open, and the port races behind it.

### Fixed

- **"The plugin did not load"**: Magpie opens the page before the service is
  listening, so the frame navigated to a refused port. A second copy now
  adopts a live service (~1.2 s) instead of failing, and the launcher never
  blocks on the bridge: `magpie.ready` and `options.get()` each get a 1.5 s
  deadline, then the page navigates anyway.
- **Failed starts are retried**: `index.mjs` used to cache a rejected start,
  so one busy port disabled the plugin until the host restarted. The cache
  now holds only a successful service.
- **Updates hand the port over**: a newer copy asks an older one to exit via
  `POST /api/handover` (loopback only, no Origin), then binds, so the page
  never stays on the previous version.
- **Port held by a foreign program** fails in ~2 s instead of 15 s, while a
  service that is shutting down is probed twice before being adopted.
- **Module-load hardening**: an unreadable `package.json` or `quota.js`
  disables the forecast instead of taking the whole plugin down.
- `/api/ready` answers without touching the gateway; the launcher and tests
  use it.
- **Adopted copies no longer start a second alert monitor**, and a takeover
  is bounded to ten minutes instead of polling forever.

### Added

- `scripts/test-service.mjs`: start, adopt, and takeover are tested (wired
  into `npm test`); `/api/ready` and `/api/handover` are in the structure
  test.
- README troubleshooting for a page that does not open.

## [2.0.0] — 2026-11-18

The product is now one quiet screen. Everything that duplicated Magpie's own
pages, or existed only to decorate them, leaves the default surface.

### Added

- **One-screen view** (`public/focus.html`): in-flight sessions, today's
  tokens/cost/calls/errors, model mix, a 14-day sparkline, and an allowance
  card that compares the last 90 minutes' burn rate with each reset time.
- **Allowance forecast**: red when the window runs out before it resets,
  amber when it is close, green when it lasts; no forecast without history.
- **Explicit demo mode** (`?demo=1`) for screenshots and preview.
- **Chinese/English UI**: the launcher passes the host language; the page, status
  labels, quota verdicts and panel copy all follow it.
- **Local quota alerts**: after the service starts, a five-minute check uses the
  same `quota.js` forecast and sends a macOS/Linux notification when a window
  will run out before its reset. Six-hour cooldown per window, several windows
  merged into one notification; `notify: false` turns it off.
- **Native Usage panel** (`panels/usage.*`): today's tokens, cost, calls and
  errors against the 7-day average, plus the top model, inside Magpie's own
  Usage page. Reads only `usage:summary` through the bridge.
- **Forecast regression test** (`scripts/test-quota.mjs`, 9 cases); the
  forecast itself moved to `public/assets/quota.js`.
- **Account/model mix**: the card defaults to top accounts by cost, with a
  toggle for the model share. Quota rows also name the account, not only the
  provider, so two WorkBuddy accounts are distinguishable.
- **Risk dots beside account spend**: the mix card looks up the account's
  quota rows and marks it red (runs out before reset) or amber (tight).
- **Token definition matches Magpie's Usage page**: input + output, with cache
  read as a separate hit rate. The old focus page added cache_read to the
  headline, which made its numbers incomparable with the host's totals.
- **Seat and reason on the Now card**: route group, serving account, and the
  failure code (e.g. 429) that caused a fallback.
- **Conservative forecast**: recent 90 minutes first, then the current
  window's average; "not enough data" instead of extrapolating a long window
  from a short burst.

### Changed

- The service root is the quiet view; the plugin launcher opens it directly.
- The page follows `?hostTheme=` and falls back to the system theme.
- `server.mjs` reads its version from `package.json`; periods are normalized
  to `today|7d|30d|all`.
- `npm run check` now checks the files that ship and runs `npm test`.
- README (both languages) and `docs/product-review-v2.md` rewritten.

### Optimized

- **One row per session**: a session with several trace routes is no longer
  repeated in "Now"; live sessions win, otherwise the latest route.
- **TTFT and token counts mean what they say**: TTFT is the final successful
  try, the token number is this turn's input + output, and TPS is hidden only
  when there is no decode time.
- **Smaller snapshots**: the request ledger is gone, usage/trace/quotas are
  slimmed to the fields the screen reads, and quota history keeps 20 points.
  A first snapshot went from 203 KB (today) / 767 KB (30d) to ~104 KB / ~119 KB;
  steady-state is still incremental.
- **Quota payload keeps every window** instead of the first four, so a
  third-window risk cannot disappear.
- **Demo period scaling**: 7d/30d demo views scale account/model breakdowns with
  the totals instead of showing today's spend beside a 30-day number.
- **Contrast, favicon, system theme changes, and a period-aligned sparkline**
  (7/14/30 days) are fixed.
- Warning threshold is now 20% left; red at 10% left or earlier than reset.

### Fixed

- **`snapshot 403` after a plugin-host restart.** The sandbox token was random
  per service run, so an already-open page kept an old token. It is now
  persisted at `~/.config/magpie/observatory-page-token` (mode 600), and a 403
  triggers one `tokenReload=1` refresh.
- **The 7-day tab was showing 30 days.** The page sent `week`, and the
  gateway silently answered `30d`.
- The console banner, page footer and `/api/version` disagreed on the version.
- The view menu rendered seven empty groups and filter chips.
- The rail navigation only scrolled and toasted; it also bound twice.
- The first-open digest modal covered the dashboard; it is now opt-in
  (`magpie.digestAuto=1`).
- `state.metric` was undefined in the view context.

### Removed from the product

- 25 views, 7 style packs, XP/levels/badges/streak/combo/records, replay with
  A/B and exports, share cards, weekly report, gateway compare, command
  palette, scratch/session notes, drag layout, PWA, mini mode, sound, ambient
  particles, mascot, attract mode, automatic digest, multi-gateway switching.
- The v1 dashboard source, its 25 view modules, 7 style packs, old scripts,
  old docs and 32 MB of screenshots are deleted from the repository; it is
  no longer published in the npm package, and `/index.html` redirects to `/`.
- The npm tarball is now ~130 KB (was ~4 MB of public assets).


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
