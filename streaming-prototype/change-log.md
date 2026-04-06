# Change Log — PRD v1.4 Alignment
**Branch:** `align-v1.4prd`

---

## v1.4 r4 — Player Episodes Rail Layout (2026-04-06)
Source: direct session feedback

### css/player.css
- **Controls padding**: `padding-bottom` increased 40px → 100px on `.player-controls` — creates a 60px clearance zone at the bottom so the episode rail peek is never covered by control elements
- **Episodes area — three-state system** (replaces single `.hidden` class):
  - Default (no class): `translateY(100%)` — fully off-screen below the fold; pointer-events off
  - `.peek`: `translateY(calc(100% - 60px))` — top 60px ("More Episodes" label) visible at bottom edge while controls are shown; signals to the user that DOWN will access the rail
  - `.expanded`: `translateY(-50px)` — slides up so the rail top sits at ~30% from the bottom of the screen; controls are hidden in this state
- Added dark gradient background to `.player-episodes-area` for legibility against video

### js/screens/player.js
- **`_showControls()`**: now sets `.peek` on the episodes area (instead of removing `.hidden`), so episodes always peek when controls are visible
- **`_hideControls()`**: removes both `.peek` and `.expanded` to fully collapse the rail off-screen
- **`_resetHideTimer()`**: added `_activeZone !== 'episodes'` guard — auto-hide does not fire while the user is focused on the episode rail
- **Buttons zone DOWN**: hides controls, clears auto-hide timer, transitions episodes area from `.peek` → `.expanded`, then focuses first episode tile
- **Episodes zone UP**: transitions episodes area from `.expanded` → `.peek`, restores controls, resets auto-hide timer, returns focus to previously active button

---

## v1.4 r3 — Feedback Round 3 (2026-04-06)
Source: `Feedback/v1.4r3/v1.4r3 Feedback.md`

### data/lander-config.json
- **Local cities rail title**: Added `"title": "Locations Near Me"` — the JS already conditionally renders the title when present
- **Marketing banner CTA**: Changed `"cta"` from `"Browse Collection"` to `"Start Now"`

### data/catalog.json
- Added `"weatherBlurb"` field to all 5 city entries (Atlanta: "Mostly sunny", St. Louis: "Mainly cloudy", Chicago: "Breezy and cold", Austin: "Clear skies", Seattle: "Light rain showers")

### js/screens/lander.js
- **City tile backplate**: Replaced flat gradient overlay with a frosted-glass inline backplate (`rgba(15,25,35,0.72)` + `backdrop-filter:blur`) so city name and temp have legible contrast against any background image
- **City tile weather blurb**: Replaced `city.tags.join(' · ')` with `city.weatherBlurb` in the secondary info line
- **Screamer focus bug fix**: When CTA is focused, `DOWN` now returns `'DOWN'` (exits rail to next) instead of moving focus to the tiles. `RIGHT` from CTA enters the tile zone instead

### js/screens/series-pdp.js
- **Season picker selected state**: Added `_selectSeason(idx)` method — on OK, all pills are re-rendered: the active pill expands to "Season N · Xep" and all others collapse to "SN". Previously only the CSS `active` class toggled; the pill text was never updated

### index.html + css/global.css
- **Version/build stamp**: Added `#build-stamp` div fixed to bottom-right corner of every screen — displays `v1.4 · 20260406-03`. Styled at 13px, 25% white opacity so it's visible but unobtrusive. Z-index 9998 (below toast at 9999)

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
