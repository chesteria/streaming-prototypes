# Feature Intake Template
> Fill this out before running the Claude Code orchestration workflow.
> Drop this file + your design images into the working directory, then invoke ORCHESTRATE.md.

---

## 1. Feature Identity

**Feature name:**
<!-- e.g., "Series PDP — Episode Selector Rail" -->

**Screen or surface:**
<!-- e.g., Home, Detail Page, Player, Settings -->

**One-sentence description:**
<!-- What does this feature do for the user? -->

---

## 2. Context & Motivation

**Why are we building this now?**
<!-- Research need, stakeholder demo, phase gate, etc. -->

**Who is the primary audience for this prototype?**
<!-- e.g., UX research participants, internal stakeholders, device QA team -->

**What phase of the platform does this belong to?**
<!-- Phase 1 / Phase 1.5 / Phase 2 / Phase 3 / Other -->

---

## 3. Design Assets

**Number of mockup images included:**
<!-- e.g., 12 screens -->

**What states are covered in the designs?**
<!-- Check all that apply -->
- [ ] Default / idle state
- [ ] Focus / d-pad hover states
- [ ] Selected / active state
- [ ] Loading / skeleton state
- [ ] Empty state
- [ ] Error state
- [ ] Mobile variant
- [ ] Other: _______________

**Are there any states NOT covered by the designs that still need to be built?**
<!-- List them here so the PRD agent doesn't miss them -->

---

## 4. Functional Requirements

### Must Have (P0 — blocking)
<!--
These are non-negotiable. The feature is not shippable without them.
One per line, written as observable behaviors.
e.g., "User can navigate between episodes using d-pad left/right"
-->

-
-
-

### Should Have (P1 — important)
<!--
High value but not blocking for the initial push.
-->

-
-
-

### Nice to Have (P2 — deferred is fine)
<!--
Would be great, but explicitly out of scope for this build.
-->

-
-
-

### Explicitly Out of Scope
<!--
Things that might seem related but are NOT being built.
Being explicit here prevents scope creep in the PRD.
-->

-
-
-

---

## 5. Technical Dependencies

**Files / modules this feature touches or depends on:**
<!-- e.g., js/navigation.js, css/components.css, data/mock-content.json -->

-
-
-

**New files that will need to be created:**

-
-
-

**External dependencies (APIs, data, config):**
<!-- e.g., "Reads rail order from config.json", "Uses placeholder poster URLs" -->

-
-

**Known conflicts or risks:**
<!-- e.g., "Navigation module has an open bug with focus trapping" -->

-
-

---

## 6. Analytics Requirements
<!-- Per platform principle: instrumentation is mandatory, not optional -->

**Events that must be tracked:**
<!-- Format: event_name | trigger | payload fields -->
<!-- e.g., episode_selected | user confirms episode | { episode_id, position, rail_id } -->

-
-
-

**Any participant/session context needed?**
<!-- e.g., participant code (P-XXXX), session ID, scenario preset active -->

---

## 7. Acceptance Criteria

**The feature is considered complete when:**
<!--
Write these as testable, binary pass/fail conditions.
These will feed directly into the test plan.
e.g., "D-pad navigation cycles through all episodes without dropping focus"
-->

1.
2.
3.
4.
5.

---

## 8. Branch & Delivery

**Target branch name:**
<!-- e.g., feature/series-pdp-episode-rail -->
<!-- Nothing merges to main. This is the branch Claude Code will create and push to. -->

**Repo:**
<!-- e.g., your-username/your-repo -->

**Any files that should NOT be touched:**
<!-- e.g., "Do not modify index.html root structure" -->

-
-

---

## 9. Notes for the PRD Agent

**Anything unusual about this feature the agent should know?**
<!-- Design quirks, platform-specific behavior, prior decisions that constrain the build -->

**Preferred implementation approach (if you have one):**
<!-- Leave blank to let the agent decide -->

**Performance constraints:**
<!-- e.g., "Must not cause frame drops on lowest-tier device profile", "Keep JS under 50KB" -->

---
*Template version: 1.0*
