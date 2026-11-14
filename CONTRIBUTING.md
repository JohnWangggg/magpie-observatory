# Contributing

Magpie Observatory is a single-page app served by a tiny local service — no
build step, no framework, no dependencies beyond Node 18+ for `preview.mjs`.

## Layout

```
public/index.html      the shell — cards, stage, pickers, sprite sheet
public/assets/app.css  every style-pack, density, layout rule
public/assets/app.js   boot, data loop, 30 views' glue, keyboard, persistence
public/assets/data.js  demo-mode fixture (the preview runs entirely on this)
public/assets/views/   one .js + optional .css per visual form
server.mjs             the read-only local service (127.0.0.1:PORT)
preview.mjs            `node preview.mjs` → http://127.0.0.1:8777
page/                  the Magpie plugin launcher (boot.js + index.html)
docs/                  screenshots, this file's siblings, roadmap
```

## A new view

1. `public/assets/views/foo.js` — an IIFE that registers
   `window.ObservatoryViews["foo"] = { title, eyebrow, render(host, ctx) }`.
   `ctx` hands you `data`, `logs`, `quotas`, `kpis`, `series`, `view`,
   `metric`, `esc`, `fmtTokens`, `fmtMoney`, `clamp`, `providerMeta`,
   `providerOfModel`, `providerIcon`, `agentMeta`, `agentIcon`, `motion`,
   `game`.
2. `public/assets/views/foo.css` if it needs styles; link it in
   `public/index.html` beside the other `views/*.css`.
3. `public/index.html` — add `<div class="stage-view" id="view-foo" hidden>`
   in the stage, `<script src="assets/views/foo.js"></script>` at the foot.
4. `public/assets/app.js` — add a `VIEW_META` row
   `{ id, title, eyebrow, group, icon, hint }`; `group` is one of
   `实时 / 用量 / 结构 / 趣味`.
5. Bump `N VIEWS` in `index.html`'s `vm-head`, the `## N views` heading in
   `README.md` / `README.zh-CN.md`, and the console banner's count in
   `app.js`.
6. `npm run check` then open `http://127.0.0.1:8777/?view=foo` — screenshot
   to `docs/mode-foo.png`, add the row to `README` ×2 and `docs/views.md` ×2.

## Conventions

- **No build step.** Plain ES2020 + SVG, no imports; each view file is an
  IIFE. `npm run check` is `node --check` across every `.js`.
- **Data is fixture-first.** Everything runs on `data.js` in demo mode; live
  data only enriches. Keep the demo plausible.
- **Views own their DOM.** `render(host, ctx)` clears `host.innerHTML` and
  rebuilds; app.js only routes.
- **Persist quietly.** localStorage keys are `magpie.*`; read them lazily.
- **Accessibility.** Interactive elements get `role`, `tabindex`, and an
  `aria-label`/`aria-expanded`; `prefers-reduced-motion` collapses animation.
- **Docs are bilingual.** `README.md` + `README.zh-CN.md`,
  `docs/views.md` + `.zh-CN.md`, `docs/interactions.md` + `.zh-CN.md` —
  keep pairs in sync.

## Checklist for a PR

- `npm run check` clean
- the view appears in the picker under the right group
- keyboard / hover / right-click wired if the surface takes it
- screenshots + README ×2 + `docs/views.md` ×2 + `docs/interactions.md` ×2
- `docs/roadmap-2026q4.md` gets a `## Phase N` entry
