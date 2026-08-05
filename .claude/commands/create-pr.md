---
description: Open a pull request for the current branch, writing the description from the work actually done.
argument-hint: '[target-branch] [review]'
---

Create a GitHub pull request for the current branch, writing the title and description from the actual work done in this session — not reconstructed from the diff.

## Why this command exists

A PR description written from the diff alone can't know _why_ a change was made, so it tends to describe things that aren't true — and those descriptions then feed `@claude` reviews, compounding the bad information. **You author the description here, where the full context of what was done and why is available.**

This is `@robosystems/core` — the **published shared frontend core** for three Next.js apps (`robosystems-app`, `roboledger-app`, `roboinvestor-app`). Every change here reaches all three, deliberately, via a version bump. Precision about the component contract matters more than in an app repo, because three consumers depend on it and none of them see this diff.

**This repository is public.** The PR title and body are world-readable the moment they're pushed, and publishing is triggered by a push to `release/**` rather than by a merge — so the text is often public before the version that carries it. Treat the description as a publication.

## Instructions

### 1. Preflight

```bash
CURRENT=$(git branch --show-current)
TARGET=${1:-main}            # override target via the first argument
```

- **Never PR from the default branch.** If `CURRENT` is `main`, stop and tell the user to switch to a feature branch first. New branches are created via `npm run feature:create`, not by hand.
- **Never target a release branch.** `release/**` is what `publish.yml` watches; a PR into one is a publish trigger, not a code review. Target `main`.
- **Source ≠ target.** If `CURRENT == TARGET`, stop.
- **Uncommitted changes.** Run `git status --porcelain`. If there are uncommitted/staged changes, surface them and ask whether to commit them (never on `main`, stage files by name, no `git add -A`) or proceed without them. The description must reflect committed state.
- **Existing PR.** Check `gh pr list --head "$CURRENT" --base "$TARGET" --json url,number`. If one exists, don't duplicate — offer `gh pr edit` instead.
- **Security fixes — check what's published.** The diff discloses the bug the moment it's pushed, and the vulnerable version stays installable on npm. Say which published versions are affected so the user can sequence a patch release with the disclosure.
- **Push the branch.** `git push -u origin "$CURRENT"` (invoking `/create-pr` authorizes pushing _this feature branch_ — never `main` or `release/*`).

### 2. Gather the real change context

- **Primary source: this session.** What was actually changed and why.
- **Corroborate against the branch:**
  ```bash
  git log --oneline "$TARGET".."$CURRENT"
  git diff --stat "$TARGET"..."$CURRENT"
  git diff "$TARGET"..."$CURRENT"             # read it, don't guess
  ```
- **Hard rule — no confabulation.** Every claim must be supported by the diff. If you didn't change a component's props, don't write "API changes." When session context and the diff disagree, the diff wins and you investigate.

### 3. Compose the PR

- **Type** — from the branch prefix (`feature/` → feat, `bugfix/`/`fix/` → fix, `hotfix/` → fix, `chore/` → chore, `refactor/` → refactor). Default `feat`.
- **Title** — concise (~50–72 chars), conventional-commit style with a scope, matching `git log` (e.g. `feat(ui-components): add empty-state variant`).
- **Body** — markdown. **Match the headings in `.github/PULL_REQUEST_TEMPLATE.md`**, because `--body-file` bypasses template prefill entirely and a hand-written body silently drops whatever sections it omits:
  - **Summary** — 1–3 sentences: what this PR does and why.
  - **Changes** — bullets grouped by directory (`ui-components/`, `contexts/`, `hooks/`, …). Name the exported surface an app would import.
  - **Consumer Impact** — "None" if nothing consumer-visible changed, and say so explicitly rather than omitting the section. See below.
  - **Testing** — state truthfully what was run. The gate is `npm run test:all` (`format:check` → `lint` → `typecheck` → `test` → `build`). Say whether you validated in a real app via `npm run pack:local` plus a tarball install — for a rendering or wiring change, that is the only evidence that counts. If nothing was run, say "Not run" — never claim passing tests that weren't executed.

  The template has no Related Issues section — put `Closes #123` / `Fixes #456` as the last line of the Summary.

- **Consumer Impact is a required judgment.** Three apps track this package:
  - **Breaking** — a removed or renamed export, a changed prop contract, altered rendered structure that app CSS or tests depend on, or a narrowed peer range. All three apps need coordinated adoption; say what each has to change.
  - **Additive** — new components, new optional props, new exports. Free, but name them.
  - **Internal** — refactors, tests, tooling that leave the emitted surface identical.

- **Packaging changes deserve their own callout.** These break consumers in ways no test here catches:
  - **`'use client'` / `'use server'` directives** must survive to the top of each emitted file. The build is per-file `tsc` on purpose — never a bundler, which merges files and strips them. CI validates directive counts in `dist/`; if your change moves code between files, say so.
  - **ESM only.** The package is `"type": "module"` and a CommonJS `require()` throws at runtime in consumer bundles — and a `try`/`catch` around it can swallow the failure into silent feature loss (this bit the GraphQL auth path once). Use static or dynamic `import`.
  - **Published from `dist/`.** `scripts/prepare-package.mjs` writes `dist/package.json`; the apps deep-import both directory barrels and direct files, which plain bundler resolution serves only because of that layout. Touching it risks every deep import in three apps.
  - **`sideEffects`.** `index.ts` configures the `@robosystems/client` SDK at import time and `dist/package.json` declares `sideEffects: ['./index.js']`. If you add or remove a side effect, keep that accurate or bundlers will tree-shake it away.
  - **Peers, not deps.** `react`, `react-dom`, `next`, `flowbite-react`, `react-icons`, and `@robosystems/client` stay peers so apps keep one instance each. Widening or narrowing a peer range is a consumer-visible change — a range that excludes what an app has installed produces `ERESOLVE` on every install.

- **Version and publish are not this PR's job.** `create-release.yml` bumps the version on `main` and cuts `release/<version>`; the push to that branch triggers `publish.yml`. Never bump `package.json` in a feature PR.

- **Security-fix disclosure.** Keep the prose terse and non-actionable — the area hardened, never the mechanism. No exploit mechanics, attack scenarios, or payloads. For coordinated disclosure use a private GitHub Security Advisory.

- **Attribution** — attribute to the user only. No "🤖 Generated with Claude Code" footer, no `Co-Authored-By: Claude` trailer, unless explicitly asked.

### 4. Create the PR

```bash
gh pr create \
  --base "$TARGET" \
  --head "$CURRENT" \
  --title "<title>" \
  --body-file /tmp/pr-body.md
```

Print the resulting PR URL.

### 5. Optional Claude review

Only if the user explicitly asks (`review` / `--review`):

```bash
gh pr comment <number> --body "@claude please review this PR"
```

`claude.yml` only fires on an `@claude` mention from an `OWNER`/`MEMBER`/`COLLABORATOR`, so nothing happens automatically.

## Output

1. The PR URL.
2. A one-line summary of the title.
3. Target ← source branches.
4. The Consumer Impact classification, and if breaking, what each app has to change.
5. Whether a Claude review was requested.

## Arguments

`$ARGUMENTS` may contain a target branch (default `main`), `review` / `--review`, or freeform guidance on what to emphasize.

$ARGUMENTS
