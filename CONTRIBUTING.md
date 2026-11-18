# Contributing

The product is one screen. Please keep it that way.

## Rules

- **One question, one screen.** A change should make "now / today / allowance"
  clearer, not add another page.
- **No new chart galleries.** Deep views belong in Magpie's own Routing,
  Usage, Sessions and Quotas pages.
- **No modals on open.** No digest popup, no tour, no onboarding overlay.
- **Follow the host.** Use `--magpie-*`, `?hostTheme=` and the host `lang`;
  every new user-facing string goes into both the `ZH` and `EN` dictionaries
  in `public/assets/focus.js` (and `panels/usage.js` for the panel).
- **Read-only and local.** Never write to Magpie, never call a provider API,
  never read prompts or replies.
- **Say when data is estimated.** A forecast, an unpriced request or a stale
  frame must be labelled.

## Files

```text
index.mjs              plugin entry; starts the local service
server.mjs             read-only Magpie proxy + static service + quota alerts
preview.mjs            standalone preview
page/index.html        launcher shown by Magpie
page/boot.js           reads magpie.service / port, then navigates
public/focus.html      the screen
public/assets/focus.js data, rendering, zh/en strings
public/assets/quota.js quota forecast (unit-tested, also used by alerts)
public/assets/focus.css
public/assets/data.js  snapshot adapter + demo fixtures
panels/usage.html      the "Today" panel in Magpie's Usage page
panels/usage.js
panels/usage.css
scripts/test-quota.mjs forecast regression test
```

## A change to the screen

1. Data shape: `public/assets/data.js` (`normalizeLive`).
2. Rendering: `public/assets/focus.js`.
3. The quota forecast: `public/assets/quota.js`; add a case to
   `scripts/test-quota.mjs` for any change to the thresholds.
4. Layout: `public/assets/focus.css`.
5. The Usage-page panel: `panels/usage.*` (bridge-only, `usage:summary`).
6. The alert path: `startMonitor` in `server.mjs`; test with
   `OBSERVATORY_ALERT_DRY=1` and `startServer({monitor:true})` so no real
   notification is sent.
6. If the change alters what is read, update the table in both READMEs and
   `docs/product-review-v2.md`.

## Test

```bash
npm run check   # syntax + forecast + structure tests
npm run preview
# http://127.0.0.1:8777
```

- `?demo=1` forces demo data.
- Check 1365×768 and 1440×900: all three questions above the fold, no
  horizontal scroll.
- Check light and dark (`?hostTheme=light`).
- Close Magpie and reload: the page must say it cannot read, keep the last
  frame, and never silently show demo data on the real service.
- The browser console must be empty.

## Pull requests

Keep the diff small. State which of the three questions the change improves,
and include a screenshot for visual changes. Do not bump the version; the
maintainer does that on release.
