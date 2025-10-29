#!/usr/bin/env bash
set -euo pipefail

# Sync Next.js public assets to SPA public folder
# Usage:
#   scripts/tools/sync-public-assets.sh [--clean]
#
# Options:
#   --clean   Remove existing files in SPA public before copying

here() { cd -- "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd -P; }
ROOT="$(here)/../.."
SRC="$ROOT/apps/web/public"
DST="$ROOT/apps/spa/public"

CLEAN=false
if [[ "${1:-}" == "--clean" ]]; then
  CLEAN=true
fi

if [[ ! -d "$SRC" ]]; then
  echo "[sync-assets] Source not found: $SRC" >&2
  exit 1
fi

mkdir -p "$DST"

if [[ "$CLEAN" == "true" ]]; then
  echo "[sync-assets] Cleaning destination: $DST"
  # Remove only contents, not the folder itself
  rm -rf "$DST"/*
fi

echo "[sync-assets] Copying assets: $SRC -> $DST"
# Use rsync if available for faster incremental copies; fall back to cp -a
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete-excluded "$SRC/" "$DST/"
else
  cp -a "$SRC/." "$DST/"
fi

echo "[sync-assets] Done. Files in $DST:"
ls -la "$DST" | sed -n '1,200p'

