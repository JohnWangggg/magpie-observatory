# Publishing · 发布

This repository is prepared for `github.com/JohnWangggg/magpie-observatory`.
No real name, personal mailbox, provider key or prompt belongs in the tree,
the screenshots or the commit history.

## 1. Identity

| Where | Value |
| --- | --- |
| `package.json` → `author` | `JohnWangggg (https://github.com/JohnWangggg)` |
| `LICENSE` | `Copyright (c) 2026 JohnWangggg` |
| Git author | `JohnWangggg <JohnWangggg@users.noreply.github.com>` |
| Repository | `https://github.com/JohnWangggg/magpie-observatory` |

The publish script sets the noreply identity locally; it never writes a
global Git config.

## 2. Privacy checklist

Run before every push:

```bash
# Real names, personal mailboxes, local home paths, tokens
rg -n "gmail|163\.com|qq\.com|/Users/|/home/|api[_-]?key|secret|password|bearer|ghp_|sk-" \
  --glob '!*.svg' .

# Every address outside example.com and GitHub's noreply domain is suspicious
rg -nP "[A-Za-z0-9._%+-]+@(?!example\.com|users\.noreply\.github\.com)[A-Za-z0-9.-]+\.[A-Za-z]{2,}" \
  --glob '!*.svg' .

npm run check
```

- Screenshots: demo mode only (`?demo=1`); quotas show `demo-…@example.com`.
- Never commit `MAGPIE_KEY`, gateway keys, provider keys, cookies or `.env`.
- The service reads only documented Magpie APIs; it stores no prompts,
  replies, credentials or model-call keys.

## 3. What Magpie needs

- `magpie.page.file` → `page/index.html`, a launcher that navigates to the
  local service.
- `magpie.page.service` → `{ "port": 3488, "option": "port" }`. The service
  is read-only and binds loopback. If another copy already holds the port it
  adopts that copy and takes over when it stops; if the holder is an older
  version it asks it to hand the port over, so an update never leaves the
  browser on a dead page.
- `magpie.permissions` → `["usage:summary"]`, used only by the Usage panel.
- `magpie.panels` → one `usage` panel at `panels/usage.html`.
- `magpie.name` / `magpie.summary.en` / `.zh` for the card.

A page that also runs a host service is classified as a **provider** by the
GitHub half of Discover (`main`/`exports` present). That is why this
repository does **not** carry the `magpie-plugin` topic; the community
registry entry with `"kind": "page"` is the page listing.

GitHub topics used here:

```text
magpie-page  magpie  observatory  quota  usage  llm-gateway
```

## 4. npm

The registry entry must name an installable npm package. From this repo:

```bash
npm login                     # an account that can publish magpie-observatory
npm run check
npm pack --dry-run            # confirm the file list and size
npm publish --access public
npm view magpie-observatory version
```

The package is `magpie-observatory` (unscoped). If the name is taken, change
`name` in `package.json` and the registry entry together. Bump `version`
first; `files` already lists `index.mjs`, `server.mjs`, `page`, `panels`,
`public/focus.html`, the focus/quota assets and icons.

## 5. Registry entry

Add to `registry.json` in
[`magpie-community/plugins`](https://github.com/magpie-community/plugins):

```json
{
  "package": "magpie-observatory",
  "name": "Observatory",
  "kind": "page",
  "icon": "https://raw.githubusercontent.com/JohnWangggg/magpie-observatory/main/docs/icon.png",
  "summary": {
    "en": "A quiet one-screen observatory: requests in flight, today's tokens and cost, and the allowance that will run out before it resets. Runs a read-only local service on 127.0.0.1, and adds a Today panel to Magpie's Usage page.",
    "zh": "一屏观测台：现在在跑什么、今天花了多少、哪个额度会在重置前耗尽。通过本机 127.0.0.1 上的只读服务提供，并在 Magpie 的 Usage 页加一块「今日一眼」。"
  }
}
```

Then:

```bash
gh repo fork magpie-community/plugins --clone --remote
cd plugins
# edit registry.json
bun scripts/check.mjs
git checkout -b add-magpie-observatory
git commit -am "add magpie-observatory (page)"
gh pr create --repo magpie-community/plugins --fill
```

## 6. GitHub

`scripts/publish-github.sh` is explicit: it commits, pushes, sets topics and
creates a tag. Review `git status` and this document first. It uses
`TAG=v2.0.1` by default and keeps the GitHub noreply identity.

```bash
TAG=v2.0.1 bash scripts/publish-github.sh
```

Do not run it until the release contents are reviewed. It does not publish to
npm.
