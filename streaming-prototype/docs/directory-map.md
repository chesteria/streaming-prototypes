# Directory Map

> Living reference document. Update when folder structure changes.
> Last updated: 2026-04-08

```
streaming-prototype/
│
├── index.html                  # App shell — routing, screen manager, nav bar
├── debug.html                  # Companion config page (rail editor, catalog editor)
├── reporting.html              # Analytics dashboard (Phase 2)
│
├── css/
│   ├── variables.css           # All colors, sizes, timing as CSS custom properties
│   ├── global.css              # Reset, typography, shared component styles
│   ├── nav.css                 # Top navigation bar
│   ├── lander.css              # Home screen styles
│   ├── series-pdp.css          # Series detail page styles
│   ├── player.css              # Video player screen styles
│   ├── debug-panel.css         # In-app debug panel (backtick key)
│   ├── debug-config.css        # Companion config page styles
│   ├── feedback.css            # Feedback overlay + participant ID prompt (Phase 2)
│   └── reporting.css           # Analytics dashboard styles (Phase 2)
│
├── js/
│   ├── app.js                  # Router, screen manager, navigation history stack
│   ├── focus-engine.js         # D-pad navigation and focus management
│   ├── data-store.js           # Data layer — loads JSON, manages app state
│   ├── debug-panel.js          # DebugConfig + DebugPanel globals
│   ├── debug-config.js         # Companion config page logic (debug.html)
│   ├── analytics.js            # Analytics event bus — Analytics.track() (Phase 2)
│   ├── feedback.js             # Feedback overlay, hold-OK, QR export (Phase 2)
│   ├── reporting.js            # Dashboard visualization logic (Phase 2)
│   ├── screens/
│   │   ├── lander.js           # Home screen — hero, rails, genre pills, cities
│   │   ├── series-pdp.js       # Series detail page — seasons, episodes, extras
│   │   └── player.js           # Video player — HLS.js, controls, episode rail
│   └── utils/
│       ├── keycodes.js         # Remote/keyboard key mapping
│       └── animations.js       # Shared animation helpers
│
├── data/
│   ├── lander-config.json      # Rail order, types, and content references
│   ├── catalog.json            # All shows, channels, collections, city entries
│   ├── geo-state.json          # Detected location (anonymous — no auth required)
│   ├── debug-defaults.json     # Default values for all 19 debug panel controls
│   └── series/                 # Per-series episode + extras data (show-001 … show-020)
│
└── docs/
    ├── change-log.md           # Full history of all changes across all sessions
    ├── directory-map.md        # This file
    ├── PRD/                    # All specifications — active and archived
    │   ├── phase1-core-app-v1.5.md
    │   ├── phase2-insight-engine-v1.0.md
    │   ├── phase3-scenarios-and-simulation-v1.0.md
    │   ├── enhancement-welcome-screen-v1.0.md
    │   ├── foundation-versioning-v1.0.md
    │   ├── template-small-prd-v1.0.md
    │   └── archive/            # Superseded PRD versions
    │       └── streaming-prototype-prd-v1.4-original.md
    └── Feedback/               # Testing notes and bug hunts
        ├── bug-hunts/          # Bug hunt reports and session logs
        │   ├── phase1-bug-hunt-report.md
        │   ├── phase1-bug-hunt-session-log.md
        │   ├── phase2-bug-hunt-report.md
        │   └── phase2-bug-hunt-session-log.md
        ├── v1.4-debug-panel/   # Debug panel feedback round
        ├── v1.4r1/             # Lander layout + focus border feedback
        ├── v1.4r3/             # Season picker + city tile feedback
        ├── v1.4r4/             # Player episode rail feedback
        └── v1.5-insights/      # Phase 2 analytics + feedback overlay feedback
```
