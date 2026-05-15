#!/usr/bin/env bash
# One-line installer for opencode-keystone.
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Adamkadaban/opencode-keystone/main/install.sh | bash
set -euo pipefail

REPO="${KEYSTONE_REPO:-Adamkadaban/opencode-keystone}"
REF="${KEYSTONE_REF:-main}"
DEST="${KEYSTONE_DIR:-$HOME/.local/share/opencode-keystone}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing required command: $1" >&2; exit 1; }; }
need git
need node

if [ -d "$DEST/.git" ]; then
  echo "[opencode-keystone] updating existing checkout at $DEST"
  git -C "$DEST" fetch --quiet origin
  git -C "$DEST" checkout --quiet "$REF"
  git -C "$DEST" pull --ff-only --quiet
else
  echo "[opencode-keystone] cloning into $DEST"
  mkdir -p "$(dirname "$DEST")"
  git clone --quiet --branch "$REF" "https://github.com/${REPO}.git" "$DEST"
fi

node "$DEST/bin/install.mjs" install --force
