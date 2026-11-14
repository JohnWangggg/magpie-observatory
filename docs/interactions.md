# Interactions · 交互速查

Every surface in Magpie Observatory responds. This file is the complete map —
click, right-click, double-click, keyboard, hover, and what each one does.

| Surface | Click | Right-click | Double-click | Keyboard | Hover |
| --- | --- | --- | --- | --- | --- |
| **Attention chip** (quota/error/streak/today) | → `burn` / `logs` / replay / toggle | Dismiss chip | — | `←→` cycle | Tooltip |
| **Quota item** | → `burn` row | Copy provider key | Copy window name | `←→` cycle | Flip to `已用/剩余` |
| **Session card** | Select + `logQuery=id` | Copy session id | Copy tries summary | `↑↓` cycle | Status tip |
| **Log row** | Expand detail strip | Export log CSV | Copy row JSON | `↑↓` cycle, `/` focus search | — |
| **Decision row** | → session card | — | — | `←→` cycle | — |
| **Decision try-pill** | → quota item pulse | Copy model name | — | — | `N attempts` |
| **Burn row** | Expand window sparkline | Export window CSV | — | `↑↓`, `Enter`/`Esc`, `←→` | Pace tooltip |
| **Burn sparkline** | — | — | — | — | `left% · at` per point |
| **Heatmap cell** | `logQuery=YYYY-MM-DD` | Copy date | — | — | `N 次 · Tok` |
| **Heatmap month** | Dim/scale focus | Export month CSV | `logQuery=YYYY-MM` | `←→` cycle | Month summary |
| **Rail fav icon** | Switch view | Un-favourite | Set as default view | `↑↓` cycle | View name |
| **Rail nav icon** | Switch view | — | — | — | View name |
| **Candle body** | Pin OHLC | — | — | `←→` walk, `Enter` pin, `Esc` clear | Crosshair + `O/H/L/C ±%` |
| **Gauge quota dial** | → `burn` row | — | — | `Enter` same | — |
| **Bloom flower** | — | — | — | — | `provider · status · N tok` |
| **Hero stage** | — | Favourite the view | — | — | — |
| **Hero title** | — | — | Copy view name | — | — |
| **Palette item** | Run | — | — | `↑↓`, `Enter`, `Esc` | — |
| **Achievement badge** | — | — | — | — | `name · date` |
| **XP level chip** | → `play` view | — | — | — | `LV n · XP` |

## Global keys

| Key | Action |
| --- | --- |
| `/` | Focus log search |
| `Space` | Pause / resume live demo |
| `T` | Toggle dark / light |
| `V` | Open the view picker |
| `R` | Toggle replay |
| `G` | Toggle auto tour |
| `F` | Favourite the current view |
| `O` | Cinema mode |
| `⌘K` | Command palette |
| `?` | Shortcut sheet |
| `Esc` | Close menu / strip / picker |

## View-picker keys

| Key | Action |
| --- | --- |
| `↑↓` | Move through items |
| `Tab` / `Shift-Tab` | Jump between groups |
| `Enter` | Switch |
| `Home` / `End` | First / last item |
| `Esc` | Close |
| `⌃V` | Toggle recent / all |

## Persistence

- Scroll position per view (`magpie.scrollPos`)
- Log query (`magpie.logQuery`)
- Burn selection (`magpie.burnSel`)
- Favourites (`magpie.favorites`)
- Default view (`magpie.defaultView`)
- Style pack, theme, density, motion, tour interval, group-by
- View menu tab (`magpie.viewMenuTab`)
