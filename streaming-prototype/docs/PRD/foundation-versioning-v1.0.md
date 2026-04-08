# PRD: Versioning & Build Number System

## Overview

**Title:** Semantic Versioning + Build Number System
**Type:** Foundational enhancement
**Parent phase:** Cross-cutting (touches build process, app shell, debug panel, analytics)
**Estimated build time:** Half a day
**Status:** Draft

---

## Problem

The prototype currently has no formal versioning. As features are added,
removed, refactored, and bugs are fixed, there's no way to:

- Tell which version of the app a colleague is running when they report
  feedback or bugs
- Correlate analytics data with specific app versions
- Reference "the version that had the working hero carousel" when
  rolling back or comparing
- Communicate to stakeholders what changed between demos
- Tag git commits with meaningful version markers
- Show users they have the latest version vs. an old cached one

This is the kind of foundation that small teams skip until it bites
them, at which point retrofitting it is painful. Doing it now is cheap
and pays dividends forever.

---

## Goal

Every build of the app has two identifiers:

1. A **semantic version** (e.g., `1.5.2`) that humans use to talk about
   meaningful changes
2. A **build number** (e.g., `247`) that increments with every build,
   regardless of whether the version changed

Both are visible in the app, included in analytics events, displayed
in the debug panel, and stored in a single source of truth file that
any part of the app can read.

---

## Specification

### Versioning Scheme

Use **semantic versioning** in the standard format: `MAJOR.MINOR.PATCH`

- **MAJOR** version increments when there are breaking changes to the
  app architecture, data structure, or PRD scope. Example: moving from
  Phase 1 to Phase 2.
- **MINOR** version increments when new features are added in a
  backward-compatible way. Example: adding the welcome screen, adding
  a new rail type.
- **PATCH** version increments for bug fixes and small improvements
  that don't add new functionality. Example: fixing a focus glitch,
  adjusting tile spacing.

### Build Number Scheme

A monotonically increasing integer that increments with **every build**,
regardless of version changes. Starts at `1` and never resets.

The build number is the most precise identifier — two builds with the
same semantic version (e.g., during active development of v1.5.0) will
have different build numbers. When a colleague reports a bug, the build
number tells you exactly which build they were running.

Build number is auto-incremented by a script that runs as part of the
build/commit process (see Implementation below).

### Version File (Source of Truth)

A single JSON file at `data/version.json` is the canonical source for
version info. Every other part of the app reads from here.

```json
{
  "version": "1.5.0",
  "buildNumber": 247,
  "buildDate": "2026-04-07T14:23:01Z",
  "gitCommit": "a1b2c3d4",
  "gitBranch": "main",
  "phase": "Phase 1.5",
  "label": "Debug Panel"
}
```

**Field descriptions:**

- `version` — semantic version, manually updated when releasing a new version
- `buildNumber` — auto-incremented integer
- `buildDate` — ISO timestamp of when this build was created
- `gitCommit` — short hash of the git commit this build was made from
- `gitBranch` — git branch name (useful for distinguishing main from feature branches)
- `phase` — human-readable phase label (e.g., "Phase 1", "Phase 1.5")
- `label` — short descriptive label for this version (e.g., "Debug Panel", "Insight Engine")

### Where Version Info Appears

**1. Welcome screen**
The welcome screen footer shows: `Streaming Prototype v1.5.0 · Build 247`

**2. Debug panel**
A "Version" section in the debug panel shows the full version info:
```
Version: 1.5.0
Build: 247
Phase: Phase 1.5 — Debug Panel
Built: April 7, 2026 at 2:23 PM
Commit: a1b2c3d4
Branch: main
```

**3. Analytics events (when Phase 2 is built)**
Every event includes version info in the config block:
```json
{
  "config": {
    "appVersion": "1.5.0",
    "buildNumber": 247,
    "gitCommit": "a1b2c3d4"
  }
}
```

This means analytics data can be filtered by version, and bug reports
from colleagues can be correlated to exact builds.

**4. Console log on app launch**
On every app launch, log to console:
```
[app] Streaming Prototype v1.5.0 (Build 247) — Phase 1.5 — Debug Panel
[app] Built April 7, 2026 from commit a1b2c3d4 on main
```

This makes it trivial to verify what version is running just by opening
DevTools.

**5. HTML meta tag**
Add a meta tag to the page head:
```html
<meta name="app-version" content="1.5.0">
<meta name="app-build" content="247">
```

This lets external tools (uptime monitors, browser extensions) read
the version without parsing the page.

### Auto-Incrementing the Build Number

The build number should increment automatically whenever the app is
"built" (which, for a static site, means whenever a commit is made).

**Implementation: Git pre-commit hook**

Create a script at `scripts/bump-build-number.sh` that:

1. Reads the current `data/version.json`
2. Increments the `buildNumber` by 1
3. Updates `buildDate` to the current ISO timestamp
4. Updates `gitCommit` to the current short hash
5. Updates `gitBranch` to the current branch name
6. Writes the updated JSON back to disk
7. Stages `data/version.json` so it's included in the commit

Wire this script up as a Git pre-commit hook in `.git/hooks/pre-commit`.
The hook runs every time you commit, so the build number always stays
current.

**Alternative for environments where pre-commit hooks aren't reliable:**

A manual command: `npm run bump` or `./scripts/bump-build-number.sh`
that you run before committing. Less elegant but more portable.

### Manually Updating the Semantic Version

Unlike the build number, the semantic version is updated **manually**
when you decide a release is meaningful enough to warrant it.

Provide a small helper script at `scripts/set-version.sh`:

```bash
./scripts/set-version.sh 1.6.0 "Insight Engine"
```

This script:
1. Updates `version` and `label` in `data/version.json`
2. Resets nothing else (build number keeps incrementing)
3. Optionally creates a git tag: `git tag v1.6.0`
4. Reminds you to commit the change

### Version History File

Maintain a `docs/CHANGELOG.md` file that lists every version release
with the meaningful changes. Following Keep A Changelog format:

```markdown
# Changelog

## [1.5.0] - 2026-04-07
### Added
- Debug panel with timing controls and feature toggles
- Companion debug.html configuration page
- Welcome screen with device-aware controls reference
- Versioning system with auto-incrementing build numbers

### Changed
- Refactored focus engine for better edge case handling

### Fixed
- Hero carousel auto-advance timing
- Genre pills scroll position memory

## [1.4.0] - 2026-04-04
...
```

This file is updated manually when a meaningful version change happens.
The build number alone is enough to identify any specific build, but
the changelog explains *why* each version exists.

---

## What to Skip

- No npm versioning integration (the prototype doesn't use npm)
- No automated changelog generation from commit messages
- No version checks against a remote server
- No "update available" notifications
- No version-based feature flags
- No tagging every commit with a version (only meaningful releases get
  git tags)

---

## Configurable Values

```javascript
// === VERSIONING ===
const SHOW_VERSION_IN_WELCOME_SCREEN = true;
const SHOW_VERSION_IN_DEBUG_PANEL = true;
const LOG_VERSION_ON_LAUNCH = true;
```

---

## File Structure Additions

```
streaming-prototype/
├── data/
│   └── version.json              # Single source of truth for version info
├── scripts/
│   ├── bump-build-number.sh      # Auto-increments build number
│   └── set-version.sh            # Manually update semantic version
├── docs/
│   └── CHANGELOG.md              # Human-readable version history
└── .git/
    └── hooks/
        └── pre-commit            # Wired to bump-build-number.sh
```

---

## Privacy Check

- [x] No real names collected
- [x] No emails collected
- [x] No device identifiers collected
- [x] Version info is anonymous and not tied to any user
- [x] No third-party SDKs added

Note: Including `gitCommit` in analytics events is internal app data,
not user data. It identifies the build, not the user.

---

## Done Criteria

- [ ] `data/version.json` exists and is the source of truth
- [ ] Version info appears in welcome screen footer
- [ ] Version info appears in debug panel
- [ ] Version info logs to console on app launch
- [ ] HTML meta tags include version and build number
- [ ] `bump-build-number.sh` script works and increments correctly
- [ ] Pre-commit hook is installed and runs automatically
- [ ] `set-version.sh` script works for manual version bumps
- [ ] `CHANGELOG.md` exists with at least one entry
- [ ] When Phase 2 is built, analytics events automatically include version info
- [ ] No regressions to existing app functionality

---

## Build Prompt for Claude Code

```
Read this PRD at docs/PRD/foundation-versioning-v1.0.md and build the
versioning and build number system.

Reference the master PRD at docs/PRD/phase1-core-app-v1.5.md
to understand the existing app architecture.

Before building:
1. Commit a snapshot with message "pre-versioning-system snapshot"
2. Create a new git branch called "versioning-system"

Build steps:
1. Create data/version.json with the initial values (start build
   number at 1, set version to current state of the app — likely
   1.5.0 since debug panel is built)
2. Create the bump-build-number.sh and set-version.sh scripts in scripts/
3. Wire up the pre-commit hook
4. Add version display to the welcome screen footer
5. Add version section to the debug panel
6. Add console logging on app launch
7. Add HTML meta tags
8. Create initial CHANGELOG.md with entries for completed phases
9. Document how to use the system in a brief README inside scripts/

When done, summarize:
- What the current version and build number are
- How the pre-commit hook works
- How to manually bump the semantic version
- Anything you want me to know about the implementation
```

---

## Bug Hunt Prompt

```
Bug hunt the versioning system you just built against
docs/PRD/foundation-versioning-v1.0.md. Focus on:

1. Does data/version.json read correctly from all the places that
   reference it (welcome screen, debug panel, console log, meta tags)?
2. Does the pre-commit hook actually run on commit?
3. Does the build number increment correctly?
4. Does set-version.sh update the version without breaking anything?
5. Are there race conditions if multiple things read version.json
   during app load?
6. Does the app still work if version.json is missing or malformed?
   (graceful fallback)
7. Console errors during version display?

Save a report to docs/bug-hunts/versioning-system-bug-hunt.md
organized by severity. Auto-fix CRITICAL only. Wait for approval
on HIGH/MEDIUM/LOW.
```

---

*PRD version 1.0 — Versioning & Build Number System*
