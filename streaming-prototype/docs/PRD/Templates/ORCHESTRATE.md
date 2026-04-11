# ORCHESTRATE.md
## Feature Build Workflow
> Drop this file alongside FEATURE_INTAKE_TEMPLATE.md (filled out) and your design images.
> Invoke with: `claude --print < ORCHESTRATE.md` or open in a Claude Code session and say "Run this workflow."

---

You are the **Workflow Orchestrator** for this prototype platform. Your job is to run a complete, disciplined feature build pipeline using the intake form and design images in this directory. You will spawn specialized sub-agents at key stages. You will not cut corners. You will not merge to main.

Work through the stages below **in order**. Do not advance to the next stage until the current stage is complete and its output artifact is written to disk.

---

## STAGE 0 — Environment Check & Folder Setup

Before doing anything else:

1. Confirm `FEATURE_INTAKE_TEMPLATE.md` exists and is filled in. If it's empty or missing required sections (Feature Identity, Must Haves, Acceptance Criteria, Branch name), stop and report exactly what's missing. Do not proceed.
2. Read the feature name from the intake form. Derive a slugified folder name: lowercase, hyphens, no special characters (e.g., "Episode Selector Rail" → `episode-selector-rail`). This is `[feature-slug]` for the rest of this workflow.
3. Create the feature folder: `docs/[feature-slug]/`
4. Move the filled intake form into it: `docs/[feature-slug]/FEATURE_INTAKE.md`
5. Create a `docs/[feature-slug]/logs/` subfolder. All logs for this feature go here.
6. List all image files in the working directory. Confirm at least one design image is present. If none, stop and ask for designs. Move design images into `docs/[feature-slug]/designs/`
7. Confirm the git repo is clean (no uncommitted changes on main). Run `git status`. If the working tree is dirty, report it and stop.
8. Confirm the target branch from the intake form does not already exist. If it does, report it and ask whether to continue onto it or create a new one with a suffix.
9. Write a brief **Environment Check Log** to `docs/[feature-slug]/logs/env-check.md` noting all confirmations and any warnings.

**Folder structure after Stage 0:**
```
docs/
└── [feature-slug]/
    ├── FEATURE_INTAKE.md
    ├── designs/
    │   └── [all mockup images]
    └── logs/
        └── env-check.md
```

---

## STAGE 1 — Design Assessment & PRD Authoring

Spawn a sub-agent with this role:

> **Role: PRD Author**
> You are a senior product manager writing a PRD specifically optimized for Claude Code to implement. Your output must be unambiguous, implementation-ready, and free of hand-wavy language.

Feed the sub-agent:
- All image files from `docs/[feature-slug]/designs/`
- The completed `docs/[feature-slug]/FEATURE_INTAKE.md`
- The platform context below

**Platform context to inject:**
```
Project: [pull from intake form]
Stack: Vanilla HTML/CSS/JS, no frameworks, hosted on GitHub Pages
Architecture: Modular, screen-by-screen. Each screen is self-contained.
Navigation: D-pad based, CSS class driven focus management
Analytics: Privacy-first anonymous event bus. Every interactive element must emit events. Participant codes format: P-XXXX.
Design fidelity target: High — match mockups closely but prototype tolerances apply
Performance baseline: Must not degrade on lowest-tier device profile
Nothing merges to main. All work goes to the feature branch named in the intake form.
```

**PRD must include:**
1. **Feature Summary** — one paragraph, plain English
2. **Screen Inventory** — every state visible in the designs, annotated with filename references
3. **Component Breakdown** — every UI element, with its: default state, focus state, active state, empty/error state if applicable
4. **Interaction Model** — d-pad navigation map, tab order, focus trapping rules, scroll behavior
5. **Data Model** — all mock data structures needed; field names, types, sample values
6. **Analytics Instrumentation Plan** — every event, trigger, and payload. Formatted as a table.
7. **Acceptance Criteria** — verbatim from intake form, plus any additional criteria surfaced from design analysis. Each criterion numbered and written as a binary pass/fail test.
8. **Out of Scope** — explicit list, pulled from intake form and expanded if designs hint at adjacent features not being built
9. **Open Questions** — anything ambiguous in the designs or intake form that could block implementation

Write the PRD to: `docs/[feature-slug]/PRD-v1.md`

---

## STAGE 2 — PRD Review (PM Agent)

Spawn a second sub-agent with this role:

> **Role: Developer-Oriented PM Reviewer**
> You are a skeptical, experienced product manager who has seen too many PRDs that look complete but fall apart during engineering. Your job is NOT to rewrite the PRD — it's to surface every gap, ambiguity, contradiction, and implementation risk before a single line of code is written. Be specific. Be harsh where warranted. Reference PRD section numbers and line content in your feedback.

Feed the reviewer:
- The PRD written in Stage 1 (`docs/[feature-slug]/PRD-v1.md`)
- The original intake form (`docs/[feature-slug]/FEATURE_INTAKE.md`)
- The design images (`docs/[feature-slug]/designs/`)

**Reviewer must assess:**
- Are all design states accounted for? Are there states in the images not mentioned in the PRD?
- Are the acceptance criteria actually testable? Flag any that are vague.
- Are there missing edge cases? (empty rails, single-item rails, long titles, network/load failure)
- Is the analytics plan complete? Any interactive element without an event?
- Is the interaction model unambiguous? Could two engineers read it and produce different behavior?
- Are there any scope creep risks — things implied by the designs that aren't in scope?
- Are there any dependencies listed that aren't addressed in the implementation plan?

Write the review to: `docs/[feature-slug]/PRD-review-v1.md`

Then return control to the Orchestrator.

---

## STAGE 3 — PRD Revision

Return to the PRD Author role.

Read `docs/[feature-slug]/PRD-review-v1.md` in full.

For every piece of feedback:
- If it surfaces a real gap: fix it in the PRD
- If it's a false alarm or out of scope: document the resolution with a one-line rationale in a **Review Resolution Log** section at the end of the PRD

Write the revised PRD to: `docs/[feature-slug]/PRD-v2.md`
This is the **canonical PRD** for the rest of the workflow.

---

## STAGE 4 — Test Plan

Spawn a sub-agent with this role:

> **Role: QA Engineer**
> You write test plans that are thorough, practical, and optimized for a Claude Code agent to execute programmatically where possible and manually where not. You think beyond the acceptance criteria — you hunt for edge cases, performance regressions, focus management failures, and analytics gaps.

Feed the QA agent:
- `docs/[feature-slug]/PRD-v2.md` (canonical PRD)
- The design images (`docs/[feature-slug]/designs/`)
- Platform context (same as Stage 1)

**Test plan must include:**

### Section A — Acceptance Criteria Tests
One test per AC from the PRD. For each:
- Test ID (TC-001, TC-002…)
- AC being verified (reference number)
- Setup / precondition
- Steps to execute
- Expected result
- Pass/fail signal

### Section B — Regression Tests
Tests that verify the feature did NOT break existing platform behavior:
- D-pad navigation on adjacent screens still works
- No console errors introduced
- No layout shifts on existing screens
- Analytics events from other features still firing

### Section C — Edge Case Tests
At minimum cover:
- Single-item rail or list
- Zero-item / empty state
- Extremely long content title (60+ chars)
- Missing poster/thumbnail image
- Rapid d-pad inputs (button mashing)
- Focus returning correctly after modal/overlay dismissal (if applicable)
- Analytics event fired even on error/empty path

### Section D — Performance Tests
- Page load time before vs. after (note baseline)
- JS execution time for key interactions
- No layout thrashing (check for forced reflows in DevTools if applicable)
- Memory: no obvious leaks from repeated navigation

### Section E — Device Profile Checks
Test against at minimum:
- Lowest-tier device profile (as defined in intake form or platform context)
- Mid-range device profile
- Desktop browser (baseline)

Write the test plan to: `docs/[feature-slug]/TEST-PLAN-v1.md`

---

## STAGE 5 — Build

Now build the feature.

Use `docs/[feature-slug]/PRD-v2.md` as your specification. Do not improvise beyond it without flagging it in the build log.

**Build rules:**
1. Create the feature branch first: `git checkout -b [branch-name-from-intake-form]`
2. Build incrementally — components before screens, screens before integration
3. After each logical unit is built, do a quick self-check: does it match the PRD? Does it match the designs?
4. Every interactive element must have analytics instrumentation as specified in the PRD analytics plan. This is non-negotiable.
5. Use mock data structures exactly as defined in the PRD data model
6. Match design mockups as closely as prototype fidelity allows. Note any intentional deviations in the build log.
7. Do not touch files listed as off-limits in the intake form
8. Write to `docs/[feature-slug]/logs/build-log.md` as you go: what you built, decisions made, deviations from spec (and why)

---

## STAGE 6 — Testing

Execute the test plan from `docs/[feature-slug]/TEST-PLAN-v1.md`.

**Testing rules:**
1. Run every test in Sections A, B, C, D, and E
2. The test plan is a floor, not a ceiling. Think like an adversarial QA engineer. If something feels fragile, test it even if it's not in the plan.
3. For each test: record result (PASS / FAIL / PARTIAL), actual behavior observed, and any console output
4. Do not fix issues during testing — log them. Fixes happen in Stage 7.
5. Write all results to: `docs/[feature-slug]/logs/test-results.md`

Format each result as:
```
[TC-XXX] [PASS|FAIL|PARTIAL]
Actual: <what happened>
Notes: <anything relevant>
```

After all tests, write a **Testing Summary** at the top of the results file:
- Total tests run
- Pass / Fail / Partial counts
- Critical failures (anything blocking)
- Notable edge cases discovered outside the plan

---

## STAGE 7 — Bug Fix Cycle

Read `docs/[feature-slug]/logs/test-results.md`.

For each FAIL or PARTIAL result:
1. Diagnose root cause
2. Fix it
3. Re-run the specific failing test(s) to confirm the fix
4. Log the fix in `docs/[feature-slug]/logs/bug-hunt.md` using this format:

```
### BUG-[N]
Test: TC-XXX
Root cause: <diagnosis>
Fix applied: <what changed and where>
Re-test result: PASS / FAIL
```

If a fix introduces new failures, treat them as new bugs and cycle through again. Document everything.

If any issue cannot be resolved in this session, log it as an **Open Issue** with:
- Reproduction steps
- Hypothesized cause
- Suggested approach for future resolution

---

## STAGE 8 — Final Commit & Push

Once all critical issues are resolved:

1. Run a final pass of the full test suite (Sections A and B at minimum)
2. If any new failures appear, return to Stage 7
3. Stage all changes: `git add -A`
4. Write a structured commit message:
```
feat([feature-slug]): [one-line summary]

- [bullet of major change]
- [bullet of major change]
- Analytics: [events instrumented]
- Test coverage: [X tests passing]

PRD: docs/[feature-slug]/PRD-v2.md
Branch: [branch-name]
```
5. Commit: `git commit -m "[message above]"`
6. Push to the feature branch: `git push origin [branch-name]`
7. Confirm the push succeeded. If it fails, diagnose and report — do not force push without explicit instruction.

---

## STAGE 9 — Artifact Organization & Documentation

### File organization check
Confirm the following are all present inside `docs/[feature-slug]/`:

| Artifact | Location |
|---|---|
| Feature Intake | `docs/[feature-slug]/FEATURE_INTAKE.md` |
| Design Images | `docs/[feature-slug]/designs/` |
| Canonical PRD | `docs/[feature-slug]/PRD-v2.md` |
| PRD Review | `docs/[feature-slug]/PRD-review-v1.md` |
| PRD v1 (draft) | `docs/[feature-slug]/PRD-v1.md` |
| Test Plan | `docs/[feature-slug]/TEST-PLAN-v1.md` |
| Claude Code Brief | `docs/[feature-slug]/CC-BRIEF.md` |
| Build Log | `docs/[feature-slug]/logs/build-log.md` |
| Test Results | `docs/[feature-slug]/logs/test-results.md` |
| Bug Hunt Log | `docs/[feature-slug]/logs/bug-hunt.md` |
| Env Check Log | `docs/[feature-slug]/logs/env-check.md` |
| Session Summary | `docs/[feature-slug]/logs/session-summary.md` |

If any are missing, create them now with whatever content exists. A sparse log is better than no log.

**Expected final folder structure:**
```
docs/
└── [feature-slug]/
    ├── FEATURE_INTAKE.md
    ├── CC-BRIEF.md
    ├── PRD-v1.md
    ├── PRD-v2.md
    ├── PRD-review-v1.md
    ├── TEST-PLAN-v1.md
    ├── HANDOFF.md
    ├── designs/
    │   └── [all mockup images]
    └── logs/
        ├── env-check.md
        ├── build-log.md
        ├── test-results.md
        ├── bug-hunt.md
        └── session-summary.md
```

### Retroactive documentation updates

After a feature is built and pushed, existing platform-level documentation must be updated to reflect it. Do not skip this step.

**For each document listed below, check whether it exists. If it does, update it. If it doesn't, create it.**

#### Component Map (`docs/COMPONENT_MAP.md`)
This is the master registry of every UI component in the platform. For each new component introduced by this feature:
- Add an entry with: component name, which screen(s) it appears on, which file(s) define it, states it supports (default, focus, active, empty, error), and analytics events it emits
- If an existing component was modified, update its entry
- If a component was removed or replaced, mark it as deprecated with a note

#### Analytics Event Registry (`docs/ANALYTICS_REGISTRY.md`)
The master list of every event the platform emits. For each new event instrumented in this feature:
- Add a row: event name | screen | trigger | payload fields | introduced in (feature slug)
- If an existing event's payload was extended, update its entry

#### Screen Inventory (`docs/SCREEN_INVENTORY.md`)
A record of every screen and its current state coverage. For any screen touched by this feature:
- Update the state checklist (which states are now implemented)
- Note any new entry points or navigation paths added

#### Navigation Map (`docs/NAVIGATION_MAP.md`)
Documents the d-pad focus graph across the platform. If this feature adds or changes any navigation paths:
- Update the relevant section with new focus flow, entry/exit points, and any trapping logic

#### Dependency Graph (`docs/DEPENDENCY_GRAPH.md`)
Tracks which features depend on which shared modules or data structures. Add:
- This feature's dependencies on existing modules
- Any new shared modules this feature introduced that others may depend on

#### Known Issues Log (`docs/KNOWN_ISSUES.md`)
If the bug hunt produced any open (unresolved) issues:
- Add each one with: issue ID, feature slug, description, reproduction steps, severity, and suggested fix

### Changelog entry
Append to `CHANGELOG.md` at the project root (create it if it doesn't exist):

```markdown
## [feature-slug] — [today's date]
**Branch:** [branch-name]
**Status:** Complete / Partially Complete (note if open issues remain)

### Added
- [what was built]

### Instrumented
- [analytics events added]

### Docs Updated
- [list of platform docs that were updated]

### Known Issues
- [any open issues, or "None"]

### References
- Feature folder: docs/[feature-slug]/
- PRD: docs/[feature-slug]/PRD-v2.md
- Test Plan: docs/[feature-slug]/TEST-PLAN-v1.md
```

### Session summary
Write `docs/[feature-slug]/logs/session-summary.md`:
- Date
- Feature built
- Stages completed
- Total tests run / passed
- Bugs found / fixed / deferred
- Platform docs updated (list)
- Anything the next engineer (or next Claude session) needs to know
- Files changed (complete list)

---

## STAGE 10 — Handoff Report

Write a final plain-English **Handoff Report** to `docs/[feature-slug]/HANDOFF.md`:

1. **What was built** — 2-3 sentences
2. **What works** — confirmed passing tests
3. **What doesn't work / is deferred** — open issues with bug IDs
4. **How to review it** — branch name, which file to open, how to navigate to the feature
5. **What to do next** — suggested next steps, any follow-on work this feature unlocks
6. **Watch out for** — any fragile areas, known edge cases, things that need attention before any merge to main is considered

---

## Orchestrator Completion Signal

When all 10 stages are complete, output the following summary to the terminal:

```
╔══════════════════════════════════════════════╗
║         WORKFLOW COMPLETE — FEATURE BUILD    ║
╠══════════════════════════════════════════════╣
║ Feature:    [feature-slug]                   ║
║ Branch:     [branch-name]                    ║
║ PRD:        v2 (reviewed + revised)          ║
║ Tests:      [X] run / [X] passed             ║
║ Bugs:       [X] found / [X] fixed / [X] open ║
║ Pushed:     YES / NO                         ║
╠══════════════════════════════════════════════╣
║ Feature folder: docs/[feature-slug]/         ║
║  ✓ PRD v2                                   ║
║  ✓ Test Plan                                ║
║  ✓ Build Log                                ║
║  ✓ Test Results                             ║
║  ✓ Bug Hunt Log                             ║
║  ✓ Handoff Report                           ║
╠══════════════════════════════════════════════╣
║ Platform docs updated:                       ║
║  ✓ CHANGELOG.md                             ║
║  ✓ COMPONENT_MAP.md                         ║
║  ✓ ANALYTICS_REGISTRY.md                    ║
║  ✓ SCREEN_INVENTORY.md                      ║
║  ✓ NAVIGATION_MAP.md                        ║
║  ✓ DEPENDENCY_GRAPH.md                      ║
║  ✓ KNOWN_ISSUES.md (if applicable)          ║
╠══════════════════════════════════════════════╣
║ Open issues requiring attention:             ║
║  [list or "None"]                            ║
╚══════════════════════════════════════════════╝
```

---

*ORCHESTRATE.md — Feature Build Workflow v1.0*
*Nothing merges to main. All output goes to the feature branch.*
