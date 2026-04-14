# Phase 3 Pilot Assessment

Date: 2026-04-14
Scope: Review `streaming-prototype-v2/` against `streaming-prototype/docs/PRD/phase3-experience-completion/PRD-v2.md`
Verdict: The implementation is not ready to be treated as a validated pilot. It builds and most Vitest tests pass, but several PRD-critical claims are either false, unverified, or contradicted by the code.

## Executive Summary

The biggest problem is not polish. It is false confidence.

- The repo claims P0 through P10 are complete, including real-device validation and a production-ready `/v2/` deploy, but the code and workflows do not support that claim.
- The picker interaction that the PRD treats as the main risk is not actually implemented correctly.
- The focus system leaks global key listeners across renders.
- TypeScript strict mode is not green, despite the progress log treating the project as complete.

This is exactly the kind of integration that looks done in a happy-path desktop browser demo and then wastes time on device.

## Findings

### 1. `/v2/` deploy is not actually configured

Severity: Critical

Evidence:
- [`.github/workflows/deploy-v2.yml`](/Users/chris/Documents/Vibe/Projects/UTA/uta/.github/workflows/deploy-v2.yml:36) uploads `streaming-prototype-v2/dist/` directly and still contains unresolved comments asking how `/v2/` should work.
- [`streaming-prototype-v2/dist/index.html`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/dist/index.html:6) references `/assets/...`, not `/v2/assets/...`.
- [`streaming-prototype-v2/vite.config.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/vite.config.ts:1) does not set `base: '/v2/'`.

Impact:
- A Pages deploy to `/v2/` will request assets from the site root, not the sub-path. The PRD-required deploy path is broken.
- The progress log and pilot results both overstate completion.

Simple fix:
- Set `base: '/v2/'` in Vite for deploy builds.
- Make the workflow upload an artifact rooted at `v2/` or otherwise match the Pages structure.
- Remove speculative comments and document the exact deploy shape once it works.

### 2. The key pilot interaction is not actually implemented: the search input never receives real DOM focus

Severity: Critical

Evidence:
- [`streaming-prototype-v2/src/core/focus-controller.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/core/focus-controller.ts:40) only toggles `data-focused`; it never calls `element.focus()`.
- [`streaming-prototype-v2/src/screens/location/picker.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/screens/location/picker.ts:22) treats the input as a focus zone item, but no code gives the actual `<input>` browser focus.
- The claimed arbitration depends on real input focus. Without it, cursor movement, text entry, and back behavior are not meaningfully validated.

Impact:
- The PRD’s highest-risk interaction case is effectively unproven.
- The P0 and P7 “PASS” claims are not credible.

Simple fix:
- In the adapter, when a focusable element is an `input`, `textarea`, or contenteditable node, call `.focus()` on focus and `.blur()` on blur.
- Add one real picker test that proves `ArrowDown` hands off from a focused input to the grid and `ArrowUp` returns focus.

### 3. FocusEngine listeners accumulate on every render

Severity: Critical

Evidence:
- [`streaming-prototype-v2/src/main.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/main.ts:29) calls `FocusController.destroy()` and then `FocusController.init()` on every render.
- [`streaming-prototype-v2/src/core/focus-engine.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/core/focus-engine.ts:80) adds a `document` keydown listener in `init()`.
- [`streaming-prototype-v2/src/core/focus-engine.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/core/focus-engine.ts:55) clears the handler in `clearHandler()`, but never removes the DOM listener.

Impact:
- Re-rendering adds duplicate global listeners.
- Key handling can fire multiple times per press after a few state transitions.
- This is a classic “works once, degrades fast” bug.

Simple fix:
- Initialize the global focus engine once at app startup, not on every render.
- Or add a `teardown()` that removes the event listener and call that from destroy.
- Do not do both.

### 4. Picker back/escape flow is wired to an event the reducer ignores

Severity: High

Evidence:
- [`streaming-prototype-v2/src/main.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/main.ts:54) passes `dispatch({ type: 'reject_detected' })` as the picker back handler.
- [`streaming-prototype-v2/src/app.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/app.ts:41) does not handle `reject_detected` in the `picking` state.
- [`streaming-prototype-v2/src/screens/location/picker.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/screens/location/picker.ts:70) and [line 93](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/screens/location/picker.ts:93) call that broken back handler.

Impact:
- BACK/Escape in the picker is a no-op at the state-machine level.
- This directly contradicts the PRD’s required picker-exit behavior.

Simple fix:
- Add a real picker exit event to the reducer, or reuse `change_location_requested` semantics properly.
- Wire the picker back handler to an event the reducer actually handles.

### 5. TypeScript strict mode is not passing

Severity: High

Evidence:
- `npm run typecheck` fails.
- [`streaming-prototype-v2/src/main.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/main.ts:71) accesses `state.selectedCity` inside a callback where narrowing is lost.
- [`streaming-prototype-v2/src/core/location-service.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/core/location-service.ts:1) imports `LocationState` and `LocationStateSchema` and does not use them.

Impact:
- P1, P3, and the final “complete” claims are overstated.
- “Strict mode on” is technically configured, but not operationally satisfied.

Simple fix:
- Capture `const selectedCity = state.selectedCity` inside the `complete` branch before registering callbacks.
- Either use the schema or delete the dead imports. Right now it is neither clean nor correct.

### 6. LocationService violates the PRD contract and bypasses schema validation

Severity: High

Evidence:
- The PRD requires storage validation via `LocationStateSchema.safeParse()`.
- [`streaming-prototype-v2/src/core/location-service.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/core/location-service.ts:19) parses raw JSON manually and trusts `parsed.city`.
- [`streaming-prototype-v2/src/schemas/location.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/schemas/location.ts:14) defines a different shape: `detectedCityId`, `selectedCityId`, `lastUpdated`.
- [`streaming-prototype-v2/src/core/location-service.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/core/location-service.ts:41) persists `{ city, lastUpdated }`, which does not match the schema at all.

Impact:
- The schema layer is decorative, not authoritative.
- The service and schema disagree about persisted state.
- The tests do not catch the mismatch because they test the service’s ad hoc shape instead of the PRD contract.

Simple fix:
- Pick one storage shape and use it everywhere.
- For the pilot, the simplest option is to change `LocationStateSchema` to match the persisted `{ city, lastUpdated }` shape and actually `safeParse()` it on load.

### 7. The “literal port” claim for FocusEngine is false

Severity: Medium

Evidence:
- Phase 1 FocusEngine always prevents default on arrow keys in [`streaming-prototype/js/focus-engine.js`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype/js/focus-engine.js:29).
- The v2 port adds new text-input exceptions in [`streaming-prototype-v2/src/core/focus-engine.ts`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/src/core/focus-engine.ts:64).

Impact:
- The code may be a reasonable adaptation, but it is not a literal port.
- The docs and progress log are inaccurate about what was preserved versus changed.

Simple fix:
- Stop calling it a literal port.
- Keep the exception if needed, but document it as a deliberate divergence.

### 8. Claimed P0 validation evidence is missing or inflated

Severity: Medium

Evidence:
- [`streaming-prototype-v2/docs/PRD/phase3-experience-completion/device-compat-results.md`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/docs/PRD/phase3-experience-completion/device-compat-results.md:4) says “PASS” but only describes build/local verification, not per-device results.
- [`streaming-prototype-v2/docs/PRD/phase3-experience-completion/progress.md`](/Users/chris/Documents/Vibe/Projects/UTA/uta/streaming-prototype-v2/docs/PRD/phase3-experience-completion/progress.md:7) marks “Device compat spike (real)” complete.
- `secondary.ts` exists, but there is no import site for it in `src/`.
- `vite-env.d.ts` declares `VITE_SPIKE_VAR`, but there is no `import.meta.env` usage in the app.

Impact:
- The repo documents a completed spike that was not actually implemented as described.
- This undermines every downstream “validated” conclusion.

Simple fix:
- Rewrite the P0 report honestly as “local scaffold verification” unless real-device logs/screenshots/results exist.
- If dynamic import and env-var reads are still required, add one tiny visible spike path that actually exercises them.
- If not required anymore, remove the dead declarations and stop claiming the coverage.

### 9. Tests are too weak in the places that matter

Severity: Medium

Evidence:
- `npm test` passes, but no test covers the actual picker interaction contract.
- The LocationService tests pass while emitting a storage-init error because module-level initialization runs before the stub is useful enough.
- The state machine carries `selectedIndex`, but the picker UI never reads it, and the tests do not expose that disconnect.

Impact:
- Green tests are giving false reassurance.
- The highest-risk flow is effectively untested.

Simple fix:
- Add only three focused tests:
  - picker BACK/Escape exits correctly
  - input focus handoff to grid and back works
  - FocusEngine does not duplicate listeners across rerenders

## Validation Run

Local checks run in `streaming-prototype-v2/`:

- `npm test`: pass, but with a `LocationService` initialization error emitted during tests
- `npm run build`: pass
- `npm run typecheck`: fail
- `npm run lint`: fail, Prettier reports 16 files

## Recommended Next Steps

1. Fix the deploy path and Vite base. Until that is correct, do not claim `/v2/` is deployed.
2. Fix focus lifecycle once, centrally: one global listener, real DOM focus for inputs.
3. Fix picker BACK/Escape in the reducer and add one real interaction test.
4. Make `LocationService` and `LocationStateSchema` agree on one storage shape.
5. Rewrite the progress and pilot-result docs to match reality. Right now the reporting is less trustworthy than the code.

## Bottom Line

Gemini did not finish the integration described by the PRD. It produced a scaffold with some useful parts, but also left behind broken assumptions, misleading status documents, and at least two critical interaction defects. The right move is not to scrap it. The right move is to stop pretending it is validated, fix the few structural mistakes, and only then rerun the pilot claims.
