# Changelog

All notable changes to Magpie Observatory are documented here.
Format: `v[version] — date — summary`. See `docs/roadmap-2026q4.md` for the full per-phase log.

## [0.67.0] — 2026-11-15

### Highlights since 0.18

**Views (30 total)**

- `burn` — quota window burn rate: fill/flat-tick/proj-dash bars, click to
  expand the window's sparkline (`left% · at` hover), flat-pace ghost line,
  per-window CSV export, `↑↓/Enter/Esc` nav, hover tooltip.
- `candle` — OHLC candlesticks of per-period tokens; `←→/Enter/Esc` walk and
  pin, crosshair + OHLC card on hover.
- `gauge` — KPI and quota-window dials (270° arc + needle); quota dial
  click/Enter jumps to `burn`.
- `bloom` — requests bloom into a garden (provider = petal colour, tokens =
  petals, failures = buds), trailing vine.
- `petri` — requests as living cells in a dish (cytoplasm = provider,
  nucleus pulses, live cells breathe, failures ghost).
- `aurora` — requests as light-curtains (height = tokens, width = tps,
  failures = grey streaks), 40 twinkling stars.
- `constellation` — sessions as star-patterns (one star per try, ≥3 padded
  aux stars), linked into a larger map, colour = agent.
- `play`, `stellar` — game / ambient views from earlier phases.

**Interaction layer**

- Attention strip: quota/error chips `click → burn / logs`, `contextmenu → dismiss`, `←→` keyboard.
- Quota card: `click → burn row`, `contextmenu → provider key`, `dblclick → name`, `←→` keyboard.
- Session card: `click → select + log filter`, `contextmenu → id`, `dblclick → tries summary`, `↑↓` keyboard.
- Log table: `click → detail strip`, `contextmenu → CSV`, `dblclick → JSON`, `↑↓` keyboard, `/` focus search.
- Decision strip: `click → session card`, `Enter` same, `contextmenu on try-pill → model name`, `try-pill click → quota pulse`.
- Heatmap: `cell click → logQuery=date`, `cell contextmenu → copy date`, `month click → dim/scale focus`, `month dblclick → logQuery=YYYY-MM`, `month contextmenu → export month CSV`, `←→` keyboard.
- Rail favs: `click → switch`, `contextmenu → un-fav`, `dblclick → default view`, `↑↓` keyboard.
- Hero: `contextmenu → favorite`, `title dblclick → view name`, `scroll-position memory` across views.
- Command palette: `↑↓` nav, `Enter` run, per-provider `看 X 烧速` shortcuts, `复制视图快照` command.
- Global: `/ Space T V R G F ?` shortcuts; `prefers-reduced-motion` honored.

**Accessibility & responsive**

- `role=button`/`aria-expanded`/`aria-label`/`aria-selected` on burn rows, session cards, log rows, quota items.
- Narrow `<680px` burn collapses to 3/2 columns, tooltips hidden on touch, attn/decision strips shrink.

**Infra**

- `npm run check` covers all 20+ JS files; `.github/workflows/check.yml` runs it on push/PR.

## [0.18.0] — 2026-11-14

Baseline: 24 views, route stage, quota/donut/trend/heatmap/log cards, 4 style packs,
cinema mode, replay bar, command palette, layout edit, gateway compare, achievements, XP.
