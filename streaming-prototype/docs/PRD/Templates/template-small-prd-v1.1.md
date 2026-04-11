# Small PRD Template

> **When to use this:** You're building a small, well-understood feature
> yourself — no design images to assess, no need for a PRD review loop.
> You fill this out and hand it directly to Claude Code.
>
> **When to use the full workflow instead:** You have design mockups,
> the feature is more than a few hours of work, or you want the
> Opus PRD authoring + PM review cycle before any code is written.
> In that case, use `FEATURE_INTAKE_TEMPLATE.md` and `ORCHESTRATE.md`.
>
> **Where this file lives:** Save completed PRDs to `docs/[feature-slug]/`
> alongside all other artifacts for that feature.
> Filename convention: `PRD-v1.md` (or `PRD-v2.md` after self-review).

---

## Overview

**Title:** [Feature name]
**Feature slug:** [lowercase-hyphenated — used for the folder and branch name]
**Type:** [Enhancement / Sub-feature / Bug fix batch / Phase addition]
**Parent phase:** [Which major phase this relates to, if any]
**Estimated build time:** [A few hours / Half a day / One evening]
**Created:** [Date]
**Status:** [Draft / Ready to build / In progress / Built / Verified]

---

## Problem

> One or two sentences describing what this solves and why it matters.
> If you can't articulate the problem clearly, the PRD isn't ready yet.

---

## Goal

> What "done" looks like in plain language. The thing the user can do
> after this is built that they couldn't do before.

---

## Specification

> The actual requirements. Be specific enough that Claude Code can build
> from this without guessing, but don't over-engineer. Cover:
>
> - What gets added (files, components, screens, behaviors)
> - How it integrates with existing code
> - Any new data structures or config values
> - Visual/interaction details if relevant
> - D-pad navigation behavior and focus states if this is a UI feature

---

## What to Skip

> Explicit out-of-scope items. This prevents Claude Code from adding
> features you didn't ask for. Be specific — if the designs imply
> something adjacent, name it here and say "do not build."

---

## Configurable Values

> If this feature introduces any timing, sizing, or behavior values
> that should be tweakable, list them as JS constants or CSS variables
> with default values.

```javascript
const FEATURE_FLAG_NAME = true;
const TIMING_VALUE_MS = 500;
```

---

## Analytics Events

> Analytics instrumentation is mandatory on every feature — not optional,
> not phase-dependent. Every interactive element must emit an event.
> If you're not sure what to track, that's a signal the spec isn't ready.

| Event Name | Fired When | Payload |
|---|---|---|
| `example_event` | User interacts with [thing] | `{ action, target, context }` |

---

## Privacy Check

> Confirm this feature does not collect or transmit any PII.
> If it does, stop and rethink the design before proceeding.

- [ ] No real names collected
- [ ] No email addresses collected
- [ ] No device identifiers collected
- [ ] All identifiers are anonymous random codes (format: P-XXXX)
- [ ] No third-party SDKs added without explicit approval

---

## Acceptance Criteria

> Binary pass/fail conditions. Every item must be testable.
> These feed directly into the bug hunt prompt below.

- [ ] [Specific testable behavior 1]
- [ ] [Specific testable behavior 2]
- [ ] [Specific testable behavior 3]
- [ ] No regressions to existing functionality
- [ ] No console errors during normal use
- [ ] All analytics events fire as specified above

---

## Build Prompt for Claude Code

```
Read the PRD at docs/[feature-slug]/PRD-v1.md and build the feature
as specified.

Reference docs/COMPONENT_MAP.md to understand existing components
and reuse them where appropriate rather than building new ones.
Reference docs/ANALYTICS_REGISTRY.md to ensure new event names
don't conflict with existing events.

Before building:
1. Confirm the working tree is clean: git status
2. Commit a snapshot: git commit -m "pre-[feature-slug] snapshot"
3. Create and switch to the feature branch: git checkout -b [branch-name]

Build the feature on that branch. Do not modify anything outside the
scope of the PRD. Do not merge to main.

When done:
- Summarize what you built and what files changed
- Note any deviations from the PRD and why
- Write a build log to docs/[feature-slug]/logs/build-log.md
```

---

## Bug Hunt Prompt

```
Bug hunt the [feature-slug] feature against the acceptance criteria
in docs/[feature-slug]/PRD-v1.md. Focus on:

1. Does every acceptance criterion pass?
2. Did anything in the existing app break as a result of this feature?
3. Are all analytics events firing with the correct payloads?
4. Any privacy violations (PII collected or transmitted)?
5. Console errors or warnings during normal use?
6. Edge cases: empty states, long text, missing images, rapid input

Save a full report to docs/[feature-slug]/logs/bug-hunt.md,
organized by severity: CRITICAL / HIGH / MEDIUM / LOW.

Auto-fix CRITICAL issues only. List all others with descriptions
and wait for approval before touching them.
```

---

## Retroactive Docs Update Prompt

```
The [feature-slug] feature has been built and verified. Update the
following platform-level documents to reflect it. Check each one —
if it doesn't exist yet, create it.

docs/COMPONENT_MAP.md
  — Add any new components introduced. For each: name, screen(s),
    file(s), states supported, analytics events emitted.
  — Update any existing components that were modified.

docs/ANALYTICS_REGISTRY.md
  — Add a row for every new event instrumented in this feature:
    event name | screen | trigger | payload fields | feature slug.

docs/SCREEN_INVENTORY.md
  — Update state coverage for any screen this feature touched.
  — Note any new navigation entry points added.

docs/NAVIGATION_MAP.md
  — Update if this feature added or changed any d-pad focus paths.

docs/DEPENDENCY_GRAPH.md
  — Add this feature's dependencies on existing modules.
  — Note any new shared modules introduced.

docs/KNOWN_ISSUES.md
  — Add any open (unresolved) bugs from the bug hunt log,
    with: issue ID, feature slug, description, severity, suggested fix.

CHANGELOG.md (project root)
  — Append an entry: feature name, date, branch, what was added,
    events instrumented, known issues, and reference to the feature folder.
```

---

*Small PRD Template version 1.1*
*For larger features with design images, use FEATURE_INTAKE_TEMPLATE.md + ORCHESTRATE.md*
