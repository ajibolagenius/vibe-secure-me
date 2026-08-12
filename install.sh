#!/usr/bin/env bash
# vibe-secure-me — security audit skill for agentic AI assistants
#
#   curl -fsSL https://raw.githubusercontent.com/ajibolagenius/vibe-secure-me/main/install.sh | bash
#
# Environment overrides:
#   SECURE_ME_REF=v1.1.0             install a specific tag or branch (default: main)
#   SECURE_ME_DIR=./.claude/skills   install into a project instead of $HOME

set -euo pipefail

REPO="${SECURE_ME_REPO:-ajibolagenius/vibe-secure-me}"
REF="${SECURE_ME_REF:-main}"
SKILLS_DIR="${SECURE_ME_DIR:-$HOME/.claude/skills}"
TARGET="$SKILLS_DIR/secure-me"

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  BOLD=$'\033[1m'; GREEN=$'\033[32m'; RED=$'\033[31m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  BOLD=""; GREEN=""; RED=""; DIM=""; RESET=""
fi

die() { printf '%s%s%s\n' "$RED" "$1" "$RESET" >&2; exit 1; }

command -v curl >/dev/null 2>&1 || die "curl is required but was not found."
command -v tar  >/dev/null 2>&1 || die "tar is required but was not found."

TMP="$(mktemp -d 2>/dev/null || mktemp -d -t vibe-secure-me)"
trap 'rm -rf "$TMP"' EXIT

printf '%sDownloading vibe-secure-me@%s%s\n' "$BOLD" "$REF" "$RESET"
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$REF" \
  | tar -xz -C "$TMP" --strip-components=1 \
  || die "Download failed. Check that $REPO exists and '$REF' is a valid ref."

SRC="$TMP/skills/secure-me"
[ -f "$SRC/SKILL.md" ] || die "Downloaded archive does not contain skills/secure-me/SKILL.md — aborting."

# Back up an existing install rather than silently destroying it.
if [ -d "$TARGET" ]; then
  BACKUP="$TARGET.backup.$(date +%Y%m%d%H%M%S)"
  mv "$TARGET" "$BACKUP"
  printf '%sExisting install moved to %s%s\n' "$DIM" "$BACKUP" "$RESET"
fi

mkdir -p "$TARGET"
cp "$SRC/SKILL.md" "$TARGET/"
cp -R "$SRC/references" "$TARGET/"
for extra in LICENSE README.md; do
  if [ -e "$TMP/$extra" ]; then cp "$TMP/$extra" "$TARGET/"; fi
done

printf '%sInstalled secure-me to %s%s\n' "$GREEN" "$TARGET" "$RESET"
printf '%sRestart your AI assistant, then ask it to "audit this codebase for security issues".%s\n' "$DIM" "$RESET"
