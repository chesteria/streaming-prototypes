# Change Log — PRD v1.4 Alignment
**Branch:** `align-v1.4prd`

---

## v1.4 r2 — Feedback Round 2 (2026-04-06)
Source: direct session feedback

### css/lander.css
- **Hero tile size**: Reduced hero tile by 10% — width 920px → 828px, height 548px → 493px
- **Hero rail shift**: Increased hero carousel `padding-top` from `calc(var(--nav-height) + 60px)` to `calc(var(--nav-height) + 135px)` (+75px downward shift); carousel container height increased 680px → 720px to preserve tile fit

### css/variables.css
- Synced `--hero-tile-width` 920px → 828px and `--hero-tile-height` 550px → 493px to match lander.css

### js/screens/lander.js
- Updated `HERO_TILE_WIDTH` 920 → 828 and `HERO_TILE_HEIGHT` 550 → 493 to match new tile dimensions
- Fixed `gap` constant in `scrollHeroToIndex` from 20 → 16 to match CSS `gap: 16px` on `.hero-track` (scroll position accuracy for idx > 0)

---

## v1.4 r1 — Feedback Round 1 (2026-04-06)
Source: `Feedback/v1.4r1/v1.4PRD-Feedback-r1.md`

### css/lander.css
- **Hero gap**: Added 60px breathing room between nav and hero carousel — `padding-top` changed from `var(--nav-height)` to `calc(var(--nav-height) + 60px)`; `height` increased from 620px → 680px to preserve tile size
- **Hero left alignment**: Added `padding-left: var(--content-pad-x)` to `.hero-track` so the first hero tile's left edge aligns with all other rails at 60px (JS `scrollHeroToIndex` already accounts for this offset in its translate calculation)
- **Focus border clipping**: Added `padding: 20px 0; margin: -20px 0` to `.rail-overflow` — the expanded padding gives box-shadow room to render; the equal negative margin cancels the layout impact so rail spacing is unchanged. Fixes clipped focus borders on both 16:9 (channel/landscape) and 2:3 (portrait) tiles

---

## data/geo-state.json — NEW FILE
- Added anonymous geo-detection state file replacing `user-state.json`
- Fields: `detectedCity`, `detectedRegion`
- Provides city/region context for lander without requiring authentication

## data/lander-config.json — UPDATED
- Removed `continue-watching` rail from config (deferred to Auth phase)
- Removed title from `local-cities` rail entry (per v1.4 spec — no label above city tiles)
- Updated rail order to match v1.4: hero-carousel → local-cities → live-channels → screamer → top-flix (portrait) → genre-pills → marketing-banner → my-mix (landscape)

## js/data-store.js — REWRITTEN
- Now loads `geo-state.json` instead of `user-state.json`
- Added `getGeoState()` and `getDetectedCity()` methods
- `getContinueWatching()` returns `[]` (DEFERRED — Auth phase stub)
- Removed all user-state mutation methods: `isInMyStuff`, `toggleMyStuff`, `hasWatchHistory`, `getContinueWatchingItem`, `removeFromHistory`

## css/variables.css — UPDATED
- Focus border opacity corrected: `rgba(255,255,255,0.5)` → `rgba(255,255,255,0.4)` per PRD spec

## css/nav.css — UPDATED
- Nav `padding-left` changed from hardcoded `48px` to `var(--content-pad-x)` (60px)
- Ensures nav tabs share the same left edge as rail titles and content

## css/lander.css — FULLY REWRITTEN
- **Hero carousel**: removed horizontal padding from `.hero-track` so hero tile is edge-to-edge with right peeking tile visible at the right edge
- **Rail sections**: `padding-bottom` tightened 40px → 36px across all rail sections
- **Screamer redesign**: portrait tiles now live INSIDE the banner's right side using `position:absolute` `.screamer-tiles-area` with CSS `mask-image` gradient for blend effect (tiles are no longer in a separate section below the banner)
- **Marketing banner**: added `.marketing-banner.has-focus` box-shadow rule so entire banner glows on focus (matches Upsell.png mockup)
- **Genre pills**: updated wrapper class to `.genre-pills-overflow`; pill gap tightened to 10px
- **Continue Watching CSS**: removed entirely (deferred to Auth phase)

## js/screens/lander.js — UPDATED
- **`buildNav()`**: Removed Bookmark icon tab — nav now has: Search, For You, Live, Movies, Shows, Settings
- **`buildContinueWatchingRail()`**: Stubbed to return `null` immediately (DEFERRED — Auth phase)
- **`buildScreamer()`**: Updated HTML to place `.screamer-tiles-area` / `.screamer-tiles-track` inside `.screamer-banner` — matches new CSS structure where tiles are overlaid on the right portion of the banner
- **`buildLocalCitiesRail()`**: Title is conditionally rendered — no title when `config.title` is empty/absent (per v1.4 spec)
- **`buildMarketingBanner()`**: Added `has-focus` class to entire banner on enter/leave for correct focus ring behavior

## js/screens/series-pdp.js — REWRITTEN
- Anonymous state only — removed all auth-gated UI
- Single primary action button: `▶ Play S1:E1` (removed My Stuff, secondary buttons)
- Removed `_isReturning`, `_cwItem`, all watch-history logic
- Episode tiles simplified — no watched checkmarks, no progress bars
- `_handleKey()` for buttons zone: DOWN goes directly to seasons (single button)

## js/screens/player.js — UPDATED
- Removed `_inMyStuff` state property and `DataStore.isInMyStuff()` call
- **Info modal**: removed "Add to My Stuff" button (DEFERRED — Auth phase)
- **Info modal**: promoted "Go to Series Page" from `.modal-link-btn` text link to `.pill-btn` pill button with proper focus state
- Simplified `_handleModalKey()` — single focusable item, OK navigates to series-pdp

## css/player.css — UPDATED
- Removed `.modal-link-btn` and `.modal-add-btn` styles (elements removed from modal)
- Added `.modal-series-btn` minimal rule for the new pill button
