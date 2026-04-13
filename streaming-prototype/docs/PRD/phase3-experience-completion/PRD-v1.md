# PRD: Phase 3 — Experience Completion (Greenfield Toolchain Pilot)

**Feature slug:** `phase3-experience-completion`
**Version:** 1.0
**Type:** New feature phase + greenfield toolchain pilot
**Parent phase:** Phase 3 (redefined — supersedes the old Phase 3 PRD)
**Estimated build time for pilot slice:** 10–15 sessions
**Created:** 2026-04-13
**Status:** Draft — planning phase

---

## 1. Context

Phase 3 has been **redefined**. The original Phase 3 (`docs/PRD/phase3-scenarios-and-simulation-v1.0.md`) was internal tooling for testing — scenario presets and device simulation for stakeholder demos. That PRD is superseded by this one and should be marked as such.

The new Phase 3 is **user-facing completion**: filling in the missing pieces of the prototype so it feels like a real streaming app during user research sessions. Target features:

- **Location detection & selection** — simulated geo detection, "is this you?" confirmation, manual city picker, change-location flow
- **Search** — simulated results, typeahead, filters
- **Auth flows** — login, signup, forgot password (all mocked, no real backend)
- **Any additional "seam" screens** needed to make the simulated experience feel complete

This phase is **also being used as a greenfield toolchain pilot** for Vite + TypeScript + Tailwind. Rather than migrating the existing ~14K LOC of Phase 1 vanilla JS into the new stack (the approach proposed in `docs/PRD/vite-ts-tailwind-migration/PRD-v1.md`, which was rejected after adversarial review), Phase 3 is built greenfield in the new stack from day one. Phase 1 stays untouched at v1.7.x.

The logic is: if a real user-facing Phase 3 feature ships successfully on real TV hardware using Vite + TS + Tailwind, the toolchain is validated on evidence, not speculation. A later decision about retroactively migrating Phase 1 can then be made with data instead of faith.

This is **Strategy A** from the adversarial review of the migration PRD: greenfield new work in new stack, old work frozen, explicit decision gate after the pilot.

---

## 2. Goals

- Ship the first Phase 3 feature (**Location Detection & Selection** — see Section 5) as a greenfield Vite + TS + Tailwind deliverable running on target TV hardware.
- Validate the new toolchain on real user-facing work, not a hello-world spike.
- Keep Phase 1 **entirely untouched** — no coupling, no shared runtime state during the pilot.
- Establish a clear **decision gate** after the pilot: continue Phase 3 in new stack? Retroactively migrate Phase 1? Abandon and revert?
- Preserve `FocusEngine` semantics (port literally from Phase 1 — this is the only piece of Phase 1 code that crosses into the pilot).

---

## 3. Non-Goals (for pilot)

- **Device support is governed by `docs/SUPPORTED_DEVICES.md`,** not by ad-hoc decisions in this PRD. Summary: Tizen 5.5+ (2020+ Samsung), VIZIO 2019+, AndroidTV/Google TV/Shield (current), FireTV via Capacitor wrapper (Fire OS 6+). Roku and tvOS are explicitly **out of scope** for this codebase — they are tracked as future parallel implementations in separate projects (BrightScript/SceneGraph for Roku, SwiftUI for tvOS), not as additional targets for the same build. Mobile is a deferred future phase.
- No retroactive migration of Phase 1 files.
- No shared runtime state between Phase 1 and the pilot. They run as separate pages/sites.
- No Phase 1 catalog integration. The pilot uses a standalone hardcoded city list.
- No real Firebase Analytics integration in the pilot. Events log to the dev console; Firebase wiring is deferred until the decision gate.
- No framework decision pre-spike. Lit and vanilla TS are both evaluated in Chunk P0.
- No Tailwind v3-vs-v4 decision pre-spike. Both candidates are tested for `color-mix()` support on old WebViews in Chunk P0.

---

## 4. Strategy & File Layout

The greenfield app lives alongside the current prototype as a sibling folder in the same repo:

```
repo-root/
├── streaming-prototype/         # Phase 1, untouched, vanilla JS
│   └── ... (current app, frozen at v1.7.x for the pilot duration)
└── streaming-prototype-v2/      # Phase 3, greenfield Vite + TS + Tailwind
    ├── index.html
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.ts (or @theme in global.css if v4)
    ├── package.json
    ├── src/
    │   ├── main.ts
    │   ├── core/
    │   │   ├── focus-engine.ts       # Literal port from Phase 1
    │   │   └── location-service.ts   # Shared module for selected city
    │   ├── types/
    │   ├── screens/
    │   │   └── location/
    │   │       ├── detection.ts      # "Detecting your location..." screen
    │   │       ├── confirmation.ts   # "Is this you?" overlay
    │   │       └── picker.ts         # Manual city picker grid
    │   ├── data/
    │   │   └── cities.json           # Standalone city list for pilot
    │   └── styles/
    └── tests/
```

**Same repo, sibling folder.** Not a separate repo — keeps one source of truth for PRDs, docs, and shared context. Shared `docs/` stays where it is.

**Deployment strategy for the pilot:** decided in Chunk P1. Options are (a) a separate GitHub Pages site via a second workflow, or (b) a sub-path like `/v2/` on the existing site. Either is fine; the decision depends on what's least disruptive to the current deploy.

---

## 5. The Pilot Slice: Location Detection & Selection

### Why this feature first

- **Self-contained.** One detection screen, one confirmation overlay, one picker screen. No cross-feature dependencies.
- **Clear user story.** First launch → simulated detection → confirm or pick another → selection persists.
- **No Phase 1 catalog dependency.** Uses a standalone city list file.
- **Real complexity where it matters.** Grid of city cards with d-pad navigation, search-as-you-type filter, focus state handling — all the things that would need to work in any future Phase 3 screen.
- **Useful on its own.** Even if we decide not to continue Phase 3 in the new stack, a working location-picker is a legitimate deliverable.

### User flow

1. **First launch** — shows "Detecting your location..." with a 2-second loading animation, then picks a random city from the list (simulated detection).
2. **"Is this you?" overlay** — shows the detected city with two buttons: "Yes, that's right" and "Pick a different location".
3. **Manual picker** (opened from the "Pick a different location" button or from a later settings-stub button) — grid of city cards, search-as-you-type filter field at the top, d-pad navigation between field and grid. Selecting a card commits the selection.
4. **Persistence** — selected city stored in `localStorage`, read back on subsequent launches (skips detection if already set).
5. **Change location** — a stub settings button in the corner re-opens the picker. Real settings UI is out of scope for the pilot.

### Out of scope for the pilot

- Real geo IP detection or browser geolocation API.
- Integration with the Phase 1 lander's city-based rails (pilot is a standalone page).
- Multi-language support.
- Location permissions dialogs (we're simulating, not requesting).
- Any of the other Phase 3 features (search, auth) — those are separate PRDs that come after the pilot validates.

---

## 6. Chunk Plan for the Pilot

Each chunk is a single squash-merged PR. Sizing is explicit; the total band (10–15 sessions) is deliberately honest about uncertainty — no best-case anchoring.

### Chunk P0 — Device Compatibility Spike (Real)

*Not* a hello world. This spike exercises the toolchain features that could realistically break on the target TV WebViews, so we learn the truth before writing real code.

**Test devices** (per `docs/SUPPORTED_DEVICES.md`):
- **Tizen 5.5 device** (2020+ Samsung) — the binding constraint, Chromium 69 baseline
- **2019 VIZIO V505-G9** (developer mode) — second-oldest target
- **NVIDIA Shield or Google TV Streamer** — modern-Chromium sanity check
- **FireTV (Fire OS 6+) via a quick Capacitor wrap** — only as a P0 stretch goal; FireTV is a separate deployment path with APK build/sideload friction, and can be deferred to a dedicated chunk if P0 is running long

The 2018 Tizen 4.0 device is **explicitly out of support** for Phase 3 (see `docs/SUPPORTED_DEVICES.md` and the deprecation entry in `docs/CHANGELOG.md`).

**The spike is a single page that includes:**
- Vite bundled output with `build.target: 'es2017'` (conservative default; Tizen 5.5 supports more, but no reason to push it)
- An `import.meta.env.VITE_*` read
- A dynamic `import()` of a secondary chunk (lazy loading)
- A stub `hls.js` import at module level (just the side effects of the import — no actual playback)
- A Tailwind-generated class that uses a CSS custom property
- One `BroadcastChannel` instantiation and message round-trip
- One focusable button that changes styling on focus via `FocusEngine`-style class toggling

**Test priority (informed by device research):**

1. **First and most important:** Plain Vite + TS scaffold + Tailwind v3 on the Tizen 5.5 device. Verify dynamic `import()`, `import.meta.env`, modulepreload, BroadcastChannel, and the stub HLS.js import all work. This is the toolchain validation that gates everything else.
2. **Second:** Same build on the 2019 VIZIO. Should be a formality given VIZIO's Chromium base, but confirm — VIZIO has historically had quirks with focus events that are worth catching early.
3. **Third:** Same build on the AndroidTV/Shield/Google TV Streamer. The "modern WebView sanity check" — if it fails here, something is wrong with the build itself, not with old-device compatibility.
4. **Fourth (stretch goal):** Wrap the same build with Capacitor for FireTV, sideload, verify. If P0 is running long, defer to a dedicated FireTV deploy chunk later — the Phase 3 hosted build can ship without FireTV initially.
5. **Fifth (optional, low priority):** Tailwind v4 variant. **Pre-spike prediction: fails on all devices because v4's default palette emits `color-mix()`, which needs Chromium 111+ and none of the target devices have it.** If you want to confirm the prediction, build the variant and watch it fail. If you trust it, skip and pick v3.
6. **Sixth (optional, bonus information):** Lit variant on top of the working Tailwind v3 base. If it works on Tizen 5.5, Lit becomes a viable option for screens with significant reactive UI.

**Deliverable:** `docs/PRD/phase3-experience-completion/device-compat-results.md` with a pass/fail matrix — one row per toolchain feature × device.

**Go/no-go decision rule:**
- If **the Tizen 5.5 + vanilla TS + Tailwind v3 baseline** fails any core feature → pilot is paused and the failure is investigated. This would be a surprise given Tizen 5.5's Chromium 69 base, but it's the gate.
- If the baseline works → that's the stack for the pilot. Document and proceed to P1.

**Estimate:** 1 session for Tizen + VIZIO + Shield/Google TV. Add 0.5–1 session if you also want to validate the FireTV Capacitor wrap in P0; otherwise defer to a later FireTV deploy chunk.

---

### Chunk P1 — Scaffold + CI Gate

- `streaming-prototype-v2/` initialized via `npm create vite@latest`
- TypeScript strict mode **on** (greenfield scope is small enough to justify the stricter bar)
- Tailwind (v3 or v4 per P0)
- Framework (Lit or none, per P0)
- Vitest + `@testing-library/dom` + jsdom
- Prettier
- `.nvmrc` pinning Node 20 LTS
- Decide: source maps in production build? Recommendation: on for the pilot (debuggability wins; privacy cost low for a prototype). Document the decision.
- Decide: same GitHub Pages site (sub-path) or new site? Document and wire up.
- `.github/workflows/ci-v2.yml` — runs `npm ci && npm run build && npm test` on every PR touching `streaming-prototype-v2/`. PRs failing cannot merge.

**Acceptance:** empty shell runs locally via `npm run dev`, `npm run build` produces a `dist/`, smoke test passes under Vitest, CI gate blocks merges on failure, existing Phase 1 deploy is completely unaffected.

**Estimate:** 1–2 sessions.

---

### Chunk P2 — Core Types + Zod Schemas for Location Data

- `src/types/location.ts` — `City` (id, displayName, region, state, coordinates), `LocationState` (detectedCityId, selectedCityId, lastUpdated)
- `src/schemas/location.ts` — zod schemas for the above
- `src/data/cities.json` — standalone city list for the pilot (15–25 cities is enough; they do not need to match Phase 1's cities)
- Type-satisfaction test using `satisfies` against `cities.json`

**Note:** if the `jsdoc-typecheck-hedge` PRD landed first, the zod/typing conventions are already familiar. This chunk builds on that muscle.

**Acceptance:** types compile under strict mode, schemas validate `cities.json`, test passes.

**Estimate:** 1 session.

---

### Chunk P3 — Focus Engine Port

- `src/core/focus-engine.ts` — **literal port** of `streaming-prototype/js/focus-engine.js` to TypeScript.
- Strong typing for `FocusZone`, `KeyAction`, handler signatures.
- Unit tests covering: zero/one/many items, edge navigation with and without wraparound, out-of-bounds focus, `setItems` shrink, global handler swap, key event mapping.
- **Honest note on reverting:** if this chunk is reverted, every downstream pilot chunk that imports it also reverts. There is no magic here; `git revert` is a command, not a dependency solver. This is called out per the adversarial review's correction to "independently revertable" claims.

**Acceptance:** 100% branch coverage on the new `focus-engine.ts`. Behavioral parity with Phase 1's focus engine verified via a shared test fixture (the same input sequence should produce the same focus state).

**Estimate:** 1–2 sessions.

---

### Chunk P4 — Design Tokens + Global Styles

- Port the tokens from `streaming-prototype/css/variables.css`:
  - If Tailwind v3: into `tailwind.config.ts` theme extension
  - If Tailwind v4: directly as `@theme` block in `src/styles/global.css`
- Install Roboto via `@fontsource/roboto` (no Google Fonts `<link>`)
- A tokens preview page showing swatches, type samples, tile sizes
- Visual comparison against the current Phase 1 build — the pilot should feel like the same app

**Acceptance:** tokens preview matches Phase 1's visual identity. Colors, fonts, and spacing all read as "same app."

**Estimate:** 1 session.

---

### Chunk P5 — Detection + Confirmation Screens

- `src/screens/location/detection.ts` — "Detecting your location..." loading state with 2-second delay + simulated pick from `cities.json`
- `src/screens/location/confirmation.ts` — "Is this you?" overlay with two focusable buttons ("Yes" / "Pick a different location")
- Focus engine integration for the two-button zone
- First per-screen parity check against a mockup
- **Second on-device render test** — deploy to preview URL, verify it runs on the oldest target device

**Acceptance:** real device render, simulated detection completes, overlay appears with correct focus state, "Yes" button commits selection to `localStorage`, "Pick different" button navigates to picker (which doesn't exist yet — stub an empty screen).

**Estimate:** 2 sessions.

---

### Chunk P6 — Manual City Picker

- `src/screens/location/picker.ts` — grid of city cards
- Search-as-you-type filter field using a vanilla `input` element + simple string match (no external fuzzy-search dep)
- D-pad navigation: up/down moves between search field and grid; arrow keys within grid
- Selection commits the choice and persists via `localStorage`
- Per-screen parity check

**Acceptance:** search filters the grid in real time, focus moves cleanly between field and grid, selection persists across reload, on-device render works.

**Estimate:** 2 sessions.

---

### Chunk P7 — LocationService Shared Module

- `src/core/location-service.ts`
- Exports `getSelectedLocation()`, `setSelectedLocation(city)`, `subscribeToLocationChanges(handler)`
- Internal state lives in module scope; `localStorage` is the persistence layer
- Unit tests for the state machine and subscriber fan-out
- Any future Phase 3 screen (search, auth, etc.) imports this instead of reaching into `localStorage` directly

**Acceptance:** module is importable, unit tests pass, all three pilot screens use it consistently.

**Estimate:** 1 session.

---

### Chunk P8 — Analytics Stub

- Typed event definitions for pilot events (`location_detection_started`, `location_detection_completed`, `location_manually_selected`, `location_changed`)
- All events namespaced with a `v2_` prefix to prevent crosstalk with Phase 1 events if/when real Firebase integration happens later
- Events log to `console.log` in dev; Firebase wiring deferred
- `BroadcastChannel('proto_analytics_v2')` for future reporting crosstab (separate channel name from Phase 1's `proto_analytics`)

**Acceptance:** navigating through the pilot fires structured events visible in the dev console. No Firebase integration yet — deferred until decision gate.

**Estimate:** 1 session.

---

### Chunk P9 — Production Deploy + On-Device Final Test

- Deploy `streaming-prototype-v2/dist/` to preview URL via the CI workflow from P1
- **Guided deploy walkthrough** (first real Vite deploy — this is where I walk you through the flow per the earlier commitment):
  1. How Vite env vars flow through GitHub Actions into `dist/`
  2. Inspecting the built output
  3. How to roll back
  4. How to add new secrets later
- Test on the full matrix of target devices available
- Document any deltas or device-specific issues

**Acceptance:** pilot is live on a real URL, tested on real devices, any issues documented.

**Estimate:** 1 session.

---

### Chunk P10 — Decision Gate

Not a code chunk. A **write-up chunk**.

Produce `docs/PRD/phase3-experience-completion/pilot-results.md` containing:

- **Device compatibility matrix** — what worked on what
- **Actual session count vs the 10–15 estimate** — be honest about overruns
- **Development friction notes** — what was faster/slower than Phase 1 vanilla JS
- **Performance observations** — bundle size (gzipped), first-render time on the lowest-end test device, memory footprint if measurable
- **Claude Code assistance quality** — subjective but important: did TS + types actually make Claude Code more helpful, or was it the same?
- **The decision:** one of three outcomes (see Section 7), with written rationale

**Acceptance:** document committed, decision recorded, next steps defined.

**Estimate:** 1 session.

---

### Pilot Total

| Chunk | Name | Sessions |
|---|---|---|
| P0 | Device compat spike (real) | 1 |
| P1 | Scaffold + CI gate | 1–2 |
| P2 | Types + schemas | 1 |
| P3 | Focus engine port | 1–2 |
| P4 | Tokens + global styles | 1 |
| P5 | Detection + confirmation | 2 |
| P6 | Manual picker | 2 |
| P7 | LocationService shared module | 1 |
| P8 | Analytics stub | 1 |
| P9 | Deploy + on-device final test | 1 |
| P10 | Decision gate writeup | 1 |
| **Total** | | **12–15** |

Band stated as 10–15 in the header; bottom-up adds to 12–15. The P0 reduction (1–2 → 1 session) reflects the device research having eliminated some pre-spike uncertainty. If the total ever reaches 20, stop and reassess rather than pushing through.

---

## 7. Decision Outcomes After the Pilot

Three legitimate outcomes:

**A. Pilot ships successfully, new stack validated.**
→ Continue Phase 3 in the new stack. Draft separate PRDs for Search, Auth, and other Phase 3 features. Phase 1 migration becomes an *optional follow-up*, scheduled only if ROI makes sense after Phase 3 is complete.

**B. Pilot ships with recoverable issues.**
→ Document the issues, fix them, decide case-by-case whether each issue justifies stack changes or workarounds. Proceed with caution. May add a `PRD-v1.1` amendment with lessons learned.

**C. Pilot doesn't work on target hardware or uncovers a dealbreaker.**
→ Abandon the new stack. Either build Phase 3 in vanilla JS alongside Phase 1, or pause Phase 3 and revisit later. Cost: ~10–15 sessions, which is recoverable — the key property of this strategy.

All three outcomes are **strictly better** than the failure mode of the rejected migration PRD, which was "discover a toolchain problem after 20+ sessions of committed migration work."

---

## 8. Abandonment Criteria

The pilot is paused or cancelled if any of the following are true:

- P0 (device compat spike) fails on the oldest target device for **both** variants with no clear fix.
- Cumulative session count passes **20** (the 15-session ceiling + a 33% buffer) without reaching P9.
- A feature is discovered in P3–P8 that requires a toolchain feature the target devices don't support, and the workaround invalidates more than one prior chunk.
- Stakeholder pressure for new user-facing features on Phase 1 becomes severe enough that Phase 1 can no longer be frozen.

Abandonment is **not failure** — it's the controlled outcome the strategy was designed to allow.

---

## 9. Risks

1. **P0 doesn't exercise a feature that breaks later.** *Mitigation:* the P0 spec deliberately tests the realistic risk surface (dynamic imports, `import.meta.env`, HLS.js side effects, Tailwind custom properties, BroadcastChannel). If something breaks *later* that P0 didn't test, we add it to P0's spec before the next migration attempt.
2. **HLS.js stub is deceptive.** Importing HLS.js for its side effects isn't the same as actually using it to play video. *Mitigation:* this is a known gap. The pilot doesn't include video playback (location features don't need it). A future Phase 3 chunk that adds video must include its own HLS validation before committing.
3. **Tailwind v4's `color-mix()` fails on old WebViews.** *Mitigation:* explicitly tested in P0's dual-variant spike. If v4 fails, we use v3.
4. **Framework (Lit) registration timing on Tizen.** *Mitigation:* tested in P0.
5. **Cumulative sessions exceed 15.** *Mitigation:* 20-session abandonment criterion in Section 8.
6. **Phase 1 hotfix touches a file that affects pilot-shared behavior.** This risk is low because the pilot is fully independent — the only shared surface is `focus-engine.ts`, which is a literal port rather than a shared file. If a Phase 1 hotfix changes focus engine behavior, it gets ported to the pilot the same day as a new chunk. Written policy, not weekly sweep.
7. **Stakeholder pressure breaks the Phase 1 "frozen" assumption.** This is real and I can't fully mitigate it from a PRD. *Soft mitigation:* the pilot is explicit about being a *new feature* (location detection is something the current app doesn't have), so it can itself be pitched as stakeholder-visible progress during the pilot period.
8. **Source maps on public GitHub Pages expose the source tree.** *Mitigation:* acknowledged. This is a prototype, not a production app; the privacy cost is low and debuggability wins. Decision made explicitly in P1.
9. **Bundle size creeps.** *Mitigation:* set a soft target of 300KB gzipped for the pilot's main bundle. If it exceeds, investigate before P9.

---

## 10. Open Questions

1. ~~**What's the oldest TV device accessible for P0 testing?**~~ **RESOLVED.** The web target matrix is documented in `docs/SUPPORTED_DEVICES.md`. Summary: minimum supported Tizen is **Tizen 5.5** (2020+ Samsung models, Chromium 69 baseline); minimum VIZIO is 2019+; AndroidTV/Google TV/NVIDIA Shield/Google TV Streamer all run current Chromium and are non-constraining; FireTV is supported via a Capacitor wrapper (Fire OS 6+ floor) as a separate deployment workstream. Roku and tvOS are explicitly out of scope for this codebase — they will be parallel implementations in separate projects. The 2018 Tizen 4.0 device is deprecated. The binding constraint for the web build is effectively Tizen 5.5 + FireTV FOS 6, which sit at roughly the same Chromium ~69-70 floor.
2. **Preview deploy target:** sub-path of existing GitHub Pages site, or a new second site? Decide in P1.
3. **Does `streaming-prototype-v2/` share any Phase 1 assets** (fonts, icons, image URLs)? Recommendation: no. The pilot is self-contained, and Phase 4-and-beyond decisions about shared assets happen later.
4. **Should this PRD also plan the Search and Auth features?** Recommendation: no. Each gets its own PRD after the pilot's decision gate. This PRD is scoped to the location pilot only — trying to plan Search/Auth now is exactly the over-planning the migration PRD was rejected for.

---

## 11. Related PRDs

- `docs/PRD/jsdoc-typecheck-hedge/PRD-v1.md` — parallel type-safety hedge for Phase 1. Should land before or during this pilot. Complementary, not a prerequisite.
- `docs/PRD/phase3-scenarios-and-simulation-v1.0.md` — the **old** Phase 3 PRD (scenario presets + device simulation). Now superseded by this document. Mark the old file with a `SUPERSEDED BY: phase3-experience-completion/PRD-v1.md` header.
- `docs/PRD/vite-ts-tailwind-migration/PRD-v1.md` — the rejected full-migration PRD. Kept as a reference for what was considered and why it was rejected.

---

## 12. File Location

```
docs/PRD/phase3-experience-completion/
├── PRD-v1.md                    ← this file
├── device-compat-results.md     ← Chunk P0 deliverable (TBD)
├── pilot-results.md             ← Chunk P10 deliverable (TBD)
└── progress.md                  ← running log (TBD)
```
