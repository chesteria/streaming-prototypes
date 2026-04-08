# Scripts — Versioning System

This folder contains two shell scripts that manage the app's version and
build number. Both require Node.js and Git.

---

## How it works

`data/version.json` is the single source of truth:

```json
{
  "version": "1.5.0",
  "buildNumber": 42,
  "buildDate": "2026-04-08T14:00:00Z",
  "gitCommit": "a1b2c3d",
  "gitBranch": "main",
  "phase": "Phase 2",
  "label": "Insight Engine"
}
```

Every part of the app reads from here — the build stamp, debug panel,
console log, and analytics events all pull live from this file.

---

## Pre-commit hook (automatic)

A Git pre-commit hook at `.git/hooks/pre-commit` runs
`bump-build-number.sh` automatically on every commit. You don't need
to do anything — the build number always stays current.

What it updates on each commit:
- `buildNumber` — incremented by 1
- `buildDate` — current UTC timestamp
- `gitCommit` — short hash of HEAD at commit time (see note below)
- `gitBranch` — current branch name

The updated `version.json` is staged and included in the commit.

> **Note — `gitCommit` is always the parent commit's hash, not the
> current one.** Pre-commit hooks run before the new commit is created,
> so `git rev-parse HEAD` returns the previous commit. This is an
> inherent limitation of pre-commit hooks. The `buildNumber` is the
> reliable identifier for a specific build — use that when tracing
> issues, not `gitCommit`. The commit hash is supplementary context.

---

## bump-build-number.sh (manual)

Run this if you want to bump the build number without making a full
commit (e.g., testing the hook logic):

```bash
./scripts/bump-build-number.sh
```

---

## set-version.sh (manual — when releasing)

Run this when you want to cut a new semantic version release:

```bash
./scripts/set-version.sh <version> "<label>" ["<phase>"]
```

**Examples:**

```bash
# MINOR bump within the same phase — phase arg omitted, stays unchanged
./scripts/set-version.sh 1.6.0 "Welcome Screen"

# MAJOR bump crossing into a new phase — include the phase arg
./scripts/set-version.sh 2.0.0 "Scenario Presets" "Phase 3"
```

This updates `version` and `label` in `version.json`. If a third
argument is provided, `phase` is updated too. It does NOT reset the
build number — that keeps incrementing as normal.

After running set-version.sh, the script reminds you to:
1. Update `docs/CHANGELOG.md`
2. Commit: `git add data/version.json docs/CHANGELOG.md && git commit -m "release: v1.6.0"`
3. Tag: `git tag v1.6.0`

---

## Versioning scheme

| Increment | When |
|-----------|------|
| **MAJOR** x.0.0 | Breaking changes to architecture, data structure, or PRD scope |
| **MINOR** 1.x.0 | New features added in a backward-compatible way |
| **PATCH** 1.5.x | Bug fixes and small improvements |

---

## Where version info appears

| Location | What's shown |
|----------|-------------|
| Build stamp (bottom-right) | `v1.5.0 · Build 42` |
| Debug panel (Section F) | Full version block |
| Browser console (on launch) | Two-line log with all fields |
| HTML meta tags | `app-version` and `app-build` |
| Analytics events | `config.appVersion`, `config.buildNumber`, `config.gitCommit` |
| Welcome screen footer (when built) | `Streaming Prototype v1.5.0 · Build 42` |
