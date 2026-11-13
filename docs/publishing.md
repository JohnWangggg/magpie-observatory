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
magpie-plugin  magpie-page  magpie  magpie-observatory  observatory
dashboard  monitoring  observability  llm-gateway  ai-gateway
quota  usage  token-usage  cost-tracking  routing
claude-code  codex  gemini-cli  opencode
```

`magpie-plugin` is the mandatory one. The others are search aids. The same list
lives in `package.json` under `keywords` and `topics`; the `docs/publishing.md`
checklist and `scripts/publish-github.sh` apply it to GitHub.

`package.json` 里的 `magpie.page.file` 必须已提交，`magpie.page.service`
声明本地服务端口；GitHub 仓库必须带 `magpie-plugin` topic。其余 topic 只帮助搜索。
`keywords` / `topics` 与脚本里的列表保持一致。

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
5. creates the annotated tag `v0.6.0` and pushes it.

Manual equivalent:

```bash
git init -b main
git config user.name "JohnWangggg"
git config user.email "JohnWangggg@users.noreply.github.com"
git add -A
git commit -m "release: Magpie Observatory v0.6.0"
gh repo create JohnWangggg/magpie-observatory --public --source=. --remote=origin --push
gh repo edit JohnWangggg/magpie-observatory \
  --add-topic magpie-plugin \
  --add-topic magpie-page \
  --add-topic magpie \
  --add-topic magpie-observatory \
  --add-topic observatory \
  --add-topic dashboard \
  --add-topic monitoring \
  --add-topic observability \
  --add-topic llm-gateway \
  --add-topic ai-gateway \
  --add-topic quota \
  --add-topic usage \
  --add-topic token-usage \
  --add-topic cost-tracking \
  --add-topic routing \
  --add-topic claude-code \
  --add-topic codex \
  --add-topic gemini-cli \
  --add-topic opencode
git tag -a v0.6.0 -m "Magpie Observatory v0.6.0"
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
git tag -a v0.6.0 -m "Magpie Observatory v0.6.0"
git push origin v0.6.0
```

For the next release, bump `package.json`, update the tag in
`scripts/publish-github.sh` (or pass `TAG=v0.7.0`), and repeat.

发布标签使用 annotated tag，并与 `package.json` 版本一致。下一次发布时提升版本号，
再用 `TAG=v0.7.0 bash scripts/publish-github.sh` 或手动打标签。
