# Small PRD Template

> Use this template for bite-sized features that can be built and tested
> in a single evening or short Claude Code session. For larger phases,
> use the master PRD format instead.
>
> Save completed PRDs to `/docs` with a descriptive filename like
> `enhancement-feature-name.md` or `phase2-subfeature-name.md`.

---

## Overview

**Title:** [Feature name]
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

---

## What to Skip

> Explicit out-of-scope items. This prevents Claude Code from adding
> features you didn't ask for.

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

## Analytics Events (if Phase 2 is built)

> Every new feature must include analytics instrumentation. List the
> events this feature should fire and what data they capture.

| Event Name | Fired When | Payload |
|---|---|---|
| `example_event` | User interacts with [thing] | `{ action, target, context }` |

---

## Privacy Check

> Confirm this feature does not collect or transmit any PII. If it does,
> stop and rethink the design.

- [ ] No real names collected
- [ ] No emails collected
- [ ] No device identifiers collected
- [ ] All identifiers are anonymous random codes
- [ ] No third-party SDKs added

---

## Done Criteria

> A short checklist for verifying the feature is complete. You'll use
> this when testing.

- [ ] [Specific testable behavior 1]
- [ ] [Specific testable behavior 2]
- [ ] [Specific testable behavior 3]
- [ ] No regressions to existing functionality
- [ ] No console errors during normal use

---

## Build Prompt for Claude Code

```
Read this PRD at docs/[filename].md and build the feature as specified.

Reference the master PRD at docs/PRD/phase1-core-app-v1.5.md
and the component map at docs/component-map.md to understand the
existing architecture and use shared components where appropriate.

Before building:
1. Commit a snapshot with message "pre-[feature-name] snapshot"
2. Create a new git branch called "[feature-name]"

Build the feature on that branch. When done, summarize what you built
and what files changed.

Do not modify anything outside the scope of this PRD.
```

---

## Bug Hunt Prompt (run after building)

```
Bug hunt the [feature name] feature you just built against
docs/[filename].md. Focus on:

1. Does the feature do what the PRD says it should?
2. Did anything in the existing app break as a result?
3. Are the analytics events firing correctly?
4. Any privacy violations?
5. Console errors or warnings?

Save a report to docs/bug-hunts/[feature-name]-bug-hunt.md organized
by severity. Auto-fix CRITICAL issues only. Wait for my approval on
HIGH, MEDIUM, and LOW.
```

---

*Small PRD Template version 1.0*
