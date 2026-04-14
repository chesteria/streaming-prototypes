# JSDoc / Type-Check Guide

This document explains the two-layer type-safety system added by the `jsdoc-typecheck-hedge` PRD. It covers how to maintain the system when adding new files, schemas, or globals.

---

## Two-layer model

| Layer | Tool | When it runs | What it catches |
|---|---|---|---|
| **Layer 1 — Type checking** | TypeScript (`tsc --noEmit`) via `npm run typecheck` | On push/PR (`.github/workflows/typecheck.yml`) | Wrong argument types, missing properties, DOM type mismatches |
| **Layer 2 — Data validation** | `tools/validate-data.js` via `npm run validate:data` | On push/PR (`.github/workflows/validate-data.yml`) | JSON files drifting from their zod schemas (missing fields, wrong types, enum violations) |

Neither layer changes runtime behavior. No code is compiled or emitted.

---

## Opting a file into type checking

Add `// @ts-check` as the **very first line** of the file:

```js
// @ts-check
/* ============================================================
   MY SCREEN — …
```

TypeScript only checks files that opt in. All files under `streaming-prototype/js/` must have either `// @ts-check` **or** a `TODO(typecheck):` comment explaining why it's deferred (see below).

### Files that should NOT use `// @ts-check` yet

Large files with heavy DOM manipulation require many `querySelector` casts before the checker produces useful signal. Mark them with a one-line reason:

```js
// TODO(typecheck): ~800-line file with extensive DOM manipulation. Deferring @ts-check
// until querySelector casts can be triaged in a dedicated session.
```

Currently deferred: `debug-panel.js`, `debug-config.js`, `reporting.js`.

---

## IIFE globals: `var` not `const`

TypeScript's global-script mode disallows re-declaring a `const` that already has an ambient `var` declaration in `.d.ts` files. All IIFE singletons assigned at global scope must use `var`:

```js
// CORRECT — TypeScript global-script compatible
var DataStore = (function() {
  // ...
  return { init, getShow, … };
})();

// WRONG — causes TS2451 "Cannot redeclare block-scoped variable"
const DataStore = (function() { … })();
```

ES module files (`analytics.js`) use `export function` / `export const` and are **not** affected by this rule.

---

## Adding a new IIFE global

1. Use `var` (not `const`) for the global assignment.
2. Add an ambient declaration to `streaming-prototype/js/types/globals.d.ts`:

```typescript
var MyNewThing: {
  doSomething(arg: string): void;
  getValue(): number;
};
```

3. Add `// @ts-check` to the new file.
4. Run `npm run typecheck` to verify no new errors.

---

## Zod schemas — source of truth for JSON shapes

All JSON data files have a corresponding zod schema in `streaming-prototype/js/schemas/`. The schemas are CommonJS (`require`/`module.exports`) so they can be required by both Jest tests and the Node CI validator.

```
data/catalog.json              → js/schemas/catalog.js
data/lander-config.json        → js/schemas/lander-config.js
data/epg-mock.json             → js/schemas/epg.js
data/geo-state.json            → js/schemas/geo-state.js
data/version.json              → js/schemas/version.js
data/series/*.json             → js/schemas/series.js
data/device-profiles/*.json    → js/schemas/device-profile.js
```

### Adding a field to a JSON schema

1. Edit the schema file (e.g. `js/schemas/catalog.js`).
2. `globals.d.ts` **automatically** picks up the change via `z.infer<typeof Schema>` — no manual type update needed.
3. Run `npm run validate:data` to confirm all JSON files still conform.
4. Run `npm run typecheck` to confirm the TS types are consistent.

### Adding a new JSON data file

1. Create the schema file in `js/schemas/`.
2. Import and add validation to `tools/validate-data.js`.
3. Add `z.infer<typeof NewSchema>` to `globals.d.ts` if screen JS needs the type.
4. Write a positive smoke test in `tests/unit/schemas-accept-real-data.test.js` and a negative fixture test in `tests/unit/schemas-reject-bad-data.test.js`.

### `z.infer` pattern

```typescript
// globals.d.ts — how data-shape types are declared
import type { z } from 'zod';
import type { ShowSchema } from '../schemas/catalog';

declare global {
  type Show = z.infer<typeof ShowSchema>;
}
```

TypeScript resolves the CommonJS `module.exports` from the schema file and derives the full TypeScript type. This means the schema file is the **single source of truth** — update the schema and the type updates automatically.

---

## CDN globals

Third-party libraries loaded via `<script>` CDN tags are not resolvable by TypeScript. Declare minimal interfaces in `globals.d.ts`:

```typescript
interface HlsConstructor {
  new(): HlsInstance;
  isSupported(): boolean;
  Events: Record<string, string>;
}
var Hls: HlsConstructor;
```

Use `// @ts-ignore` (with a reason) only for import/require paths that can't be resolved (e.g. CDN URLs, the git-ignored `firebase-config.js`):

```js
// @ts-ignore — CDN URL resolved at runtime; not a resolvable TS module path
const { initializeApp } = await import('https://www.gstatic.com/firebasejs/…/firebase-app.js');
```

---

## Running checks locally

```bash
# Type check all opted-in files
npm run typecheck

# Validate all JSON data files against their schemas
npm run validate:data

# Run all tests (includes schema acceptance + rejection tests)
npm test
```

---

## CI workflows

| Workflow | File | Triggers on |
|---|---|---|
| Typecheck | `.github/workflows/typecheck.yml` | Changes to `streaming-prototype/js/**`, `tsconfig.json`, `package.json` |
| Validate Data | `.github/workflows/validate-data.yml` | Changes to `streaming-prototype/data/**`, `streaming-prototype/js/schemas/**`, `tools/validate-data.js` |

Both workflows run on push to `main` and on pull requests. To enable them as **required status checks**, go to GitHub → Settings → Branches → Branch protection rules → require status checks to pass before merging.

**Validate on a throwaway branch first** before enabling required checks on `main`, to confirm the workflows pass cleanly in CI.
