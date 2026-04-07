# PRD Update Plan — v1.4 → v1.5
**Date:** 2026-04-07  
**Branch:** `prd-v1.5-update`  
**Status:** In progress — use this as restart point if session ends

---

## What's being done

Splitting the single master PRD into three standalone phase PRDs, and updating the Phase 1 doc to reflect what's actually been built (not what was originally planned).

---

## Files being created / modified

| File | Action | Status |
|------|--------|--------|
| `docs/archive/streaming-prototype-prd-v1.4-original.md` | Created (backup) | ✅ Done |
| `docs/prd-update-plan.md` | This file | ✅ Done |
| `docs/streaming-prototype-phase1-prd.md` | Update in place → v1.5 | ⏳ Todo |
| `docs/streaming-prototype-phase2-prd.md` | New file, extracted from master | ⏳ Todo |
| `docs/streaming-prototype-phase3-prd.md` | New file, extracted from master | ⏳ Todo |
| `docs/prd-update-summary.md` | New — change log v1.4→v1.5 | ⏳ Todo |

---

## Discovery findings: what changed since v1.4 was written

### MAJOR DIVERGENCES — Must be corrected in v1.5

**1. HLS video playback is real, not simulated**
- PRD §8 says "No real video playback (simulated timer + static image)"
- Reality: HLS.js integrated, real `.m3u8` stream plays on Chromium; native fallback for Safari/WebKit
- PRD §6.1 should be rewritten to reflect real playback; simulated fallback still exists for no-video cases
- Out-of-scope list (§8) must remove the "No real video" bullet

**2. `components/` folder doesn't exist**
- PRD §2 file structure shows `js/components/` with `rail.js`, `tile.js`, `badge.js`, `progress-bar.js`, `button.js`, `modal.js`
- Reality: no components folder at all; all logic is self-contained within each screen file
- File structure in PRD must be updated to match actual disk layout

**3. `animations.js` doesn't exist**
- PRD §2 shows `js/utils/animations.js`
- Reality: only `js/utils/keycodes.js` exists in utils/

**4. `user-state.json` listed twice incorrectly in file structure**
- PRD shows it under `js/` (wrong) AND `data/` (correct)
- File exists at `data/user-state.json` but is not loaded (deferred to Auth phase)
- File structure should show it only under `data/` with a DEFERRED note

**5. Hero tile dimensions changed**
- PRD §2 constants: `HERO_TILE_WIDTH_FOCUSED = 920`, `HERO_TILE_HEIGHT = 550`
- Reality (v1.4 r2): `828 × 493px`

**6. `PLAYPAUSE` key mapping added**
- PRD keycodes table (§7) doesn't include `PLAYPAUSE`
- Reality: `PLAYPAUSE: ['MediaPlayPause', 'XF86PlayPause', 'MediaPlay', 'MediaPause']` added for Vizio

**7. Nav right section shows detected city, not "Location, ST"**
- PRD §4.1: "Location pin icon + 'Location, ST' text"
- Reality: `DataStore.getDetectedCity().name` (e.g., "Atlanta, GA")

**8. Nav bar: no bookmark icon tab**
- PRD §4.1 (implicit) — v1.4 removed the Bookmark tab; nav is now: Search, For You, Live, Movies, Shows, Settings

**9. Debug panel triple-LEFT restricted to nav bar**
- PRD §12.1: "press Left three times rapidly from the nav bar" — this is now enforced by a `.nav-tab.nav-focused` guard
- Was a bug (fired from anywhere), now matches the PRD intent

**10. Series data fully populated**
- PRD §2 file structure shows only `show-001.json`
- Reality: all 20 shows have series data files (`show-001.json` through `show-020.json`)

**11. Marketing banner CTA text changed**
- PRD §4.2.G: "Browse Collection →"
- Reality: "Start Now" (changed in v1.4 r3)

**12. Local cities rail has a title in the config**
- PRD §4.2 and lander-config.json example: no `title` field on local-cities rail
- Reality: `"title": "Locations Near Me"` was added to the config in v1.4 r3

**13. City tile shows `weatherBlurb`, not `tags.join(' · ')`**
- PRD §4.2.A: "category tags (News · Weather · Community)"
- Reality: `city.weatherBlurb` field (e.g., "Mostly sunny") shown instead; `weatherBlurb` added to catalog.json city objects

**14. City tile has frosted-glass backplate**
- PRD doesn't describe this
- Reality: `rgba(15,25,35,0.72)` + `backdrop-filter:blur` backplate behind city name/temp for legibility

**15. Screamer tiles are inside the banner, not below it**
- PRD §4.2.D: "portrait tiles appear within or just below the screamer background"
- Reality: tiles are absolutely positioned inside the banner's right side with a CSS mask gradient blend

**16. Player episodes rail: three-state system**
- PRD §6.3: "Visible below the transport controls"
- Reality: three-state: fully hidden (default) → `.peek` (60px visible at bottom while controls shown) → `.expanded` (slides up when DOWN pressed from buttons zone)

**17. Player info modal: "Go to Series Page" is a pill button**
- PRD §6.4: "→ Go to Series Page (pill button)" — matches now, but was a plain text link before v1.4

**18. Screen state save/restore pattern**
- Not in PRD — `onBlur()` saves scroll/focus/zone state to `container._savedXxx`; `init()` restores it
- Enables correct BACK navigation to restore exact position

**19. `destroy()` called correctly on BACK**
- PRD §2 documents `destroy()` in screen registration pattern
- Reality: was never called until H1 fix; now called when `replace === true` in `navigate()`

**20. Build stamp added to every screen**
- `#build-stamp` div fixed bottom-right, shows `v1.4 · 20260406-03`
- Not in PRD

**21. Ken Burns toggle exists in debug panel but is a no-op**
- PRD §12.1.C: "Ken Burns Effect (subtle hero zoom)" toggle
- Reality: never implemented in CSS/JS; toggle present but has no effect

**22. `_startCityTimers()` removed**
- Was an empty stub; removed; `onFocus()` now calls `_restartAllLivingTiles()` directly

**23. Rail IDs sanitized**
- `id="std-rail-${config.title.replace(/\s+/g, '-').toLowerCase()}"` — valid HTML IDs

**24. `_fromLander` params removed**
- Dead weight removed from `navigate()` calls

**25. `debug-defaults.json` exists in `data/`**
- PRD §12.3 lists this. ✓ Implemented.

**26. Section references in Phase 2/3 prompts point to old file**
- PRD §Phase 2 and §Phase 3 have "Read Phase X section of the PRD at `docs/streaming-prototype-phase1-prd.md`"
- After split, these should point to the new separate files

---

## What stays the same (no corrections needed)

- Brand colors (§1) ✓
- Font stack ✓
- `catalog.json` structure ✓
- `geo-state.json` structure ✓
- `lander-config.json` structure (content updated, structure unchanged) ✓
- Focus engine rules (§7) ✓ — no wrapping, scroll behavior, memory ✓
- Series PDP zones and navigation ✓
- Player controls layout ✓
- Debug panel sections A-E ✓
- `debug.html` companion page ✓
- Export/import ✓
- All "Deferred to Auth Phase" items (§15) ✓
- Technical constraints: vanilla JS, no frameworks ✓
- Hosting: GitHub Pages ✓
- Phase 2 and Phase 3 content — extracted unchanged

---

## Split plan

### Phase 1 PRD (update in place, bump to v1.5)
Contains: §1–§12 + §14–§16
Remove: Phase 2 section, Phase 3 section
Add: intro linking to Phase 2 and 3 standalone docs
Update: all 26 divergences above

### Phase 2 PRD (new file, v1.0)
Extract §Phase 2 (Analytics/Insight Engine) verbatim
Add: brief intro, links to Phase 1 and Phase 3 docs
Update: "Read Phase 2 section at docs/streaming-prototype-phase1-prd.md" → new file path

### Phase 3 PRD (new file, v1.0)
Extract §13 (Phase 3: Scenario Presets & Device Simulation) verbatim
Add: brief intro, links to Phase 1 and Phase 2 docs
Update: "Read Phase 3 of the PRD at docs/streaming-prototype-phase1-prd.md" → new file path

---

## Order of operations

1. ✅ Archive original PRD
2. ✅ Write this plan
3. ⏳ Write Phase 2 PRD (new file)
4. ⏳ Write Phase 3 PRD (new file)
5. ⏳ Update Phase 1 PRD in place → v1.5
6. ⏳ Write prd-update-summary.md
7. ⏳ Commit all three PRDs
8. ⏳ Push

---

## Restart instructions (if session ends before completion)

1. Read this file first to understand what's done and what isn't
2. Check the Status column above
3. Read `docs/archive/streaming-prototype-prd-v1.4-original.md` for the source material
4. Read `docs/change-log.md` for all implementation changes since v1.4
5. The discovery findings above are comprehensive — no need to re-read all the code
6. Resume from the first ⏳ item in the order of operations
