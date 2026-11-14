# Listing Observatory as a page in Magpie's Plugins market

Magpie's Plugins tab reads `registry.json` from
[`magpie-community/plugins`](https://github.com/magpie-community/plugins).
An entry **without** a `kind` is a provider plugin; a page is an entry with
`"kind": "page"` (see the repo's `scripts/registry.mjs` and
`internal/plugin/market.go` in `yetone/magpie`).

Observatory declares `magpie.page` in `package.json`, so an installed copy is
a page (`magpie plugin list` shows `page`). The market card needs a registry
entry, and the entry's `package` must be an npm name users can install, so the
package has to be on npm before the pull request is useful.

## The entry

`registry.json` → `plugins[]`:

```json
{
  "package": "magpie-observatory",
  "name": "Observatory",
  "kind": "page",
  "icon": "https://raw.githubusercontent.com/JohnWangggg/magpie-observatory/main/docs/icon.png",
  "summary": {
    "en": "A live cockpit for Magpie: two-way magpie routes, quotas, usage, twenty-one views and seven style packs. Runs its own local service on 127.0.0.1.",
    "zh": "Magpie 的实时监看驾驶舱：双向喜鹊路由、账号额度、用量、二十一种视图和七套风格。通过本机 127.0.0.1 上的服务提供。"
  }
}
```

Fields the registry checker accepts: `package`, `name`, `icon`, `providers`,
`community`, `replaces`, `kind`, `summary`. A page has `kind` and no
`providers`.

## Steps

1. `npm login` (an account that can publish the unscoped name
   `magpie-observatory`), then `npm publish --access public` from this
   repository. Bump `version` first; `files` already lists everything needed.
2. Fork and add the entry:

   ```sh
   gh repo fork magpie-community/plugins --clone --remote
   cd plugins
   # edit registry.json: append the entry above under "plugins"
   bun scripts/check.mjs
   git checkout -b add-magpie-observatory
   git commit -am "add magpie-observatory (page)"
   gh pr create --repo magpie-community/plugins --fill
   ```

3. The maintainers merge it; Magpie refreshes the market every few hours
   (`plugin-market.json` in the cache).

## Why this repository carries no `magpie-plugin` topic

Magpie's GitHub half of Discover searches `topic:magpie-plugin` and derives a
listing's `kind` from the repository's `package.json`:

```go
// internal/plugin/github.go
runs := pj.Main != "" || len(pj.Exports) > 0
case !runs && strings.TrimSpace(pj.Magpie.Page.File) != "":
    t.Kind = "page"
```

This plugin runs a local service, so it must name an entry
(`main`/`exports`): without it Magpie's host never starts the service
(`internal/plugin/host.go` sends a plugin to the Bun host only when it is not
`InMagpieOnly`, and `InMagpieOnly` is true exactly for packages with no
`main`/`exports`). A repository that runs a host part therefore cannot be a
`kind: "page"` GitHub listing — it would show as a provider there, which is
why the topic is left off and the registry entry is the page listing.
