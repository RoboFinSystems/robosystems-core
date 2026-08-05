---
description: Run the full test and code-quality gate, fixing failures to green.
argument-hint: '[test-file-or-path]'
---

Run `npm run test:all` and systematically fix all failures to achieve 100% completion.

## Timeouts

Use `timeout: 600000` (10 minutes) on Bash calls for `npm run test:all`. The default 2-minute Bash timeout is too short — prettier walks the tree, `tsc` runs on the full project, and the build emits per-file output plus the package assembly step.

## Strategy

1. **Run full suite first**: use the grep pattern below to extract the signal.
2. **Fix in the order `test:all` runs**: `format:check` → `lint` → `typecheck` → `test` → `build`. It's an `&&` chain and short-circuits on the first failure, so fix that layer before re-running.
3. **Iterate on the failing layer only** before re-running the full suite.
4. **Stop when done**: once it passes, stop immediately. Do NOT re-run to "confirm."

## What `npm run test:all` actually runs

```
npm run format:check && npm run lint && npm run typecheck && npm run test && npm run build
```

**Unlike the consuming apps, this gate is check-only — it does not auto-write.** The apps' `test:all` runs `format` and `lint:fix` and silently rewrites files; this one runs `format:check` and `lint` and _fails_ instead. So a formatting failure here needs an explicit `npm run format` / `npm run lint:fix` and a re-stage; nothing is fixed for you. That also means the gate matches the pre-commit hook exactly, so a green gate really does mean a clean commit.

The `build` step is part of the gate for a reason: it's per-file `tsc` plus `scripts/prepare-package.mjs`, and it's where packaging mistakes surface. CI additionally validates the emitted package structure and the `'use client'` / `'use server'` directive counts in `dist/` — so a green local gate can still fail CI on directive loss if a change moved code between files.

## Output Handling

`npm run test:all` prints prettier's file walk, then eslint, then tsc, then vitest, then the build. With plain `| tail -N` the vitest summary scrolls away behind build output. Filter:

```
npm run test:all 2>&1 | grep -E "Test Files|Tests |FAIL|✗|×|error TS|✖|Error:" | tail -30
```

Captures the vitest summary (`Test Files`, `Tests`), failing files/tests (`FAIL`, `✗`, `×`), TypeScript errors (`error TS`), ESLint errors (`✖`), and generic `Error:` lines. **Success = a `Test Files ... passed` line, no failure markers, and the build completing** — the build runs last, so a truncated tail that ends mid-build is not a pass.

## Key Commands

**Full suite:**

- `npm run test:all` — format:check + lint + typecheck + test + build

**Iteration (one layer at a time):**

- `npx vitest run <path>` — a single test file (fastest feedback)
- `npm run test` — vitest only
- `npm run typecheck` — `tsc -p tsconfig.build.json --noEmit`
- `npm run lint` / `npm run lint:fix`
- `npm run format:check` / `npm run format`
- `npm run build` — clean + tsc + prepare-package
- `npm run pack:local` — build + `npm pack ./dist`, producing the tarball for real-app validation

## Validating in a consuming app

Nothing in this repo exercises the package the way an app does. For any consumer-visible change, the real test is:

```bash
npm run pack:local
cd ../roboledger-app && npm install ../robosystems-core/robosystems-core-<version>.tgz
npm run test:all     # in the app
```

Do this before releasing anything that touches rendering, exports, or packaging — and remember the app install is a real change to that app's `package.json`/lockfile, so revert it when you're done rather than leaving a tarball path committed.

## Notes

- Vitest uses `✓` for pass and `✗`/`×` for fail, plus a `FAIL` prefix for files containing failures.
- Tests live in `__tests__/` directories alongside source and run **here**, not in the apps.
- **Module-resolution failures are usually a missing mock.** `test/__mocks__/` mirrors the apps' `src/__mocks__`; a component that starts importing a new symbol from `@robosystems/client` fails as an opaque import error until the stub gains it. Fix the mock, not the test.
- `vitest.setup.ts` assigns `globalThis.jest = vi`, and source guards dev-only logging with `typeof jest === 'undefined'`. That's deliberate — don't "simplify" it to make a test pass.
- **`no-unused-vars` is `warn`, not `error`** (pre-existing debt). `npm run lint` therefore passes with warnings — don't read a clean exit as a clean lint, and don't add new warnings.
- A `require()` anywhere in source is a runtime failure in consumer bundles, not a style issue — the package is ESM-only.

## Goal

100% pass on `npm run test:all` with no errors of any kind. Efficiency matters — don't re-run the full suite until you've fixed all known issues in the current layer.

$ARGUMENTS
