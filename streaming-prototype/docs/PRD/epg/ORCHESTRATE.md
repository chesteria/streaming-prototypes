# ORCHESTRATE.md — EPG (Electronic Program Guide)

> Claude Code workflow for the EPG feature build.
> Invoke this file from the project root with Claude Code. Walk the stages in order. Do not skip stages.

---

## Feature metadata

- **Feature name:** EPG (Electronic Program Guide)
- **Feature slug:** `epg`
- **Branch:** `epg-initial`
- **Repo:** `chesteria/UTA`
- **Phase:** 3 (Live experience)
- **Artifact root:** `docs/epg/`
- **Companion brief:** `docs/epg/CC-BRIEF.md` (load this into context for the build stages)

---

## Platform context (applies to every stage)

```
Project: UTA — modular streaming app prototype
Repo: chesteria/UTA
Stack: Vanilla HTML/CSS/JS — no frameworks, no build tools
Hosting: GitHub Pages
Architecture: Modular, screen-by-screen. Each screen self-contained.
Navigation: D-pad, CSS class-driven focus management
Analytics: Anonymous event bus. Participant codes: P-XXXX format.
              Every interactive element emits events. MANDATORY.
Performance baseline: Must not degrade on lowest-tier device profile
Design fidelity: High — match mockups closely within prototype tolerances
Branch policy: Nothing merges to main. All work to `epg-initial`.
Existing screens that must not break: For You lander, debug.html
```

---

## Stage 0 — Environment check

Before touching anything:

1. Confirm working tree is clean. If not, stop and surface to user.
2. Confirm current branch. Create `epg-initial` from main if it doesn't exist; check it out if it does.
3. Confirm `docs/epg/` exists. Create it if not.
4. Confirm the following platform docs exist (do not edit yet — just verify presence):
   `docs/COMPONENT_MAP.md`, `docs/ANALYTICS_REGISTRY.md`, `docs/SCREEN_INVENTORY.md`,
   `docs/NAVIGATION_MAP.md`, `docs/DEPENDENCY_GRAPH.md`, `docs/KNOWN_ISSUES.md`, `CHANGELOG.md`.
   Flag any missing.
5. Read `docs/epg/EPG_INTAKE_V1.md` and `docs/epg/CC-BRIEF.md` into context.

**Gate:** Do not proceed until the environment is verified and intake is loaded.

---

## Stage 1 — PRD authoring

Author `docs/epg/PRD.md` (v1) covering, in order:

1. **Summary** — one paragraph, what this is and where it lives
2. **Goals & non-goals** — pull non-goals verbatim from the intake out-of-scope list
3. **User stories** — phrased as participant scenarios (P-XXXX framing)
4. **Information architecture** — channel/genre/program data model, including the
   multi-genre channel rule and the independent-instance scroll rule
5. **Screen spec** — top nav, genre rail, channel grid, more-info overlay
6. **Component spec** — each component with default + focus + any additional states
7. **Navigation & focus map** — every d-pad transition, including:
   - left from currently-playing tile → channel logo
   - up from top channel row → genre rail
   - up from genre rail → top nav (Live tab)
   - back from anywhere in rail/grid → top nav
   - genre rail right-wrap from last → first
   - return-to-now animation on row blur (~250ms ease-out)
8. **Two more-info panel variants** — currently-playing (Watch Live + progress bar + duration remaining) vs. future program (Watch Channel + scheduled window). Document which fields appear in each.
9. **Tile content rules** — currently-playing shows remaining time ("12m", "33m left"); future shows scheduled window ("9:00–9:05a")
10. **Genre rail behavior** — anchor reaction on row blur, horizontal scroll, wrap, configurable order
11. **Mock data plan** — 30+ rows, 8+ genres, hand-authored cheeky/humorous metadata, IP-free placeholder logos, channel-in-multiple-genres examples
12. **debug.html additions** — genre naming, genre order, channel-to-genre association, channel metadata edit. Plus a logical sweep of any other EPG-relevant toggles that fit the existing debug pattern.
13. **Analytics events** — author the event list (see Stage 1a)
14. **Acceptance criteria** — derived from P0 (see Stage 1b)
15. **Open questions** — flag anything still ambiguous

### Stage 1a — Analytics event authoring
Draft events covering: screen entry/exit, dwell time per screen, genre rail focus, genre selection, genre anchor reaction (auto-highlight on row blur), channel row focus, program tile focus, program tile scrub (forward navigation in time), row return-to-now, channel logo focus, more-info panel open/close, more-info CTA focus, back-button to nav. Each event: `event_name | trigger | payload fields`. Include `participant_code` and `session_id` on every event.

### Stage 1b — Acceptance criteria authoring
Derive ACs from every P0 bullet. Each AC must be binary pass/fail. Cover at minimum:
- Genre grouping renders correctly with channels appearing in multiple groups when configured
- Independent row scroll, including independence between stacked instances of the same channel
- Return-to-now animation triggers on row blur
- Genre rail anchor updates within 100ms of focus entering a new genre group
- Genre selection scrolls grid to first channel of that genre
- 24-hour forward limit enforced; no past programs accessible
- Left-from-currently-playing reaches channel logo; select opens more-info
- Up from grid → rail → nav, with nav landing on Live
- Back button from rail/grid lands on top nav
- Genre rail wraps right-to-first
- Nav from For You → Live and Live → For You both work
- Every interactive element emits its analytics event
- 30+ rows and 8+ genres present
- No Local Now branding anywhere

**Gate:** PRD v1 written. Proceed to Stage 2.

---

## Stage 2 — PRD review

Self-review `PRD.md`. Produce `docs/epg/PRD-REVIEW.md` covering:
- Any P0 item not reflected in the PRD
- Any AC that is not actually testable as written
- Any component without a defined focus state
- Any interactive element missing an analytics event
- Any navigation transition not specified
- Conflicts between sections

**Gate:** Surface the review to the user. Wait for explicit "proceed" before Stage 3.

---

## Stage 3 — PRD revision

Apply review fixes. Output `docs/epg/PRD.md` (v2, overwriting v1). Diff summary in chat.

**Gate:** User confirms PRD v2.

---

## Stage 4 — Test plan

Author `docs/epg/TEST-PLAN.md`. Each test references an AC ID from the PRD.

**EPG-specific edge cases that MUST be in the plan:**
- Channel appearing in 2+ genres: each instance scrolls independently; scrubbing instance A does not move instance B
- Row blur during scrub mid-animation: animation completes cleanly to "now," no stuck state
- Genre anchor reaction when scrolling fast through rows that span multiple genres: rail keeps up, lands on the correct chip
- Genre rail wrap: focus right from last chip → first chip; left from first → last
- Back button from a deeply-scrubbed row state: returns to nav AND row resets to now
- Last channel row: down arrow does not crash or escape the grid
- Program tile at the 24-hour boundary: right arrow does not advance past it
- Channel logo focus → select → more-info opens with the **currently-playing** variant, not the future variant
- More-info opened over a row that was mid-scrub: closing the panel returns row to its current focus position OR resets to now (PRD must specify which; test enforces)
- Top nav focus when arriving from up-arrow: lands on "Live" pill, not "For You"
- Nav from For You → Live → For You: round trip preserves nothing (each entry is fresh state)
- Debug panel changes to genre order: reflected on next EPG load without errors
- 30 rows × 8 genres render without frame drops
- Every analytics event fires exactly once per trigger (no duplicates from event bubbling)

**Gate:** Test plan written. Proceed to Stage 5.

---

## Stage 5 — Build

Read `docs/epg/CC-BRIEF.md` and follow the build order in it. Build rules specific to this feature:

**Architecture rules:**
- EPG is a self-contained screen module. New files live under `js/screens/epg/` and `css/screens/epg/` (or match the existing screen-folder convention if different — verify against the For You lander structure first).
- Mock data lives in `data/epg-mock.json`. Loaded at screen init.
- Genre/channel/program data model must support a channel ID appearing in multiple genre arrays without duplication of the underlying channel record.
- Each rendered row instance has its own focus/scroll state keyed by `${channelId}:${genreId}` so stacked instances are independent.

**Component rules:**
- Channel logo column is **fixed** — does not scroll horizontally with the row. Only the program tile area scrubs.
- Program tiles are fixed-width regardless of program duration.
- Currently-playing tile renders a remaining-time string; future tiles render a scheduled window string. Single tile component, two render modes.
- Favorite heart under channel logo renders as **static decoration only**. No click handler. No toggle.
- More-info panel is an overlay layer over a dimmed EPG, not a route change. Back/Escape closes it.
- Return-to-now animation: ~250ms ease-out. Use CSS transitions on transform, not JS scroll loops.
- Genre rail anchor reaction: debounce to ~50ms so fast row scrolling doesn't thrash the rail.

**Analytics rules:**
- Wire analytics into each component AS IT IS BUILT, not as a final pass.
- Use the existing event bus from prior screens. Do not invent a new one.
- Every event includes `participant_code` and `session_id` from the existing session module.

**Initial focus on screen entry:** First channel row, currently-playing tile (leftmost focusable program tile in the first rendered row).

**HARD STOPS — do not build any of these even if mockups suggest them:**
- ❌ Picture-in-Picture player (any rendering, focus state, interaction, or transition). The PiP element in mockups is a design reference only and must not appear in the build.
- ❌ Player playback. Selecting a channel or "Watch Live"/"Watch Channel" CTA must be a no-op that fires an analytics event only.
- ❌ Favoriting interaction. The heart icon is decorative.
- ❌ Authentication, sign-in, account state.
- ❌ Any persistence of user state (no localStorage, no cookies, no session storage for user data).
- ❌ Channel icon upload or any feature requiring file storage.
- ❌ Wiring up Search, Movies, Shows, Bookmarks, Settings, or Location pill in the top nav. Only For You ↔ Live navigation is live in this build.
- ❌ Past programs. There is no leftward navigation past "now."
- ❌ Now-line indicator.
- ❌ Local Now branding of any kind. Use IP-free placeholder logos and channel names.

**Build order:** See `CC-BRIEF.md` § "Build order." Follow it sequentially.

**Gate:** Build complete and self-verified locally. Proceed to Stage 6.

---

## Stage 6 — Testing

Walk the test plan from Stage 4. For each AC, mark pass/fail with notes. Output `docs/epg/TEST-RESULTS.md`.

If any AC fails, do not proceed. Surface failures and go to Stage 7.

---

## Stage 7 — Bug fix

Fix only items that failed in Stage 6. No scope creep. After fixes, re-run the failed tests only. Update `TEST-RESULTS.md`.

**Gate:** All ACs pass. Proceed to Stage 8.

---

## Stage 8 — Commit & push

- Commit message format: `feat(epg): <summary>` for feature commits, `fix(epg): <summary>` for fix commits, `docs(epg): <summary>` for doc-only commits.
- Push to `epg-initial` on `chesteria/UTA`. Never push to `main`.
- Do not open a PR. The user handles merge decisions.

---

## Stage 9 — Artifact organization

Verify everything under `docs/epg/`:
- `EPG_INTAKE_V1.md` (already present)
- `CC-BRIEF.md`
- `ORCHESTRATE.md` (this file)
- `PRD.md` (v2)
- `PRD-REVIEW.md`
- `TEST-PLAN.md`
- `TEST-RESULTS.md`

---

## Stage 10 — Handoff & retroactive platform doc updates

Update the following platform-level docs to reflect the new feature. Each update is a separate commit on `epg-initial`:

- `docs/COMPONENT_MAP.md` — add EPG components
- `docs/ANALYTICS_REGISTRY.md` — add EPG events
- `docs/SCREEN_INVENTORY.md` — add Live/EPG screen
- `docs/NAVIGATION_MAP.md` — add For You ↔ Live transitions and intra-EPG focus map
- `docs/DEPENDENCY_GRAPH.md` — add EPG module and its debug.html dependency
- `docs/KNOWN_ISSUES.md` — log anything deferred or quirky discovered during build
- `CHANGELOG.md` — entry for the EPG feature on `epg-initial`

Final handoff message in chat: branch name, commit hashes, test pass summary, list of known issues, and any open questions for the user.

---

*Workflow version: 1.0 — generated for EPG feature build*
