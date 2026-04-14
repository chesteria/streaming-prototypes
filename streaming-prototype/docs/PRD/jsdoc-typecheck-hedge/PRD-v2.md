# PRD: JSDoc Type Check + JSON Schema Validation Hedge (v2)

**Feature slug:** `jsdoc-typecheck-hedge`
**Type:** Foundation / tooling
**Parent phase:** Foundation (cross-cutting)
**Estimated build time:** 5–7 sessions
**Created:** 2026-04-13
**Revised:** 2026-04-13 (post external review)
**Status:** Draft v2 — ready to build

---

## v2 Revision Notes

This PRD was revised after an external code review (Codex) identified six concrete issues with v1 that would have caused real problems during implementation. The v1 file is preserved in this folder as a record of what was rejected and why.

**Six issues fixed in v2:**

1. **Module-system contradiction.** v1 showed `data-store.js` using ES `import` for zod schemas, but `data-store.js` is loaded as a classic `<script>` tag — ES `import` statements don't work in classic scripts and the example code wouldn't have run. v2 resolves this by making validation **two-layered**: a Node CI script (which can use ESM freely) is the primary safety net, and runtime validation in the browser uses zod loaded as a global via UMD or skipped entirely depending on file boundary needs.
2. **`checkJs: true` vs file-by-file rollout.** v1 set `checkJs: true` and described file-by-file adoption as if they were compatible. They aren't — `checkJs: true` checks every included JS file regardless of `// @ts-check` directives. v2 uses `checkJs: false` with explicit per-file opt-in via `// @ts-check`, which matches the gradual rollout intent.
3. **Validating every JSON file in `DataStore.init()`.** v1 instructed validating all JSON inside `DataStore.init()`. This was both incomplete (device profiles are loaded by `welcome-screen.js`, EPG data is loaded by `screens/epg/data-model.js`) and harmful (would have force-loaded all 20 series files at startup, breaking the existing lazy-load behavior). v2 validates **at the loader boundary** — wherever each dataset is actually fetched.
4. **Missing ambient global declarations.** v1 jumped to per-file `@ts-check` adoption without first declaring the IIFE globals (`DataStore`, `App`, `FocusEngine`, `ScaleEngine`, etc.). Without ambient global types, the first `@ts-check` rollout would produce a flood of avoidable noise on every cross-file reference. v2 adds `types/globals.d.ts` as the first typing artifact, before any per-file `@ts-check` enablement.
5. **Dual-maintaining typedefs and zod schemas.** v1 had separate JSDoc typedefs and zod schemas describing the same shapes — double the maintenance load. v2 makes **zod the source of truth for data shapes** and uses `z.infer` to derive types for JSDoc consumption. JSDoc remains the source of truth for code-facing interfaces (globals, screen module contracts) where there's no zod equivalent.
6. **Missing positive-path smoke test.** v1's testing scope was negative-only (broken fixtures rejected by schemas). It missed the failure mode of pointing tests at the wrong schema/file/symbol — a misconfigured test setup would silently pass. v2 adds one positive smoke test per schema family validating real production data.

**Two clarifications, not fixes:**

- **Session estimate revised from 3–5 to 5–7.** The v1 estimate was anchored on a best case that ignored ambient globals, the dual-layer validation split, and the loader-boundary pattern. 5–7 is honest.
- **Session 5 acceptance criteria made concrete.** v1's "expand `@ts-check` coverage" was open-ended; v2 specifies "every file in `streaming-prototype/js/` either has `// @ts-check` or has a `TODO(typecheck): <reason>` comment."

The PRD's overall intent is unchanged: catch type errors at development time and JSON shape drift at load/CI time, without rewriting any module or changing the runtime architecture of `streaming-prototype/`.

---

## Problem

The codebase has accreted ~14K LOC of vanilla JS with no compile-time type checking and no runtime validation against the JSON data shapes in `/data/`. Three concrete pain points:

1. **Claude Code re-infers types every session.** Each new session has to re-discover what shape a `Show` or a `Rail` has by reading call sites. Type context evaporates at the session boundary.
2. **JSON shape drift isn't caught until runtime** on the specific screen that renders the affected field. A field added to `show-003.json` but not `show-004.json` only surfaces when you navigate to the PDP for show-003.
3. **Manual coordination between the 20 show JSONs is fragile.** Nothing enforces that they share the same shape.

---

## Goal

Catch type errors at development time, catch JSON shape drift before the browser ever runs (CI), and add lightweight runtime validation at the points where JSON actually crosses into the app — **without touching runtime behavior or rewriting any module**. The existing vanilla JS + IIFE architecture stays exactly as-is. This is a layered hedge, not a rewrite.

What "done" looks like:

- `npm run typecheck` runs against opted-in JS files and reports JSDoc-enforced type errors.
- `npm run validate:data` runs in Node against all JSON files under `data/` and validates them against zod schemas. CI blocks merges that fail validation.
- Runtime fetch boundaries (`DataStore.init`, `DataStore.getSeriesData`, `WelcomeScreen` device profile loader, `EPGDataModel.init`) validate their JSON when fetched, logging clear errors and falling back gracefully on failure.
- CI blocks merges that fail typecheck or data validation.
- Claude Code sees typed shapes immediately on opening any file, without having to read its way across the codebase.

---

## Specification

### 1. tsconfig.json (per-file opt-in mode)

Create `tsconfig.json` at the repo root:

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "ES2020",
    "moduleResolution": "node",
    "allowJs": true,
    "checkJs": false,
    "noEmit": true,
    "strict": false,
    "noImplicitAny": false,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": [
    "streaming-prototype/js/**/*.js",
    "streaming-prototype/js/**/*.d.ts",
    "tools/**/*.js"
  ],
  "exclude": [
    "node_modules",
    "streaming-prototype/js/firebase-config.js"
  ]
}
```

**Critical:** `checkJs: false`. Type checking is opt-in via `// @ts-check` at the top of individual files. This is the *actual* file-by-file rollout model.

### 2. Ambient global declarations (Session 1, before any `@ts-check`)

Create `streaming-prototype/js/types/globals.d.ts` declaring the IIFE-global surface area. This must exist **before** any file gets `// @ts-check`, otherwise the first opt-in will produce noise on every reference to `DataStore`, `App`, `FocusEngine`, etc.

```typescript
// streaming-prototype/js/types/globals.d.ts
//
// Ambient declarations for the IIFE globals exposed by classic <script> tags
// in index.html. These do not change runtime behavior — they teach TypeScript
// what each global looks like so per-file @ts-check produces useful errors
// rather than noise.

import type { z } from 'zod';
import type { CatalogSchema, ShowSchema, ChannelSchema, CitySchema, CollectionSchema } from '../schemas/catalog';
import type { LanderConfigSchema, RailSchema } from '../schemas/lander-config';
import type { SeriesDataSchema } from '../schemas/series';
import type { VersionSchema } from '../schemas/version';

declare global {
  // --- Data shapes (zod is source of truth, types derived) ---
  type Show = z.infer<typeof ShowSchema>;
  type Channel = z.infer<typeof ChannelSchema>;
  type City = z.infer<typeof CitySchema>;
  type Collection = z.infer<typeof CollectionSchema>;
  type Catalog = z.infer<typeof CatalogSchema>;
  type Rail = z.infer<typeof RailSchema>;
  type LanderConfig = z.infer<typeof LanderConfigSchema>;
  type SeriesData = z.infer<typeof SeriesDataSchema>;
  type VersionInfo = z.infer<typeof VersionSchema>;

  // --- IIFE singletons (declared, not implemented here) ---
  const DataStore: {
    init(): Promise<void>;
    getVersion(): VersionInfo;
    getShow(id: string): Show | null;
    getChannel(id: string): Channel | null;
    getCity(id: string): City | null;
    getCollection(id: string): Collection | null;
    getGeoState(): unknown;
    getDetectedCity(): City | null;
    getFeaturedItems(): Array<(Show | City | Collection) & { _type: 'show' | 'city' | 'collection' }>;
    getContinueWatching(): unknown[];
    getAllShows(): Show[];
    getAllChannels(): Channel[];
    getAllCities(): City[];
    getGenres(): string[];
    getTopFlix(): Show[];
    getMyMix(): Show[];
    getSeriesData(showId: string): Promise<SeriesData | null>;
    getLanderConfig(): LanderConfig;
  };

  const App: {
    init(): Promise<void>;
    navigate(screenId: string, params?: object, replace?: boolean): Promise<void>;
    back(): boolean;
    registerScreen(module: ScreenModule): void;
  };

  type KeyAction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'OK' | 'BACK' | 'PLAYPAUSE';

  type FocusZone = {
    focus(index: number): boolean;
    blur(): void;
    move(dir: 'LEFT' | 'RIGHT'): boolean;
    select(): void;
    getIndex(): number;
    getItem(): unknown;
    getItems(): unknown[];
    setItems(items: unknown[]): void;
  };

  const FocusEngine: {
    init(): void;
    enable(): void;
    disable(): void;
    setHandler(handler: (action: KeyAction, event: KeyboardEvent) => void): void;
    clearHandler(): void;
    createZone(items: unknown[], options?: {
      startIndex?: number;
      onFocus?: (index: number, item: unknown) => void;
      onBlur?: (index: number, item: unknown) => void;
      onSelect?: (index: number, item: unknown) => void;
      wrapAround?: boolean;
    }): FocusZone;
  };

  const ScaleEngine: {
    init(): void;
    destroy(): void;
    getScale(): number;
    setForcedDimensions(width: number | null, height: number | null): void;
  };

  type ScreenModule = {
    id: string;
    init(container: HTMLElement, params?: object): Promise<void> | void;
    onFocus?: () => void;
    onBlur?: () => void;
    destroy?: () => void;
    _params?: object;
  };

  const LanderScreen: ScreenModule;
  const SeriesPDPScreen: ScreenModule;
  const PlayerScreen: ScreenModule;
  const EPGScreen: ScreenModule;

  // --- analytics.js exposes these as window globals via ES module ---
  function trackEvent(name: string, params?: Record<string, unknown>): void;
  function initSession(participantId: string, deviceProfile: string): void;
  function endSession(): void;

  interface Window {
    trackEvent: typeof trackEvent;
    initSession: typeof initSession;
    endSession: typeof endSession;
  }
}

export {};
```

**Why this file matters:** every IIFE file that gets `// @ts-check` will reference at least one of these globals. Without this declaration file, TypeScript would flag every reference as an error. With it, references type-check correctly and you get real signal from the per-file rollout.

### 3. Add `// @ts-check` per file (Session 1 onward)

Add the `// @ts-check` directive to JS files in priority order. Files that surface too many errors to fix in the current session get a `TODO(typecheck): <one-line reason>` comment instead — they're tracked as opt-out, not invisible.

Priority order:

1. **Session 1:** `js/data-store.js`, `js/focus-engine.js`, `js/app.js`, `js/utils/scale.js`, `js/utils/keycodes.js`, `js/utils/animations.js`
2. **Session 2:** `js/screens/lander.js`, `js/screens/series-pdp.js`, `js/screens/player.js`
3. **Session 2:** `js/screens/epg/epg-screen.js`, `js/screens/epg/data-model.js`, `js/screens/epg/components/*.js`
4. **Session 5:** `js/analytics.js`, `js/debug-panel.js`, `js/feedback.js`, `js/welcome-screen.js`, `js/reporting.js`, `js/debug-config.js`

### 4. zod schemas (Session 3, source of truth for data shapes)

```bash
npm install zod
```

Create `streaming-prototype/js/schemas/` with one schema file per dataset. Use `.passthrough()` selectively where genuinely necessary, but **prefer strict matching** so unknown fields raise a clear error rather than slipping through.

```javascript
// streaming-prototype/js/schemas/catalog.js
// This file is loaded by the Node CI validator (tools/validate-data.js) and,
// optionally, by the runtime validator wrapper. It uses CommonJS exports
// because the Node validator is a classic Node script — this keeps the file
// usable from both contexts without bundling.
const { z } = require('zod');

const ShowSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  heroImage: z.string(),
  posterImage: z.string(),
  landscapeImage: z.string(),
  rating: z.enum(['TV-G', 'TV-PG', 'TV-14', 'TV-MA']),
  year: z.string(),
  genres: z.array(z.string()),
  seasons: z.number(),
  type: z.enum(['TV-Series', 'Movie', 'Special']),
  badges: z.array(z.string()),
  duration: z.string(),
  featured: z.boolean(),
  director: z.string(),
  cast: z.array(z.string()),
});

const ChannelSchema = z.object({ /* ... */ });
const CitySchema = z.object({ /* ... */ });
const CollectionSchema = z.object({ /* ... */ });

const CatalogSchema = z.object({
  shows: z.array(ShowSchema),
  channels: z.array(ChannelSchema),
  cities: z.array(CitySchema),
  collections: z.array(CollectionSchema),
  genres: z.array(z.string()),
  featured: z.array(z.string()),
});

module.exports = {
  ShowSchema,
  ChannelSchema,
  CitySchema,
  CollectionSchema,
  CatalogSchema,
};
```

**Why CommonJS exports:** the Node CI validator is a classic Node script and `require()`s these files. Using ESM `export` would force `"type": "module"` at the package level, which has cascading effects on the existing Jest setup. CommonJS is the path of least resistance and the schemas are still consumable from TypeScript via the type imports in `globals.d.ts` (TypeScript's `esModuleInterop` handles this).

**The schemas are the source of truth for data shapes.** Types in `globals.d.ts` are derived via `z.infer<typeof Schema>`. This eliminates dual maintenance.

### 5. Node CI validator — `tools/validate-data.js` (Session 3, primary safety net)

This is the **primary safety net**. It validates every JSON file under `streaming-prototype/data/` against its schema in Node, before any browser ever runs. It replaces the v1 plan of "validate everything in `DataStore.init()`."

```javascript
// tools/validate-data.js
// Validates every JSON file under streaming-prototype/data/ against zod schemas.
// Run via `npm run validate:data`. Exits non-zero on any failure.
//
// This is the PRIMARY safety net for JSON shape drift. The browser doesn't
// run this — it runs in Node, in CI, before merge. Runtime validation in the
// browser is a secondary debugging aid, not the primary check.

const fs = require('fs');
const path = require('path');

const { CatalogSchema } = require('../streaming-prototype/js/schemas/catalog.js');
const { LanderConfigSchema } = require('../streaming-prototype/js/schemas/lander-config.js');
const { SeriesDataSchema } = require('../streaming-prototype/js/schemas/series.js');
const { VersionSchema } = require('../streaming-prototype/js/schemas/version.js');
const { GeoStateSchema } = require('../streaming-prototype/js/schemas/geo-state.js');
const { DeviceProfileSchema } = require('../streaming-prototype/js/schemas/device-profile.js');
const { EpgMockSchema } = require('../streaming-prototype/js/schemas/epg.js');

const DATA_DIR = path.join(__dirname, '..', 'streaming-prototype', 'data');

let failures = 0;

function validate(filePath, schema, label) {
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const result = schema.safeParse(raw);
    if (!result.success) {
      console.error(`✗ ${label}: ${path.relative(process.cwd(), filePath)}`);
      console.error(JSON.stringify(result.error.format(), null, 2));
      failures++;
    } else {
      console.log(`✓ ${label}: ${path.relative(process.cwd(), filePath)}`);
    }
  } catch (e) {
    console.error(`✗ ${label}: ${filePath} — ${e.message}`);
    failures++;
  }
}

// Singleton files
validate(path.join(DATA_DIR, 'catalog.json'), CatalogSchema, 'Catalog');
validate(path.join(DATA_DIR, 'lander-config.json'), LanderConfigSchema, 'LanderConfig');
validate(path.join(DATA_DIR, 'version.json'), VersionSchema, 'Version');
validate(path.join(DATA_DIR, 'geo-state.json'), GeoStateSchema, 'GeoState');
validate(path.join(DATA_DIR, 'epg-mock.json'), EpgMockSchema, 'EpgMock');

// All series files
const seriesDir = path.join(DATA_DIR, 'series');
for (const file of fs.readdirSync(seriesDir).filter((f) => f.endsWith('.json'))) {
  validate(path.join(seriesDir, file), SeriesDataSchema, 'SeriesData');
}

// All device profiles
const profileDir = path.join(DATA_DIR, 'device-profiles');
for (const file of fs.readdirSync(profileDir).filter((f) => f.endsWith('.json'))) {
  validate(path.join(profileDir, file), DeviceProfileSchema, 'DeviceProfile');
}

if (failures > 0) {
  console.error(`\n${failures} file(s) failed validation.`);
  process.exit(1);
}
console.log('\nAll JSON files validated successfully.');
```

**This script catches every JSON file under `data/`, including the ones loaded outside `DataStore` (device profiles, EPG data) and the ones loaded lazily (series files). It runs in Node, takes ~1 second, and gives you full CI coverage with zero browser-runtime cost.**

### 6. Runtime validation at fetch boundaries (Session 4, secondary debugging aid)

Runtime validation is a **secondary** layer. The Node CI validator is the safety net; runtime validation exists to catch cases where someone runs the app in dev with a hand-edited or deliberately broken JSON file, and to provide clear error messages at the point of failure.

**Critical constraint:** zod cannot be ESM-imported in a classic script. Two viable approaches:

- **Approach A (recommended): Skip runtime validation entirely.** The Node CI validator is the primary safety net, and CI blocks bad data before merge. Runtime validation in the browser adds complexity, bundle weight, and the module-system problem from v1, in exchange for catching cases that the Node validator already catches. **For a prototype, the CI gate is sufficient.**
- **Approach B: Load zod via UMD script tag, validate at fetch boundaries with `window.Zod`.** Adds a CDN dependency, but works in classic scripts. Use only if Approach A proves insufficient in practice.

**v2 recommends Approach A for the initial implementation.** If runtime validation later proves valuable (e.g., during a tricky debug session where the Node validator passed but the browser is misbehaving), Approach B can be added in a follow-up. Treat runtime validation as opt-in, not mandatory.

If Approach B is later adopted, the validation pattern is:

```javascript
// Hypothetical pattern — only if Approach B is adopted later
async function loadJSONValidated(path, schemaName) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}`);
  const data = await response.json();
  const schema = window.Schemas[schemaName];
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Validation] ${path} failed schema check:`, result.error.format());
    return null;
  }
  return result.data;
}
```

And the call sites that *would* use it:

- `js/data-store.js` → `init()` validates `catalog.json`, `lander-config.json`, `version.json`, `geo-state.json`
- `js/data-store.js` → `getSeriesData(showId)` validates each series JSON when fetched
- `js/welcome-screen.js` → device profile fetch validates against `DeviceProfileSchema`
- `js/screens/epg/data-model.js` → `init()` validates `epg-mock.json`

**Each of these locations gets validation only if Approach B is adopted.** Under Approach A (the recommendation), runtime validation is skipped and the loader-boundary list above is documentation of *where validation would go* if it's ever needed.

### 7. Tests (Session 3)

Two layers of tests, all using the existing Jest setup (no new test infrastructure):

#### Negative fixtures (catches schema permissiveness)

Five intentionally-broken JSON fixtures, each with one assertion:

```
streaming-prototype/tests/fixtures/broken/
├── catalog-missing-shows.json        # catalog with no `shows` key
├── show-wrong-rating.json            # rating: "TV-X" (not in enum)
├── lander-config-unknown-rail.json   # rail with type: "fake-rail"
├── version-missing-build.json        # version.json without buildNumber
└── series-missing-episodes.json      # season with no episodes array
```

```javascript
// tests/unit/schemas-reject-bad-data.test.js
const { CatalogSchema } = require('../../streaming-prototype/js/schemas/catalog.js');
const { LanderConfigSchema } = require('../../streaming-prototype/js/schemas/lander-config.js');
const { SeriesDataSchema } = require('../../streaming-prototype/js/schemas/series.js');
const { VersionSchema } = require('../../streaming-prototype/js/schemas/version.js');

const brokenCatalog = require('../fixtures/broken/catalog-missing-shows.json');
const brokenShow = require('../fixtures/broken/show-wrong-rating.json');
const brokenLanderConfig = require('../fixtures/broken/lander-config-unknown-rail.json');
const brokenVersion = require('../fixtures/broken/version-missing-build.json');
const brokenSeries = require('../fixtures/broken/series-missing-episodes.json');

test('CatalogSchema rejects catalog missing shows array', () => {
  expect(CatalogSchema.safeParse(brokenCatalog).success).toBe(false);
});

test('Catalog ShowSchema rejects show with invalid rating', () => {
  // (or test against a sub-schema once exported)
  expect(CatalogSchema.safeParse({ shows: [brokenShow], channels: [], cities: [], collections: [], genres: [], featured: [] }).success).toBe(false);
});

test('LanderConfigSchema rejects unknown rail type', () => {
  expect(LanderConfigSchema.safeParse(brokenLanderConfig).success).toBe(false);
});

test('VersionSchema rejects version missing buildNumber', () => {
  expect(VersionSchema.safeParse(brokenVersion).success).toBe(false);
});

test('SeriesDataSchema rejects season missing episodes', () => {
  expect(SeriesDataSchema.safeParse(brokenSeries).success).toBe(false);
});
```

#### Positive smoke test (catches misconfigured wiring)

One assertion per major schema, validating the **real production data file**. Catches the failure mode of pointing tests at the wrong schema, exporting the wrong symbol, or breaking a require path:

```javascript
// tests/unit/schemas-accept-real-data.test.js
const { CatalogSchema } = require('../../streaming-prototype/js/schemas/catalog.js');
const { LanderConfigSchema } = require('../../streaming-prototype/js/schemas/lander-config.js');
const { VersionSchema } = require('../../streaming-prototype/js/schemas/version.js');

const realCatalog = require('../../streaming-prototype/data/catalog.json');
const realLanderConfig = require('../../streaming-prototype/data/lander-config.json');
const realVersion = require('../../streaming-prototype/data/version.json');

test('Real catalog.json validates against CatalogSchema', () => {
  const result = CatalogSchema.safeParse(realCatalog);
  if (!result.success) console.error(result.error.format());
  expect(result.success).toBe(true);
});

test('Real lander-config.json validates against LanderConfigSchema', () => {
  expect(LanderConfigSchema.safeParse(realLanderConfig).success).toBe(true);
});

test('Real version.json validates against VersionSchema', () => {
  expect(VersionSchema.safeParse(realVersion).success).toBe(true);
});
```

**These two test files together catch both directions of failure** — schemas that are too permissive (negative fixtures) and schemas that are wired incorrectly to begin with (positive smoke). Total cost: ~15 minutes inside Session 3.

### 8. CI gates (Session 5)

Two CI workflows, both adding required status checks on PRs to `main`:

`.github/workflows/typecheck.yml`:

```yaml
name: Typecheck
on:
  pull_request:
    branches: [main]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run typecheck
```

`.github/workflows/validate-data.yml`:

```yaml
name: Validate Data
on:
  pull_request:
    branches: [main]
jobs:
  validate-data:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run validate:data
```

`package.json` scripts:

```json
"scripts": {
  "typecheck": "tsc --noEmit",
  "validate:data": "node tools/validate-data.js",
  "test": "jest --forceExit"
}
```

**Validate before enforcing.** Run both workflows on a throwaway branch first to confirm they pass on the current state of `main`. Only enable required status checks once both are green.

### 9. Documentation (Session 5)

Create `docs/JSDOC_GUIDE.md` covering:
- The two-layer validation model (CI + optional runtime)
- How to add a new schema (zod file → CI validator entry → fixture if applicable)
- How to add `@ts-check` to a file
- How to use `TODO(typecheck)` for opt-outs
- How types are derived from zod schemas via `z.infer`
- The CommonJS schema convention and why

---

## Session Budget

| Session    | Work                                                                                                                                                                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1          | `tsconfig.json` (with `checkJs: false`), `package.json` script entries, `js/types/globals.d.ts` (full ambient declarations), enable `// @ts-check` on 6 core files (data-store, focus-engine, app, scale, keycodes, animations), fix surfaced errors       |
| 2          | Enable `@ts-check` on the three main screens (lander, pdp, player) and the EPG sub-files; grandfather painful files with `TODO(typecheck): <reason>`                                                                                                       |
| 3          | Install zod, write all schemas (CommonJS), build `tools/validate-data.js`, write 5 broken fixtures + negative tests + positive smoke tests, run validator against current data and fix any drift discovered                                                |
| 4          | **Make the runtime-validation decision (A vs B).** Default: Approach A — skip runtime validation, document where it would go if needed. If A is chosen, this session is short and used to update `globals.d.ts` types if any drift was found in Session 3. |
| 5          | Enable `@ts-check` on the remaining files (analytics, debug-panel, feedback, welcome-screen, reporting, debug-config), wire both CI workflows, validate them on a throwaway branch, write `docs/JSDOC_GUIDE.md`                                            |
| 6 (buffer) | Catchup for any session that overran. Specifically reserved for ambient global iteration if Sessions 1–2 surface real issues with the global declarations.                                                                                                 |
| 7 (buffer) | Final polish, second-pass `@ts-check` cleanup, any documentation gaps                                                                                                                                                                                      |

5 is the target; 7 is the ceiling. **If the work is exceeding 7 sessions, stop and reassess** rather than pushing through — that's a signal something in the plan is wrong, not a signal to grind harder.

**Acceptance criterion for Session 5 (concrete):** every `.js` file under `streaming-prototype/js/` either has `// @ts-check` at the top OR has a `TODO(typecheck): <one-line reason>` comment. No invisible opt-outs. The reason should be specific enough to act on later (e.g., `TODO(typecheck): heavy use of dynamic property access in DOM builders, needs targeted refactor`).

---

## What to Skip

- **Do NOT convert `.js` → `.ts`.** That's the migration we explicitly chose not to do.
- **Do NOT enable strict mode.** Retrofitting is hours of busywork.
- **Do NOT enable `checkJs: true`.** Per-file opt-in via `// @ts-check` is the actual rollout model.
- **Do NOT refactor IIFE patterns.** Leave global singletons alone.
- **Do NOT change the module loading system.** Script tags stay.
- **Do NOT try to type every internal helper.** Public interfaces only.
- **Do NOT validate at every access point in the browser.** CI is the primary safety net.
- **Do NOT force-load lazy-loaded JSON at startup.** Series files stay lazy.
- **Do NOT introduce Vitest, `@testing-library/dom`, or any new test infrastructure.** Those decisions belong in Phase 3.
- **Do NOT write JSDoc typedefs that duplicate zod schemas.** Use `z.infer` in `globals.d.ts` instead.

---

## Analytics Events

N/A. This is a tooling change with no user-visible surface.

---

## Risks

1. **Ambient global declarations in `globals.d.ts` drift from runtime reality.** *Mitigation:* the declarations are derived by reading the actual IIFE source files. If a method signature changes in `data-store.js` and the declaration isn't updated, `@ts-check` will flag it on the next run, which is the desired behavior. Treat the declaration file as a living document maintained alongside the IIFE files it describes.
2. **Schema strictness might reject real data on first run.** *Mitigation:* Session 3's `npm run validate:data` is run against current data *as part of the chunk*, before CI is enabled. Any drift surfaced is fixed at the data layer (or the schema is loosened with explicit reasoning) before the CI gate goes live.
3. **`TODO(typecheck)` opt-outs accumulate and never get fixed.** *Mitigation:* Session 5's acceptance criterion requires every opt-out to have a specific reason. Future opportunistic cleanup is encouraged but not blocking.
4. **The Node CI validator and the runtime architecture diverge.** *Mitigation:* both consume the same schema files. The schema is the contract; both layers must respect it.
5. **CI gates block work if misconfigured.** *Mitigation:* Session 5 explicitly validates both workflows on a throwaway branch before enabling required status checks on `main`.
6. **CommonJS schema files cause friction with future ESM tooling.** *Mitigation:* if Phase 3's Vite build wants ESM versions of the schemas, they can be re-exported from a tiny ESM wrapper at that time. The CommonJS source-of-truth choice is for Phase 1 compatibility and doesn't preclude wrapping.

---

## Relationship to the Broader Stack Question

This PRD captures most of the type-safety win from a full Vite+TS migration at roughly 1/10th the cost and zero risk to the shipping codebase. It is designed to be valuable **on its own**, independent of any future toolchain decision.

If the greenfield Phase 3 in Vite+TS+Tailwind proceeds (see `docs/PRD/phase3-experience-completion/`), the zod schemas written here port directly — zod schemas *are* TS types via `z.infer<typeof Schema>`, and the schema files can be re-imported into the Phase 3 codebase as-is or wrapped in a thin ESM adapter. Nothing done here is thrown away by a later migration, if one ever happens.

---

## File Location

```
docs/PRD/jsdoc-typecheck-hedge/
├── PRD-v1.md       ← initial draft (kept as record)
├── PRD-v2.md       ← this file (post external review)
└── progress.md     ← running log (TBD once started)
```
