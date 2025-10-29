#!/usr/bin/env bash
set -euo pipefail

echo "[purge] Checking working tree is clean..."
if [ -n "$(git status --porcelain)" ]; then
  echo "[purge] Working tree not clean. Commit or stash changes first." >&2
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
STAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_BRANCH="backup/pre-purge-node_modules-${STAMP}"

echo "[purge] Creating backup branch: ${BACKUP_BRANCH} (from ${BRANCH})"
git branch "$BACKUP_BRANCH"

echo "[purge] Verifying git filter-repo availability..."
if ! command -v git-filter-repo >/dev/null 2>&1 && ! git filter-repo -h >/dev/null 2>&1; then
  cat >&2 <<'EOF'
[purge] git filter-repo is not installed.
Install instructions:
  - pipx install git-filter-repo   (recommended)
  - OR pip install --user git-filter-repo
Docs: https://github.com/newren/git-filter-repo
EOF
  exit 2
fi

echo "[purge] Running git filter-repo to remove **/node_modules/** from history..."
git filter-repo --force --path-glob '**/node_modules/**' --invert-paths

echo "[purge] Expiring reflog and running aggressive GC..."
git reflog expire --expire=now --all || true
git gc --prune=now --aggressive || true

echo "[purge] Done. Current branch rewritten: ${BRANCH}"
echo "[purge] Next steps:"
echo "  1) Verify repo looks correct (diff vs ${BACKUP_BRANCH})."
echo "  2) Force-push with lease: git push --force-with-lease origin ${BRANCH}"
echo "  3) Coordinate with collaborators to rebase/fetch the rewritten history."

