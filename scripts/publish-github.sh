#!/usr/bin/env bash
# Publish Magpie Observatory to GitHub with the identity and topics the
# Magpie plugin directory looks for.
#
# This script is intentionally explicit: it commits and pushes when you run
# it. Review `git status` and `docs/publishing.md` first.
set -euo pipefail

REPO="${REPO:-JohnWangggg/magpie-observatory}"
BRANCH="${BRANCH:-main}"
TAG="${TAG:-v0.9.0}"
GIT_NAME="${GIT_NAME:-JohnWangggg}"
GIT_EMAIL="${GIT_EMAIL:-JohnWangggg@users.noreply.github.com}"

TOPICS=(
  magpie-plugin
  magpie-page
  magpie
  observatory
  dashboard
  monitoring
  llm-gateway
)

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "missing: $1" >&2; exit 1; }
}

need git
need gh
gh auth status >/dev/null

cd "$(dirname "$0")/.."

# Keep the public commit identity to the GitHub handle and GitHub's noreply
# address — no real name and no personal email in the repository history.
git config user.name "$GIT_NAME"
git config user.email "$GIT_EMAIL"

if [ ! -d .git ]; then
  git init -b "$BRANCH"
fi

git add -A
if ! git diff --cached --quiet; then
  git commit -m "release: Magpie Observatory ${TAG}"
fi

repo_exists() {
  gh repo view "$REPO" >/dev/null 2>&1 && return 0
  # A transient GraphQL/API failure must not look like a missing repository:
  # ask Git directly before creating anything.
  git ls-remote "https://github.com/${REPO}.git" >/dev/null 2>&1
}

if repo_exists; then
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/${REPO}.git"
  fi
  git push -u origin "$BRANCH"
else
  gh repo create "$REPO" \
    --public \
    --description "A live monitoring cockpit for Magpie: routing, quotas, usage and rhythm." \
    --source=. \
    --remote=origin \
    --push
fi

# GitHub topics are what Magpie's Discover uses to find a page plugin.
# `magpie-plugin` is mandatory; the rest improve search. PUT replaces the
# whole set, so re-running keeps the repository clean.
topic_args=(--method PUT "repos/${REPO}/topics")
for topic in "${TOPICS[@]}"; do
  topic_args+=(-f "names[]=${topic}")
done
gh api "${topic_args[@]}" >/dev/null

if git rev-parse -q --verify "refs/tags/${TAG}" >/dev/null; then
  echo "tag ${TAG} already exists"
else
  git tag -a "$TAG" -m "Magpie Observatory ${TAG}"
fi
git push origin "$TAG"

echo
echo "Published: https://github.com/${REPO}"
gh repo view "$REPO" --json url,repositoryTopics \
  --jq '{url, topics: [.repositoryTopics[].name]}'
