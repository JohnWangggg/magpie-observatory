# Publishing & store discovery · 发布与商店检索

This repository is prepared for `github.com/JohnWangggg/magpie-observatory`.
It uses the GitHub handle everywhere; no real name or personal email belongs in
the tree, the screenshots or the commit history.

本仓库按 `github.com/JohnWangggg/magpie-observatory` 准备。全仓库只使用 GitHub
账号名，不在文件、截图或提交历史里放真实姓名和个人邮箱。

## 1. Identity · 身份

| Where | Value |
| --- | --- |
| `package.json` → `author` | `JohnWangggg (https://github.com/JohnWangggg)` |
| `LICENSE` | `Copyright (c) 2026 JohnWangggg` |
| Git author | `JohnWangggg <JohnWangggg@users.noreply.github.com>` |
| Repository | `https://github.com/JohnWangggg/magpie-observatory` |

GitHub's noreply address keeps a personal email out of public commits. The
publish script sets it locally; it never writes a global Git config.

GitHub 的 noreply 地址可以避免个人邮箱进入公开提交。发布脚本只在当前仓库设置它，
不会改全局 Git 配置。

## 2. Privacy checklist · 隐私检查

Run before every push:

```bash
# Real names, personal mailboxes, local home paths, tokens
rg -n "gmail|163\.com|qq\.com|/Users/|/home/|api[_-]?key|secret|password|bearer|ghp_|sk-" \
  --glob '!docs/*.png' --glob '!*.svg' .

# Every address outside example.com and GitHub's noreply domain is suspicious
rg -nP "[A-Za-z0-9._%+-]+@(?!example\.com|users\.noreply\.github\.com)[A-Za-z0-9.-]+\.[A-Za-z]{2,}" \
  --glob '!docs/*.png' .

npm run check
```

Rules:

- Screenshots: demo mode only; quotas must show `demo-…@example.com`.
- Never commit `MAGPIE_KEY`, gateway keys, provider keys, cookies or `.env`.
- Docs may mention `~/.config/magpie/usage.jsonl` as a product path, never a
  personal absolute path.
- The live service reads only documented Magpie APIs and stores no prompts,
  replies, credentials or model-call keys.

## 3. What the Magpie store looks for · Magpie 商店如何发现插件

Magpie's Discover reads a GitHub repository and checks:

1. the repository has the **`magpie-plugin`** topic;
2. `package.json` has a `magpie.page` object with a committed `file`
   (`page/index.html` here);
3. `magpie.page` has a `service` when the page needs a local service
   (`{ "port": 3488, "option": "port" }` here);
4. the listing text comes from `magpie.name`, `magpie.summary.en` /
   `magpie.summary.zh`, and the page title in `magpie.page.titles`.

Topics configured for this repository:

```text
magpie-plugin  magpie-page  magpie  observatory  dashboard  monitoring
llm-gateway
```

`magpie-plugin` is the mandatory one. The others are search aids. This is a
deliberately small set: across the 100 most-starred repositories tagged
`magpie-plugin`, the median is 4 topics; `magpie` appears on 49%, `magpie-page`
on the page plugins, and feature tags such as `quota` or `routing` are uncommon.
The same list lives in `package.json` under `topics`; `keywords` keeps the
feature words for npm-style search.

`package.json` 里的 `magpie.page.file` 必须已提交，`magpie.page.service`
声明本地服务端口；GitHub 仓库必须带 `magpie-plugin` topic。其余 topic 只帮助搜索。
这里刻意收敛到 7 个：同类仓库 topic 中位数约为 4 个，`magpie` 出现在约一半仓库，
`magpie-page` 用于页面插件，`quota` / `routing` 这类功能词并不常见。
`topics` 与脚本里的列表保持一致，功能词放在 `keywords`。

## 4. One-command release · 一键发布

Review the tree first, then run:

```bash
npm run check
bash scripts/publish-github.sh
```

The script:

1. sets the local Git identity to the handle + GitHub noreply address;
2. initializes `main` if needed, commits the working tree;
3. creates the public repository if it does not exist, otherwise pushes;
4. adds all store topics with `gh repo edit --add-topic`;
5. creates the annotated tag `v0.18.0` and pushes it.

Manual equivalent:

```bash
git init -b main
git config user.name "JohnWangggg"
git config user.email "JohnWangggg@users.noreply.github.com"
git add -A
git commit -m "release: Magpie Observatory v0.18.0"
gh repo create JohnWangggg/magpie-observatory --public --source=. --remote=origin --push
gh api --method PUT repos/JohnWangggg/magpie-observatory/topics \
  -f 'names[]=magpie-plugin' \
  -f 'names[]=magpie-page' \
  -f 'names[]=magpie' \
  -f 'names[]=observatory' \
  -f 'names[]=dashboard' \
  -f 'names[]=monitoring' \
  -f 'names[]=llm-gateway'
git tag -a v0.18.0 -m "Magpie Observatory v0.18.0"
git push -u origin main --tags
```

## 5. Verify · 验证

```bash
gh repo view JohnWangggg/magpie-observatory \
  --json url,repositoryTopics \
  --jq '{url, topics: [.repositoryTopics[].name]}'

# Install exactly as a user would
magpie plugin add github:JohnWangggg/magpie-observatory
```

Expected: `magpie-plugin` appears in the topic list and the plugin installs
under **Plugins → Installed** with an **Observatory** tab.

预期：topic 列表里出现 `magpie-plugin`，插件安装后侧边栏出现 **观测台**。

## 6. Version tags · 版本标签

Release tags are annotated and match `package.json`:

```bash
git tag -a v0.18.0 -m "Magpie Observatory v0.18.0"
git push origin v0.18.0
```

For the next release, bump `package.json`, update the tag in
`scripts/publish-github.sh` (or pass `TAG=v0.18.0`), and repeat.

发布标签使用 annotated tag，并与 `package.json` 版本一致。下一次发布时提升版本号，
再用 `TAG=v0.18.0 bash scripts/publish-github.sh` 或手动打标签。

---

## 发版前检查

```bash
npm run check          # lint-data + sync-views — the fast pre-flight
npm run smoke          # 336 视图 route-stage 渲染冒烟（空 DOM / 页面错误）
npm run thumbs         # 刷新 public/shots/*.png（可选，费时；--ids a,b 只重截指定视图）
```

`npm run check` 已在 `.github/workflows/check.yml` 的 CI 里跑：
`lint-data` 校验 `data.js` 的 provider/session/quota/series/heatmap 形状和
缺失图标，`sync-views` 保持 `manifest.js` 与 `views-catalog.md` 与 `VIEW_META`
一致。`smoke` 报告三类：`ok` / `empty stage` / `page error`。新增视图务必
先跑 `check` + `smoke`。

