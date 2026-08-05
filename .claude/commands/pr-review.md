---
description: Review a pull request — gather metadata, diff, and existing feedback, then give a verdict.
argument-hint: '[pr-number-or-url]'
---

Review a pull request by gathering all PR metadata, diff, and review comments, then provide a comprehensive review summary.

## Instructions

### 1. Identify the PR

- **URL provided** (e.g., `https://github.com/RoboFinSystems/robosystems-core/pull/18`): Extract the repo and PR number
- **Number provided** (e.g., `18`): Use the current repository
- **Nothing provided**: Detect from the current branch using `gh pr view --json number,url` — if no open PR exists, ask which PR to review

### 2. Gather PR Data

```bash
# PR metadata + conversation comments in one call
gh pr view <NUMBER> --json number,url,title,body,author,state,isDraft,labels,comments,reviews,reviewDecision,latestReviews,reviewRequests,statusCheckRollup,mergeStateStatus,headRefName,headRefOid,baseRefName,additions,deletions,changedFiles,files,closingIssuesReferences,createdAt,updatedAt

# PR diff (the actual code changes)
gh pr diff <NUMBER>

# Inline review comments — no --json equivalent exists, so this call is still required
gh api repos/$(gh repo view --json nameWithOwner -q .nameWithOwner)/pulls/<NUMBER>/comments --paginate
```

**Field notes:**

- `reviews` not `reviewers` — `reviewers` is not a valid field and errors.
- `reviewDecision` is the single field that answers "has this been approved."
- `comments` covers the top-level conversation, so no separate `issues/<n>/comments` call is needed.
- `files` matters here: a change to `scripts/prepare-package.mjs`, `tsconfig.build.json`, or `package.json` peers has a blast radius nothing in the source diff shows.
- Keep `--paginate` **bare**. Adding `-q`/`--jq` makes gh emit one JSON document _per page_ instead of a merged array. Pipe to `jq` after the call, not through it.

### 3. Categorize Review Feedback

- **Human Reviews**, **AI Reviews**, **Code Quality**, **Security**, **CI/CD**

**How feedback actually arrives in this repo:**

- Formal `reviews` and inline comments are typically **empty** and `reviewDecision` blank. That's the norm, not a skipped review.
- **AI review is opt-in** — `claude.yml` only fires on an explicit `@claude` mention from an `OWNER`/`MEMBER`/`COLLABORATOR`. Findings appear as a **bot comment in `comments`**, not a formal review.
- CI runs `format:check` → `lint` → `typecheck` → `test` → `build` → **validate package structure**. That last step is this repo's distinguishing check — it verifies the emitted `dist/` layout and directive counts.
- **What CI cannot see: the three consuming apps.** Nothing here installs the built package into `robosystems-app`, `roboledger-app`, or `roboinvestor-app`. Green CI means the package builds, not that it still works where it's used.
- `NEUTRAL`/`SKIPPED` conclusions are not failures.

### 4. Review the Diff

- **Consumer impact first.** Three apps track this package. Does the diff remove or rename an export, change a prop contract, or alter rendered structure that app CSS or tests depend on? That needs coordinated adoption across all three — an uncoordinated break is blocking, not a note.
- **Directive preservation.** Does the change move code between files, or add a component that needs `'use client'` / `'use server'`? Those directives must survive to the top of each **emitted** file. The build is per-file `tsc` deliberately — a bundler would merge files and strip them. If a directive is missing, the failure shows up in an app as a confusing server/client boundary error, not here.
- **ESM discipline.** The package is `"type": "module"`. A CommonJS `require()` throws at runtime inside consumer bundles, and a `try`/`catch` around it degrades into silent feature loss rather than a visible error — this has already bitten the GraphQL auth path once. Any `require()` in the diff is blocking.
- **Peers, not deps.** `react`, `react-dom`, `next`, `flowbite-react`, `react-icons`, `@robosystems/client` must stay peer dependencies so each app keeps a single instance. A peer promoted to a dependency causes duplicate-React and context-identity bugs that are miserable to diagnose. A narrowed peer range produces `ERESOLVE` on every app install.
- **Side effects.** `index.ts` configures the SDK at import time and `dist/package.json` declares `sideEffects: ['./index.js']`. A new side effect outside that file will be tree-shaken away in consumers.
- **Packaging.** Changes to `scripts/prepare-package.mjs` or the publish-from-`dist/` layout affect every deep import in three apps (`@robosystems/core/ui-components`, `@robosystems/core/hooks/use-toast`). Read these with real suspicion.
- **Per-app assumptions.** Brand tokens (`primary-*`) are defined **per app**, not here. A component that hardcodes a brand color, or assumes a token this repo doesn't own, will look wrong in at least one app.
- **Correctness / patterns**: does it do what the description says, and follow existing idiom (check `CLAUDE.md`)?
- **Accessibility and dark mode**: both regress silently and reach three apps at once.
- **Tests**: are changes covered? Tests live in `__tests__/` alongside source and run here, not in the apps. Read the test rather than trusting it's green — one asserting the buggy behavior passes just as happily.
- **Disclosure hygiene** (public repo): does the PR _text_ over-disclose? Name the area hardened, never the mechanism. The vulnerable version stays installable on npm after merge — flag whether a patch release is needed.
- **Missing changes**: a new component not exported from its barrel, a new peer not declared, a prop change without a `CLAUDE.md` or README update.

### 5. Output Format

```
## PR Summary
**Title**: ...
**Author**: ... | **Branch**: ... → ...
**Status**: ... | **Changes**: +X / -Y across Z files

<Brief summary of what the PR does>

## Consumer Impact
<BREAKING / ADDITIVE / INTERNAL — and for breaking, what each of the three apps must change>

## Existing Review Feedback

### Human Reviews
### AI Reviews
### Code Quality
### Security
### CI/CD Status

## My Review

### Issues (should fix before merge)
### Suggestions (non-blocking improvements)
### Questions

## Verdict
<APPROVE / REQUEST_CHANGES / NEEDS_DISCUSSION — with brief rationale>
```

### Notes

- Packaging and build-config changes deserve disproportionate attention: they're small diffs with a three-app blast radius and no test coverage
- For security findings, err on the side of flagging
- If the PR references an issue (`closingIssuesReferences`), check the requirements are met
- If the change is consumer-visible, say whether it was validated in a real app via `npm run pack:local` — and treat "not validated" as a gap worth raising

$ARGUMENTS
