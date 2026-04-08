# PRD: Welcome Screen — Controls Reference

## Overview

**Title:** Welcome Screen with Device-Aware Controls Reference
**Type:** Enhancement
**Parent phase:** Phase 1.5 (extends debug system) and Phase 1 (touches app shell)
**Estimated build time:** Half a day
**Status:** Draft

---

## Problem

Colleagues opening the prototype for the first time on a TV device have
no way to know which remote buttons map to which actions in the app.
They press random buttons, get frustrated, and either give up or fall
back to asking someone how it works. This friction wastes the value of
sideloading the app onto real devices.

Additionally, when the prototype is run on different platforms (Roku,
FireTV, VIZIO, Tizen), the remote button labels and layouts are
different. A generic "press OK to select" instruction is technically
correct but unhelpful when the user is staring at a VIZIO remote
trying to figure out which button is "OK."

---

## Goal

When a user launches the prototype for the first time on any device,
they see a welcome screen that clearly shows which buttons on their
specific remote do what within the app. They can dismiss the screen
and never see it again, but it's always available via a key combo
or debug panel option for reference.

---

## Specification

### Welcome Screen Layout

A full-screen overlay shown on first app launch (and on demand). Dark
background matching the app theme. Contains:

- App title and version (e.g., "Streaming Prototype v1.5")
- A short welcome message: "Welcome! Here's how to get around."
- A visual reference of the remote/keyboard with each button labeled
  by its function in the app
- A "Got it" button (focused by default) to dismiss
- Small text at the bottom: "You can see this again anytime by pressing
  the Help button or selecting Help from the debug panel."

### Device Detection

On app launch, the welcome screen detects which platform/device the
user is running on. Detection logic uses these signals in order:

1. **User Agent string** — most reliable for distinguishing platforms.
   Look for substrings like "VIZIO", "SMART-TV", "Tizen", "Web0S",
   "AFTS" (FireTV), "BRAVIA" (Sony), etc.
2. **Screen resolution and aspect ratio** — TVs are almost always
   1920x1080 or 3840x2160 in 16:9; mobile/desktop varies.
3. **Touch capability** — TVs report no touch support; mobile/tablet
   does.
4. **Fallback** — generic "TV / keyboard" reference if no specific
   match.

### Device Profiles

Each detected device has a corresponding profile that defines:

- A display name ("VIZIO SmartCast TV", "Amazon FireTV", etc.)
- A remote layout description (which physical buttons exist)
- A mapping of physical buttons → in-app actions
- Optionally, a small SVG or simple visual representation of the remote

**Initial profiles to support:**

| Profile ID | Display Name | Detection Signal |
|---|---|---|
| `vizio` | VIZIO SmartCast | UA contains "VIZIO" or "SMART-TV; VIZIO" |
| `firetv` | Amazon FireTV | UA contains "AFTS", "AFTT", "AFTM" |
| `androidtv` | Android TV | UA contains "Android" + "TV" |
| `tizen` | Samsung Tizen | UA contains "Tizen" |
| `webos` | LG webOS | UA contains "Web0S" or "webOS" |
| `roku` | Roku (web wrapper) | UA contains "Roku" |
| `desktop` | Desktop Browser | Default for non-TV browsers |
| `mobile` | Mobile Browser | Touch support detected |

If detection fails or the device isn't recognized, fall back to the
`desktop` profile with a note: "We couldn't detect your device. Showing
keyboard controls."

### Button Mappings

The welcome screen displays the device's remote layout (or keyboard
layout for desktop) with each relevant button labeled by what it does
in the app.

**For VIZIO SmartCast specifically:**

| Physical Button | App Action |
|---|---|
| D-pad Up/Down/Left/Right | Navigate between tiles, rails, and screens |
| OK (center of d-pad) | Select / activate focused item |
| Back (curved arrow) | Go back to previous screen / close modal |
| Home | Exit prototype (returns to VIZIO home) |
| Play/Pause | Toggle player controls (when in player) |
| Info | Show More Info modal (when in player) |
| Menu (≡) | Open debug panel (if enabled) |

**For FireTV:**

| Physical Button | App Action |
|---|---|
| D-pad Up/Down/Left/Right | Navigate |
| Center button | Select |
| Back arrow | Go back |
| Home | Exit prototype |
| Play/Pause | Toggle player controls |
| Menu (☰) | Open debug panel |

**For desktop/keyboard:**

| Key | App Action |
|---|---|
| Arrow keys | Navigate |
| Enter / Space | Select |
| Backspace / Esc | Go back |
| Backtick (`` ` ``) | Open debug panel |
| H | Show this welcome screen |

Each profile defines its own mapping. Profiles are stored as JSON files
so new devices can be added without code changes.

### Visual Representation

The welcome screen should show a simple visual of the remote/keyboard
relevant to the detected device. This doesn't need to be a pixel-perfect
illustration — a stylized SVG outline of the remote with labeled
buttons is plenty. The goal is recognition: "Oh, that's my remote."

For desktop, show a stylized keyboard or just a list of key bindings
with kbd-style boxes around the keys.

### First-Launch Behavior

- On the very first app launch (no `welcomeScreenSeen` flag in
  localStorage), show the welcome screen automatically after a brief
  app load
- After dismissal, set `welcomeScreenSeen: true` in localStorage so it
  doesn't show again
- The screen can always be reopened by:
  - Pressing the H key on desktop
  - Pressing the dedicated Help/Info button on supported remotes
  - Selecting "Show Welcome Screen" from the debug panel

### Manual Override

In the debug panel, add a "Force Welcome Screen On Launch" toggle. When
enabled, the welcome screen shows every time the app loads, regardless
of the seen flag. Useful for demos and testing.

Also in the debug panel: a dropdown to manually override the detected
device profile. Useful for testing — "show me what FireTV users see
even though I'm on desktop."

---

## What to Skip

- No animations or fancy transitions on the welcome screen — keep it
  simple and fast
- No multi-step onboarding flow — this is one screen, one purpose
- No localization for now (English only)
- No remote button illustrations beyond simple SVG outlines
- No detection for obscure devices — start with the 8 profiles listed
- No analytics on welcome screen interactions in this PRD (will be
  added when Phase 2 instrumentation requirements are applied)

---

## Configurable Values

```javascript
// === WELCOME SCREEN ===
const WELCOME_SCREEN_ENABLED = true;
const WELCOME_SCREEN_AUTO_SHOW_ON_FIRST_LAUNCH = true;
const WELCOME_SCREEN_FORCE_ON_LAUNCH = false; // debug override
const WELCOME_SCREEN_DEFAULT_PROFILE = 'desktop'; // fallback
```

---

## File Structure Additions

```
streaming-prototype/
├── js/
│   └── welcome-screen.js       # Detection logic + screen rendering
├── css/
│   └── welcome-screen.css      # Welcome screen styling
└── data/
    └── device-profiles/
        ├── vizio.json
        ├── firetv.json
        ├── androidtv.json
        ├── tizen.json
        ├── webos.json
        ├── roku.json
        ├── desktop.json
        └── mobile.json
```

### Example Device Profile Format

```json
{
  "id": "vizio",
  "displayName": "VIZIO SmartCast TV",
  "detection": {
    "userAgentSubstrings": ["VIZIO", "SMART-TV; VIZIO"]
  },
  "remoteVisual": "vizio-remote.svg",
  "buttons": [
    {
      "label": "D-pad",
      "key": "ArrowUp/Down/Left/Right",
      "appAction": "Navigate between tiles, rails, and screens"
    },
    {
      "label": "OK",
      "key": "Enter",
      "appAction": "Select / activate focused item"
    },
    {
      "label": "Back",
      "key": "Backspace",
      "appAction": "Go back to previous screen or close modal"
    },
    {
      "label": "Play/Pause",
      "key": "MediaPlayPause",
      "appAction": "Toggle player controls"
    }
  ]
}
```

---

## Privacy Check

- [x] No real names collected
- [x] No emails collected
- [x] No device identifiers collected (User Agent is read locally only,
      not transmitted unless analytics is enabled)
- [x] Detected device type is logged to analytics as a generic string
      (e.g., "vizio", "firetv") which is not PII
- [x] No third-party SDKs added

---

## Done Criteria

- [ ] Welcome screen appears on first launch in any browser/device
- [ ] Welcome screen does not appear on subsequent launches
- [ ] H key reopens the welcome screen on desktop
- [ ] Welcome screen shows the correct device profile based on User Agent
- [ ] At least 4 device profiles are populated with accurate button mappings
      (VIZIO, FireTV, Tizen, desktop)
- [ ] Manual profile override in debug panel works
- [ ] "Force welcome screen on launch" toggle in debug panel works
- [ ] Welcome screen can be dismissed with OK/Enter
- [ ] No regressions to existing app navigation
- [ ] No console errors during welcome screen display or dismissal

---

## Build Prompt for Claude Code

```
Read this PRD at docs/PRD/enhancement-welcome-screen-v1.0.md and build the welcome
screen feature.

Reference the master PRD at docs/PRD/phase1-core-app-v1.5.md
and the component map at docs/component-map.md to understand the
existing architecture.

Before building:
1. Commit a snapshot with message "pre-welcome-screen snapshot"
2. Create a new git branch called "welcome-screen"

Build the feature on that branch. Start with desktop profile detection
and rendering, then add the TV device profiles. Make device profiles
data-driven via JSON files so new devices can be added later without
code changes.

When done, summarize:
- Which device profiles you implemented
- How detection works for each
- How to test the manual override in the debug panel
- Any edge cases you handled
```

---

## Bug Hunt Prompt

```
Bug hunt the welcome screen feature you just built against
docs/PRD/enhancement-welcome-screen-v1.0.md. Focus on:

1. Does the welcome screen appear correctly on first launch?
2. Does the localStorage flag prevent it from showing again?
3. Does device detection work for each supported profile?
4. Does the manual profile override in debug panel work?
5. Does dismissing the screen return focus to the correct place
   in the underlying app?
6. Is there any way the welcome screen can get "stuck" or block
   navigation to the rest of the app?
7. Console errors or warnings?

Save a report to docs/bug-hunts/welcome-screen-bug-hunt.md organized
by severity. Auto-fix CRITICAL only. Wait for my approval on
HIGH/MEDIUM/LOW.
```

---

*PRD version 1.0 — Welcome Screen with Device-Aware Controls Reference*
