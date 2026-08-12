#!/usr/bin/env bash
# vibe-secure-me — security audit skill for agentic AI assistants
#
#   curl -fsSL https://raw.githubusercontent.com/ajibolagenius/vibe-secure-me/main/install.sh | bash
#
# Environment overrides:
#   SECURE_ME_REF=main               track the branch instead of the pinned release
#   SECURE_ME_DIR=./.claude/skills   install into a project instead of $HOME
#   SECURE_ME_REPO=owner/repo        install from a fork

set -euo pipefail

REPO="${SECURE_ME_REPO:-ajibolagenius/vibe-secure-me}"
# Default to an immutable release tag, not a branch. SKILL.md is executed as
# instructions by an agent, so tracking a moving ref means any push to that
# branch lands in every user's agent context. CI keeps this in step with
# package.json; see .github/workflows/validate.yml.
PINNED_REF="v1.3.1"
REF="${SECURE_ME_REF:-$PINNED_REF}"
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

# codeload serves branches and commit SHAs from the bare path, but an
# annotated tag 404s there and must be requested as refs/tags/<tag>. Try the
# tag form first so the default pinned release resolves, then fall back to
# the bare path for branches and SHAs.
ARCHIVE="$TMP/source.tar.gz"
downloaded=""
for ref_path in "refs/tags/$REF" "$REF"; do
  if curl -fsSL "https://codeload.github.com/$REPO/tar.gz/$ref_path" -o "$ARCHIVE" 2>/dev/null; then
    downloaded="yes"
    break
  fi
done
[ -n "$downloaded" ] || die "Download failed. Check that $REPO exists and '$REF' is a valid ref."

# Download fully before extracting, so a truncated transfer cannot leave a
# half-populated source tree that still looks installable.
tar -xzf "$ARCHIVE" -C "$TMP" --strip-components=1 \
  || die "Downloaded archive could not be extracted."

SRC="$TMP/skills/secure-me"
[ -f "$SRC/SKILL.md" ] || die "Downloaded archive does not contain skills/secure-me/SKILL.md — aborting."

# Back up an existing install rather than silently destroying it, keeping
# only the two most recent so repeated updates do not litter the skills
# directory an agent scans.
if [ -d "$TARGET" ]; then
  BACKUP="$TARGET.backup.$(date +%Y%m%d%H%M%S)"
  mv "$TARGET" "$BACKUP"
  printf '%sExisting install moved to %s%s\n' "$DIM" "$BACKUP" "$RESET"

  ls -d "$TARGET".backup.* 2>/dev/null \
    | sort -r \
    | tail -n +3 \
    | while IFS= read -r old; do rm -rf "$old"; done
fi

mkdir -p "$TARGET"
cp "$SRC/SKILL.md" "$TARGET/"
cp -R "$SRC/references" "$TARGET/"
for extra in LICENSE README.md; do
  if [ -e "$TMP/$extra" ]; then cp "$TMP/$extra" "$TARGET/"; fi
done

printf '%sInstalled secure-me to %s%s\n' "$GREEN" "$TARGET" "$RESET"
printf '%sRestart your AI assistant, then ask it to "audit this codebase for security issues".%s\n' "$DIM" "$RESET"
