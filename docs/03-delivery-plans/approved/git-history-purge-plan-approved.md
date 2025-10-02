---
title: Git History Purge: node_modules
domain: delivery-plans
status: approved
owner: delivery@echo.ai
last-updated: 2025-10-02
linked-issues: []
---
# Git History Purge: node_modules

Purpose: Remove all `**/node_modules/**` content from Git history and prevent future commits of those files.

Already done:
- `.gitignore` now ignores `**/node_modules` across the monorepo.
- Tracked `node_modules` were removed from the index in the latest commit.

This guide purges historical commits using `git filter-repo`.

## Prerequisites
- Coordinate with your team: history rewrite requires everyone to rebase/fetch.
- Install git filter-repo:
  - `pipx install git-filter-repo` (recommended)
  - or `pip install --user git-filter-repo`
  - Docs: https://github.com/newren/git-filter-repo

## One‑liner (manual)
```
git branch backup/pre-purge-node_modules-$(date +%Y%m%d-%H%M%S)
git filter-repo --force --path-glob '**/node_modules/**' --invert-paths
git reflog expire --expire=now --all || true
git gc --prune=now --aggressive || true
git push --force-with-lease origin $(git rev-parse --abbrev-ref HEAD)
```

## Scripted (recommended)
- Run: `bash scripts/maintenance/purge-node-modules-history.sh`
- Verify diff vs backup branch it creates.
- Push: `git push --force-with-lease origin <branch>`

## After pushing
- Notify collaborators to:
  - `git fetch --all --prune`
  - `git checkout <branch>`
  - Option A: hard reset to remote (if no local changes):
    - `git reset --hard origin/<branch>`
  - Option B: rebase local commits on top of the new history if needed.

## Notes
- This purge is limited to `node_modules`. If other large/binary content was committed by mistake, run an additional pass.
- For very large repos, `git filter-repo` is preferred over BFG.

