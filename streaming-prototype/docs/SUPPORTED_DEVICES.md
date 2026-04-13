# Supported Devices

> Living reference for the device platforms this codebase targets, which ones are out of scope, and which ones are handled by parallel implementations.
> Last updated: 2026-04-13

---

## Summary Matrix

| Platform | Status | Min version | Web engine (approx) | Deploy path |
|---|---|---|---|---|
| **Samsung Tizen** | ✅ Supported | Tizen 5.5 (2020+ models) | Chromium 69 | Hosted URL in native browser/WebView |
| **VIZIO SmartCast** | ✅ Supported | 2019+ | Chromium-based | Hosted URL in native browser |
| **AndroidTV / Google TV** | ✅ Supported | Android 9+ | Current Chromium | Hosted URL in Chrome / native browser |
| **NVIDIA Shield** | ✅ Supported | Android 9+ | Current Chromium | Hosted URL in Chrome |
| **Google TV Streamer** | ✅ Supported | All versions | Current Chromium | Hosted URL in Chrome |
| **FireTV** | ✅ Supported (wrapped) | Fire OS 6+ (API 25+) | Chromium ~70 | Sideloaded APK via Capacitor wrapper |
| **Roku** | ❌ Out of scope (parallel) | — | N/A — not a web platform | Future parallel project (BrightScript / SceneGraph) |
| **tvOS** | ❌ Out of scope (parallel) | — | N/A — not a web platform | Future parallel project (Swift / SwiftUI) |
| **Mobile (iOS / Android)** | ⏳ Future phase | TBD | TBD | TBD — likely a separate phase with its own toolchain decisions |

---

## Web Targets — Detailed Notes

### Samsung Tizen (5.5+)

- **Floor:** Tizen 5.5, which ships on Samsung 2020+ TV models. Per Samsung's developer documentation, 2020 devices run Tizen 5.5; 2021 devices run Tizen 6.0; 2022+ runs newer.
- **Chromium baseline:** ~Chromium 69. This supports dynamic `import()`, `import.meta.env`, modulepreload, ES2017+, BroadcastChannel, CSS custom properties — everything the planned toolchain needs.
- **Tizen 4.0 (2018 models) is explicitly deprecated** as of 2026-04-13. It was too painful to develop against and gated too many modern toolchain features. See `CHANGELOG.md` for the deprecation note.
- **Why not bump to Tizen 6.0 as the floor?** Evaluated and rejected. The Chromium 69 → 76 jump doesn't unlock anything material for this project (Tailwind v4's `color-mix()` requirement still fails on both — needs Chromium 111+). Bumping would lose 2020 model support for no benefit.

### VIZIO SmartCast (2019+)

- **Floor:** 2019 V-series and later (V505-G9 confirmed working).
- **Chromium baseline:** Chromium-based; specific version varies by SmartCast firmware. Generally close to Tizen 5.5 in capability.
- **Quirks worth knowing:** VIZIO's WebView has historically had some focus-event handling differences. Test focus interactions specifically.

### AndroidTV / Google TV (NVIDIA Shield, Google TV Streamer, etc.)

- **Floor:** Android 9+ (API 28).
- **Chromium baseline:** Current Chrome / WebView, kept up to date by Google.
- **Effectively non-constraining** — these devices handle anything the Tizen 5.5 floor handles, and significantly more. They're useful as a "does it work on a modern WebView" sanity check, not as a constraint driver.

### FireTV (Fire OS 6+ / API 25+) — via Capacitor wrapper

- **Floor:** Fire OS 6 (API 25, Android 7.1 Nougat). Earlier Fire OS versions are out of scope.
- **Chromium baseline:** ~Chromium 70 in practice. Android System WebView is updateable on API 24+, but Amazon controls update cadence on FireTV; field devices typically have a webview ~6-12 months behind current.
- **Deployment is meaningfully different from other web targets.** FireTV does not browse hosted URLs from a launcher — the practical path is a sideloaded APK that wraps the web app in a native shell.
- **Recommended wrapper:** **Capacitor** (modern, actively maintained by the Ionic team). Cordova works but is in long-term decline. Capacitor's job is purely structural — the web app code is identical to the hosted version; the wrapper just provides a `WebView` and a sideloadable APK build target.
- **Test loop is slower than other platforms.** Build APK → ADB sideload → launch on device → debug remotely via Chrome DevTools. Plan for this when scoping FireTV-specific work.
- **FireTV deployment is a separate workstream** from the core web build. The first Phase 3 deliverable does not need to ship to FireTV — that's a follow-up step once the hosted build is stable.

---

## Out-of-Scope Platforms (Parallel Implementations)

### Roku — Future Parallel Project

Roku is **not a web platform.** It uses BrightScript (or BrighterScript) with the SceneGraph XML-based scene system. There is no DOM, no browser, no WebView, and no toolchain that produces a Roku app from this codebase.

- **The Roku version, if and when it happens, will be a separate Claude Code project** that implements the same product spec and consumes the same data shapes (`catalog.json`, `lander-config.json`, design tokens) but in BrightScript/BrighterScript with native SceneGraph components.
- **Shared contract, separate code.** The data files and PRDs are portable; the implementation is not.
- **Status:** No active work. Tracked as a future possibility, not a current obligation.

### tvOS — Future Parallel Project

tvOS apps are written in Swift (SwiftUI or UIKit) or, less commonly, TVMLKit (Apple's XML+JS templating system). Like Roku, it is not a web platform and requires a parallel implementation.

- **The tvOS version, if and when it happens, will be a separate Claude Code project** in SwiftUI consuming the same data contracts.
- **Status:** No active work. Tracked as a future possibility, not a current obligation.
- **A WKWebView-wrapping approach is technically possible** but has significant focus-management quirks because tvOS's focus engine is system-managed, not app-managed. Not recommended unless the SwiftUI path proves impractical.

---

## Deferred Platforms

### Mobile (iOS / Android)

Mobile is a planned future phase but is **out of scope for the current codebase.** ScaleEngine assumes a 1920×1080 logical canvas and TV-style remote/d-pad input — neither holds for mobile. When mobile lands, it will be a phase of its own with its own toolchain decisions (likely a Capacitor wrapper or a parallel responsive implementation).

---

## Notes on the Test Matrix in Practice

Not every change needs to be tested on every device. A pragmatic test cadence:

- **Per-PR smoke test:** Tizen 5.5 + Chrome desktop. Catches the binding-constraint platform plus the modern baseline.
- **Per-screen completion:** Add VIZIO 2019 + an AndroidTV/Shield device. Confirms the wider field.
- **Pre-release / pre-demo:** Full available matrix including FireTV (via wrapper).

This cadence keeps the test loop fast during normal development and reserves the slower targets (FireTV especially, because of the APK build/sideload cycle) for moments where the cost is justified.

---

## Related Documents

- `docs/CHANGELOG.md` — see the 2026-04-13 entry for the Tizen 4.0 deprecation
- `docs/PRD/phase3-experience-completion/PRD-v1.md` — the active Phase 3 PRD, which uses this device matrix as its target
- `docs/KNOWN_ISSUES.md` — runtime quirks and limitations (separate concern from platform support)
