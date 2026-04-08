# PRD: Streaming TV Prototype Platform — Phase 1 + Phase 1.5

## Lander + Series PDP + Player + Debug System

**Version:** 1.5  
**Status:** ✅ Built and shipping  
**Branch:** `initial-debug-panel` (merged to `main`)

---

## Roadmap Context

This is one of three phase PRDs for the Streaming TV Prototype Platform:

| Phase | File | Status |
|-------|------|--------|
| **Phase 1 + 1.5 (this doc)** | `docs/PRD/phase1-core-app-v1.5.md` | ✅ Built |
| **Phase 2 — Insight Engine** | `docs/PRD/phase2-insight-engine-v1.0.md` | ⏳ Not started |
| **Phase 3 — Scenario Presets & Device Simulation** | `docs/PRD/phase3-scenarios-and-simulation-v1.0.md` | ⏳ Not started |

---

## 1. Context

**Product:** A streaming TV prototype platform — an unbranded, IP-free reference application that mimics a real FAST/AVOD streaming service. Built as a playground for a product director to demo new features, test UX concepts, and give the development team a head start on implementation.

**Platform:** TV (10-foot UI, remote/d-pad navigation), 1920×1080  
**Target deployment:** Hosted on GitHub Pages, viewable in TV web browsers, WebView wrappers (Tizen, FireTV, AndroidTV), and desktop browsers for demos.

**Brand colors:**
- Background: `#0F1923` (deep navy)
- Card/tile background: `#1A2A3A` (lighter navy)
- Focus border: `rgba(255, 255, 255, 0.4)` with soft glow
- Focus button (active): `#FFFFFF` background, `#0F1923` text
- Unfocused button: `#2A3A4A` background, `#FFFFFF` text
- Text primary: `#FFFFFF`
- Text secondary: `#8899AA` (muted blue-gray)
- Text tertiary: `#667788` (dimmer, for metadata labels)
- Progress bar (watching): `#4CAF50` (green)
- Progress bar (scrubbing): `#4488CC` (blue)
- Nav active pill: `#FFFFFF` bg, dark text
- Nav inactive: `#8899AA` text
- Badge backgrounds: `#2A3A4A` at 80% opacity
- LIVE badge: `#4CAF50` background (green) with ⚡ icon
- Ratings badge: bordered pill, `#FFFFFF` border

**Font:** System sans-serif stack: `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`

---

## 2. Architecture — Modular Design

This application is built with a modular architecture so new features and screens can be added without rebuilding the existing app.

### Actual File Structure

```
streaming-prototype/
├── index.html              # App shell — routing, nav, focus engine
├── debug.html              # Companion config page (debug system)
├── css/
│   ├── variables.css       # All colors, sizes, timing as CSS custom properties
│   ├── global.css          # Reset, typography, shared component styles
│   ├── nav.css             # Top navigation bar
│   ├── lander.css          # Lander screen styles
│   ├── series-pdp.css      # Series detail page styles
│   ├── player.css          # Player screen styles
│   ├── debug-panel.css     # In-app debug panel
│   └── debug-config.css    # Companion config page
├── js/
│   ├── app.js              # Router, screen manager, navigation history
│   ├── focus-engine.js     # D-pad navigation / focus management
│   ├── data-store.js       # Data layer (loads JSON, manages state)
│   ├── debug-panel.js      # DebugConfig + DebugPanel globals
│   ├── debug-config.js     # Companion config page logic
│   ├── screens/
│   │   ├── lander.js       # Home screen
│   │   ├── series-pdp.js   # Series detail page
│   │   └── player.js       # Video player screen
│   └── utils/
│       └── keycodes.js     # Key mapping for remote/keyboard
├── data/
│   ├── lander-config.json  # Rail order, types, and content references
│   ├── catalog.json        # All shows, channels, collections, cities
│   ├── geo-state.json      # Detected location (anonymous, no auth)
│   ├── debug-defaults.json # Default values for all debug controls
│   ├── series/             # Per-series episode/extras data
│   │   ├── show-001.json   # … show-020.json (all 20 shows populated)
│   └── user-state.json     # DEFERRED — added with Authentication phase
└── docs/
    ├── change-log.md
    ├── directory-map.md
    ├── PRD/
    │   ├── phase1-core-app-v1.5.md  (this file)
    │   ├── phase2-insight-engine-v1.0.md
    │   ├── phase3-scenarios-and-simulation-v1.0.md
    │   ├── enhancement-welcome-screen-v1.0.md
    │   ├── foundation-versioning-v1.0.md
    │   ├── template-small-prd-v1.0.md
    │   └── archive/
    │       └── streaming-prototype-prd-v1.4-original.md
    └── Feedback/
        ├── bug-hunts/
        └── (per-round subfolders: v1.4r1, v1.4r3, v1.4r4, v1.5-insights, …)
```

> **Note:** There is no `js/components/` folder. All component logic (rails, tiles, navigation zones) is built inline within each screen file. This approach was chosen for simplicity and zero-dependency compatibility with TV WebViews.

### Screen Registration Pattern

Each screen in `js/screens/` exports an object:
```javascript
{
  id: 'lander',
  init: function(container, params) { ... },  // Build the DOM
  onFocus: function() { ... },                // Called when screen becomes active
  onBlur: function() { ... },                 // Called when leaving screen — saves state
  destroy: function() { ... }                 // Called on BACK navigation — cleanup
}
```

`app.js` manages transitions. `navigate(screenId, params, replace)` calls `onBlur()` on the outgoing screen; when `replace === true` (BACK navigation), it also calls `destroy()` before tearing down the DOM. Forward navigations preserve the screen DOM for re-initialization on return.

### State Restoration Pattern (BACK navigation)

When a screen is blurred (`onBlur()`), it saves its scroll position, focused zone, and relevant indices onto the container DOM element as `_savedXxx` properties. On re-initialization (`init()`), the screen reads these properties from the container, clears them, and restores the exact state — so pressing BACK from the Player returns to the exact scroll position and focus zone the user was in on the Series PDP or Lander.

### Adding New Features

- **New rail type on lander:** Add a new `case` in `buildRail()`, add an entry to `lander-config.json`. No other files change.
- **New screen:** Create a new file in `screens/`, register it in `app.js`. Existing screens untouched.

---

## 3. Data Layer — Mock Content (IP-Free)

All content is completely unbranded. No real show titles, no real channel names, no real logos, no real actor names.

### Placeholder Images
- Landscape (16:9): `https://picsum.photos/seed/{id}/800/450`
- Portrait (2:3): `https://picsum.photos/seed/{id}/400/600`
- Hero (wide): `https://picsum.photos/seed/{id}/1920/800`
- Episode thumbnails: `https://picsum.photos/seed/{id}/480/270`
- City photos: `https://picsum.photos/seed/{city}/920/500`

### catalog.json Structure
```json
{
  "shows": [
    {
      "id": "show-001",
      "title": "Garage Kings",
      "description": "Master mechanics transform vintage vehicles into...",
      "heroImage": "https://picsum.photos/seed/garagekings/1920/800",
      "posterImage": "https://picsum.photos/seed/garagekings-poster/400/600",
      "landscapeImage": "https://picsum.photos/seed/garagekings-land/800/450",
      "rating": "TV-14",
      "year": "2014",
      "genres": ["Automotive", "Reality"],
      "seasons": 9,
      "type": "TV-Series",
      "badges": ["New Season"],
      "duration": "42m"
    }
  ],
  "channels": [
    {
      "id": "channel-001",
      "name": "Metro News 5",
      "callSign": "WMTV",
      "city": "Atlanta, GA",
      "image": "https://picsum.photos/seed/metronews/480/270",
      "currentProgram": "Morning Report",
      "timeSlot": "10:00-12:00p",
      "isLive": true
    }
  ],
  "collections": [
    {
      "id": "collection-001",
      "title": "Ocean Explorers",
      "description": "Sharks and other creatures of the deep.",
      "heroImage": "https://picsum.photos/seed/ocean/1920/600",
      "items": ["show-010", "show-011", "show-012"],
      "ctaText": "Browse Collection"
    }
  ],
  "cities": [
    {
      "id": "city-001",
      "name": "Atlanta, GA",
      "temperature": "72°",
      "weatherIcon": "sun",
      "weatherBlurb": "Mostly sunny",
      "tags": ["News", "Weather", "Community"],
      "images": [
        "https://picsum.photos/seed/atlanta1/920/500",
        "https://picsum.photos/seed/atlanta2/920/500",
        "https://picsum.photos/seed/atlanta3/920/500"
      ]
    }
  ]
}
```

Catalog contains: 20 shows, 8 channels, 3 collections, 5 cities, 15 genre categories.

### geo-state.json Structure
```json
{
  "detectedCity": "city-001",
  "detectedRegion": "Atlanta, GA"
}
```

> **NOTE:** `user-state.json` (Continue Watching, My Stuff, Watch History, Saved Locations) is deferred to a future Authentication phase. The file exists in `data/` but is not loaded by `data-store.js`. All personalized features that require knowing who the user is are out of scope for Phase 1.

### lander-config.json Structure
```json
{
  "rails": [
    { "type": "hero-carousel", "dataSource": "featured",
      "config": { "cycleInterval": 5000, "fadeDuration": 600 } },
    { "type": "local-cities", "dataSource": "cities",
      "title": "Locations Near Me",
      "config": { "cycleInterval": 5000 } },
    { "type": "live-channels", "dataSource": "channels",
      "title": "Local Channels", "filter": { "city": "geo-detected" } },
    { "type": "screamer", "dataSource": "collection-001" },
    { "type": "standard-rail", "dataSource": "top-flix",
      "title": "Top Flix", "tileType": "portrait" },
    { "type": "genre-pills", "dataSource": "genres" },
    { "type": "marketing-banner",
      "content": {
        "headline": "Never miss a beat.",
        "subtext": "Save your spot, sync your devices, and keep your favorites front and center.",
        "cta": "Start Now"
      }
    },
    { "type": "standard-rail", "dataSource": "my-mix",
      "title": "My Mix", "tileType": "landscape" }
  ]
}
```

To rearrange the lander, reorder items in this array. The app also checks `localStorage` for a `debug_landerConfig` override — set by `debug.html` — before reading the JSON file.

### series/{show-id}.json Structure
```json
{
  "id": "show-001",
  "seasons": [
    {
      "number": 1,
      "episodeCount": 12,
      "episodes": [
        {
          "id": "s1e1",
          "title": "The '69 Camaro Project",
          "description": "...",
          "thumbnail": "https://picsum.photos/seed/gk-s1e1/480/270",
          "airDate": "Sep 16, 2014",
          "duration": "42m",
          "season": 1,
          "episode": 1
        }
      ]
    }
  ],
  "extras": [
    { "id": "extra-001", "title": "Behind the Wrench",
      "description": "...", "thumbnail": "...", "duration": "2m 34s" }
  ],
  "similar": ["show-006", "show-015", "show-019"]
}
```

All 20 shows (`show-001.json` through `show-020.json`) are populated with real episode titles, descriptions, and metadata.

---

## 4. Screen 1: Lander (Home)

### 4.1 Top Navigation Bar

Fixed at top, ~60px tall, full width. Dark background with a subtle bottom gradient fade.

**Left section (navigation tabs):**
- Search icon (magnifying glass)
- "For You" (default active — white pill background, dark text)
- "Live"
- "Movies"
- "Shows"
- Settings/gear icon

**Right section:**
- Location pin icon + geo-detected city name (e.g., "Atlanta, GA") — reads from `DataStore.getDetectedCity().name`
- Profile avatar (circular, ~36px)

**Focus behavior:** When nav has focus, LEFT/RIGHT moves between tabs. The active tab has the white pill. OK on a tab shows a toast. DOWN exits nav to the first rail below. Triple-LEFT (3× ArrowLeft within 800ms) while nav is focused opens the debug panel.

### 4.2 Rail Types

#### A. Hero Carousel Rail
- Large featured tiles, **828×493px** when focused
- Takes up the majority of screen height below nav
- Focused tile: soft white border glow (2px, rounded corners)
- Unfocused tiles peek from left/right edges
- LEFT padding on the track aligns the first tile with the nav and other rails at 60px
- **Tile content variants:**
  - **Series:** Badge, title, rating, date, genres, season count, type
  - **Live:** LIVE badge (green ⚡), title, rating, channel info, duration
  - **Local city:** City name (large), temperature badge with weather icon, weather blurb (e.g., "Mostly sunny"). **Living tile:** cycles through city images at configurable interval with crossfade. Frosted-glass backplate behind name/temp for legibility. Includes "Add More Locations +" CTA slide.
  - **Collection:** "Collection" label badge, collection title (large), artistic hero image
- OK/Select on a tile → navigate to Series PDP (for shows) or show toast for other types

#### B. Continue Watching Rail — DEFERRED TO AUTH PHASE
> This rail requires user watch history. It will be added when Authentication is implemented. The rail type handler is stubbed in `buildRail()` and returns `null` until activated.

#### C. Local Channels Rail
- Title: "Local Channels"
- Landscape tiles (~440×270px) with LIVE badge (green ⚡) top-left
- Green progress bar at bottom of tile
- Below each tile: channel call sign + time slot, program title
- OK/Select → navigate to Player for live channel

#### D. Collection Screamer
- Full-width banner spanning the entire content area
- Left side: collection title, description, and "Browse Collection →" CTA button
- Right side: portrait poster tiles of collection items absolutely positioned inside the banner, with a CSS `mask-image` gradient fade blending them into the background — tiles do NOT appear in a separate section below the banner
- CTA button focus: white fill. DOWN from CTA enters the tile zone inside the banner.
- Pressing DOWN from tiles exits the rail

#### E. Standard Content Rail (Portrait)
- Title: e.g., "Top Flix"
- Portrait poster tiles (~180×270px)
- Optional badges on tiles
- OK/Select → navigate to Series PDP

#### F. Genre Pills Rail
- Horizontal row of pill-shaped buttons
- Default: dark gray background, white text
- Focused: white background, dark text
- Scrollable; scroll position computed from each pill's actual `offsetLeft` (not a hardcoded width)
- OK/Select → show toast "Filtering by [Genre]..."
- 15 genres available

#### G. Marketing/Upsell Banner
- Full-width, ~340px tall
- Background: teal/dark gradient with decorative show poster thumbnails
- Left side: headline, subtext, and "Start Now" CTA button
- Focus: entire banner gets border glow (`.has-focus` class)
- OK/Select → show toast "Opening signup flow..."

#### H. Standard Content Rail (Landscape)
- Title: e.g., "My Mix"
- Landscape tiles (~280×158px)
- OK/Select → navigate to Player or Series PDP depending on content type

### 4.3 Lander Navigation

**Vertical zones:** Top Nav → Rails in order as defined in `lander-config.json`

DOWN from nav → first rail. UP from first rail → nav.

**Focus memory:** Each rail remembers its last focused index. BACK navigation from a sub-screen restores the lander to the exact scroll position and rail/tile that was focused when the user left — via the state restoration pattern (§2).

**Scroll behavior:** When focus moves to a rail that's off-screen, the lander scrolls to bring that rail's title into view. Smooth 300ms ease-out transition.

---

## 5. Screen 2: Series PDP (Product Detail Page)

### 5.1 Hero Section

- Full-screen hero image as background (right-aligned)
- Dark gradient overlay on left for text readability
- Left content stack (~50% of screen width):

**Anonymous User (Phase 1 default):**
- Editorial badge pill (if applicable)
- Series title (large, bold, ~48px)
- Description (truncated ~3 lines)
- Metadata row: [Rating badge] · Year · Genres · Seasons · Type
- Single action button: "▶ Play S1:E1"

> **DEFERRED TO AUTH PHASE:** "+ Add To My Stuff", "↻ Restart", "▶ Resume" buttons, returning user layout, watch progress indicators. See §15.

### 5.2 Scrolling Down — Season/Episode Browser

**Season Selector Row:**
- Horizontal row of season pills
- Active: white background, dark text, shows "Season N · Xep"
- Inactive: dark gray, compact "SN" label
- OK/Select on a season: updates pill labels AND rebuilds the episodes rail below to that season's content. Episode index and scroll reset to 0.

**Episodes Rail:**
- Landscape tiles (~440×250px)
- Below each tile: metadata (S1:E1 · date · duration), episode title, description
- OK/Select → navigate to Player for that episode

> **DEFERRED TO AUTH PHASE:** Watched checkmark (✓) and progress bars on episode tiles.

**Extras Rail:**
- Title: "Extras"
- Landscape tiles (~440×250px)
- Below each tile: duration, title, description
- OK/Select → navigate to Player

**You May Also Like Rail:**
- Title: "You May Also Like"
- Portrait poster tiles (~180×270px)
- OK/Select → navigate to Series PDP for that show (recursive navigation)

**More Info Card:**
- Full-width card with dark background, rounded corners, subtle border
- Columns: Rating + Release Date + Seasons + Genre | Director + Cast | Full description
- Has focus state (border glow) — no action on OK

### 5.3 Series PDP Navigation

**Vertical zones:**
1. Hero action buttons
2. Season selector pills
3. Episodes rail
4. Extras rail
5. You May Also Like rail
6. More Info card

UP/DOWN moves between zones. LEFT/RIGHT within each zone. BACK → return to Lander (restores exact scroll + focus position via state restoration pattern).

Zone, season, episode index, and scroll position are all saved on BACK and restored when returning from Player.

---

## 6. Screen 3: Player

### 6.1 Playback Area

**Real HLS video playback** via HLS.js on Chromium-based browsers (Vizio SmartCast, Chrome, FireTV WebView). Native HLS path on Safari/WebKit TVs via `video.canPlayType('application/vnd.apple.mpegurl')`. A simulated timer-based fallback is used only when no video element is found.

```javascript
const VIDEO_STREAM_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
```

HLS.js is loaded via CDN in `index.html` before screen scripts. The `<video>` element has no `src` attribute — the source is attached programmatically by HLS.js or the native path.

### 6.2 Controls Overlay

Triggered by any d-pad press during playback. Auto-hides after a configurable timeout (default 5 seconds, adjustable in debug panel). While the user is in the episodes zone, auto-hide is suspended.

BACK when overlay visible → hide overlay. BACK when overlay hidden → exit player.

**Overlay layout (bottom portion of screen):**

**Content info (above controls):**
- Series title (bold, ~28px)
- Metadata line: [Rating badge] · S1:E2 · Episode Title

**Progress bar:**
- Full-width horizontal bar
- Left: elapsed time. Right: remaining time.
- Bar: white track, blue fill, white dot scrub handle
- **Scrub mode:** LEFT/RIGHT moves scrub position. A thumbnail preview strip appears above the bar — center thumbnail enlarged with white border, flanking thumbnails smaller.

**Action buttons (two groups):**
- Left: "Start Over" (↻) · "Next Episode" (→)
- Right: "More Info" · "Captions On/Off"

### 6.3 More Episodes Rail (In-Player)

Three-state system:
- **Default (hidden):** Fully off-screen below the fold, pointer-events off
- **Peek:** Top 60px ("More Episodes" label) visible at bottom edge while controls are shown — signals to the user that DOWN will expand it
- **Expanded:** Slides up to ~30% from screen bottom; controls are hidden in this state

DOWN from buttons zone → transitions peek → expanded, focuses first episode tile  
UP from episodes zone → transitions expanded → peek, restores controls, returns focus to previous button

Episodes rail shows landscape tiles for the current series/season. OK/Select → switch to that episode.

### 6.4 Info Modal ("More Info" button)

Slides in from the right as a panel over the dimmed player.

- Dark overlay on the left (player content dimmed)
- Panel (~400px wide) on the right:
  - Episode thumbnail (landscape)
  - Series title (bold)
  - Episode title, description
  - Metadata row: [Rating badge] · Year · Genre · Duration
  - "→ Go to Series Page" (pill button)
- OK on "Go to Series Page" → navigate to Series PDP
- BACK → close modal, return to player controls

> **DEFERRED TO AUTH PHASE:** "+ Add to My Stuff" button in this modal.

### 6.5 Player Navigation

**Vertical zones:**
1. Progress bar (scrub mode)
2. Action buttons
3. More Episodes rail (expanded state only)

BACK: controls visible → hide controls. Controls hidden → exit player.

### 6.6 Media Key Support

`PLAYPAUSE` action mapped to `['MediaPlayPause', 'XF86PlayPause', 'MediaPlay', 'MediaPause']` for Vizio and standard media remote play/pause keys. Fires regardless of active zone — toggles `video.play()`/`video.pause()` with toast notification.

---

## 7. Focus Engine — Global Rules

The focus engine is a shared system (`focus-engine.js`) used across all screens.

### Focus Visual Treatment
- **Focused element:** White border (2px), rounded corners (12px), soft box-shadow glow: `0 0 20px rgba(255, 255, 255, 0.15)`
- **Focused button:** White background, dark text, slightly larger
- **Transition:** All focus changes animate over 200ms ease-out (configurable via `--t-focus`)
- **Focus clipping fix:** Rails use `padding: 20px 0; margin: -20px 0` on the overflow wrapper so box-shadow glows aren't clipped at rail boundaries

### D-Pad Mapping
```javascript
const KEYS = {
  UP:        ['ArrowUp',    'Up'],
  DOWN:      ['ArrowDown',  'Down'],
  LEFT:      ['ArrowLeft',  'Left'],
  RIGHT:     ['ArrowRight', 'Right'],
  OK:        ['Enter', 'Return', ' '],
  BACK:      ['Backspace', 'Escape', 'XF86Back'],
  PLAYPAUSE: ['MediaPlayPause', 'XF86PlayPause', 'MediaPlay', 'MediaPause']
};
```

### Focus Memory
Each rail/zone remembers its last focused index. When navigating away and back (within a session), focus restores to that index. Full scroll + zone state is restored across BACK navigations via the container save pattern (see §2).

### Scroll Behavior
When focus moves to an off-screen element, the container scrolls smoothly (300ms ease-out) to bring the focused element into view. Rail horizontal scroll uses each pill/tile's actual `offsetLeft` rather than hardcoded widths.

### No Wrapping
Focus stops at the edges of all lists/rails. It does not wrap around.

---

## 8. What's In and Out of Scope

### In Scope (Phase 1 + 1.5) — Built
- Real HLS video playback (HLS.js on Chromium, native on Safari/WebKit)
- Full d-pad navigation with focus memory and state restoration on BACK
- Lander with 7 rail types, fully configurable via JSON
- Series PDP with seasons, episodes, extras, similar titles, more info
- Series data populated for all 20 shows
- Player with real video, transport controls, episode rail, info modal
- Debug panel (in-app) and companion config page (debug.html)
- Build stamp visible on every screen

### Out of Scope
- Real authentication or user accounts
- Continue Watching rail (auth-gated — see §15)
- Real API calls — all data from local JSON files
- Search functionality (shows toast only)
- Settings screen (shows toast only)
- Ken Burns effect — toggle exists in debug panel but is not yet implemented
- Mini player / picture-in-picture
- Mobile responsiveness (TV-only, 1920×1080)
- Accessibility beyond keyboard/d-pad navigation
- Loading skeletons or error states
- Phase 2 (Analytics/Insight Engine) — see `PRD/phase2-insight-engine-v1.0.md`
- Phase 3 (Scenario Presets & Device Simulation) — see `PRD/phase3-scenarios-and-simulation-v1.0.md`

---

## 9. Technical Constraints

**Tech stack:** Vanilla HTML, CSS, JavaScript. NO frameworks (no React, no Vue, no Angular). No build tools (no webpack, no npm). Runs as static files from a file system or static host.

**Why vanilla:** Maximum compatibility across TV WebViews (Tizen, FireTV, etc.), zero build step complexity, and easy for a non-developer to modify CSS values or JSON data files.

**External dependencies (CDN only):**
- HLS.js `1.x` via jsDelivr: `https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js`
  - Loaded in `index.html` before screen scripts
  - Required for `.m3u8` playback on Chromium; not used on Safari/WebKit

**Performance:**
- All animations use CSS transforms and opacity (GPU-accelerated)
- No layout-triggering properties in animations
- Lazy-load images as rails scroll into view
- `will-change` on frequently animating elements

**Hosting:** GitHub Pages (static files)  
**Browser targets:** Chrome 80+, Vizio SmartCast WebView, Samsung Tizen WebView, Amazon WebView (FireTV), Android System WebView

---

## 10. Configurable Constants

All timing, sizing, and feature constants are at the top of their relevant JS files. They are also controllable at runtime via the debug panel (§12).

```javascript
// === TIMING ===
const HERO_CYCLE_INTERVAL_MS = 5000;      // Hero carousel auto-advance
const CITY_CYCLE_INTERVAL_MS = 5000;      // Living tile image cycling
const FADE_DURATION_MS = 600;             // Crossfade transition
const CONTROLS_AUTO_HIDE_MS = 5000;       // Player controls timeout
const FOCUS_TRANSITION_MS = 200;          // Focus state animation
const SCROLL_TRANSITION_MS = 300;         // Rail/page scroll animation

// === SIZES ===
const HERO_TILE_WIDTH = 828;              // px (focused)
const HERO_TILE_HEIGHT = 493;             // px
const PORTRAIT_TILE_W = 180;             // px
const PORTRAIT_TILE_H = 270;             // px
const LANDSCAPE_TILE_W = 440;            // px
const LANDSCAPE_TILE_H = 250;            // px
const TILE_GAP = 16;                     // px between tiles
// Tile corner radius controlled via --tile-radius CSS var (default 12px)

// === FEATURES ===
const ENABLE_LIVING_TILES = true;         // City tile image cycling
// const ENABLE_KEN_BURNS = false;        // NOT YET IMPLEMENTED
const SIMULATE_PLAYBACK = true;           // Timer fallback (no video element only)
const PLAYBACK_SPEED = 1;                 // 1 = realtime

// === VIDEO ===
const VIDEO_STREAM_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
```

All CSS custom properties in `variables.css` can be overridden at runtime by `DebugConfig`:

```css
--tile-radius: 12px
--rail-gap: 16px
--color-bg: #0F1923
--t-focus: 200ms
--t-scroll: 300ms
--t-fade: 600ms
--color-focus-glow: rgba(255,255,255,0.15)
--focus-box-shadow: 0 0 20px var(--color-focus-glow)
```

---

## 11. Phase 1 Deliverables — Completion Checklist

All of the following are built and working:

1. ✅ Lander with configurable rail set — 7 rail types, JSON-driven order
2. ✅ Full d-pad navigation: UP/DOWN between rails, LEFT/RIGHT within rails
3. ✅ Focus memory within session; scroll + zone state restored on BACK
4. ✅ Navigate from any content tile to Series PDP
5. ✅ Series PDP: Play button, season/episode browser, extras, similar, more info — all 20 shows populated
6. ✅ Navigate from Series PDP to Player
7. ✅ Real HLS video playback (HLS.js + native WebKit fallback)
8. ✅ Player: transport controls, scrub thumbnails, peek/expanded episode rail, info modal
9. ✅ BACK navigation through full stack: Player → PDP → Lander, all with state restore
10. ✅ Debug panel (in-app) with all controls wired and functional
11. ✅ Companion config page (debug.html) with rail editor, catalog editor, export/import

---

## 12. Phase 1.5: Debug Panel & Configuration Dashboard

The debug system turns the prototype from a static demo into a live configuration tool — change values on the fly during meetings, simulate edge cases, and explore "what if" scenarios without touching code.

### 12.1 In-App Debug Panel

**Triggers:**
- Backtick key (`` ` ``) — keyboard
- Triple-LEFT (3× ArrowLeft within 800ms) — **only fires when nav bar is focused** (`.nav-tab.nav-focused` guard). Pressing LEFT from tiles or other zones does not count toward the combo.

**Appearance:** Panel slides in from the right (~400px wide), dark semi-transparent background, scrollable. Pressing backtick again or BACK closes it. D-pad navigable (UP/DOWN between controls, LEFT/RIGHT to adjust, OK to toggle).

`FocusEngine.disable()` called on open; `enable()` on close.

**Panel sections:**

**A — Timing Controls (sliders)**
- Hero Carousel Interval: 1000–15000ms (default 5000)
- City Tile Cycle Interval: 1000–15000ms (default 5000) — stops/restarts all living tiles live on change
- Crossfade Duration: 100–2000ms (default 600)
- Player Controls Auto-Hide: 2000–30000ms (default 5000)
- Focus Transition Speed: 50–500ms (default 200)
- Scroll Animation Speed: 100–800ms (default 300)
- Playback Speed: 1x, 2x, 5x, 10x, 50x

**B — Visual Controls**
- Focus Glow Opacity: 0–0.5 (default 0.15)
- Focus Glow Spread: 0–50px (default 20)
- Focus Border Width: 0–4px (default 2)
- Tile Corner Radius: 0–24px (default 12)
- Tile Gap: 4–40px (default 16)
- Background Color: color picker (default #0F1923)

**C — Feature Toggles**
- Living Tiles (city image cycling) — stops/restarts all tiles live on toggle
- Ken Burns Effect — **toggle present but not yet implemented** (no-op)
- Hero Auto-Advance
- Simulated Playback Timer — affects fallback timer only; does not affect real HLS playback
- Show Focus Outlines (debug: highlights all focusable elements)
- Show Grid Overlay (debug: 60px grid lines)

**D — Simulated Auth State (STUB)**
- Currently shows only: "Anonymous (geo-detected)"
- Radio button UI built; Auth phase adds more options

**E — App State Controls**
- "Reload App" — reloads page
- "Screenshot Mode" — hides debug chrome and overlays
- "Reset All to Defaults" — clears localStorage, reverts to JSON defaults

**Implementation:**
- All changes persist to `localStorage` (survive page refreshes during demo sessions)
- Each control shows its CSS variable or JS constant name for easy code lookup
- `DebugConfig.get(key, fallback)` / `DebugConfig.set(key, value)` — `set()` applies CSS var changes immediately and dispatches `debugconfig:change` event
- `DebugConfig.applyAll()` called on `DOMContentLoaded` to restore stored overrides
- Screen files listen for `debugconfig:change` and update live (living tiles, hero timer, player controls, playback speed)

### 12.2 Companion Config Page (`debug.html`)

**URL:** `streaming-prototype/debug.html`

**A — Lander Rail Editor**
- Visual list of all rails from `lander-config.json`
- Drag-and-drop reordering (HTML5 drag API)
- Toggle each rail on/off without deleting
- Edit rail titles inline
- Save → writes to `localStorage` as `debug_landerConfig` (app reads this first, falls back to JSON)
- Preview App button → opens `index.html` in new tab

**B — Content Catalog Editor**
- Searchable table of all shows in `catalog.json`
- Double-click any cell to edit inline (`contenteditable`)
- Add show (random picsum placeholder), delete row
- Save → writes to `localStorage` as `debug_catalog`

> **DEFERRED TO AUTH PHASE:** User State Editor (Continue Watching, My Stuff, Watch History, Saved Locations)

**C — Export/Import**
- Export → downloads timestamped JSON of all `debug_` localStorage keys
- Import → reads uploaded JSON, writes all keys to localStorage
- Lets you save named configurations: "Demo for Board Meeting", "Edge Case: New User", etc.

### 12.3 File Structure Additions (Phase 1.5)
```
streaming-prototype/
├── debug.html
├── js/
│   ├── debug-panel.js      # DebugConfig global + DebugPanel global
│   └── debug-config.js     # Config page logic
├── css/
│   ├── debug-panel.css     # Panel + toggle styles
│   └── debug-config.css    # Config page styles
└── data/
    └── debug-defaults.json # Default values for all 19 debug config keys
```

---

## 13. Build Stamp

Every screen shows a version/build stamp in the bottom-right corner (fixed position, z-index 9998). Format: `v1.4 · YYYYMMDD-NN`. Styled at 13px, 25% white opacity. Hidden in Screenshot Mode.

---

## 14. How to Use This PRD with Claude Code

### Running the app
Open `streaming-prototype/index.html` directly in a browser, or serve it via any static file server. No build step required.

### Iterating
After the initial build, iterate naturally:
- "The hero carousel tiles need to be taller" — edit `HERO_TILE_WIDTH`/`HERO_TILE_HEIGHT` in `lander.js` and sync in `variables.css`
- "Add a new rail type" — add a case in `buildRail()`, add an entry to `lander-config.json`
- "The focus glow is too bright" — adjust `--color-focus-glow` in `variables.css` or via debug panel

### Deploying
```bash
git add .
git commit -m "update"
git push
```
Live at: `https://chesteria.github.io/UTA/streaming-prototype/`

---

## 15. Deferred to Authentication Phase

The following features are designed and mocked but require a user authentication system.

**Lander:**
- Continue Watching rail (portrait tiles with progress bars)
- My Favorite Channels rail
- Bookmark icon in top nav bar
- Saved Locations persistence

**Series PDP:**
- "+ Add To My Stuff" / "✓ Added To My Stuff" toggle button
- "✕ Remove From Watch History" button
- "↻ Restart Episode" button
- "▶ Resume S1:E1" (resume instead of play)
- Returning User hero layout (episode subtitle, portrait poster art)
- Watched checkmark (✓) on episode tiles
- In-progress progress bars on episode tiles

**Player:**
- "+ Add to My Stuff" in the More Info modal
- Episode progress bar in the modal thumbnail

**Debug Panel:**
- Full auth state selector (Logged Out / Free / Premium / New User)
- User state controls (Reset Watch History, Reset My Stuff, etc.)

**Companion Config Page:**
- User State Editor tab

**Data:**
- `user-state.json` — file exists in `data/` but not loaded until Auth phase

---

## 16. Reference Mockups

All mockup images used during the initial build are in the project's reference uploads folder. Key files:

**Lander:**
- `Carousel_Focus__Local.png` — Living tile, city carousel
- `Carousel_Focus_Series.png` — Hero carousel, series tile
- `Carousel_Focus_Live.png` — Hero carousel, live content
- `Carousel_Focus_Collection.png` — Hero carousel, collection tile
- `Live_Focus_Tile_First.png` — Local channels rail
- `Collection_Focus_Tile_First.png` — Collection screamer + tiles
- `Genre_Focus_Tile_First.png` — Genre pills rail
- `Marketing_Focus_Tile_First.png` — Marketing/upsell banner
- `Screamer_Focus_Tile_First.png` — Screamer with poster tiles
- `Upsell.png` — Full upsell banner

**Player:**
- `Shows_Focus.png` — Default controls overlay
- `Shows_Focus__Start_Over.png` — Start Over focused
- `Shows_Focus__More_Info.png` — More Info focused
- `Shows_Focus__Timeline.png` — Progress bar scrub mode
- `Shows_Focus__Thumbnails.png` — Thumbnail preview strip
- `Shows_Focus_Episodes_Tile_First/Middle/Last.png` — More Episodes rail
- `Shows_Modal_Focus_*.png` — Info modal states

**Series PDP:**
- `First_Visit_Focus_Play.png` — First visit, Play focused
- `Season_Focus_Tile_First/Last.png` — Season selector
- `Episodes_Focus_Tile_First.png` — Episode browser
- `Extras_Focus_Tile_First/Last.png` — Extras rail
- `Similar_Title_Focus_Tile_First/Last.png` — You May Also Like
- `More_Info_Focus.png` — More info card

**Auth Phase mockups (reference for future):**
- `Continue_Watching_Focus_Tile_First/Last.png`
- `Resume_Focus_*.png` — All returning user PDP states
- `No_Hero.png` — Returning user with poster art
- `Shows_Modal_Focus_Add_To_My_Stuff.png` and variants

Match the visual style, spacing, colors, and component design shown in these mockups as closely as possible.
