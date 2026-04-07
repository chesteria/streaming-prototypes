# PRD Update Summary — v1.4 → v1.5
**Date:** 2026-04-07  
**Original archived at:** `docs/archive/streaming-prototype-prd-v1.4-original.md`

This document lists every change made to the Phase 1 PRD, and describes the three-way split of the original master document.

---

## Structural Changes

### Split into three standalone PRDs

The original single-file master PRD has been split into three files:

| File | Contents | Version |
|------|----------|---------|
| `streaming-prototype-phase1-prd.md` | Phase 1 (Lander, Series PDP, Player) + Phase 1.5 (Debug system) — updated to reflect built reality | **v1.5** |
| `streaming-prototype-phase2-prd.md` | Phase 2: Insight Engine (Analytics, Feedback, Reporting) — extracted unchanged | v1.0 |
| `streaming-prototype-phase3-prd.md` | Phase 3: Scenario Presets & Device Simulation — extracted unchanged | v1.0 |

Each Phase 2 and Phase 3 PRD has a roadmap context table at the top linking back to the other two.

---

## Phase 1 PRD Changes (v1.4 → v1.5)

### Additions

**1. Roadmap context table** (top of document)
Links to Phase 2 and Phase 3 standalone PRDs.

**2. Real HLS video playback** (§6.1, §8, §9)
- §6.1 rewritten: describes HLS.js for Chromium + native WebKit fallback. Documents `VIDEO_STREAM_URL`, CDN loading, programmatic source attachment.
- §8 out-of-scope list: "No real video playback" removed; replaced with note that Ken Burns effect is the only unimplemented feature
- §9 technical constraints: CDN dependency on HLS.js documented

**3. Media key support** (§6.6 — new section)
Documents `PLAYPAUSE` key mapping (`MediaPlayPause`, `XF86PlayPause`, `MediaPlay`, `MediaPause`) for Vizio/TV remote play-pause buttons.

**4. Player episodes rail three-state system** (§6.3)
Replaces the simple "visible below transport controls" description with the full three-state spec: hidden → peek (60px visible while controls shown) → expanded (slides up on DOWN from buttons). Documents the UP path back from episodes.

**5. State restoration pattern** (§2 — new subsection)
Documents the `container._savedXxx` pattern: `onBlur()` saves state to the container DOM element; `init()` reads and clears it. This is how BACK navigation restores exact scroll + focus across all screens.

**6. `destroy()` on BACK navigation** (§2)
Documents that `navigate(screenId, params, replace=true)` calls `destroy()` on the outgoing screen, releasing HLS resources and removing event listeners.

**7. Build stamp** (§13 — new section)
Documents the `#build-stamp` div (fixed bottom-right, format `v1.4 · YYYYMMDD-NN`, hidden in Screenshot Mode).

**8. Season selector rebuilds episode rail** (§5.2)
Added that OK on a season pill rebuilds the episodes rail below to that season's content (not just updating pill labels). Episode index and scroll reset to 0 on season change.

**9. `weatherBlurb` field on city objects** (§3 catalog.json structure)
Added `weatherBlurb` field to the city object schema. City tiles show weather blurb (e.g., "Mostly sunny") instead of `tags.join(' · ')`.

**10. Frosted-glass backplate on city tiles** (§4.2.A)
Documents `rgba(15,25,35,0.72)` + `backdrop-filter:blur` backplate behind city name/temperature for legibility against any background image.

**11. All 20 series data files populated** (§3 and §11)
File structure updated to show `show-001.json` through `show-020.json`. Completion checklist updated.

**12. Phase 2 / Phase 3 Claude Code prompts updated** (moved to their own files)
Both prompts now reference the new standalone PRD file paths instead of the old single-file path.

---

### Corrections

**13. File structure: removed `js/components/` folder** (§2)
- Removed: `rail.js`, `tile.js`, `badge.js`, `progress-bar.js`, `button.js`, `modal.js`
- Reality: no components folder; all logic self-contained in screen files
- Added explanatory note: this was a deliberate choice for TV WebView compatibility

**14. File structure: removed `js/utils/animations.js`** (§2)
File was never created. Only `keycodes.js` exists in utils/.

**15. File structure: `user-state.json` listed once (correctly)** (§2)
Was incorrectly listed under both `js/` and `data/`. Now listed only under `data/` with DEFERRED note.

**16. Hero tile dimensions corrected** (§10 constants)
- v1.4: `HERO_TILE_WIDTH_FOCUSED = 920`, `HERO_TILE_HEIGHT = 550`
- v1.5: `HERO_TILE_WIDTH = 828`, `HERO_TILE_HEIGHT = 493`

**17. Nav right section: geo-detected city, not "Location, ST"** (§4.1)
- v1.4: "Location pin icon + 'Location, ST' text"
- v1.5: reads `DataStore.getDetectedCity().name` (e.g., "Atlanta, GA")

**18. Nav tabs: no bookmark icon** (§4.1)
Bookmark tab was removed in v1.4 spec update. Nav is now: Search, For You, Live, Movies, Shows, Settings.

**19. Debug panel triple-LEFT restricted to nav bar** (§12.1)
- v1.4: "press Left three times rapidly from the nav bar" (was not enforced — fired from anywhere)
- v1.5: guarded by `.nav-tab.nav-focused` check; explicitly documented that pressing LEFT from tiles or non-nav zones does not count

**20. Marketing banner CTA text** (§4.2.G and lander-config.json example)
- v1.4: "Browse Collection →"
- v1.5: "Start Now"

**21. Local cities rail title** (§3 lander-config.json example)
- v1.4: no `title` field on local-cities rail
- v1.5: `"title": "Locations Near Me"` added to config example

**22. Screamer tile layout** (§4.2.D)
- v1.4: "portrait tiles appear within or just below the screamer background"
- v1.5: tiles are absolutely positioned inside the banner's right side with CSS `mask-image` gradient blend. No separate tile section below the banner.

**23. Ken Burns toggle marked as not yet implemented** (§8 and §12.1.C)
Toggle exists in the debug panel but is a no-op. Removed from feature list; noted explicitly in §8 and the debug panel section.

**24. Genre pill scroll** (§7 and §4.2.F)
- v1.4: (not explicitly specified — used hardcoded 120px)
- v1.5: scroll position computed from each pill's actual `offsetLeft`; noted in §7 scroll behavior

**25. Configurable constants variable names corrected** (§10)
Names updated to match actual code (`HERO_TILE_WIDTH`, `HERO_TILE_HEIGHT`, `PORTRAIT_TILE_W`, `PORTRAIT_TILE_H`, `LANDSCAPE_TILE_W`, `LANDSCAPE_TILE_H`, `TILE_GAP`). Added `VIDEO_STREAM_URL` constant. Added comment noting Ken Burns is not yet implemented.

**26. GitHub Pages URL corrected** (§14)
- v1.4: `https://chesteria.github.io/streaming-prototypes/streaming-prototype/`
- v1.5: `https://chesteria.github.io/UTA/streaming-prototype/`

---

### Removals

**27. Phase 2 section removed** from Phase 1 PRD
Extracted to `streaming-prototype-phase2-prd.md`. Referenced via roadmap table.

**28. Phase 3 section removed** from Phase 1 PRD
Extracted to `streaming-prototype-phase3-prd.md`. Referenced via roadmap table.

**29. "How to Use with Claude Code — Initial Build" section simplified** (§14)
The lengthy initial-build prompt was removed. The prototype is already built. §14 now covers running, iterating, and deploying.

---

## Flagged Items (Not Clearly Belonging to Any Phase)

None. All content from the original PRD mapped cleanly to one of the three phases.

---

## Items Intentionally Left Out of v1.5

The following were identified as implementation details (derivable from reading the code) that don't belong in the PRD:

- Internal method names (`_startCityTimers`, `_restartAllLivingTiles`, etc.)
- Rail ID sanitization (`std-rail-top-flix` instead of `std-rail-Top Flix`)
- Removed `_fromLander` params dead code
- Specific `onBlur`/`init` save/restore method names — the *pattern* is documented, not the implementation
