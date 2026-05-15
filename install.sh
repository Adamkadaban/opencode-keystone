#!/usr/bin/env bash
# One-line installer for opencode-keystone.
#
# Interactive (TTY):
#   ./install.sh                    # menu
# Non-interactive (curl | bash):
#   curl -fsSL https://raw.githubusercontent.com/Adamkadaban/opencode-keystone/main/install.sh | bash
#       (defaults to opencode)
#   curl -fsSL ... | bash -s -- --target=all
#   curl -fsSL ... | bash -s -- --target=opencode,claude

set -euo pipefail

REPO="${KEYSTONE_REPO:-Adamkadaban/opencode-keystone}"
REF="${KEYSTONE_REF:-main}"
DEST="${KEYSTONE_DIR:-$HOME/.local/share/opencode-keystone}"

TARGET=""
FORCE=""

while [ $# -gt 0 ]; do
  case "$1" in
    --target=*) TARGET="${1#--target=}" ;;
    --target|-t) shift; TARGET="${1:-}" ;;
    --force) FORCE="--force" ;;
    -h|--help)
      cat <<EOF
opencode-keystone installer

usage: install.sh [--target=<t>] [--force]

  --target=<t>  one of: opencode (default), claude, copilot, all
                or a comma-separated list, e.g. --target=opencode,claude
  --force       overwrite an existing keystone file at the target

run with no flags in an interactive shell for a menu.
EOF
      exit 0
      ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
  shift || true
done

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing required command: $1" >&2; exit 1; }; }
need git
need node

# Interactive menu only when no --target was given AND we have a real TTY
if [ -z "$TARGET" ] && [ -t 0 ] && [ -t 1 ]; then
  cat <<'EOF'
opencode-keystone installs a /keystone slash command into one or more AI CLIs.
Pick what to install for:

  1) OpenCode               (~/.config/opencode/commands/keystone.md)
  2) Claude Code            (~/.claude/commands/keystone.md)
  3) GitHub Copilot CLI     (~/.copilot/agents/keystone.md)
  4) All of the above
  q) Quit

EOF
  printf 'choice [1]: '
  read -r choice </dev/tty || choice=1
  case "${choice:-1}" in
    1|"") TARGET="opencode" ;;
    2)    TARGET="claude" ;;
    3)    TARGET="copilot" ;;
    4)    TARGET="all" ;;
    q|Q)  echo "aborted." >&2; exit 0 ;;
    *)    echo "invalid choice: $choice" >&2; exit 2 ;;
  esac
fi

# Default when piped without --target
TARGET="${TARGET:-opencode}"

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

# shellcheck disable=SC2086
node "$DEST/bin/install.mjs" install --target="$TARGET" $FORCE
