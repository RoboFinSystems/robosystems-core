---
description: Monitor a release/publish run — diagnose failures, verify the package landed and the apps can adopt it.
argument-hint: '[run-id]'
---

Monitor a release and publish run — pinpoint why it failed, and confirm the version actually landed on npm in a state the three apps can adopt.

## How a release actually happens here

Two workflows, and the trigger between them is the part that surprises people:

1. **`create-release.yml`** (`workflow_dispatch` with a major/minor/patch choice, or `npm run release:create`) — reads the version from `package.json`, computes the next one, commits the bump **to `main`**, cuts `release/<version>` from that commit, tags `v<version>`, and creates a GitHub Release with a Claude-generated changelog.
2. **`publish.yml`** — triggered by **a push to `release/**`**, not by a merge and not by the tag. It builds and runs `npm publish ./dist --provenance` over npm OIDC trusted publishing.

So **merging a PR to `main` publishes nothing** — the release-branch push is the publishing event.

Note the publish is `npm publish ./dist`, not `npm publish`. The package is assembled by `scripts/prepare-package.mjs` and published **from `dist/`** so compiled files sit at the package root. A publish that succeeded from the wrong directory would produce a package where every deep import in three apps fails.

**There is no curated-release-notes override in this repo.** Unlike the apps and the SDK clients, `tag-release.yml` here has no `.github/release-notes/v<version>.md` check — the Claude-generated changelog is what ships, with a commit-count fallback if the API call fails. If a release needs hand-written notes, they have to be edited into the GitHub Release after the fact, or the override step ported over from `robosystems-app`.

## Scope & guardrails

- **`gh` reads are free; triggering a release is not.** Reading runs, jobs, and logs needs no confirmation. **Dispatching `create-release.yml`** is outward-facing and effectively irreversible — an npm version cannot be unpublished after 72 hours, and even within that window unpublishing breaks consumers. Confirm the bump type and ref with the user; default to watching a run they already started.
- **Never bump `package.json` by hand.** The workflow owns the bump.
- **A breaking release is a three-app event.** `robosystems-app`, `roboledger-app`, and `roboinvestor-app` all track this package. If the change set removes or renames exports, changes prop contracts, or narrows a peer range, say so and stop — don't dispatch without the user deciding how the three adoptions get sequenced.
- **Validate in an app before releasing, not after.** `npm run pack:local` plus a tarball install in one app is the only check that exercises the package the way consumers do.

## 1. Find the run

```bash
gh run list --workflow=publish.yml --limit 5
gh run list --workflow=create-release.yml --limit 5
gh run view <run-id>
gh run watch <run-id>            # live, if in flight
```

## 2. Pinpoint the failure

```bash
gh run view <run-id> --log-failed
```

- **`create-release.yml` — branch already exists.** A previous run got partway. Resolve the leftover `release/<version>` branch rather than re-dispatching blindly.
- **`create-release.yml` — push to `main` rejected.** The bump commits directly to a protected branch; a permissions failure shows up at the push step.
- **`create-release.yml` — changelog step.** A failed Claude API call falls back to a commit-count summary rather than failing the run. A release whose notes look mechanical usually means that fallback fired, not that nothing happened.
- **`publish.yml` — build.** `tsc` per file plus `prepare-package.mjs`. This is where packaging breaks surface: a missing `'use client'` directive in `dist/`, a malformed `dist/package.json`, or a bad `sideEffects` entry.
- **`publish.yml` — the upload.** OIDC trusted publishing with provenance. Failures are usually npm-side trust configuration or a name/version mismatch, not the code.
- **Version already on npm.** The publish will refuse rather than overwrite. If you expected a publish, the version wasn't bumped.

## 3. Verify it actually landed

A green workflow is not proof. Check npm directly:

```bash
npm view @robosystems/core version              # latest published
npm view @robosystems/core versions --json      # full history
```

Then confirm the artifact is shaped correctly, since packaging faults don't fail the publish:

```bash
npm pack @robosystems/core@<version> --dry-run   # file list — compiled files must be at the package ROOT, not under dist/
```

In that listing, check specifically:

- **Files at the root** (`ui-components/…`, `hooks/…`), not nested under `dist/` — otherwise every app deep import breaks.
- **`package.json` has `sideEffects: ['./index.js']`** — without it, bundlers tree-shake away the SDK configuration that `index.ts` performs at import time.
- **Peers intact** — `react`, `react-dom`, `next`, `flowbite-react`, `react-icons`, `@robosystems/client` should be peer dependencies, not dependencies.

Then the real check — adoption in an app:

```bash
cd ../roboledger-app && npm install @robosystems/core@<version> && npm run test:all
```

A peer range that excludes what an app has installed produces `ERESOLVE` at this step, and it's better to find that here than in three PRs.

## Output

A short status: which workflow, what failed and at which step, the root cause, the re-run link if any, the verified published version from `npm view`, and whether the three apps can adopt it cleanly. If nothing failed, say so — don't manufacture work.

$ARGUMENTS
