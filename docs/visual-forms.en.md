# Visual Forms · Research Notes

> After Route / Radar / Loom / Rhythm / Rings: **which other forms are both
> beautiful and honestly supported by Magpie's data?**
>
> Surveyed: Langfuse / Helicone / LangSmith / Braintrust / Datadog / Grafana +
> OTel LLM observability UIs, chart catalogues (Data Viz Project, Visualizing.JP,
> Dataviz Inspiration), and Magpie community panels such as
> `magpie-agent-office`, `busy-magpie`, `tokenmeter`, `ccusage` and
> `magpie-chat`.
>
> Short answer: **build quota burn-down + pace first, then the session
> waterfall, then cost treemaps and latency distributions.** The polar calendar
> (Rings) is already shipped as the fifth view; see `docs/mode-rings.png`.

---

## 0. What data we actually have

`server.mjs` reads only these endpoints:

| Endpoint | Grain | Forms it supports |
| --- | --- | --- |
| `/v1/magpie/trace` | route / tries / group / affinity / concurrency | flows, paths, reroute narratives |
| `/v1/magpie/concurrency` | in-flight, queue, lanes | live pulse, Gantt, gauges |
| `/v1/magpie/quotas?kept=1` | account × window × used/remaining/resetsAt | quota rings, bars, burn-down |
| `/v1/magpie/quotas/history` | account × window × `at/left/start/resetsAt` | **burn-down, pace, projection** |
| `/v1/magpie/quotas/cards` | card metadata, errors, via | account status, failure reasons |
| `/v1/magpie/usage?period=` | totals + hour/day series + agents/models/accounts/providerKeys/sessions aggregates | trends, treemaps, shares, rankings |
| `/v1/magpie/usage/requests` | per request: in/out/cache/cost/ms/ttft/status/agent/provider/model/session/stop/ep | waterfall, distributions, scatter, table |
| `/api/usage/heatmap` (GUI only) | 53 weeks × days | heatmap, rings, spiral |

**Missing:**

- no span tree / tool nesting → not enough y-axis data for a flame graph;
- `usage` time series is totals only, not stacked by provider/model/agent →
  streamgraph / horizon would need our own aggregation from `requests` or a
  server-side cache;
- no latency histogram → beeswarm / ridgeline can only sample the latest
  80–500 requests;
- no prompt/reply bodies → every form works on counters, latency, cost, status.

---

## 1. Form catalogue and verdicts

| Form | Question | Data needed | Effort | Fit |
| --- | --- | --- | --- | --- |
| **Quota burn-down + pace** | Will this window run out before reset? | `quotas/history` `left/start/resetsAt` | medium | ★★★ |
| **Session waterfall / Gantt** | What happened inside one session, and how parallel was it? | `requests` `session/t/ms/ttft` | medium | ★★★ |
| **Latency beeswarm / ridgeline** | Which provider's TTFT/TPS distribution is worst? | `requests` `ttft_ms/ms/out` | low-medium | ★★ |
| **Cost treemap / sunburst** | Which provider → account → model layer eats the money? | `usage` model/account/agent aggregates | low | ★★ |
| **Sankey / alluvial** | Agent → group → provider → model flow | latest 500 `requests` + trace groups | medium | ★★ |
| **Polar calendar (Rings)** | Which days and weekdays were busiest this half year? | `heatmap` days | shipped | ★★★ |
| **Spiral timeline** | A whole year's rhythm in one line | `heatmap` days | medium | ★★ |
| **Orrery / constellation** | Who orbits whom; quota as fuel | `sessions` + `quotas` | medium-high | ★★ |
| **Latency heatmap (time × bucket)** | Which hours pile up slow requests? | a latency histogram (ring buffer) | medium | ★★ |
| **Funnel** | requests → first token → done → success; where is the drop? | `usage` totals: calls/timed/canceled/errors | low | ★★ |
| **Bullet chart** | quota vs pace vs threshold | `quotas` + history | low | ★★ |
| **Marimekko / mosaic** | provider × model cost structure | `usage.models` + provider | low | ★ |
| **Chord diagram** | agent ↔ provider two-way volume | `requests` aggregate | medium | ★ (readability) |
| **Force-directed network** | agent ↔ group ↔ provider relations | `requests` + trace | medium-high | ★ (layout churn) |
| **Streamgraph / horizon** | provider share over time | time × dimension | high (needs aggregation) | ★★ |
| **Flame graph** | where a session's/request's time goes | span nesting | high (data missing) | ★ (future) |
| **Candlestick / OHLC** | hourly extremes of price/latency | `usage.series` | low | ✕ (weak semantics) |
| **3D / isometric office** | immersion of "what agents are doing" | session state (community plugin already does it) | high | ★★ (fun) |
| **Audio / rhythm** | beats and density | `requests` | medium | ★ (Rhythm exists) |
| **Radar / spider** | provider × metric comparison | `usage` aggregates | low | ★ |
| **Treemap / sunburst** | same, stronger hierarchy | `usage` aggregates | low | ★★ |

---

## 2. Why quota burn-down + pace comes first

Magpie's quota history is uniquely shaped for it:

```json
{ "provider": "opencode-go", "user": "…",
  "lines": [{ "name": "5h", "points": [
    { "at": "…", "left": 76.25, "start": "…", "resetsAt": "…" } ] }] }
```

A burn-down chart can show:

- x = time, y = remaining quota;
- each window is a step line; reset points get a vertical dashed marker;
- a burn rate from the last few points projects a dashed line to `resetsAt`:
  - hits zero before reset → red "runs out early";
  - keeps headroom → green "lasts to reset";
- provider icons, and the existing 70/88% colour bands.

It answers the third product question — **how long will the quota last?** — that
none of the five views answers. No new collection: the service only has to bring
`/quotas/history` into the snapshot, and the client adds a card or a view.

---

## 3. Second: session waterfall / Gantt

Each `requests` row already has `t`, `ms`, `ttft_ms`, `session`, `agent` and
`provider`. Group the latest N rows by session and draw:

- one row per session, x = time;
- each request is a bar: pale part = queue/first token, dark part = streaming;
- colour = provider, red outline = failure/reroute, hover = model/tokens/TPS;
- busy windows stack into visible parallelism.

It is a trace waterfall built from the ledger we already have. Unlike Loom
(which shows density), it shows one session's causality.

---

## 4. Third: cost treemap / sunburst

`usage` already returns four aggregate levels:

```
provider → account → model → agent
```

Area = cost or tokens answers "where did the money go" in one look. It is cheap
and pure frontend; because it overlaps the model donut, it fits best as an
expand state of that card rather than a sixth view.

---

## 5. Fourth: latency beeswarm / ridgeline

The latest 80–500 requests give `ttft_ms`, `ms`, `out/ms`:

- one horizontal band per provider;
- one point per request (x = TTFT, y = jitter);
- median and P90 as thin lines; outliers pop out.

It is more honest than an average TPS and easier than a table, but the sample is
finite: a card-level chart, not a full-screen view.

---

## 6. The shipped fifth view: Rings

`docs/mode-rings.png` is the output of this research:

- the last **26 weeks** as a polar calendar;
- 7 concentric rings = Monday → Sunday (inner to outer);
- 26 columns = 26 weeks; one bead = one day;
- bead size = tokens, colour = five activity levels;
- today keeps a green outline; month labels sit outside the rim;
- side panel: total tokens, busiest day, today, streak, last 6 months;
- light/dark and all four style packs inherit CSS variables; reduced motion
  skips the reveal animation.

Why not 53 weeks: the hero is roughly 280–420px tall; 53 × 7 beads would be too
small to read, and the rectangular heatmap already covers 53 weeks. Rings is
specifically the recent weekday rhythm. If the hero ever gets a taller
one-screen quota, `RINGS_WEEKS` can move to 53.

---

## 7. Implementation status (2026-11)

Shipped from this list as hero views:

| Form | Status | Where |
| --- | --- | --- |
| Rings (polar calendar) | ✅ v0.7.0 | `#view-rings` |
| Quota burn-down + pace | ✅ v0.8.0 | `#view-quota` |
| Session waterfall / Gantt | ✅ v0.8.0 | `#view-waterfall` |
| Latency beeswarm / ridgeline | ✅ v0.8.0 | `#view-swarm` |
| Cost treemap | ✅ v0.8.0 | `#view-treemap` |
| Agent → provider → model flow | ✅ v0.8.0 | `#view-sankey` |

Still open and worth doing:

- **Funnel** (calls → timed → done → success): cheap, fits beside the KPI row;
- **Bullet / budget threshold**: a lightweight card version of the quota view;
- **Latency heatmap (time × bucket)**: needs a client-side request ring buffer;
- **Orrery / constellation**: strongest brand fit, weaker data fidelity;
- **Flame graph / streamgraph / horizon**: blocked until Magpie exposes span
  nesting or stacked `usage?by=provider` series.

## 8. Recommended order

1. **Quota burn-down + pace**: add `/quotas/history` to the service, add a
   burn-down card (or replace the radar's quota rings with it).
2. **Session waterfall**: a sixth hero mode or a session detail drawer.
3. **Latency beeswarm**: above the request ledger, as a one-glance "why slow".
4. **Cost treemap**: an expand state of the model donut.
5. **Later**: flame graphs, streamgraphs and horizon charts once Magpie exposes
   span/tool nesting or stacked `usage?by=provider` series.

---

## 9. References

- Langfuse Custom Dashboards: https://langfuse.com/docs/metrics/features/custom-dashboards
- Langfuse flame graph issue #16219: https://github.com/langfuse/langfuse/issues/16219
- Datadog Trace View (flame / waterfall / map): https://docs.datadoghq.com/tracing/trace_explorer/trace_view/
- Helicone: https://github.com/Helicone/helicone
- Arize Phoenix: https://github.com/Arize-ai/phoenix
- Grafana + OTel GenAI: https://github.com/BerriAI/litellm/pull/35159
- Data Viz Project: https://datavizproject.com/
- Visualizing.JP Chart Catalogue: https://visualizing.jp/catalogue/
- spiralize (spiral time series): https://jokergoo.github.io/spiralize_vignettes/spiralize.html
- tokenmeter: https://github.com/tt-a1i/tokenmeter
- ccusage: https://github.com/ryoppippi/ccusage
- magpie-agent-office: https://github.com/QingJ01/magpie-agent-office
- CrommaCode Game View: https://cromma.ai/code
