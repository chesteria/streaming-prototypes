# PRD: Streaming TV Prototype Platform — Phase 1

## Lander + Series PDP + Player (Modular Architecture)

---

## 1. Context

**Product:** A streaming TV prototype platform — an unbranded, IP-free reference
application that mimics a real FAST/AVOD streaming service. Built as a playground
for a product director to demo new features, test UX concepts, and give the
development team a head start on implementation.

**Platform:** TV (10-foot UI, remote/d-pad navigation), 1920×1080
**Target deployment:** Hosted on GitHub Pages, viewable in TV web browsers,
WebView wrappers (Tizen, FireTV, AndroidTV), and desktop browsers for demos.

**Brand colors (extracted from mockups):**
- Background: #0F1923 (deep navy)
- Card/tile background: #1A2A3A (lighter navy)
- Focus border: rgba(255, 255, 255, 0.4) with soft glow
- Focus button (active): #FFFFFF background, #0F1923 text
- Unfocused button: #2A3A4A background, #FFFFFF text
- Text primary: #FFFFFF
- Text secondary: #8899AA (muted blue-gray)
- Text tertiary: #667788 (dimmer, for metadata labels)
- Progress bar (watching): #4CAF50 (green)
- Progress bar (scrubbing): #4488CC (blue)
- Nav active pill: #FFFFFF bg, dark text
- Nav inactive: #8899AA text
- Badge backgrounds: #2A3A4A at 80% opacity
- LIVE badge: #4CAF50 background (green) with ⚡ icon
- Ratings badge: bordered pill, #FFFFFF border

**Font:** System sans-serif stack: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif

---

## 2. Architecture — Modular Design (CRITICAL)

This application MUST be built with a modular architecture so new features
and screens can be added without rebuilding the existing app. This is the
single most important technical requirement.

### File Structure
```
streaming-prototype/
├── index.html              # App shell — routing, nav, focus engine
├── css/
│   ├── variables.css       # All colors, sizes, timing as CSS custom properties
│   ├── global.css          # Reset, typography, shared component styles
│   ├── nav.css             # Top navigation bar
│   ├── lander.css          # Lander screen styles
│   ├── series-pdp.css      # Series detail page styles
│   └── player.css          # Player screen styles
├── js/
│   ├── app.js              # Router, screen manager, global state
│   ├── focus-engine.js     # D-pad navigation / focus management system
│   ├── data-store.js       # Mock data layer (loads JSON, manages state)
│   ├── components/         # Reusable UI components
│   │   ├── rail.js         # Horizontal scrolling rail (used everywhere)
│   │   ├── tile.js         # Content tile (portrait, landscape, hero variants)
│   │   ├── badge.js        # LIVE, New Season, Staff Pick, etc.
│   │   ├── progress-bar.js # Green watching / blue scrubbing bars
│   │   ├── button.js       # Focusable button with pill style
│   │   └── modal.js        # Slide-in info panel
│   ├── screens/
│   │   ├── lander.js       # Home screen — reads rail config from JSON
│   │   ├── series-pdp.js   # Series detail page
│   │   └── player.js       # Video player screen
│   └── utils/
│       ├── keycodes.js     # Key mapping for remote/keyboard
│       └── animations.js   # Shared transition helpers
│   └── user-state.json     # DEFERRED — added with Authentication phase
├── data/
│   ├── lander-config.json  # Rail order, types, and content references
│   ├── catalog.json        # All shows, movies, channels (mock content)
│   ├── geo-state.json      # Detected location (anonymous, no auth needed)
│   ├── series/             # Per-series data
│   │   └── show-001.json   # Episodes, seasons, extras for one show
│   └── user-state.json     # Simulated user state (watch history, my stuff)
└── assets/
    └── (placeholder images referenced by URL — no local files needed)
```

### Screen Registration Pattern
Each screen in `js/screens/` exports an object with:
```javascript
{
  id: 'lander',
  init: function(container, params) { ... },  // Build the DOM
  onFocus: function() { ... },                // Called when screen becomes active
  onBlur: function() { ... },                 // Called when leaving this screen
  destroy: function() { ... }                 // Cleanup
}
```
The router in `app.js` manages transitions between screens. To add a new
screen in the future, you create a new file in `screens/`, register it
in the router, and it just works.

### Adding New Features (Future-Proofing)
- **New rail type on lander:** Add a new rail type handler in `rail.js`,
  add entries to `lander-config.json`. No other files change.
- **New screen (e.g., EPG, Search):** Create a new file in `screens/`,
  register route in `app.js`. Existing screens untouched.
- **New tile variant:** Add a variant to `tile.js`. Rails automatically
  pick it up based on config.

---

## 3. Data Layer — Mock Content (IP-Free)

All content must be completely unbranded. No real show titles, no real
channel names, no real logos, no real actor names. Use invented but
realistic-sounding content.

### Placeholder Images
Use these URL patterns for placeholder art:
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

Populate with at least:
- 20 shows (mix of series and movies)
- 8 channels
- 3 collections
- 5 cities
- 10 genre categories

### geo-state.json Structure (Anonymous / Geo-Detected)
```json
{
  "detectedCity": "city-001",
  "detectedRegion": "Atlanta, GA"
}
```

> **NOTE:** `user-state.json` (Continue Watching, My Stuff, Watch History,
> Saved Locations) is deferred to a future Authentication phase. All
> personalized features that require knowing who the user is are out of
> scope for Phase 1. See "Deferred to Auth Phase" at the end of this
> document.

### lander-config.json Structure (Configurable Rail Order)
```json
{
  "rails": [
    {
      "type": "hero-carousel",
      "dataSource": "featured",
      "config": { "cycleInterval": 5000, "fadeDuration": 600 }
    },
    {
      "type": "local-cities",
      "dataSource": "cities",
      "config": { "cycleInterval": 5000 }
    },
    {
      "type": "live-channels",
      "dataSource": "channels",
      "title": "Local Channels",
      "filter": { "city": "geo-detected" }
    },
    {
      "type": "screamer",
      "dataSource": "collection-001"
    },
    {
      "type": "standard-rail",
      "dataSource": "top-flix",
      "title": "Top Flix",
      "tileType": "portrait"
    },
    {
      "type": "genre-pills",
      "dataSource": "genres"
    },
    {
      "type": "marketing-banner",
      "content": {
        "headline": "Never miss a beat.",
        "subtext": "Save your spot, sync your devices, and keep your favorites front and center.",
        "cta": "Browse Collection"
      }
    },
    {
      "type": "standard-rail",
      "dataSource": "my-mix",
      "title": "My Mix",
      "tileType": "landscape"
    }
  ]
}
```

To rearrange the lander, simply reorder items in this JSON array.
To remove a rail, delete its entry. To add a new one, add a new entry.

---

## 4. Screen 1: Lander (Home)

### 4.1 Top Navigation Bar

Fixed at top, ~60px tall, full width. Dark background matching the app bg
with a subtle bottom gradient fade.

**Left section (navigation tabs):**
- Search icon (magnifying glass)
- "For You" (default active — white pill background, dark text)
- "Live"
- "Movies"
- "Shows"
- Settings/gear icon

**Right section:**
- Location pin icon + "Location, ST" text
- Profile avatar (circular, ~36px)

**Focus behavior:** When the nav bar has focus, left/right moves between
tabs. The active tab has the white pill. Pressing OK on a tab shows a
toast: "Navigating to [tab]..." (simulated). Pressing DOWN exits the
nav to the first rail below.

### 4.2 Rail Types

Each rail type is a reusable component. Here are all rail types needed
for Phase 1, based on the mockups:

#### A. Hero Carousel Rail
- Large featured tiles, ~920×550px when focused
- Takes up the majority of screen height below the nav
- Focused tile has soft white border glow (2px, rounded 12px corners)
- Unfocused tiles visible peeking from left/right edges (~350px wide)
- **Tile content variants (driven by data type):**
  - **Series:** Badge (New Season/Staff Favorite), title, rating, date,
    genres, season count, type. Shows metadata row at bottom.
  - **Live:** LIVE badge (green ⚡), title, rating, channel info, duration
  - **Local city:** City name (large), temperature badge with weather icon,
    category tags (News · Weather · Community). LIVING TILE: cycles through
    images when focused (configurable interval, crossfade transition).
    Includes CTA slide "Add More Locations +"
  - **Collection:** "Collection" label badge, collection title (large),
    illustrated/artistic hero image
- Left/right navigates between tiles
- OK/Select on a tile → navigate to Series PDP (for shows) or show toast
  for other types

#### B. Continue Watching Rail — DEFERRED TO AUTH PHASE
> This rail requires user watch history. It will be added when the
> Authentication system is implemented. The rail type handler should
> be stubbed in `buildRail()` so it can be activated later by adding
> an entry to `lander-config.json`.

#### C. Local Channels Rail
- Title: "Local Channels"
- **Landscape tiles** (~440×270px) with LIVE badge (green ⚡) top-left
- Green progress bar at bottom of tile
- Below each tile: channel call sign + time slot, program title
- Focus: white border glow on tile
- OK/Select → navigate to Player for live channel

#### D. Collection Screamer
- **Full-width banner** spanning the entire content area (~1400×340px)
- Left side: collection title text (large, bold), description, and
  "Browse Collection →" CTA button (white pill with arrow)
- Right side: background image/art, edge-to-edge with gradient fade to left
- When focused, the whole banner has a subtle border glow
- Pressing DOWN from the screamer's CTA moves to the embedded tile rail
- **Embedded tile rail:** portrait poster tiles of collection items appear
  within or just below the screamer background
- Focus states: CTA button gets white fill; tiles below get individual focus

#### E. Standard Content Rail (Portrait)
- Title: e.g., "Top Flix"
- **Portrait poster tiles** (~180×270px)
- Optional badges on tiles: "Newly Added", "Staff Pick" (bottom of tile,
  semi-transparent dark pill)
- Focus: white border glow
- OK/Select → navigate to Series PDP

#### F. Genre Pills Rail
- **Horizontal row of pill-shaped buttons**
- Default: dark gray background (#2A3A4A), white text
- Focused: white background, dark text (same as nav active pill)
- Scrollable left/right, no wrapping
- OK/Select → show toast "Filtering by [Genre]..."
- Genre list: Action, Adventure, Animation, Comedy, Crime, Documentary,
  Drama, Family, Fantasy, Horror, Musical, Romance, Sci-Fi, Thriller,
  Western

#### G. Marketing/Upsell Banner
- Full-width, ~340px tall
- Background: teal/dark gradient with grid of show poster thumbnails
  (decorative, faded)
- Left side: headline text ("Never miss a beat."), subtext, and
  "Browse Collection →" CTA button
- Focus: CTA button gets white fill
- OK/Select → show toast "Opening signup flow..."

#### H. Standard Content Rail (Landscape)
- Title: e.g., "My Mix"
- **Landscape tiles** (~280×158px)
- Optional "On Now" / "Up Next" badges (top-left pill)
- Focus: white border glow
- OK/Select → navigate to Player or Series PDP depending on content type

### 4.3 Lander Navigation

**Vertical zones (UP/DOWN):**
1. Top Nav Bar
2. Rail 1 (hero carousel)
3. Rail 2, 3, 4... (as defined in lander-config.json)

DOWN from nav → first rail. UP from first rail → nav.
Within each rail, LEFT/RIGHT scrolls horizontally.

**Focus memory:** When navigating between rails (UP/DOWN), remember the
horizontal position within each rail. If the user was on the 3rd tile
in "Top Flix", navigates to another rail, then comes back, focus returns
to the 3rd tile.

**Scroll behavior:** When focus moves to a rail that's off-screen, the
lander scrolls vertically to bring that rail into view. The focused rail
should be positioned with its title visible near the top of the viewport.

---

## 5. Screen 2: Series PDP (Product Detail Page)

Accessed by selecting a series tile from any rail on the lander.

### 5.1 Hero Section

- **Full-screen hero image** as background (right-aligned, key art from show)
- Dark gradient overlay on left side for text readability
- Left content stack (~50% of screen width):

**Anonymous User (no auth — Phase 1 default):**
- Editorial badge pill: "New Season" (if applicable)
- Series title (large, bold, ~48px)
- Description (truncated with "..." after ~3 lines, ~16px, secondary color)
- Metadata row: [Rating badge] · Date · Genres · Season count · Type
- Action buttons (vertical stack):
  1. "▶ Play S1:E1" (pill button, primary CTA)

> **DEFERRED TO AUTH PHASE:** The following PDP states require user
> authentication and are out of scope for Phase 1:
> - "+ Add To My Stuff" / "✓ Added To My Stuff" toggle button
> - "✕ Remove From Watch History" button
> - "↻ Restart Episode" / "▶ Resume S1:E1" buttons
> - Returning User layout with episode subtitle and poster art
> - Watch progress indicators on episode tiles
> These will be added as a batch when the Authentication system is built.

**Focus behavior:** UP/DOWN moves between action buttons. The focused
button gets the white pill treatment. Play navigates to Player.

### 5.2 Scrolling Down — Season/Episode Browser

When user presses DOWN past the action buttons, the hero scrolls up and
the content sections come into view. The series title ("Bitchin' Rides"
→ use fake name) stays pinned at the top-left as a section header.

**Season Selector Row:**
- Horizontal row of season pills
- Active season: white background, dark text, shows episode count
  (e.g., "Season 1 14ep")
- Inactive seasons: dark gray circle, white text (e.g., "S2", "S3"...)
- LEFT/RIGHT navigates between seasons
- OK/Select on a season switches the episodes rail below to that season's content

**Episodes Rail:**
- Landscape tiles (~440×250px), rounded corners
- Below each tile: metadata (S1:E1 · Oct 9, 2018 · 43m), episode title
  (bold), description (2 lines, secondary color)
- Focus: white border glow on tile
- OK/Select → navigate to Player for that episode

> **DEFERRED TO AUTH PHASE:** Watched checkmark (✓) indicators and
> in-progress blue/green progress bars on episode tiles will be added
> with Authentication.

**Extras Rail:**
- Title: "Extras"
- Landscape tiles (~440×250px)
- Below each tile: duration (e.g., "2m 34s"), title (bold), description
- OK/Select → navigate to Player

**You May Also Like Rail:**
- Title: "You May Also Like"
- Portrait poster tiles (~180×270px)
- OK/Select → navigate to Series PDP for that show (recursive navigation)

**More Info Card:**
- Full-width card (~960px wide) with dark background, rounded corners,
  subtle border
- Structured layout inside:
  - Column 1: Rating (badge), Release Date, Seasons, Genre (labels in
    tertiary color, values in white)
  - Column 2: Director, Cast
  - Column 3: Full description text (no truncation)
- Has focus state (border glow) but no action on OK

### 5.3 Series PDP Navigation

**Vertical zones:**
1. Hero action buttons (vertical list)
2. Season selector pills (horizontal)
3. Episodes rail (horizontal)
4. Extras rail (horizontal)
5. You May Also Like rail (horizontal)
6. More Info card

UP/DOWN moves between zones. LEFT/RIGHT within each zone.
BACK key → return to Lander (restore previous focus position).

---

## 6. Screen 3: Player

Accessed by selecting Play from Series PDP or selecting a content tile
from Live Channels on the lander.

### 6.1 Playback Area

- **Full-screen video** (or simulated: use a static/animated background
  image that represents "playing content" — a dark frame with the show's
  landscape image, slightly dimmed)
- For Phase 1, video playback is simulated. Use a timer that counts up
  to simulate elapsed time. In future phases, this will use real HLS
  streams (Big Buck Bunny etc.)
- The progress bar advances automatically based on the simulated timer

### 6.2 Controls Overlay

Triggered by pressing OK or any d-pad button during playback. Auto-hides
after 5 seconds of inactivity. Pressing BACK during overlay visible → hide overlay. Pressing BACK when overlay hidden → exit player, return to previous screen.

**Overlay layout (bottom portion of screen):**

**Content info (above controls):**
- Series title (bold, ~28px)
- Metadata line: [Rating badge] · S1:E2 · Episode Title

**Progress bar:**
- Full-width horizontal bar
- Left: elapsed time (e.g., "1:23")
- Right: remaining time (e.g., "-1:23:45")
- Bar: white track, blue fill for progress, white dot scrub handle
- **Scrub/seek mode:** When progress bar has focus, LEFT/RIGHT moves
  the scrub position. A **thumbnail preview strip** appears above the bar
  showing scene thumbnails — the center thumbnail is enlarged with a
  white border (focused), flanking thumbnails are smaller. This provides
  visual context for where you're scrubbing to.
- For the prototype, use placeholder episode thumbnails at intervals

**Action buttons (below progress bar, two groups):**

Left group:
- "Start Over" (↻ icon) — pill button
- "Next Episode" (→ icon) — pill button

Right group (right-aligned):
- "More Info" — pill button
- "Captions On" / "Captions Off" — pill button (toggle state)

**Focus behavior:** LEFT/RIGHT moves between buttons within a group.
There's a spatial gap between left and right groups. DOWN from buttons
moves to the "More Episodes" rail.

### 6.3 More Episodes Rail (In-Player)

Visible below the transport controls. Shows episodes from the current
series/season.

- Title: "More Episodes"
- Landscape episode tiles (~440×250px)
- Watched checkmark, progress bars, metadata below (same as Series PDP
  episodes rail)
- Focus: white border glow
- OK/Select → switch to that episode (reset timer, update info)

### 6.4 Info Modal (Triggered by "More Info" button)

Slides in from the right as a panel over the dimmed player.

- Dark semi-transparent overlay on the left (player content dimmed)
- Panel (~400px wide) on the right side with:
  - Episode thumbnail (landscape, ~250px wide)
  - Series title (bold)
  - Episode title
  - Description (full text, ~4 lines)
  - Metadata row: [Rating badge] · Year · Genre · Duration · Type
  - "→ Go to Series Page" (pill button)
- OK on "Go to Series Page" → navigate to Series PDP
- BACK → close modal, return to player controls

> **DEFERRED TO AUTH PHASE:** "+ Add to My Stuff" / "✓ Added to My Stuff"
> toggle button will be added to this modal with Authentication.

### 6.5 Player Navigation

**Vertical zones:**
1. Progress bar (scrub mode)
2. Action buttons (Start Over, Next Episode ... More Info, Captions)
3. More Episodes rail

Controls auto-hide after 5 seconds. Any d-pad press re-shows them.
BACK: If controls visible → hide controls. If controls hidden → exit
player to previous screen.

---

## 7. Focus Engine — Global Rules

The focus engine is a shared system used across all screens. It must
handle these behaviors consistently:

### Focus Visual Treatment
- **Focused element:** White border (2px), rounded corners (12px),
  soft box-shadow glow: `0 0 20px rgba(255, 255, 255, 0.15)`
- **Focused button:** White background, dark text, slightly larger
  (scale 1.02 or increased padding)
- **Transition:** All focus changes animate over 200ms ease-out

### D-Pad Mapping
```javascript
const KEYS = {
  UP: ['ArrowUp', 'Up'],
  DOWN: ['ArrowDown', 'Down'],
  LEFT: ['ArrowLeft', 'Left'],
  RIGHT: ['ArrowRight', 'Right'],
  OK: ['Enter', 'Return', ' '],       // Space also works
  BACK: ['Backspace', 'Escape', 'XF86Back']
};
```

### Focus Memory
Each rail/zone remembers its last focused index. When navigating away
and back, focus restores to that index.

### Scroll Behavior
When focus moves to an element that's off-screen (horizontally in a
rail, or vertically on the page), the container scrolls smoothly
(300ms ease-out) to bring the focused element into view.

### No Wrapping
Focus stops at the edges of all lists/rails. It does not wrap around.

---

## 8. What to Skip (Out of Scope for Phase 1)

- No real video playback (simulated timer + static image) — Phase 2
  will add Big Buck Bunny HLS streams
- No real authentication or user accounts
- No real API calls — all data from local JSON files
- No search functionality (shows toast only)
- No settings screen (shows toast only)
- No mini player / picture-in-picture
- No mobile responsiveness (TV-only, 1920×1080)
- No accessibility beyond keyboard/d-pad navigation
- No loading skeletons or error states
- No deep linking or URL routing (hash-based routing is fine for
  internal screen navigation)

---

## 9. Technical Constraints

**Tech stack:** Vanilla HTML, CSS, JavaScript. NO frameworks (no React,
no Vue, no Angular). No build tools (no webpack, no npm). This must run
as static files directly from a file system or static host.

**Why vanilla:** Maximum compatibility across TV WebViews (Tizen, FireTV,
etc.), zero build step complexity, and easy for a non-developer to modify
CSS values or JSON data files.

**Performance:**
- All animations use CSS transforms and opacity (GPU-accelerated)
- No layout-triggering properties in animations (no width/height/top/left)
- Lazy-load images as rails scroll into view
- Use `will-change` on elements that animate frequently

**Hosting:** GitHub Pages (static files, no server-side processing)

**Browser targets:** Chrome 80+, Samsung Tizen WebView, Amazon WebView
(FireTV), Android System WebView

---

## 10. Configurable Constants

Place these at the top of the relevant JS files, clearly labeled so a
non-developer can find and tweak them:

```javascript
// === TIMING ===
const HERO_CYCLE_INTERVAL_MS = 5000;      // Hero carousel auto-advance
const CITY_CYCLE_INTERVAL_MS = 5000;      // Living tile image cycling
const FADE_DURATION_MS = 600;             // Crossfade transition
const CONTROLS_AUTO_HIDE_MS = 5000;       // Player controls timeout
const FOCUS_TRANSITION_MS = 200;          // Focus state animation
const SCROLL_TRANSITION_MS = 300;         // Rail/page scroll animation

// === SIZES ===
const HERO_TILE_WIDTH_FOCUSED = 920;      // px
const HERO_TILE_HEIGHT = 550;             // px
const PORTRAIT_TILE_WIDTH = 180;          // px
const PORTRAIT_TILE_HEIGHT = 270;         // px
const LANDSCAPE_TILE_WIDTH = 440;         // px
const LANDSCAPE_TILE_HEIGHT = 250;        // px
const TILE_GAP = 16;                      // px between tiles
const TILE_CORNER_RADIUS = 12;           // px

// === FEATURES ===
const ENABLE_LIVING_TILES = true;         // City tile image cycling
const ENABLE_KEN_BURNS = false;           // Subtle zoom on focused hero
const SIMULATE_PLAYBACK = true;           // Timer-based fake playback
const PLAYBACK_SPEED = 1;                 // 1 = realtime, 10 = 10x speed
```

---

## 11. Phase 1 Deliverables Summary

At the end of Phase 1, the prototype should:

1. Load to the Lander with a configurable set of rails populated with
   fake but realistic content (no auth-dependent rails)
2. Allow full d-pad navigation: UP/DOWN between rails, LEFT/RIGHT within
   rails, with focus memory and smooth scrolling
3. Navigate from any content tile to the Series PDP
4. Show the Series PDP in anonymous/first-visit state (Play S1:E1,
   season/episode browser, extras, similar titles, more info card)
5. Navigate from Series PDP to the Player
6. Show simulated playback with full transport controls, scrub
   thumbnails, episode rail, and info modal
7. Allow BACK navigation through the full stack: Player → PDP → Lander
8. Support rearranging the lander by editing lander-config.json

---

## 12. Phase 1.5: Debug Panel & Configuration Dashboard

Build this AFTER the three core screens are stable and navigating correctly.
The debug system turns the prototype from a static demo into a live
configuration tool — change values on the fly during meetings, simulate
edge cases, and explore "what if" scenarios without touching code.

### 12.1 In-App Debug Panel

**Trigger:** Press the backtick key (`` ` ``) to toggle. On a TV remote,
map this to a hidden button combo (e.g., press Left three times rapidly
from the nav bar).

**Appearance:** A panel slides in from the right side (~400px wide), dark
semi-transparent background, scrollable. The rest of the app remains
visible and interactive behind it. Pressing backtick again or BACK closes it.

**Panel sections:**

**A — Timing Controls (sliders)**
Each slider maps directly to the JS constants and updates in real time:
- Hero Carousel Interval: 1000ms–15000ms (default 5000)
- City Tile Cycle Interval: 1000ms–15000ms (default 5000)
- Crossfade Duration: 100ms–2000ms (default 600)
- Player Controls Auto-Hide: 2000ms–30000ms (default 5000)
- Focus Transition Speed: 50ms–500ms (default 200)
- Scroll Animation Speed: 100ms–800ms (default 300)
- Playback Speed: 1x, 2x, 5x, 10x, 50x (for demoing progress quickly)

**B — Visual Controls**
- Focus Glow Opacity: 0–0.5 slider (default 0.15)
- Focus Glow Spread: 0–50px slider (default 20)
- Focus Border Width: 0–4px slider (default 2)
- Tile Corner Radius: 0–24px slider (default 12)
- Tile Gap: 4–40px slider (default 16)
- Background Color: color picker (default #0F1923)

**C — Feature Toggles (on/off switches)**
- Living Tiles (city image cycling)
- Ken Burns Effect (subtle hero zoom)
- Hero Auto-Advance
- Simulated Playback Timer
- Show Focus Outlines (debug: highlights all focusable elements)
- Show Grid Overlay (debug: shows alignment guides)

**D — Simulated Auth State (STUB — ready for Auth Phase)**
- Currently shows only: "Anonymous (geo-detected)"
- When Authentication is added, this will expand to include:
  Logged Out, Free User, Premium User, New User states.
- The radio button UI should be built now but with only one option,
  so the auth phase just adds more options without rebuilding the control.

**E — App State Controls**
- "Reload Lander Config" — re-reads lander-config.json and rebuilds
- "Screenshot Mode" — hides the debug panel and any debug overlays
- "Reset All to Defaults" — restores every setting to PRD defaults

**Implementation notes:**
- All changes persist to localStorage so they survive page refreshes
  during a demo session
- A "Reset All" button clears localStorage and reverts to JSON defaults
- Each control shows its current value and the CSS variable or JS
  constant name it maps to (e.g., `--tile-radius: 12px`) — this helps
  when translating a demo discovery into a real code change later
- The panel itself must be navigable by d-pad (UP/DOWN between controls,
  LEFT/RIGHT to adjust sliders, OK to toggle switches)

### 12.2 Companion Config Page (`debug.html`)

A separate page for structural changes that require more space and are
typically done before a demo, not during one.

**URL:** `streaming-prototype/debug.html`

**Sections:**

**A — Lander Rail Editor**
- Visual list of all rails from lander-config.json
- **Drag-and-drop reordering** (or UP/DOWN arrow buttons)
- Toggle each rail on/off (visible/hidden) without deleting it
- Edit rail titles inline
- Add new rail (select type from dropdown, configure)
- Preview button → opens the main app in a new tab
- Save → writes to localStorage (app reads from localStorage first,
  falls back to JSON)

**B — Content Catalog Editor**
- Searchable/filterable table of all shows in catalog.json
- Edit title, description, genres, rating, badges inline
- Add new show (generates a random picsum URL for artwork)
- Delete show
- Assign shows to collections

> **DEFERRED TO AUTH PHASE:** User State Editor (Continue Watching,
> My Stuff, Watch History, Saved Locations) will be added here when
> Authentication is implemented.

**C — Export/Import**
- Export Current Config → downloads a JSON file with all current settings
  (lander config + catalog + user state + debug panel values)
- Import Config → upload a previously exported JSON to restore a
  specific demo setup
- This lets you save named configurations: "Demo for Board Meeting",
  "Demo for Engineering Review", "Edge Case: New User", etc.

### 12.3 File Structure Additions
```
streaming-prototype/
├── ... (existing files)
├── debug.html              # Companion config page
├── js/
│   ├── debug-panel.js      # In-app debug panel logic
│   └── debug-config.js     # Config page logic
├── css/
│   ├── debug-panel.css     # Debug panel styling
│   └── debug-config.css    # Config page styling
└── data/
    └── debug-defaults.json # Default values for all debug controls
```

### 12.4 Claude Code Prompt for Building the Debug System

```
Add a debug system to the streaming prototype. Read the Phase 1.5
section of the PRD linked at the end of this prompt for
full specifications.

Build in this order:
1. In-app debug panel (backtick key toggle) with timing sliders,
   visual controls, feature toggles, and auth state selector.
   All changes should apply immediately without reload.
2. Companion debug.html page with lander rail editor (drag-and-drop
   reorder), catalog editor, and user state editor.
3. Export/import config functionality.

Use localStorage for persistence. The main app should check
localStorage first for any config values, falling back to the
JSON files if nothing is stored.

Reference the component map — use the same variable names from
css/variables.css and the JS constants so the debug panel labels
match the codebase.
```

---

## Phase 2: Insight Engine — Analytics, Feedback & Usability Testing

Build this AFTER the debug panel is stable. This system transforms the
prototype into a remote usability testing platform. Colleagues sideload
the app onto their TV devices, use it naturally, and behavioral data
plus direct feedback flows back to you — no moderation required.

**Core principle:** Every new feature added to the app in the future
MUST include analytics instrumentation as a mandatory requirement. The
analytics layer is not an afterthought — it's foundational infrastructure
that every screen and component hooks into.

### Analytics Event Architecture

All analytics flow through a single event bus. Every component in the
app fires events through one function:

```javascript
Analytics.track(eventName, payload)
```

The analytics module handles storage, batching, and transmission. No
component needs to know where the data goes — it just calls `track()`.

### Privacy & PII Policy

**No personally identifiable information (PII) is collected, stored,
or transmitted at any point.** This is a hard requirement.

**What counts as PII (do NOT collect):**
- Real names, initials, or nicknames
- Email addresses
- IP addresses
- Device serial numbers or hardware identifiers
- Any identifier that could be linked back to a specific individual
  without a lookup table

**What IS collected (anonymous identifiers only):**
- `sessionId`: a random UUID generated fresh at each app launch.
  Cannot be linked to a person. Dies when the session ends.
- `participantId`: a short random code (e.g., "P-7X3K") generated
  at first launch and stored in localStorage. This lets you correlate
  sessions from the same device across time, but it cannot identify
  who is using the device. The participant chooses their own code or
  accepts the auto-generated one — they are explicitly told NOT to
  use their name or initials.
- `deviceType`: generic platform string ("firetv", "tizen", "roku",
  "browser") — no model numbers, no serial numbers, no MAC addresses.

**First-launch prompt:**
When the app first opens on a device that has no `participantId` in
localStorage, show a simple overlay:

```
Welcome to the prototype testing program.

Your feedback is anonymous. You'll be assigned a random
participant code to help us group your sessions.

Your code: P-7X3K

[Accept]    [Generate New Code]
```

The participant can regenerate until they get a code they're happy
with (purely cosmetic preference). They are NOT asked for their name.
If you need to know which colleague has which code for follow-up,
maintain a separate private mapping document outside the app (e.g.,
a spreadsheet in your personal notes: "P-7X3K = Sarah"). This mapping
never enters the app or its data pipeline.

**Data transmission rules:**
- All analytics data stored locally on-device by default
- QR code export: the participant sees exactly what data is being
  shared before confirming — full transparency
- Firebase transport (if enabled): no PII in any payload. The
  Firebase project should have no authentication linked to real
  user accounts. Use anonymous Firebase auth if auth is needed
  for write access.
- No third-party analytics SDKs (no Google Analytics, no Mixpanel,
  no Amplitude). The analytics system is fully self-contained.

**Data retention:**
- Local storage: rolling buffer, capped at 50 sessions or 5MB
- Firebase (if used): define a retention policy (e.g., auto-delete
  after 90 days). Document this in your team's data handling practices.
- Export files: the person who downloads them is responsible for
  secure storage and deletion.

**Event schema — every event includes:**
```json
{
  "event": "focus_change",
  "timestamp": "2026-04-05T14:23:01.442Z",
  "sessionId": "a1b2c3d4-random-uuid",
  "participantId": "P-7X3K",
  "deviceType": "firetv",
  "screen": "lander",
  "config": {
    "landerVersion": "config-hash",
    "debugOverrides": {}
  },
  "payload": {
    ...event-specific data
  }
}
```

No field in any event, anywhere in the system, should ever contain
a value that could identify a specific person. If a future feature
needs to collect something that might be PII, flag it in the PRD
for privacy review before building it.

### Phase 2A — Passive Analytics (Zero Friction)

The app silently collects behavioral data. No action required from
the tester. These events are mandatory for all existing and future
screens.

#### Navigation Events

**`focus_change`** — fired every time focus moves
```json
{
  "payload": {
    "from": { "screen": "lander", "zone": "rail-3", "index": 2, "itemId": "show-005" },
    "to": { "screen": "lander", "zone": "rail-4", "index": 0, "itemId": "show-012" },
    "method": "dpad-down",
    "dwellTimeMs": 3200
  }
}
```
The `dwellTimeMs` on the `from` element tells you how long they sat
on that item before moving. This is your most valuable metric — long
dwell on a tile they don't select means interest but hesitation.

**`navigation`** — fired on screen transitions
```json
{
  "payload": {
    "from": "lander",
    "to": "series-pdp",
    "trigger": "tile-select",
    "itemId": "show-001",
    "sourceRail": "hero-carousel",
    "sourceIndex": 2
  }
}
```

**`scroll_depth`** — fired when the user scrolls past each rail
```json
{
  "payload": {
    "screen": "lander",
    "railsVisible": ["hero-carousel", "local-cities", "live-channels"],
    "maxDepthRail": "live-channels",
    "maxDepthIndex": 2,
    "totalRails": 9
  }
}
```

**`dead_end`** — fired when a d-pad press has no effect
```json
{
  "payload": {
    "screen": "lander",
    "zone": "genre-pills",
    "index": 0,
    "direction": "left",
    "note": "user pressed left at first item — possible confusion"
  }
}
```

#### Engagement Events

**`tile_select`** — fired when OK is pressed on any tile
```json
{
  "payload": {
    "screen": "lander",
    "rail": "top-flix",
    "railIndex": 3,
    "tileIndex": 1,
    "itemId": "show-007",
    "itemTitle": "Ocean Patrol",
    "timeOnScreenMs": 45200,
    "tilesViewedInRail": 4
  }
}
```

**`rail_engagement`** — fired when focus leaves a rail (summary)
```json
{
  "payload": {
    "screen": "lander",
    "rail": "continue-watching",
    "railIndex": 1,
    "tilesViewed": 3,
    "totalTiles": 6,
    "dwellTimeMs": 8400,
    "selectedTile": null,
    "scrolledPastWithoutEngaging": false
  }
}
```

**`feature_interaction`** — fired for special behaviors
```json
{
  "payload": {
    "feature": "living-tile-cycle",
    "screen": "lander",
    "rail": "local-cities",
    "cyclesSeen": 3,
    "selectedDuringCycle": true,
    "selectedImageIndex": 1
  }
}
```

#### Session Events

**`session_start`** — fired at app launch
```json
{
  "payload": {
    "deviceType": "firetv",
    "screenResolution": "1920x1080",
    "configVersion": "hash-of-lander-config",
    "returningParticipant": true,
    "previousSessionCount": 4
  }
}
```

**`session_end`** — fired at app exit or after 5 minutes of inactivity
```json
{
  "payload": {
    "durationMs": 342000,
    "screensVisited": ["lander", "series-pdp", "player"],
    "totalFocusChanges": 187,
    "totalSelections": 12,
    "railsScrolledPast": 4,
    "deepestScreen": "player"
  }
}
```

#### Player-Specific Events

**`playback_start`** — when playback begins
**`playback_pause`** — when user pauses (or controls appear)
**`playback_scrub`** — when user seeks (with from/to positions)
**`playback_complete`** — when content finishes or user exits
**`controls_interaction`** — which player buttons are used and in what order

### Phase 2B — Active Feedback (Low Friction)

A feedback mechanism designed for TV — no keyboard typing required.

**Trigger:** Hold the OK button for 3 seconds (a subtle radial progress
indicator appears around the current focused element to show the hold
is registering). On release, the feedback overlay appears.

**Feedback Overlay:**
- Full-screen semi-transparent dark overlay
- Current state is captured automatically:
  - Which screen
  - Which element has focus
  - Scroll position
  - Current rail configuration
  - All debug panel values
  - Timestamp
  - Tester ID
- **Quick Reaction Row:** 5 emoji-style icons navigable by d-pad:
  - 😍 Love it
  - 👍 Good
  - 😐 Neutral
  - 😕 Confusing
  - 👎 Dislike
- **Optional Tag Selection:** After picking a reaction, a second row
  appears with context tags (multi-select, toggle with OK):
  - "Too slow" / "Too fast"
  - "Expected something different"
  - "Couldn't find what I wanted"
  - "Layout feels wrong"
  - "Love this feature"
  - "Text too small"
  - "Navigation confusing"
- **Confirm and dismiss:** Select "Send" button. A brief "Thanks!" toast
  appears and the overlay closes. Total interaction: ~5 seconds.

**Feedback data captured:**
```json
{
  "event": "user_feedback",
  "timestamp": "...",
  "participantId": "P-7X3K",
  "reaction": "confusing",
  "tags": ["navigation confusing", "expected something different"],
  "state": {
    "screen": "series-pdp",
    "focusedElement": "season-selector-pill-3",
    "scrollPosition": 420,
    "heroShowId": "show-001",
    "activeConfig": { ... }
  }
}
```

### Phase 2C — Structured Task Testing

Optional test mode for directed usability studies.

**Activation:** A flag in the debug panel or a URL parameter
(`?testMode=find-documentary`). When active, the app shows a task
card before the session begins.

**Task Card:**
- Full-screen overlay with the task description
- Example: "Find a documentary about ocean life and start watching it."
- "Begin" button starts the session and the clock
- Optional: multiple tasks in sequence

**During the task:**
- A subtle timer badge in the corner (can be hidden via config)
- All standard analytics fire as normal
- Additional tracking: optimal path calculation (how many steps
  *should* it take vs. how many it *did* take)

**Task completion:**
- Detected automatically (user reaches the target screen/action)
  OR manually (user presses a "Done" button)
- Post-task survey: 1-3 quick d-pad-navigable questions
  - "How easy was that?" (1-5 scale)
  - "Did you find what you expected?" (Yes / No / Partially)

**Task data captured:**
```json
{
  "event": "task_complete",
  "taskId": "find-documentary",
  "participantId": "P-7X3K",
  "completedSuccessfully": true,
  "durationMs": 28400,
  "optimalSteps": 4,
  "actualSteps": 11,
  "pathTaken": ["lander:hero-carousel", "lander:genre-pills", "lander:genre-pills:documentary", "lander:screamer-ocean", "lander:screamer-ocean:cta", "series-pdp:show-012", "player:show-012"],
  "postTaskRating": 3,
  "foundExpected": "partially"
}
```

### Phase 2D — Data Transport

How collected data gets from TV devices back to you.

**Layer 1 — Local Storage (always on, zero infrastructure)**
All events are stored in localStorage in a rolling buffer (cap at
last 50 sessions or 5MB, whichever comes first). A "View Local Data"
option in the debug panel shows raw event logs for the current device.

**Layer 2 — QR Code Export (no backend required)**
In the debug panel, a "Send Report" button generates a QR code on
screen. The tester scans it with their phone — it opens a pre-filled
Google Form (or a simple web form hosted on GitHub Pages) with the
session data JSON attached. You receive an email or spreadsheet entry
with their data.

**Layer 3 — Firebase Realtime Database (recommended for scale)**
If you set up a free Firebase project, the app can POST event batches
to a Firebase endpoint periodically (every 30 seconds or on session
end). Zero server management, generous free tier (1GB storage, 10GB
transfer/month — more than enough for internal testing). All data
flows into one place.

Configuration in the app:
```javascript
// === ANALYTICS TRANSPORT ===
const ANALYTICS_ENABLED = true;
const ANALYTICS_TRANSPORT = 'localStorage';  // 'localStorage' | 'firebase' | 'both'
const FIREBASE_URL = '';                      // set when ready
const ANALYTICS_BATCH_INTERVAL_MS = 30000;   // how often to flush to Firebase
const ANALYTICS_MAX_LOCAL_SESSIONS = 50;     // rolling buffer cap
```

### Phase 2E — Reporting Dashboard (`reporting.html`)

A standalone page that visualizes all collected analytics data. Hosted
alongside the prototype on GitHub Pages.

**Data source:** Reads from Firebase if configured, otherwise from
a manually uploaded JSON export file.

**Dashboard sections:**

**A — Session Overview**
- Total sessions, unique participants, average session duration
- Sessions by device type (FireTV, Roku, Tizen, etc.)
- Sessions over time (line chart)

**B — Navigation Heatmap**
- Visual representation of the lander showing which rails and tiles
  get the most focus time
- Color intensity = dwell time
- Click-through rate per rail (selections / focus events)

**C — Flow Diagram**
- Sankey or flow chart showing how users move through the app
- Most common paths highlighted
- Drop-off points identified (where do people leave?)

**D — Rail Performance Comparison**
- Bar chart: average dwell time per rail
- Bar chart: selection rate per rail
- Bar chart: scroll-past rate per rail (rails people skip)
- Table: rail-by-rail breakdown with all metrics

**E — Feedback Feed**
- Chronological list of all user feedback events
- Each entry shows: participant code, reaction emoji, tags, and a
  reconstructed view of what they were looking at (screen + focused
  element + state)
- Filterable by reaction type, screen, participant

**F — Task Results (if structured testing is used)**
- Task completion rates
- Average completion time vs. optimal time
- Path efficiency scores
- Per-participant breakdown

**G — A/B Comparison (future)**
- If two different lander configs are deployed, compare engagement
  metrics side by side
- "Config A (hero carousel first) vs. Config B (live channels first)"

### Phase 2 File Structure Additions
```
streaming-prototype/
├── ... (existing files)
├── reporting.html              # Analytics dashboard
├── js/
│   ├── analytics.js            # Event bus, storage, transport
│   ├── feedback.js             # Feedback overlay logic
│   ├── task-runner.js          # Structured task testing
│   └── reporting.js            # Dashboard visualization logic
├── css/
│   ├── feedback.css            # Feedback overlay styling
│   └── reporting.css           # Dashboard styling
└── data/
    └── tasks/                  # Task definitions for structured testing
        ├── find-documentary.json
        └── resume-watching.json
```

### Instrumentation Requirements for Future Features

**Every new screen or feature added to the prototype MUST include:**

1. **Analytics events defined in the PRD** — list every trackable
   interaction before building
2. **Feedback trigger support** — the hold-OK feedback mechanism must
   work on the new screen with accurate state capture
3. **Debug panel controls** — any configurable values must be added
   to the debug panel
4. **Reporting dashboard update** — new event types should be
   reflected in the dashboard

This ensures the analytics layer grows with the app rather than
being retrofitted.

### Claude Code Prompt for Building Analytics

```
Add the analytics and feedback system to the streaming prototype.
Read the Phase 2 section of the PRD at docs/streaming-prototype-phase1-prd.md
for full specifications.

Build in this order:
1. Analytics event bus (Analytics.track) with localStorage storage.
   Instrument all existing screens — every focus change, navigation,
   tile selection, rail engagement, and session start/end.
2. Feedback overlay (hold OK for 3 seconds) with reaction picker
   and tag selector. Capture full app state with each feedback event.
3. QR code export in the debug panel for sending data without a backend.
4. Reporting dashboard (reporting.html) with session overview,
   navigation heatmap, rail performance comparison, and feedback feed.
5. Firebase transport (disabled by default, configurable via constant).

Make Analytics.track the single entry point for all telemetry. Every
component fires events through this one function. The analytics module
handles storage and transport — no component should know or care where
the data goes.
```

---

## Phase 3: Scenario Presets & Device Simulation

Build this AFTER the Insight Engine is functional. This phase transforms
the debug panel from a collection of individual controls into a
storytelling tool — one tap configures the entire app to demonstrate a
specific narrative, user journey, or device condition.

### 13.1 Scenario Presets

A preset is a saved snapshot of every configurable value in the app:
all debug panel settings, lander config rail order, feature toggles,
timing values, visual overrides, and (when auth is added) simulated
user state. Loading a preset instantly reconfigures the entire app.

**Preset structure:**
```json
{
  "id": "preset-001",
  "name": "Board Demo — Best Foot Forward",
  "description": "Hero carousel with collections, living tiles active, smooth transitions, premium feel",
  "created": "2026-04-10T14:00:00Z",
  "modified": "2026-04-12T09:30:00Z",
  "config": {
    "landerConfig": { "rails": [ ... ] },
    "timing": {
      "HERO_CYCLE_INTERVAL_MS": 6000,
      "CITY_CYCLE_INTERVAL_MS": 5000,
      "FADE_DURATION_MS": 800,
      "FOCUS_TRANSITION_MS": 250
    },
    "visual": {
      "focusGlowOpacity": 0.12,
      "tileCornerRadius": 16,
      "tileGap": 20
    },
    "features": {
      "ENABLE_LIVING_TILES": true,
      "ENABLE_KEN_BURNS": true
    },
    "deviceSimulation": {
      "profile": "none",
      "latencyMs": 0,
      "imageLoadDelayMs": 0
    }
  }
}
```

**Built-in presets (ship with the app):**

| Preset | Purpose |
|---|---|
| **Showcase** | Everything polished — smooth animations, living tiles on, ken burns, best content in hero. The "happy path" demo. |
| **Engineering Review** | Debug overlays on, focus outlines visible, grid overlay, faster playback speed. Built for technical walkthroughs. |
| **New User Journey** | Anonymous state, no personalized rails, upsell banners prominent. Shows what a first-time visitor sees. |
| **Content-Heavy** | Maximum rails, all rail types visible, lots of content per rail. Tests visual density and scroll depth. |
| **Minimal** | Hero carousel + one standard rail only. Tests whether a stripped-down lander performs better. |
| **Roku Stress Test** | Low-performance device simulation active (see 13.2). Tests the experience under real-world constraints. |
| **Comcast/Xumo Target** | Device profile matching Comcast X1/Xumo hardware capabilities. Latency, image loading, and animation constraints applied. |

**Custom presets:**
Users can create their own presets from the current app state:
1. Configure the app however you want (debug panel, config page, etc.)
2. Open debug panel → Presets section → "Save Current State As..."
3. Enter a name and optional description
4. Preset is saved to localStorage and appears in the preset list

**Preset management in debug panel:**
- Dropdown or scrollable list of all presets (built-in + custom)
- One-tap to load any preset — app reconfigures immediately
- Edit, duplicate, rename, delete custom presets
- "Compare" mode: load preset A, switch to preset B, see what changed
  (shows a diff of the two configurations)

**Preset management in companion config page (debug.html):**
- Full visual editor for presets
- Drag values between presets
- Export presets as shareable JSON files (email a preset to a colleague,
  they import it on their device)
- Import presets from file

**Presets and the Insight Engine:**
Every analytics event already captures `configVersion` in the event
schema. When a preset is active, this field stores the preset ID.
The reporting dashboard can then filter and compare analytics data
by preset — "engagement was 40% higher under the Showcase preset
than Content-Heavy." This is essentially A/B testing for free.

### 13.2 Device Simulation & Latency Testing

Real streaming apps run on hardware ranging from flagship smart TVs
to budget Roku sticks and set-top boxes from Comcast and Xumo. The
experience varies dramatically. This system lets you simulate those
conditions on any device.

**Device profiles:**

Each profile defines a set of performance constraints that the app
enforces artificially:

```json
{
  "id": "roku-express",
  "name": "Roku Express (Budget)",
  "description": "Low-end Roku hardware — limited memory, slower CPU",
  "constraints": {
    "focusTransitionMs": 400,
    "scrollTransitionMs": 600,
    "imageLoadDelayMs": 800,
    "imageLoadStaggerMs": 150,
    "maxConcurrentImages": 3,
    "animationFps": 30,
    "inputLatencyMs": 120,
    "memoryWarningAfterRails": 6,
    "disableFeatures": ["kenBurns", "livingTiles"]
  }
}
```

**Built-in device profiles:**

| Profile | Focus Delay | Scroll | Image Load | Input Lag | Notes |
|---|---|---|---|---|---|
| **None (ideal)** | 200ms | 300ms | 0ms | 0ms | No simulation — raw performance |
| **Flagship Smart TV** | 200ms | 300ms | 200ms | 50ms | Samsung/LG 2024+ |
| **Mid-Range Smart TV** | 280ms | 450ms | 500ms | 80ms | Samsung/LG 2020-2023 |
| **Roku Ultra** | 250ms | 400ms | 400ms | 70ms | Capable but not instant |
| **Roku Express** | 400ms | 600ms | 800ms | 120ms | Budget hardware, real pain points |
| **Roku Streaming Stick** | 350ms | 500ms | 600ms | 100ms | Mid-tier Roku |
| **FireTV Stick Lite** | 380ms | 550ms | 700ms | 110ms | Budget Amazon hardware |
| **FireTV Stick 4K** | 250ms | 350ms | 350ms | 60ms | Solid performer |
| **Comcast X1** | 300ms | 500ms | 600ms | 90ms | Set-top box, hosted app |
| **Comcast Flex** | 400ms | 600ms | 800ms | 130ms | Lower-end Comcast hardware |
| **Xumo TV** | 350ms | 500ms | 700ms | 100ms | VIZIO/Xumo platform |
| **Xumo Stream Box** | 420ms | 650ms | 900ms | 140ms | Budget set-top box |
| **Apple TV 4K** | 180ms | 250ms | 150ms | 30ms | Premium hardware |
| **Android TV (Generic)** | 320ms | 480ms | 550ms | 90ms | Average Android TV box |

**How simulation works:**

The device simulation layer intercepts core app behaviors and adds
artificial delays:

**Input latency:** Every keypress is delayed by `inputLatencyMs`
before the focus engine processes it. This simulates the lag between
pressing a remote button and seeing the UI respond. On a budget Roku,
this can be 100-150ms — enough to feel sluggish.

**Focus transitions:** Override the CSS `--t-focus` variable to slow
down focus state animations. On low-end hardware, transitions that
look smooth at 200ms become janky at 400ms.

**Scroll transitions:** Override `--t-scroll` to simulate slower page
and rail scrolling.

**Image loading:** Instead of images appearing instantly (as they do
from fast CDN/cache), add artificial delay:
- `imageLoadDelayMs`: base delay before each image starts loading
- `imageLoadStaggerMs`: additional delay per image in a rail (simulates
  sequential loading)
- `maxConcurrentImages`: limits how many images load simultaneously
- Visual treatment: images fade in from a placeholder skeleton state,
  just like real slow-loading images would

**Animation degradation:** Reduce animation frame rate by dropping
CSS animation precision — instead of smooth 60fps transitions, simulate
30fps by using stepped timing functions or reducing `will-change` hints.

**Feature degradation:** Some features are simply too expensive for
low-end hardware. The profile can disable specific features entirely
(living tiles, ken burns, hero auto-advance) to simulate what a
real implementation might need to cut.

**Memory pressure simulation:** After a configurable number of rails
have been scrolled, show a simulated performance warning or start
degrading image quality (reduce placeholder image resolution). This
mimics what happens on real devices when texture memory fills up.

**Debug panel integration:**

In the debug panel under a "Device Simulation" section:
- Dropdown: select a device profile (or "None" for ideal performance)
- When a profile is selected, all constraints apply immediately
- Individual override sliders appear below, pre-filled with the
  profile's values — you can tweak any single parameter
- A "Custom" profile option lets you set everything manually
- A real-time "Performance Score" indicator: 100 (ideal) down to
  0 (severely constrained) based on current simulation settings

**Latency visualization (optional overlay):**
Toggle an overlay that shows real-time metrics in the corner:
```
Device: Roku Express
Input Lag: 120ms
Last Focus: 412ms
Images Loading: 2/6
FPS: ~30
```
Useful for recording demo videos that show the performance story.

**The stakeholder narrative:**

This feature enables a powerful demo flow:
1. Show the app running beautifully — "This is the ideal experience
   on a modern Samsung TV."
2. Switch to Roku Express profile — the app immediately feels slower,
   images load in chunks, focus feels laggy.
3. "This is what 35% of our users actually experience. Here's why
   we need to invest in performance optimization."
4. Switch to Comcast X1 profile — "And here's what our Comcast
   audience sees."

That's a conversation-changer with leadership.

### 13.3 Device Simulation Analytics

When a device profile is active, every analytics event automatically
includes the simulation context:

```json
{
  "config": {
    "deviceSimulation": {
      "profileId": "roku-express",
      "profileName": "Roku Express (Budget)",
      "overrides": { "inputLatencyMs": 150 }
    }
  }
}
```

The Insight Engine reporting dashboard can then compare engagement
metrics across device profiles — "users navigated 40% fewer rails on
the Roku Express simulation vs. ideal performance." This quantifies
the performance tax on user engagement.

### 13.4 File Structure Additions

```
streaming-prototype/
├── ... (existing files)
├── js/
│   ├── scenario-presets.js     # Preset save/load/management
│   └── device-simulation.js   # Latency injection, constraint engine
├── css/
│   └── device-overlay.css     # Performance metrics overlay
└── data/
    ├── presets/
    │   ├── showcase.json
    │   ├── engineering-review.json
    │   ├── new-user-journey.json
    │   ├── content-heavy.json
    │   ├── minimal.json
    │   ├── roku-stress-test.json
    │   └── comcast-xumo-target.json
    └── device-profiles/
        ├── roku-express.json
        ├── roku-ultra.json
        ├── firetv-stick-lite.json
        ├── firetv-stick-4k.json
        ├── comcast-x1.json
        ├── comcast-flex.json
        ├── xumo-tv.json
        ├── xumo-stream-box.json
        ├── apple-tv-4k.json
        └── android-tv-generic.json
```

### 13.5 Claude Code Prompt for Building Scenario Presets & Device Simulation

```
Add the Scenario Presets and Device Simulation system to the streaming
prototype. Read Phase 3 of the PRD at docs/streaming-prototype-phase1-prd.md
for full specifications.

Build in this order:
1. Preset data structure and save/load system (localStorage).
   Create the 7 built-in presets defined in the PRD.
2. Preset UI in the debug panel — dropdown to select, one-tap to load,
   "Save Current State As..." to create custom presets.
3. Preset management in debug.html — visual editor, export/import.
4. Device simulation engine — intercept focus transitions, scroll,
   image loading, and input to add artificial delays based on profiles.
5. Built-in device profiles for all 14 devices listed in the PRD.
6. Device simulation section in the debug panel with profile dropdown,
   individual override sliders, and performance score indicator.
7. Optional performance metrics overlay (toggle in debug panel).
8. Wire preset and device profile IDs into the analytics event schema
   so the Insight Engine can filter by these dimensions.

The device simulation layer should intercept at the lowest level
possible — ideally wrapping the focus engine's input handler and the
image loading pipeline — so that every part of the app is affected
uniformly without per-component changes.
```

---

## 14. How to Use This PRD with Claude Code

### Initial Build
Open terminal in your `streaming-prototypes` directory:
```
cd streaming-prototypes
claude
```

Then paste:
```
Read the PRD at [path to this file]. Also look at the reference mockup
images in [path to uploads folder] for visual reference — match the
dark navy color scheme, the white focus glow treatment, the tile styles,
and overall layout shown in those mockups.

Build the full Phase 1 prototype following the file structure defined
in the PRD. Start with the app shell, focus engine, and data layer,
then build each screen. Place everything in a folder called
streaming-prototype/ in this directory.
```

### Iterating
After the initial build, iterate screen by screen:
- "The hero carousel tiles need to be taller"
- "Add a new rail type called 'trending' that shows numbered tiles"
- "The focus glow is too bright, make it more subtle"
- "Switch the Continue Watching rail to be the first rail after the hero"
  (or just edit lander-config.json yourself!)

### Deploying
```bash
git add .
git commit -m "Phase 1 streaming prototype"
git push
```
Live at: `https://chesteria.github.io/streaming-prototypes/streaming-prototype/`

---

## 15. Deferred to Authentication Phase

The following features are designed and mocked but require a user
authentication system. They will be added as a batch in a future phase.
Mockups for these states exist in the reference images and should be
used when the auth phase is built.

**Lander:**
- Continue Watching rail (portrait tiles with green progress bars)
- My Favorite Channels rail
- Bookmark icon in top nav bar
- Saved Locations persistence (cities rail still works via geo-detection)

**Series PDP:**
- "+ Add To My Stuff" / "✓ Added To My Stuff" toggle button
- "✕ Remove From Watch History" button
- "↻ Restart Episode" button
- "▶ Resume S1:E1" (changes to resume instead of play)
- Returning User hero layout (episode subtitle, portrait poster art)
- Watched checkmark (✓) on episode tiles
- In-progress blue/green progress bars on episode tiles

**Player:**
- "+ Add to My Stuff" / "✓ Added to My Stuff" in the More Info modal
- Episode progress bar in the More Info modal thumbnail

**Debug Panel:**
- Full auth state selector (Logged Out / Free / Premium / New User)
- User state controls (Reset Watch History, Reset My Stuff, etc.)
- User State Editor in companion config page

**Data:**
- `user-state.json` (watch history, my stuff, saved locations)

**Reference mockups for auth phase:**
- Continue_Watching_Focus_Tile_First.png / Last.png
- Resume_Focus_*.png (all returning user PDP states)
- No_Hero.png (returning user with poster art)
- Shows_Modal_Focus_Add_To_My_Stuff.png / Added variants
- First_Visit_Focus_Add_To_My_Stuff.png
- First_Visit_Added_To_My_Stuff_Focus_Play.png
- Resume_Added_To_My_Stuff_*.png

---

## 16. Reference Mockups

All uploaded mockup images should be referenced during build. Key files:

**Lander mockups (active for Phase 1):**
- Carousel_Focus__Local.png — Living tile, city carousel
- Carousel_Focus_Series.png — Hero carousel, series tile
- Carousel_Focus_Live.png — Hero carousel, live content
- Carousel_Focus_Collection.png — Hero carousel, collection tile
- Live_Focus_Tile_First.png — Local channels rail
- Collection_Focus_Tile_First.png — Collection screamer + tiles
- Collection_Roku_Only.png — Collection screamer focused
- Genre_Focus_Tile_First.png — Genre pills rail
- Genre_Focus_Tile_Middle.png — Genre pills, scrolled
- Marketing_Focus_Tile_First.png — Marketing/upsell banner
- Screamer_Focus_Tile_First.png — Screamer with poster tiles
- Upsell.png — Full upsell banner
- Top Flix visible in multiple screenshots

**Player mockups (14 images):**
- Shows_Focus.png — Default controls overlay
- Shows_Focus__Start_Over.png — Start Over button focused
- Shows_Focus__More_Info.png — More Info button focused
- Shows_Focus__Captions_On.png — Captions On focused
- Shows_Focus_Captions_Off.png — Captions Off, Start Over focused
- Shows_Focus__Timeline.png — Progress bar scrub mode
- Shows_Focus__Thumbnails.png — Thumbnail preview strip during scrub
- Shows_Focus_Episodes_Tile_First/Middle/Last.png — More Episodes rail
- Shows_Modal_Focus_*.png — Info modal, all states

**Series PDP mockups (18 images):**
- First_Visit_Focus_Play.png — First visit, Play focused
- First_Visit_Focus_Add_To_My_Stuff.png — First visit, Add focused
- First_Visit_Added_To_My_Stuff_Focus_Play.png — Added state
- Resume_Focus_*.png — All returning user states
- No_Hero.png — Returning user with poster art variant
- Season_Focus_Tile_First/Last.png — Season selector
- Episodes_Focus_Tile_First.png — Episode browser
- Extras_Focus_Tile_First/Last.png — Extras rail
- Similar_Title_Focus_Tile_First/Last.png — You May Also Like
- More_Info_Focus.png — More info card

Match the visual style, spacing, colors, and component design shown
in these mockups as closely as possible.

---

*PRD version 1.4 — Phases 1 through 3: Streaming TV Prototype Platform*
*Phase 1: Core App (Lander + PDP + Player)*
*Phase 1.5: Debug Panel & Configuration Dashboard*
*Phase 2: Insight Engine (Analytics, Feedback & Usability Testing)*
*Phase 3: Scenario Presets & Device Simulation*
*Designed for use with Claude Code — modular architecture for iterative feature development*
