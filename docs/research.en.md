# Magpie Observatory · Research & Design Notes

**English** · [简体中文](research.md)

> Research subjects: `bowenliang123/dsh-context`, `smallcat2333/magpie-hud`,
> Magpie's own Gateway / Routing / Usage / Quotas screens, and a dozen adjacent
> projects.
>
> The conclusion first: **do not build a second Magpie admin console. Build a
> control room.** Magpie already owns configuration, providers, accounts and
> routing rules; the observatory answers three questions:
>
> 1. **Who is running right now?** (requests, sessions, subagents, live routes)
> 2. **Where did the money and tokens go?** (model, provider, account, time)
> 3. **How long will the quota last?** (windows, reset countdowns, reroutes,
>    cooldowns)
>
> `index.html` is the runnable visual prototype; this document records the
> evidence, the data contract and the delivery plan. Every screenshot and account
> in this repository is demo data (`demo-…@example.com`).

---

## 0. Three reference projects and the problem each solves

| Project | Form | What is worth borrowing | What does not transfer |
| --- | --- | --- | --- |
| `dsh-context` | DeepSeek Harness plugin (TypeScript / React) | Information architecture, KPI strip, 7-day paired bars, 8-week heatmap, composition donut, session cards, empty states and drill-down | It is bound to DSH's session projection / host plugin model |
| `magpie-hud` | Tauri 2 + Rust desktop overlay | Real data sources, live-route narrative, quota rail, responsive portrait/landscape, performance isolation, offline fallback | It is a floating window, not a full-screen cockpit; the layout has to be enlarged |
| Magpie official UI | Go + native Web UI (no framework) | Route stage (Agent → magpie → account), live/history switch, the complete Usage metric set, brand icons, themes and colorblind-safe palette | It is an admin surface with high density; the observatory should be quieter and more scannable |

---

## 1. `dsh-context`: turn context into a story you can drill into

### 1.1 What it does

`dsh-context` is a context-insight plugin for DeepSeek Harness with five entry
points:

- **Context Insights page**: a cross-session overview and a first-level sidebar
  panel.
- **Context tab**: per-session statistics, composition, trend, events, messages
  and command execution.
- **Fleet tab**: the current agent, its parent and its subagents as a live graph.
- **Context sidebar panel**: the same dashboard beside the chat.
- **`/context` command**: a centered modal inside chat.

Its core is not chart drawing; it splits context into explainable layers: system
prompt, tool definitions, user messages, injected context, skill injection, tool
calls, reasoning and answers — then aggregates by request, turn, step, session
and agent family.

### 1.2 Page structure worth borrowing

| Block | Purpose | Mapping to Magpie |
| --- | --- | --- |
| KPI strip | Tokens, cost, cache hit rate, turns | Requests, tokens, cost, cache hit, TPS, active sessions |
| 7-day paired bars | Token + cost per day, side by side | 24h / 7d / 30d token + cost combo chart |
| Activity heatmap | Tokens per day for the last 8 weeks; click to filter a day | 12-week request/token heatmap; click to filter a date |
| Composition donut | Which billable token classes were spent | Model / provider / agent share donut |
| Session cards | Composition ring, tokens, turns, cost, workspace; sort/search/group | Session card: model, routing group, tokens, TPS, reroutes |
| Empty state / skeleton | First load, no data, reading | Gateway offline, quota unavailable, history not loaded |

### 1.3 Engineering lessons

- **Aggregate on the host; render on the client.** `src/host/` performs fold,
  aggregate, cache, pricing and attribution; `src/client/` only receives the
  projected data. The observatory should aggregate in the service/proxy layer,
  not recompute in the browser.
- **Prefer the official meter.** Context pressure and composition read the
  official `contextPressure` / `contextBreakdown`, so the ring matches the chat
  input box. For Magpie, prefer `/v1/magpie/quotas` and `/v1/magpie/usage`;
  never rebuild cost from raw logs.
- **Every number can explain itself.** Tooltips state the formula, denominator
  and exclusions (for example internal routing calls).
- **Empty states are product.** Do not just draw `—`; say why there is no data
  and how to get some.
- **Component granularity.** `overviewUsage.tsx`, `overviewPanel.tsx`,
  `donut.tsx`, `stackedBar.tsx`, `trendChart.tsx` and `pulseTimeline.tsx` are
  independent, reusable pieces.

### 1.4 Design language

- Dark base, low-saturation cards, one accent color; tabular numerals for values.
- Charts are mostly area + thin line; avoid thick bars and saturated blocks.
- Small card titles, uppercase eyebrows, muted descriptions; hierarchy comes
  from weight and whitespace, not borders.
- Interaction is drill-down: KPI → filtered sessions; heatmap day → that day's
  sessions; model → requests.

---

## 2. `magpie-hud`: a live narrative on real Magpie data

### 2.1 What it is

A Tauri 2 desktop overlay that reads:

- Completed usage: `~/.config/magpie/usage.jsonl`
- In-flight state: gateway `/v1/magpie/trace`, `/v1/magpie/concurrency`
- Quotas: `/v1/magpie/quotas?kept=1`
- Cost: `/v1/magpie/usage?period=today`

It never modifies Magpie and never reads model-call keys; remote mode goes
through a separate HUD server and view key.

### 2.2 Refresh cadence (worth copying)

| Data | Frequency | Notes |
| --- | --- | --- |
| `usage.jsonl` | File watch + 1s polling fallback; completed rows in ≤500ms | Written when a request ends |
| `/v1/magpie/trace` | Long poll, `after=<seq>&wait=<s>` | Incremental route snapshot; `ids` is the retained set |
| `/v1/magpie/concurrency` | 1s | In-flight requests, queue, tool calls |
| `/v1/magpie/quotas?kept=1` | Immediately at start + every 60s; refresh 2s after completion | Does not wait for the provider |
| `/v1/magpie/usage?period=today` | 5s | Official USD estimate and hourly series |

### 2.3 Key decisions in the route visualization

- **One main card per session.** When several main requests are active, show the
  newest route ID; when all are done, show the backend's current completed
  record. Subagents attach below the main card.
- **Draw the confirmed group chain.** When width is tight, collapse from the
  front and keep `… → last group → model`; hover reveals the full path.
- **Lines carry semantics:**
  - Blue-cyan flowing line = active request.
  - No first token for 15s → amber (means "first token unconfirmed", not
    failure).
  - A confirmed segment lights a dot for at least 1s, then becomes a green solid
    line.
  - Unconfirmed segments stay light gray.
- **Durations sit above the line.** <1s green, 1–2s amber, ≥2s red.
- **Reroute / retry.** `tries>1` or fail-then-success shows "completed" while
  keeping the retry and recovery explanation.
- **Fixed status/intensity columns.** 48px / 60px in landscape so numbers do not
  jitter the layout.

### 2.4 Quota rail

- Each account shows only its **shortest window** (5h over weekly when both
  exist).
- In automatic routing, outer group providers do not participate in quota
  matching; show the actually selected provider and full account.
- Keep the last reading; never draw an empty bar for "selecting an account".
- A 5h/weekly window with no model restriction is account-shared quota.

---

## 3. Magpie's official UI: the real data contract

### 3.1 Page map

The official app's navigation is **Work / Models / Insights / Extend**. The
surfaces relevant to the observatory are:

- **Gateway**: gateway address, recent calls, masking, browser access, remote
  magpie.
- **Routing**: live route stage + history + routing groups + rules + accounts
  and keys.
- **Usage**: Overview / Requests / Sessions / Quotas (plus a Context card).
- **Sessions**: session list, session details, tool calls, file activity.
- **Providers / Agents**: providers, accounts, models, agent bindings.

### 3.2 Routing page

**Live stage** (`internal/gui/assets/plugins/routing/routing.css`):

- Three columns: agent source → magpie hub → account/key list.
- Connections use `stroke-dasharray` + `stroke-dashoffset`; the flowing layer is
  a separate SVG so static lines are not redrawn every frame.
- Requests and answers are magpie-shaped packets along the path; requests are
  filled, answers outlined, failures red-outlined.
- Account rows show provider icon, account, plan, model, status, quota bar and
  failure label.
- Copy emphasizes "live, as the gateway decides" and "Every request an agent
  sends to magpie shows up here, routed for real."
- Supports **Back to live**, view by session, view by request; history is kept
  for 30 days, and days older than 200MB are pruned.

**Route explanation:**

- `asked`: the model the agent named.
- `group` / `rule`: the matched rule and its model-selection decision.
- `model` / `effort`: the current attempt and reasoning effort.
- `tries[]`: every attempt; a failed `fail` is a fallback.
- `done` / `status` / `served`: after completion.

APIs:

```
GET /v1/magpie/route?session=<id>
GET /v1/magpie/route?session=<id>&after=<seq>&wait=<seconds>
GET /v1/magpie/trace?after=<seq>
GET /v1/magpie/concurrency
```

### 3.3 Usage page

The official Usage page is a complete data dictionary:

- **KPI / Totals**: calls, errors, retried, canceled, input, output, cache_read,
  cache_write, reasoning, cost, unpriced, credits, timed, ttft_ms, decode_ms,
  decode_out, and more.
- **Series**: bucketed by hour/day/week; `by` can stack provider / agent / model.
- **Breakdown**: agents, models, accounts, providerKeys, callerKeys, sessions.
- **Requests**: per-request table with period, day, agent, provider, model,
  account, callerKey, purpose, failed, retried, q, via, computer filters;
  `limit` max 500.
- **Incremental ledger**: `?cursor=start&limit=500` → `rows`, `deleted`,
  `next_cursor`, `has_more`; upsert by `id`, replace when `seq` is higher.
- **Heatmap**: GUI `/api/usage/heatmap` returns
  `{from,to,days:[{date,calls,tokens,cost}]}`; 53 weeks in the official UI.
- **Quotas**: `/v1/magpie/quotas`, `?kept=1`, `/quotas/history`,
  `/quotas/cards`, `POST /quotas/refresh`, `POST /quotas/codex-reset`. Each
  window has `used`, `remaining`, `resetsAt`, `holds` (whole-window estimate)
  and `holdsWhy`.

### 3.4 Official visual system

Design tokens extracted from `internal/gui/assets/app.css`:

| Token | Light | Dark |
| --- | --- | --- |
| Background | `#f4f4f6` | `#1a1a1e` |
| Card | `#ffffff` | `#232327` |
| Card secondary | `#f9f9fb` | `#1f1f23` |
| Border | `#e3e3e8` | `#333339` |
| Primary text | `#1c1c21` | `#ededf1` |
| Secondary text | `#4b4b53` | `#b9b9c1` |
| Muted text | `#85858d` | `#8b8b94` |
| Accent | `#4f46e5` | `#a5b4fc` |
| Success / warning / error | `#189a58` / `#b45309` / `#d64545` | `#6fd99b` / `#f2b544` / `#f28b82` |

- Charts use the **Okabe–Ito** qualitative palette (colorblind-safe) with a
  `data-colorblind="1"` toggle.
- Failures are not only red; an `x` shape keeps them readable in grayscale.
- 212 brand SVGs are bundled locally and mapped by provider/agent/model; unknown
  sources use a generic icon.
- No framework: one state object in `app.js` plus view files, embedded via
  `//go:embed`.
- Motion only where it means something: live routing, refresh spinner, press
  feedback, theme switch.

### 3.5 Why the official APIs matter to the observatory

| Need | Official API | Notes |
| --- | --- | --- |
| Live routes | `/v1/magpie/trace` | Long-poll deltas; `ids` removes evicted routes |
| Single session route | `/v1/magpie/route?session=` | Status bar / single-session panel |
| Concurrency | `/v1/magpie/concurrency` | `active[]` + lanes + waiting |
| Quotas | `/v1/magpie/quotas?kept=1` | Does not wait for providers |
| Usage totals | `/v1/magpie/usage?period=` | Official USD estimate |
| Request ledger | `/v1/magpie/usage/requests` | Filters + cursor |
| Heatmap | `/api/usage/heatmap` | GUI / `magpie web` only |
| Cost series | `series` in `/v1/magpie/usage` | Includes internal routing |
| Gateway key limits | `/v1/magpie/limit` | For shared gateways |

---

## 4. More projects worth studying

> These are not copy targets; each solves one sub-problem. Pick one reference per
> sub-problem instead of cramming every interaction into one screen.

### 4.1 Agent usage and status lines

| Project | Link | Borrow |
| --- | --- | --- |
| `jarrodwatts/claude-hud` | https://github.com/jarrodwatts/claude-hud | Status-line HUD: context pressure, active tools, running agents, todo progress; compress "what the agent is doing" into one line |
| `tt-a1i/tokenmeter` | https://github.com/tt-a1i/tokenmeter | Go local dashboard; 15 local sources; live event stream (Unix socket → SSE); budget alerts, forecasts, heatmap, tool-error analysis |
| `ryoppippi/ccusage` | https://github.com/ryoppippi/ccusage | 5-hour block view, daily/monthly/session reports; better for "billing windows" than a live panel |
| `Nihondo/AgentLimits` | https://github.com/Nihondo/AgentLimits | macOS widget: quota rings, tokens/cost/heatmap; menu-bar / widget form |
| `philipecomputacao/claude-llm-quota-bar` | https://github.com/philipecomputacao/claude-llm-quota-bar | Multi-provider quota adapters, burn rate (🧊/⚡/🔥), context percentage; a status-line extension |

### 4.2 Gateway and cost management

| Project | Link | Borrow |
| --- | --- | --- |
| `BerriAI/litellm` | https://github.com/BerriAI/litellm | Spend Logs / Analytics UI, virtual keys, budgets, model/key breakdown, Prometheus + Grafana |
| `Calcium-Ion/new-api` | https://github.com/Calcium-Ion/new-api | Multi-channel/model management, quota and multipliers, logs and dashboards; a density reference for Chinese admin UIs |
| `musistudio/claude-code-router` | https://github.com/musistudio/claude-code-router | Routing configuration and status line across providers/models; how routing rules become a product |
| `magpie-community/plugins` | https://github.com/magpie-community/plugins | Magpie plugin ecosystem; make observability a plugin, not a bolt-on |

### 4.3 Observability and traces

| Project | Link | Borrow |
| --- | --- | --- |
| `Helicone` | https://github.com/Helicone/helicone | Request waterfall, cost/latency, cache hits, session replay; tell one request as a timeline |
| `Langfuse` | https://github.com/langfuse/langfuse | Trace / Session / Generation hierarchy, cost, scores and datasets |
| `Arize Phoenix` | https://github.com/Arize-ai/phoenix | OpenTelemetry-native traces, LLM/agent evaluation; later OTel integration |
| `Grafana` + OTel GenAI | https://github.com/BerriAI/litellm/pull/35159 | Metric shape: `gen_ai.request.model`, token usage, latency histogram; long-term storage and alerts |
| OpenRouter Activity | https://openrouter.ai/activity | Spend by model/provider/time; the aggregator's billing feel |

### 4.4 Icons and visual assets

| Project | Link | Borrow |
| --- | --- | --- |
| `lobehub/lobe-icons` | https://github.com/lobehub/lobe-icons | Static brand icons used by `magpie-hud`; MIT; map by provider/agent and keep original colors |
| `simple-icons` | https://github.com/simple-icons/simple-icons | Broader monochrome brand set; a good fallback |
| Radix / shadcn style | — | Not a dependency; borrow the restraint of low-contrast borders, one accent and small uppercase eyebrows |

> Conclusion: **never pull icons from a CDN at runtime.** Bundle 20–40 common
> provider/agent SVGs locally, fall back to the Magpie mark or an initial block;
> offline, no flicker, controlled size and color.

---

## 5. Product definition: Magpie Observatory

### 5.1 One sentence

> One screen that shows which path every agent's request is taking through
> Magpie, how much it costs, and when the next account quota resets.

### 5.2 One-screen information architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│ rail │ topbar: live status · data source · today/7d/30d · pause · theme│
│      ├──────────────────────────────────────┬───────────────────────┤
│      │ Live route stage                     │ Live sessions          │
│      │ Agent → magpie → Provider/Account    │ active / recent        │
│      │ decision strip: group · rule · tries │ main card + subagents  │
│      ├──────────────────────────────────────┴───────────────────────┤
│      │ KPI × 6: requests · tokens · cost · cache · TPS · active     │
│      ├──────────────────────┬───────────────┬───────────────────────┤
│      │ 24h / 7d / 30d trend │ account quotas│ model mix             │
│      ├──────────────────────┴───────────────┴───────────────────────┤
│      │ Activity heatmap (12 weeks)          │ Recent requests       │
│      └──────────────────────────────────────┴───────────────────────┘
│ statusbar: gateway · usage.jsonl · events · refresh cadence · clock   │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.3 Visual direction

**Keywords: control room, low noise, real brand colors, only the routes move.**

- Background: near-black blue `#07080c` plus two very faint purple/cyan radial
  lights, never a full wash.
- Cards: `#0e1118`, 1px `#1d2431` border, 16px radius, a subtle top highlight.
- Accent: purple `#8b7cf6`; live/success cyan-green; reroute amber; error coral.
- Type: Inter / SF Pro + PingFang SC; tabular numerals; model names in mono.
- Sizes: titles 14–16, body 10–11, secondary 8.5–9.5; hierarchy without huge
  type.
- Icons: 16/20/26px; providers and agents in original colors; UI icons as
  monochrome strokes.
- Rings: quotas with conic-gradient; model mix as an SVG donut; no 3D, no shadow
  stacking.

### 5.4 Component inventory

| Component | Data | Interaction |
| --- | --- | --- |
| `AgentNode` | agent, active count, group, token load | Click to filter that agent |
| `HubNode` | active sessions, concurrency, routing mode | Click to return to overview |
| `ProviderNode` | provider, current model, account chips, quota, status | Click to filter that provider |
| `RouteWire` | agent→hub, hub→provider | Flowing dashed line + two-way magpies; color on failure/reroute |
| `DecisionStrip` | group, rule, intent, confidence, tries | Hover for the full narrative |
| `SessionCard` | title, agent, model, group, status, tokens, TPS, reroutes | Click to lock the route of that session |
| `QuotaRing` | provider, account, window used, resetsAt | Hover for window details |
| `TrendChart` | series (tokens/cost) | Switch metric; crosshair tooltip |
| `ModelDonut` | model tokens | Hover highlight; click to filter the ledger |
| `Heatmap` | date/tokens/calls | Hover date; click to filter |
| `RequestTable` | time, agent, session, model, status, tokens, ttft, tps, cost | Search, export CSV |

### 5.5 The two-way magpie animation (v2)

The first version used the official Routing page's `FLIER` path plus SMIL
`animateMotion`; it did not work well:

- At 20–30px the outline looked like a small fish/arrow.
- WebKit's support for `mpath` + `keyPoints="1;0"` was unstable; return birds
  piled up at the SVG origin.
- Birds whose `begin` had not started were still painted at `(0,0)`, creating
  ghost birds.

v2:

- **Use the Magpie brand silhouette** (`assets/icons/magpie.svg`) at 30px/25px;
  the white belly reads in both themes.
- **One pair per active session**: a filled bird carries the message dot to the
  provider; a mirrored outlined bird brings the answer back. Only the first 3
  active sessions (6 birds) fly, so the hub is not drowned.
- **Compute the path ourselves**: `requestAnimationFrame` +
  `path.getPointAtLength()`, setting `transform="translate(x y)"` at 30fps. No
  SMIL, no ghost birds.
- **Use a separate reverse path for the return leg**, not `keyPoints`; best
  compatibility.
- The path leaves the agent's right edge, passes about 30px above/below the hub,
  and reaches the provider's left edge; birds never cover the "magpie" wordmark.
- With `prefers-reduced-motion`, birds sit at 50% of the path and do not play.
- Performance: 6 birds × 30fps of `getPointAtLength` + `transform` only repaints,
  never reflows; route DOM is rebuilt only when agents/providers/status change
  (token counters do not trigger a rebuild).

### 5.6 Responsive: one screen vs scrolling

"Fill the screen" and "do not clip" conflict at 1366×768 / 1280×800. The
trade-off:

| Condition | Behavior |
| --- | --- |
| ≥ 901px tall | Fixed four-row grid: `1.45fr / auto / .72fr / .72fr`; `body` does not scroll; cards scroll internally |
| ≤ 900px tall | Stop forcing it; `body` scrolls; cards return to natural height and keep every account/request |
| ≥ 1700px wide | 53-week heatmap; three quota columns |
| 1401–1700px | 53-week heatmap (narrower cells); three quota columns |
| 981–1400px | 53-week heatmap (compressed further); two quota columns; chart and quota each span 6 |
| ≤ 980px wide | Route and sessions stack; wires and birds hidden; heatmap/table full width |
| ≤ 680px wide | Single column; two KPI columns; one quota column; 53-week heatmap compressed to its readable floor |

The heatmap currently always draws 53 weeks (371 days) and compresses cells with
`minmax(0, 1fr)`; if larger phone cells are needed later, slice the last 26/13
weeks per breakpoint. Other fixed-height regions (`hero`, `live-panel`,
`quota-list`, `table-scroll`) use `min-height: 0` + internal scrolling so rows
cannot burst the layout; chart height is recomputed from the container's
`clientHeight`. Short screens prefer readability over a forced single screen.

### 5.7 Quota card readability (v3)

The first version was 2 columns × 3 rows with rings, two progress bars,
percentages and countdowns — overloaded. The second used 2 columns of 40px rows
and was still cramped. v3:

- **Three columns wide, two at ≤1400px, one on phones**; each card is 66px tall
  and breathes.
- Each card: a 34/38px ring gauge (provider icon inside), account name + plan,
  **one** shortest-window bar, email + window/reset, and a large percentage on
  the right.
- Other windows are not drawn as a second bar; they live in `title`. One card
  never shows three competing numbers.
- Percentage color: <70 brand, 70–88 amber, ≥88 red; balances never fake a
  percentage.
- At 1920×1080 six accounts fit 3×2 on one screen; 1500px wide still 3×2; at
  1280×800 it becomes 2×3 and the page scrolls; phones use one column.

### 5.8 Cromma Game View and other formats

[CrommaCode](https://cromma.ai/code) turns every agent tool call into a
"watchable beat":

- **Westworld**: a giant dial whose needle points at the current tool and
  trails where the agent is working.
- **Loom**: each call is woven into a row; a whole session is a tapestry.
- **Factory**: calls move like parcels on a conveyor past workstations.
- **Chips**: each call is a card; chips × multiplier scoring.
- **Rhythm**: calls are notes on lanes with PERFECT / GREAT / GOOD judgments.
- **Bees**: parallel subagents are a swarm, each with its own worktree and
  branch.

What is worth learning is not the game skin but four principles:

1. **One call appears once.** Every view shares one event stream; no double
   counting.
2. **Every visual maps to real data.** Needle angle = current provider, loom row
   = one request, note = one call; motion is never decoration.
3. **History is material.** File trees, Git graphs and looms re-arrange history
   instead of showing only the latest item.
4. **Fun must not block reading.** The default stays a terminal/list; Game View
   is an optional second layer.

Other formats worth borrowing:

| Form | Best for | Mapping in Magpie |
| --- | --- | --- |
| Sankey / metro map | Request flow from agent to provider | Route stage, group chain, reroutes |
| Radar / constellation | Current provider, quota, active sessions | **Implemented: route radar** |
| Loom / tapestry | Request density and color over time | **Implemented: request loom** |
| Oscilloscope / track | TPS, TTFT, latency beats | Rhythm: provider lanes + notes |
| Flame graph | Time in model, tools, queue, first token | Request detail timeline |
| Factory conveyor | Queue → route → stream → done | Factory: request parcels |
| Cards / scoring | Cache hit, reroute, TPS combo | Chips: combo × multiplier |
| Swarm / orbit | Subagents, parallel sessions | Bees: one bee per subagent |

This prototype implements five views over the same data (more candidates in
[`visual-forms.en.md`](visual-forms.en.md)):

- **Route**: two-way magpies along Agent → magpie → Provider.
- **Radar**: magpie at the center, providers on a dial, quota rings; in-flight
  and quota panels on the sides.
- **Loom**: the last 16 requests become colored bands; color = provider,
  brightness = token density; model/tokens/status on the right, cache hit at the
  top.
- **Rhythm**: one lane per provider; requests land on a 16-step grid; a playhead
  sweeps; combo/cache at the bottom; failed notes turn red.
- **Rings**: the last 26 weeks as a polar calendar; seven weekday rings and one
  column per week; bead size = tokens, colour = activity level, today keeps a
  green ring.

Later, **Factory** (queued/streaming parcels) and **Chips** (combo × multiplier)
can be added, but not all on one screen; mode switching preserves the
readability of the default route view.

### 5.9 Style system: theme × style

"Theme" and "style" are independent dimensions:

- `data-theme="light|dark"`: day/night.
- `data-style="control|pixel|paper|neon"`: art direction.

All four styles share the same DOM, layout and data; only CSS tokens and a few
textures change:

| Style | Language | Variants |
| --- | --- | --- |
| Control | Glass cards, purple/cyan, thin borders, soft shadows | Light + dark |
| Pixel | Hard borders, 4px hard shadows, monospace, scanlines, Game Boy green | Light + dark |
| Paper | Cream, serif, brown accent, paper grain, report feel | Light + dark |
| Neon | Black, magenta/cyan glow, radar-first | Light + dark |

Implementation:

- Style variables live on `:root[data-style=...]`; theme variants override with
  `[data-style][data-theme]`. No page or component duplication.
- Pixel overlays scanlines with `body::before`, uses `box-shadow: 4px 4px 0` and
  removes every radius; birds, charts and heatmap keep the same data in a pixel
  language.
- Paper uses serif type and a paper gradient, a `sepia` filter on charts and a
  brown heatmap ramp.
- Neon uses saturated accents and glow for night walls and the radar view.
- Style choice is stored in `localStorage`, separately from theme.

Switching a style calls `renderAll()` once; CSS variables take over after that,
so data and sessions are never rebuilt.

The settings panel also makes "space" a choice:

- **Layout**: `auto` (one screen on large displays, scroll on small), `fit`
  (force one screen at ≥1200×900 with internal scrolling), `comfort` (always
  natural height).
- **Density**: `compact` / `cozy` / `spacious`; changes gaps, padding and
  quota/session row heights.
- **Motion**: `full` / `soft` / `off`; `off` pins birds at the path midpoint and
  stops radar sweep, loom shuttle and rhythm playhead.
- These three dimensions are orthogonal to theme and style; `data-layout`,
  `data-density` and `data-motion` sit on `<html>`; CSS only overrides, never
  data.

"One screen" is not unconditional scaling: forcing it on a small display
sacrifices readability, so below 1200×900 it falls back to scrolling and says so.
This lets a dense monitoring wall and comfortable reading coexist.

---

## 6. Data contract: translating Magpie fields into UI fields

### 6.1 Snapshot aggregation

The browser never talks to Magpie directly (no CORS, no key in the page). The
plugin service `server.mjs` aggregates and caches:

```json
{
  "ok": true,
  "gateway": "127.0.0.1:3425",
  "fetchedAt": 1763021234567,
  "period": "today",
  "data": {
    "trace": { "seq": 123, "ids": [], "routes": [] },
    "quotas": { "data": [] },
    "usage": { "totals": {}, "series": [], "models": [] },
    "concurrency": { "active": [] },
    "requests": { "rows": [] },
    "heatmap": { "days": [] }
  },
  "errors": {}
}
```

### 6.2 Field mapping

| UI field | Source | Notes |
| --- | --- | --- |
| `sessions[].id` | `trace.routes[].session` | Fall back to `id` |
| `sessions[].agent` | `routes[].agent` | Map to `AGENTS` |
| `sessions[].title` | local session title / `folder` | Official trace's `folder` has only the last two levels |
| `sessions[].group` | `routes[].group.ref/id/name` | Exact match; never guess by name |
| `sessions[].rule` | `routes[].rule.n/use/pick` | `n=0` means no rule matched |
| `sessions[].intent` | `rule.classified.intent` | Mark `fallback=previous` as "carried over" |
| `sessions[].tries[]` | `routes[].tries[]` | `done/status/firstText/served` |
| `sessions[].provider` | provider of the last successful try | Not the first failure |
| `sessions[].model` | model of the last successful try / `served` | The model that actually served |
| `sessions[].status` | `done` + `status` + `concurrency.active` | 200–299 success; 499 canceled; others failure |
| `kpis.tokens` | `usage.totals.input+output+cache_read` | Matches official Usage |
| `kpis.cache` | `cache_read / (input + cache_read)` | Exclude official `cache_unknown` |
| `kpis.tps` | `decode_out / (decode_ms/1000)` | Official `decode_ms` is the streaming output window |
| `quotas[].windows[].used` | `used` (0–1 or 0–100) | Normalize to a percentage |
| `quotas[].windows[].resetsIn` | `resetsAt - now` | Local countdown |
| `logs[]` | `usage/requests.rows` | `in/out/cache_read`, `ttft_ms`, `decode_*` |
| `heatmap[]` | `/api/usage/heatmap.days` | GUI / `magpie web` only |

### 6.3 Refresh strategy

| Data | Suggested frequency | Failure handling |
| --- | --- | --- |
| trace | 1s long poll (`after=seq&wait=1`) | Keep the last snapshot; mark "possibly stale" |
| concurrency | 1s | Keep the last snapshot |
| usage | 5s | Keep the last cost; mark `stale` |
| quotas | 60s + 2s after a completion | Keep the last reading |
| requests | 10s or manual | Pagination/cursor |
| heatmap | 5min | Empty state |
| usage.jsonl | File watch + 1s fallback | Keep a partial line until complete |

### 6.4 Two ways to do live routes

**Option A: polling snapshots (the prototype)**

- Fetch `/api/snapshot` every 2.5s; the server requests six sources in parallel.
- Pros: simple, cross-browser, no SSE.
- Cons: route animations reset; more requests.
- Mitigation: diff on the client, rebuild SVG only when the route set changes;
  keep animations alive with CSS/SMIL.

**Option B: SSE / long poll (recommended for production)**

- The server keeps the trace `after` cursor and pushes deltas:
  `event: route` / `event: quota` / `event: usage`.
- The client updates only changed cards; SVG wires are reused by `routeId`.
- Reconnect from the last `seq`; use `ids` to remove evicted routes.

---

## 7. Key interaction details

### 7.1 Route stage

- **Do not draw all history.** Draw active + the last 10; history belongs in the
  table.
- Sort agent nodes by active count; sort provider nodes by
  "answering > queued > rerouted > idle".
- Keep failed attempts on the provider row, labeled "rerouted"; never make them
  disappear.
- Wire color: agent color → provider color; failed segments are red dashed.
- Hovering an agent/provider thickens related wires and fades the rest to 12%.
- Clicking an agent/provider filters the session list; click again to clear.
- Selecting a session highlights only that path; the decision strip shows its
  rule/tries.

### 7.2 Session card

- One main request per row; subagents indent with `↳`.
- Status: streaming (green), queued (amber), done (gray), error (red).
- Token / TPS use tabular numerals; TPS bands: <30 red, 30–60 amber, 60–120
  blue, ≥120 green.
- Reroute count is an amber chip, never red (a reroute is not an error).
- Fixed card height, ellipsized title; hover reveals the full title and route.

### 7.3 Quotas

- Each account shows only its shortest window; other windows live in a tooltip.
- Percentage color: <70 brand, 70–88 amber, ≥88 red.
- Balance accounts (OpenRouter / DeepSeek) show the balance; never fake a
  percentage.
- Reset countdown updates every minute; expired shows "resetting soon".
- Old readings are marked `stale`, never zeroed.

### 7.4 Charts

- 24h uses area + thin line; 7d/30d use the same visual language, not a different
  chart type.
- Token and cost share the x-axis but normalize separately; the legend says
  "cost is dashed".
- Tooltip always shows time, tokens and cost; calls optional.
- Heatmap is 12 weeks × 7 days; today gets a cyan outline; five levels, not a
  continuous gradient.
- Model donut has at most 6 slices; the rest merge into "Other".

---

## 8. Performance and accessibility

### 8.1 Performance

- **Do not put the whole page in one React state that re-renders every second.**
  Subscribe by region: KPI, sessions, route stage, charts.
- Split SVG into a static wire layer and a flowing layer; the flowing layer only
  updates `stroke-dashoffset` or packet positions.
- Route cards use `content-visibility: auto` + `contain-intrinsic-size` so off-
  screen rows are not laid out.
- Render only the visible table window (the prototype caps at 22 rows;
  production uses a virtual list).
- Downsample chart data by pixel width; 24h needs at most 24 points, 30d at most
  30; no per-second recompute.
- All numbers use `font-variant-numeric: tabular-nums` to avoid jitter.
- Icons are local SVGs with fixed `width`/`height`; no load flicker.

### 8.2 Accessibility

- Shape/text in addition to color: failures use `x`, reroutes say "rerouted",
  statuses have labels.
- Support `prefers-reduced-motion`: stop flow, sheen and spin.
- Keyboard: `/` focuses search, Space pauses, `T` toggles theme; cards are
  tabbable and Enter opens them.
- Tooltips work on focus, not only hover.
- Contrast: body text ≥4.5:1; muted text only for secondary information.
- Support the light theme; the chart palette stays readable on light.

---

## 9. Delivery roadmap

### Phase 0 · Visual prototype (done in this repo)

- Static HTML/CSS/JS, no build.
- Mock data + live simulation; 24h/7d/30d, heatmap, donut, quotas, request table.
- `server.mjs` read-only proxy against real Magpie; falls back to demo when
  Magpie is absent.

### Phase 1 · Real data integration (1–2 days)

- Run `/v1/magpie/*` through the plugin host or `server.mjs`.
- Align `data.js` `normalizeLive()` with real fields; add `usage/requests` and
  `/api/usage/heatmap`.
- Handle error/stale/empty states; move polling to SSE.

### Phase 2 · Route animation and history (3–5 days)

- Reuse DOM by `routeId`; update incrementally.
- Replay historical routes by `seq`; support "back to live".
- Add "by session / by request" switching; keep 30 days.

### Phase 3 · Desktop (1 week)

- Tauri 2 or plain Web + `magpie web`.
- Tray/menu bar, always-on-top, translucent blur, multiple displays, shortcuts.
- Local config file, remote HUD server, view key.

### Phase 4 · Depth and ecosystem (ongoing)

- Cost forecast, budget alerts, webhooks.
- Tool-call/file-activity/subagent timelines.
- Plugin packaging: ship the panel as a Magpie plugin that follows the official
  theme and icons.
- OTel / Prometheus export for Grafana.

---

## 10. Prototype files and running

```
.
├── public/
│   ├── index.html          # one-screen dashboard
│   └── assets/
│       ├── app.css         # design tokens, layout, animation, responsive
│       ├── app.js          # rendering, interaction, simulation, live adapter
│       ├── data.js         # mock data + Magpie field normalization
│       └── icons/          # local provider/agent SVGs (MIT)
├── page/                   # Magpie plugin launcher page
├── index.mjs               # Magpie plugin entry; starts the local service
├── server.mjs              # zero-dependency static server + read-only proxy
├── preview.mjs             # standalone preview
├── docs/
│   ├── research.md         # this document (Chinese)
│   ├── research.en.md      # this document (English)
│   ├── publishing.md       # release + store topics
│   └── preview-*.png       # screenshots (demo data)
└── README.md
```

```bash
# standalone preview (Node 18+)
node preview.mjs
# http://127.0.0.1:8777

# connect to a local Magpie
MAGPIE_URL=http://127.0.0.1:3425 node preview.mjs

# when a shared gateway needs a key
MAGPIE_KEY=... node preview.mjs
```

After opening the page, click "演示数据" in the top right to switch to live; if
the gateway is unreachable it falls back to demo with a notice.

---

## 11. References

**Core**

- https://github.com/bowenliang123/dsh-context
- https://github.com/smallcat2333/magpie-hud
- https://github.com/yetone/magpie
- https://usemagpie.ai/docs/zh/start
- https://github.com/yetone/magpie/blob/main/docs/reference.md
- https://github.com/yetone/magpie/blob/main/docs/integrating.md

**Adjacent projects**

- https://github.com/jarrodwatts/claude-hud
- https://github.com/tt-a1i/tokenmeter
- https://github.com/ryoppippi/ccusage
- https://github.com/BerriAI/litellm
- https://github.com/Calcium-Ion/new-api
- https://github.com/musistudio/claude-code-router
- https://github.com/Helicone/helicone
- https://github.com/langfuse/langfuse
- https://github.com/Arize-ai/phoenix
- https://github.com/Nihondo/AgentLimits
- https://github.com/philipecomputacao/claude-llm-quota-bar
- https://github.com/lobehub/lobe-icons
- https://github.com/simple-icons/simple-icons
- https://github.com/magpie-community/plugins

---

## 12. One-line summary

`dsh-context` teaches you to turn data into a story, `magpie-hud` teaches you to
tell a live story with real data, and Magpie's official UI gives you the full
data dictionary and brand assets. **Combine them into one control room: routing
is the protagonist, quotas are the constraint, cost is the outcome, and icons
and motion only serve "what is happening right now".**
