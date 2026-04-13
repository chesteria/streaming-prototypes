# PRD: Streaming TV Prototype Platform — Phase 3
## Scenario Presets & Device Simulation

**Version:** 1.0  
**Status:** Not yet built — spec only  
**Prerequisite:** Phase 2 (Insight Engine) must be functional before starting Phase 3.

---

## Roadmap Context

This is one of three phase PRDs for the Streaming TV Prototype Platform:

| Phase | File | Status |
|-------|------|--------|
| **Phase 1 + 1.5** | `docs/PRD/phase1-core-app-v1.5.md` | ✅ Built |
| **Phase 2** | `docs/PRD/phase2-insight-engine-v1.0.md` | ⏳ Not started |
| **Phase 3 (this doc)** | `docs/PRD/phase3-scenarios-and-simulation-v1.0.md` | ⏳ Not started |

Phase 3 transforms the debug panel from a collection of individual controls into a storytelling tool — one tap configures the entire app to demonstrate a specific narrative, user journey, or device condition.

---

## 13.1 Scenario Presets

A preset is a saved snapshot of every configurable value in the app: all debug panel settings, lander config rail order, feature toggles, timing values, visual overrides, and (when auth is added) simulated user state. Loading a preset instantly reconfigures the entire app.

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
| **Roku Stress Test** | Low-performance device simulation active (see §13.2). Tests the experience under real-world constraints. |
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
- "Compare" mode: load preset A, switch to preset B, see what changed (shows a diff of the two configurations)

**Preset management in companion config page (debug.html):**
- Full visual editor for presets
- Drag values between presets
- Export presets as shareable JSON files (email a preset to a colleague, they import it on their device)
- Import presets from file

**Presets and the Insight Engine:**
Every analytics event already captures `configVersion` in the event schema. When a preset is active, this field stores the preset ID. The reporting dashboard can then filter and compare analytics data by preset — "engagement was 40% higher under the Showcase preset than Content-Heavy." This is essentially A/B testing for free.

---

## 13.2 Device Simulation & Latency Testing

Real streaming apps run on hardware ranging from flagship smart TVs to budget Roku sticks and set-top boxes from Comcast and Xumo. The experience varies dramatically. This system lets you simulate those conditions on any device.

**Device profiles:**

Each profile defines a set of performance constraints that the app enforces artificially:

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

The device simulation layer intercepts core app behaviors and adds artificial delays:

**Input latency:** Every keypress is delayed by `inputLatencyMs` before the focus engine processes it. This simulates the lag between pressing a remote button and seeing the UI respond. On a budget Roku, this can be 100-150ms — enough to feel sluggish.

**Focus transitions:** Override the CSS `--t-focus` variable to slow down focus state animations. On low-end hardware, transitions that look smooth at 200ms become janky at 400ms.

**Scroll transitions:** Override `--t-scroll` to simulate slower page and rail scrolling.

**Image loading:** Instead of images appearing instantly (as they do from fast CDN/cache), add artificial delay:
- `imageLoadDelayMs`: base delay before each image starts loading
- `imageLoadStaggerMs`: additional delay per image in a rail (simulates sequential loading)
- `maxConcurrentImages`: limits how many images load simultaneously
- Visual treatment: images fade in from a placeholder skeleton state, just like real slow-loading images would

**Animation degradation:** Reduce animation frame rate by dropping CSS animation precision — instead of smooth 60fps transitions, simulate 30fps by using stepped timing functions or reducing `will-change` hints.

**Feature degradation:** Some features are simply too expensive for low-end hardware. The profile can disable specific features entirely (living tiles, ken burns, hero auto-advance) to simulate what a real implementation might need to cut.

**Memory pressure simulation:** After a configurable number of rails have been scrolled, show a simulated performance warning or start degrading image quality (reduce placeholder image resolution). This mimics what happens on real devices when texture memory fills up.

**Debug panel integration:**

In the debug panel under a "Device Simulation" section:
- Dropdown: select a device profile (or "None" for ideal performance)
- When a profile is selected, all constraints apply immediately
- Individual override sliders appear below, pre-filled with the profile's values — you can tweak any single parameter
- A "Custom" profile option lets you set everything manually
- A real-time "Performance Score" indicator: 100 (ideal) down to 0 (severely constrained) based on current simulation settings

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
1. Show the app running beautifully — "This is the ideal experience on a modern Samsung TV."
2. Switch to Roku Express profile — the app immediately feels slower, images load in chunks, focus feels laggy.
3. "This is what 35% of our users actually experience. Here's why we need to invest in performance optimization."
4. Switch to Comcast X1 profile — "And here's what our Comcast audience sees."

That's a conversation-changer with leadership.

---

## 13.3 Device Simulation Analytics

When a device profile is active, every analytics event automatically includes the simulation context:

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

The Insight Engine reporting dashboard can then compare engagement metrics across device profiles — "users navigated 40% fewer rails on the Roku Express simulation vs. ideal performance." This quantifies the performance tax on user engagement.

---

## 13.4 File Structure Additions

```
streaming-prototype/
├── ... (existing files from Phase 1/1.5/2)
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

---

## 13.5 Claude Code Build Prompt

```
Add the Scenario Presets and Device Simulation system to the streaming
prototype. Read Phase 3 of the PRD at docs/PRD/phase3-scenarios-and-simulation-v1.0.md
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
