# Opus Meta-Prompt
## "Generate my Claude Code feature workflow"
> Paste this into Opus (or claude.ai using Opus) when you're about to start a new feature build.
> Opus will review your intake form and designs, then produce a customized, ready-to-run ORCHESTRATE.md for that specific feature.

---

You are helping me prepare a complete Claude Code build workflow for a new feature in my prototype platform.

The platform is a modular streaming app prototype (vanilla HTML/CSS/JS, GitHub Pages) used for UX research and stakeholder demos. It targets TV devices as well as mobile. Navigation is d-pad based. Analytics are privacy-first and anonymous.

I'm going to give you two things:
1. My completed **Feature Intake Form** (below or attached)
2. My **design mockup images** (attached)

Your job is to do the following:

---

## What I need from you

### Step 1 — Intake form audit
Read my intake form carefully. Tell me:
- Is anything missing or underspecified that would cause the PRD agent to make assumptions?
- Are my acceptance criteria actually testable as written, or do any need to be sharpened?
- Are my P0/P1/P2 priorities coherent, or am I accidentally scoping too much into P0?
- Is my out-of-scope list complete, or are there adjacent features the designs imply that I haven't explicitly excluded?

Give me this as a short, direct bullet list. I'll revise the intake form if needed before we proceed.

### Step 2 — Design image assessment
Look at every design image I've provided. Tell me:
- How many distinct screens / states did you identify?
- Are there any states in the designs that my intake form doesn't mention?
- Are there any interactions implied by the designs (scroll behavior, focus states, transitions) that I haven't described?
- Are there any design elements that look ambiguous or underspecified — things an engineer would have to guess about?

Again, short and direct. I'll update my intake form or flag things as intentionally deferred.

### Step 3 — Generate the workflow
Once I confirm the intake form is ready (I'll say "go"), produce a customized `ORCHESTRATE.md` for this specific feature.

Use the standard workflow structure (10 stages: environment check → PRD authoring → PRD review → PRD revision → test plan → build → testing → bug fix → commit/push → artifact organization → handoff). Customize it for this feature by:

- Pre-populating the feature name, branch name, and file paths from my intake form. All artifact paths should use the `docs/[feature-slug]/` folder convention — the feature slug is derived by lowercasing the feature name and replacing spaces with hyphens
- Expanding the Stage 4 test plan scaffold with specific edge cases that are unique to this feature based on the designs
- Adding any feature-specific build rules in Stage 5 that the designs or intake form suggest (e.g., "this component uses a horizontal scroll rail — ensure scroll position is preserved on focus return")
- Flagging any of my P2 or out-of-scope items in the Stage 5 build rules as explicit "do not build" guardrails
- Injecting the acceptance criteria from my intake form directly into the Stage 6 test structure

The output should be a complete, ready-to-run markdown file that I can drop into my project directory and invoke with Claude Code.

### Step 4 — Claude Code Briefing Doc
After the ORCHESTRATE.md is produced, write one additional document: `CC-BRIEF.md`

This file will live at `docs/[feature-slug]/CC-BRIEF.md` alongside the PRD and all other feature artifacts. It is a condensed, Claude Code-shaped version of the PRD v2. It is not a product document — it is a direct instruction set. Claude Code will hold this in context during the build. It should be concise enough to not eat the session budget, but complete enough that Claude Code never has to infer intent.

It must include, in this order:

**1. Build context (3-5 sentences)**
What this feature is, where it lives in the app, what it connects to, and what must not be broken.

**2. Build order**
An explicit numbered sequence of what to build first. Components before screens. Foundation before behavior. Analytics wired in at each step, not at the end.

**3. Component checklist**
Every UI element as a checkbox. Each one annotated with: default state | focus state | any additional states. One line per component.

**4. Do not build (hard stops)**
A flat list of anything explicitly out of scope, pulled from the intake form. Claude Code must not build these even if the designs imply them.

**5. Analytics table**
| Event name | Trigger | Payload fields |
One row per event. Every interactive element must appear here.

**6. Acceptance criteria checklist**
The AC list from the PRD, formatted as checkboxes Claude Code can work through during testing.

**7. File map**
All artifacts for this feature live under `docs/[feature-slug]/`. Reference this structure explicitly:
- Files to create (with purpose) — note which go in the feature folder vs. the project root
- Files to touch (with what changes)
- Files that must not be touched, listed explicitly
- Platform-level docs that will need retroactive updates after the build: `docs/COMPONENT_MAP.md`, `docs/ANALYTICS_REGISTRY.md`, `docs/SCREEN_INVENTORY.md`, `docs/NAVIGATION_MAP.md`, `docs/DEPENDENCY_GRAPH.md`, `docs/KNOWN_ISSUES.md`, `CHANGELOG.md`

**8. Branch and push instructions**
Branch name, commit message format, push target. One paragraph, no ambiguity.

This document travels with Claude Code into the build session. The full PRD v2 is reference material. This briefing is the working doc.

---

## Platform context (inject into all agent roles you generate)

```
Project: [pull from intake form]
Repo: [pull from intake form]
Stack: Vanilla HTML/CSS/JS — no frameworks, no build tools
Hosting: GitHub Pages
Architecture: Modular, screen-by-screen. Each screen self-contained.
Navigation: D-pad, CSS class-driven focus management
Analytics: Anonymous event bus. Participant codes: P-XXXX format. Every interactive element emits events. This is mandatory, not optional.
Performance baseline: Must not degrade on lowest-tier device profile
Design fidelity: High — match mockups closely within prototype tolerances
Branch policy: Nothing merges to main. All work to feature branch named in intake form.
Existing screens: [pull from intake form — list screens that must not be broken]
```

---

## Intake form

[PASTE YOUR FILLED-OUT FEATURE_INTAKE_TEMPLATE.md HERE]

---

## My design images

[ATTACH YOUR MOCKUP IMAGES HERE]

---

When you're ready, start with Step 1. I'll confirm at each step before you proceed. The full sequence is: audit → image assessment → ORCHESTRATE.md → CC-BRIEF.
