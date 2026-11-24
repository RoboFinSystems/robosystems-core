# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@robosystems/core` is the shared frontend core for the three RoboSystems Next.js apps (robosystems-app, roboledger-app, roboinvestor-app), published to public npmjs. It is Next.js-specific by design (App Router `'use client'`/`'use server'` components, Server Actions, `next/headers` cookie helpers) and its compiled output targets bundler resolution — it is not loadable by Node's native ESM resolver. `ui/` holds the shared UI primitives the apps import from `@robosystems/core/ui`; there is no external component library.

## Development Commands

```bash
npm install          # Also wires .githooks via the prepare script
npm run test         # Vitest suite (jsdom, app-equivalent mocks in test/__mocks__)
npm run test:all     # format:check + lint + typecheck + test + build
npm run build        # tsc → dist/ + scripts/prepare-package.mjs (publishable package root)
npm run pack:local   # Build + npm pack ./dist → tarball for local app validation
npm run lint:fix     # Fix ESLint issues
npm run format       # Prettier (same config as the apps, incl. tailwind class sorting)
```

Validate changes in an app before releasing:

```bash
npm run pack:local
cd ../roboledger-app && npm install ../robosystems-core/robosystems-core-<version>.tgz
```

## Packaging Rules

- **Published from `dist/`**: `prepare-package.mjs` writes `dist/package.json` and the package is packed/published from that directory, so compiled files sit at the package root. The apps deep-import both directory barrels (`@robosystems/core/ui`, `@robosystems/core/ui-components`) and direct files (`@robosystems/core/hooks/use-toast`) — publish-from-dist lets plain bundler resolution serve both with no `exports` map.
- **Per-file tsc, never a bundler**: the build must preserve `'use client'` / `'use server'` directives at the top of each emitted file; bundling would merge files and strip them. CI validates directive counts in `dist/`.
- **ESM only — no `require()`**: the package is `"type": "module"`; CommonJS `require()` throws at runtime in consumer bundles (and try/catch can swallow it into silent feature loss — this bit the GraphQL auth path once). Use static or dynamic `import`.
- **Root barrel side effect**: `index.ts` configures the `@robosystems/client` SDK at import time (base URL from `NEXT_PUBLIC_ROBOSYSTEMS_API_URL`, Bearer interceptor). The GraphQL `tokenProvider` is not set here: `auth-core/client.ts` sets it through `setSDKClientConfig`, and `task-monitoring/operationMonitor.ts` passes its own to each `OperationClient`. `dist/package.json` declares `sideEffects: ['./index.js']` — keep it accurate.
- **Peers, not deps**: `react`, `react-dom`, `next`, `react-icons`, and `@robosystems/client` (`>=2.34 <3`, uses the `/clients` subpath) stay peer dependencies so apps keep a single instance of each.

## Consumer App Wiring

Apps consuming this package need two config entries (already present in all three):

- Tailwind content scan: `'node_modules/@robosystems/core/**/*.js'` (Tailwind classes are authored here but compiled by the app; the `primary-*` brand tokens are defined per-app)
- Vitest: `test.server.deps.inline: [/@robosystems\/core/]` — the compiled ESM uses directory imports and needs the apps' `@robosystems/client` mock aliases applied inside it

## Graph Stage

`graph-stage/` is the landing pages' backdrop, shared by the three sites: `GraphStage` (the hero's live graph, plain WebGL), `Dust`, `GraphOrb`, `GraphGalaxies`, `GridFloor`, `NodeGlow`, and in `styles/graph-stage.css` the `node-card`, `node-link` and `node-icon` classes an app puts on its own cards and icons.

- An app imports `@robosystems/core/styles/graph-stage.css` once, and sets its colours on `:root` after the import: `--graph-1`, `--graph-2`, `--graph-3` and a `-light` shade of each, as space-separated RGB (`34 211 238`) so the styles can give them an opacity. The defaults are RoboSystems' cyan, blue and indigo. `--graph-1` leads: the dust, the floor, the light on cards and icons.
- The hero graph is seeded, and the content machine's film stage (`renderer/templates/film_stage.js`, `clusters`) draws the same graph node for node. Change the geometry in `graphStageGl.ts` and change it there too; colour takes no part in where a node sits.
- Check canvas changes in a real GPU-backed Chrome, not only headless: a headless browser has shown a canvas that real Chrome dropped.

## Testing

Tests live in `__tests__/` directories alongside source and run here (not in the apps) via vitest with jsdom and the mock surface in `test/__mocks__/` (mirrors the apps' `src/__mocks__`). `vitest.setup.ts` assigns `globalThis.jest = vi` — source guards dev-only logging with `typeof jest === 'undefined'`.

## Releasing

1. `npm run release:create` (or dispatch the **Create Release & Publish** workflow with a major/minor/patch choice)
2. The workflow bumps the version on `main`, cuts a `release/<version>` branch, tags `v<version>`, and creates a GitHub Release with an AI-generated changelog
3. A `publish` job in the same run, gated by the `production` environment's required reviewer, checks out the tag and runs build + `npm publish ./dist --provenance` via npm OIDC Trusted Publishing
4. Apps adopt with `npm install @robosystems/core@<version>` — one app per PR is fine; that's the point of version pinning

## Important Notes

- Always run `npm run test:all` before commits (the pre-commit hook enforces the check-only variants)
- Core changes affect all three apps — coordinate before releasing breaking changes
- ESLint: `no-unused-vars` is temporarily `warn` (pre-existing debt); don't add new warnings, and promote back to `error` once burned down
