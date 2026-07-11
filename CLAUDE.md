# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@robosystems/core` is the shared frontend core for the three RoboSystems Next.js apps (robosystems-app, roboledger-app, roboinvestor-app), published to public npmjs. It is Next.js-specific by design (App Router `'use client'`/`'use server'` components, Server Actions, `next/headers` cookie helpers) and its compiled output targets bundler resolution — it is not loadable by Node's native ESM resolver.

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

- **Published from `dist/`**: `prepare-package.mjs` writes `dist/package.json` and the package is packed/published from that directory, so compiled files sit at the package root. The apps deep-import both directory barrels (`@robosystems/core/ui-components`) and direct files (`@robosystems/core/hooks/use-toast`) — publish-from-dist lets plain bundler resolution serve both with no `exports` map.
- **Per-file tsc, never a bundler**: the build must preserve `'use client'` / `'use server'` directives at the top of each emitted file; bundling would merge files and strip them. CI validates directive counts in `dist/`.
- **ESM only — no `require()`**: the package is `"type": "module"`; CommonJS `require()` throws at runtime in consumer bundles (and try/catch can swallow it into silent feature loss — this bit the GraphQL auth path once). Use static or dynamic `import`.
- **Root barrel side effect**: `index.ts` configures the `@robosystems/client` SDK at import time (base URL from `NEXT_PUBLIC_ROBOSYSTEMS_API_URL`, Bearer interceptor, GraphQL `tokenProvider`). `dist/package.json` declares `sideEffects: ['./index.js']` — keep it accurate.
- **Peers, not deps**: `react`, `react-dom`, `next`, `flowbite-react`, `react-icons`, and `@robosystems/client` (>=0.3.2, uses the `/clients` subpath) stay peer dependencies so apps keep a single instance of each.

## Consumer App Wiring

Apps consuming this package need two config entries (already present in all three):

- Tailwind content scan: `'node_modules/@robosystems/core/**/*.js'` (Tailwind classes are authored here but compiled by the app; the `primary-*` brand tokens are defined per-app)
- Vitest: `test.server.deps.inline: [/@robosystems\/core/]` — the compiled ESM uses directory imports and needs the apps' `@robosystems/client` mock aliases applied inside it

## Testing

Tests live in `__tests__/` directories alongside source and run here (not in the apps) via vitest with jsdom and the mock surface in `test/__mocks__/` (mirrors the apps' `src/__mocks__`). `vitest.setup.ts` assigns `globalThis.jest = vi` — source guards dev-only logging with `typeof jest === 'undefined'`.

## Releasing

1. `npm run release:create` (or dispatch the **Create Release & Publish** workflow with a major/minor/patch choice)
2. The workflow bumps the version on `main`, cuts a `release/<version>` branch, tags `v<version>`, and creates a GitHub Release with an AI-generated changelog
3. The `release/**` push triggers `publish.yml`: build + `npm publish ./dist --provenance` via npm OIDC Trusted Publishing
4. Apps adopt with `npm install @robosystems/core@<version>` — one app per PR is fine; that's the point of version pinning

## Important Notes

- Always run `npm run test:all` before commits (the pre-commit hook enforces the check-only variants)
- Core changes affect all three apps — coordinate before releasing breaking changes
- ESLint: `no-unused-vars` is temporarily `warn` (pre-existing debt); don't add new warnings, and promote back to `error` once burned down
