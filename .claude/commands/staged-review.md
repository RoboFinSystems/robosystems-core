---
description: Review the staged diff against this package's consumer contract, packaging, and ESM rules.
---

Review all staged changes (`git diff --cached`) with focus on the contexts below. Read the diff first — if nothing is staged, say so rather than reviewing the working tree.

This is `@robosystems/core`: the **published shared frontend core** for `robosystems-app`, `roboledger-app`, and `roboinvestor-app`. It is Next.js-specific by design (App Router `'use client'`/`'use server'`, Server Actions, `next/headers`), ESM-only, and published from `dist/`. It is a **public repository**.

## Consumer contract (decides the verdict)

Three apps track this package, so the exported surface is a contract:

- Is an export removed or renamed? A prop contract changed? Rendered structure altered in a way app CSS or tests depend on? Each needs coordinated adoption across all three apps and must be stated, not discovered.
- Does new surface actually appear in its barrel? An unexported component is invisible to consumers.
- **Brand tokens are per-app.** The `primary-*` Tailwind colors are defined in each app, not here. A component that hardcodes a brand color, or assumes a token this repo doesn't own, will look wrong in at least one app.
- Was the change validated in a real app (`npm run pack:local`, then install the tarball)? For rendering or wiring changes that's the only evidence that counts — nothing in this repo exercises the package as an app consumes it.

## Packaging and build (small diffs, three-app blast radius)

These are the changes most likely to break consumers and least likely to be caught by a test:

- **`'use client'` / `'use server'` directives** must survive to the top of each **emitted** file. The build is per-file `tsc` on purpose — never a bundler, which merges files and strips them. CI validates directive counts in `dist/`; moving code between files can silently drop one, and it surfaces in an app as a confusing server/client boundary error.
- **ESM only.** `"type": "module"` — a CommonJS `require()` throws at runtime inside consumer bundles, and a `try`/`catch` around it degrades into **silent feature loss** rather than a visible error. This already bit the GraphQL auth path once. Any `require()` staged here is blocking; use static or dynamic `import`.
- **Published from `dist/`.** `scripts/prepare-package.mjs` writes `dist/package.json` and the package is packed from that directory so compiled files sit at the package root. That layout is what lets apps deep-import both directory barrels (`@robosystems/core/ui-components`) and direct files (`@robosystems/core/hooks/use-toast`) with no `exports` map. Any change here risks every deep import in three apps.
- **`sideEffects`.** `index.ts` configures the `@robosystems/client` SDK at import time, and `dist/package.json` declares `sideEffects: ['./index.js']`. A side effect added outside that file will be tree-shaken away in consumers.
- **Peers, not deps.** `react`, `react-dom`, `next`, `flowbite-react`, `react-icons`, and `@robosystems/client` stay peers so apps keep one instance each. A peer promoted to a dependency causes duplicate-React and context-identity bugs; a narrowed range produces `ERESOLVE` on every app install.

## Component quality

- Properly typed, with no `any` used to silence `tsc`?
- `'use client'` applied at the right level — pushed to the leaf that needs it, not hoisted?
- Does anything server-only leak into a client component, or a client hook into a server one?
- Is state at the right level, and do the contexts (graph, organization, entity, service-offerings, sidebar) stay the single source they're meant to be?
- Flowbite and existing Tailwind idiom followed, dark mode handled, responsive behavior checked. These regress silently and reach three apps at once.
- Accessibility: labels, keyboard reachability, heading order — a shared component's a11y bug is three apps' a11y bug.

## Auth and secrets

- `auth-core/` and `auth-components/` handle sessions and tokens. Is anything logged, stringified into an error, or persisted where it shouldn't be?
- No API keys, JWTs, graph IDs, or real financial data in tests, fixtures, or comments.

## Testing

- Do new components have tests? They live in `__tests__/` alongside source and run **here**, not in the apps.
- Does the mock surface in `test/__mocks__/` need extending? It mirrors the apps' `src/__mocks__` — a new `@robosystems/client` import that isn't stubbed fails as an opaque module-resolution error.
- Is the test asserting correct behavior, or just what the code currently does?
- Note `vitest.setup.ts` assigns `globalThis.jest = vi`, and source guards dev-only logging with `typeof jest === 'undefined'` — don't "fix" that guard without understanding it.

## Lint debt

`no-unused-vars` is temporarily `warn` here (pre-existing debt). Don't add new warnings, and don't silence the rule further — the intent is to burn it down and promote it back to `error`.

## Public-repo hygiene

- No customer names, graph IDs, internal cost/pricing detail, or real financial data in code, comments, or fixtures.
- If the change fixes a security issue, keep commit messages and comments terse and non-actionable — the area hardened, never the mechanism. The vulnerable version stays installable on npm until a patch is published.

## Output

1. **Consumer impact**: BREAKING / ADDITIVE / INTERNAL, and for breaking, what each of the three apps must change
2. **Issues**: Problems that should be fixed before commit
3. **Suggestions**: Improvements that aren't blocking
4. **Questions**: Anything unclear that needs clarification

Anchor each finding to `file:line`. If the staged diff is clean, say so plainly rather than manufacturing findings.
