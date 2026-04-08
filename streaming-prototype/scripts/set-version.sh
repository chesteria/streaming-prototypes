#!/usr/bin/env bash
# set-version.sh
# Manually update the semantic version, label, and optionally phase in data/version.json.
# Build number is NOT changed — it keeps incrementing as normal.
#
# Usage:
#   ./scripts/set-version.sh <version> "<label>" ["<phase>"]
#
# Examples:
#   ./scripts/set-version.sh 1.6.0 "Welcome Screen"           # phase unchanged
#   ./scripts/set-version.sh 2.0.0 "Scenario Presets" "Phase 3"

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <version> \"<label>\" [\"<phase>\"]"
  echo "  version — semantic version, e.g. 1.6.0"
  echo "  label   — short description of this release, e.g. \"Welcome Screen\""
  echo "  phase   — optional phase name, e.g. \"Phase 3\" (omit for MINOR/PATCH bumps)"
  exit 1
fi

NEW_VERSION="$1"
NEW_LABEL="$2"
NEW_PHASE="${3:-}"

# Validate semver format (x.y.z)
if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "[set-version] ERROR: Version must be in x.y.z format (got: $NEW_VERSION)"
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
VERSION_FILE="$REPO_ROOT/streaming-prototype/data/version.json"

if [ ! -f "$VERSION_FILE" ]; then
  echo "[set-version] ERROR: version.json not found at $VERSION_FILE"
  exit 1
fi

OLD_VERSION=$(node -e "const v=require('$VERSION_FILE'); process.stdout.write(v.version);")

node - <<JS
const fs = require('fs');
const path = '$VERSION_FILE';
const v = JSON.parse(fs.readFileSync(path, 'utf8'));
v.version = '$NEW_VERSION';
v.label   = '$NEW_LABEL';
if ('$NEW_PHASE') v.phase = '$NEW_PHASE';
fs.writeFileSync(path, JSON.stringify(v, null, 2) + '\n');
JS

PHASE_NOTE=""
if [ -n "$NEW_PHASE" ]; then
  PHASE_NOTE="  phase → \"$NEW_PHASE\""
fi
echo "[set-version] $OLD_VERSION → $NEW_VERSION  \"$NEW_LABEL\"$PHASE_NOTE"
echo ""
echo ""
echo "Next steps:"
echo "  1. Update docs/CHANGELOG.md with an entry for v$NEW_VERSION"
echo "  2. Commit: git add data/version.json docs/CHANGELOG.md && git commit -m \"release: v$NEW_VERSION\""
echo "  3. Tag:    git tag v$NEW_VERSION"
echo ""
echo "The build number will auto-increment on the next commit as usual."
