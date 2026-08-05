---
description: Create a GitHub issue for the shared frontend core, routed to the right repo and labelled.
argument-hint: '[what the issue is about]'
---

Create a GitHub issue for the current repository based on the user's input.

## Instructions

1. **Check you're in the right repo first** - This package is the **shared frontend core** for three Next.js apps (`robosystems-app`, `roboledger-app`, `roboinvestor-app`). Almost every bug reported "in core" is first observed in an app, so establishing which layer owns it is the whole job:
   - **Belongs here**: anything under `auth-components/`, `auth-core/`, `components/`, `contexts/`, `hooks/`, `library/`, `research/`, `task-monitoring/`, `theme/`, `types/`, `ui-components/`, `utils/`, plus the build and packaging scripts. A fix here reaches all three apps on their next version bump.
   - **Belongs in the app**: app-local pages and routes, per-app brand tokens (the `primary-*` Tailwind colors are defined per app, not here), and anything only one app exhibits after you've confirmed the core component behaves correctly in isolation.
   - **Belongs in `RoboFinSystems/robosystems`**: wrong data, endpoint behavior, or API contracts. Core only renders what it's given.
   - **Belongs in `robosystems-typescript-client`**: SDK types or call surfaces. Core consumes `@robosystems/client` as a **peer**, so a client bug is not a core bug even when core surfaces it.

   **Say which app(s) reproduce it.** A component that misbehaves in one app but not the others usually points at that app's wiring — the Tailwind content glob (`node_modules/@robosystems/core/**/*.js`) or the vitest `server.deps.inline` entry — rather than at core.

2. **Determine Issue Type** - Based on the user's description, pick one:
   - **Bug**: Defects or unexpected behavior
   - **Task**: Specific, bounded work items that can be completed in one PR
   - **Feature**: Request a new capability (no design required)
   - **RFC**: Propose a design for discussion before implementation
   - **Spec**: Approved implementation plan ready for execution

   **This repo has no `.github/ISSUE_TEMPLATE/` directory**, unlike the apps and the SDK clients. Confirm before assuming — `ls .github/ISSUE_TEMPLATE/` and `gh issue create --help`. If types are available on the org, still set one with `--type`; if not, lead the title with the kind of work and structure the body yourself.

3. **Gather Context** - If the user provides a file path or references existing code:
   - Read the relevant files to understand the current implementation
   - Check the `__tests__/` directory alongside the source — tests live here, not in the apps
   - Review any referenced documentation

4. **Draft the Issue** - With no templates to mirror, impose the structure yourself. For a bug that means, at minimum:
   - **Which app(s)** it reproduces in, and the **core version** they're on (`npm ls @robosystems/core` in the app)
   - The component or hook by its import path as an app would write it (`@robosystems/core/ui-components`, `@robosystems/core/hooks/use-toast`)
   - Actual vs expected, plus the route and viewport if it's visual, and the color scheme if it's dark-mode-specific
   - Whether it reproduces with a local tarball (`npm run pack:local`, then install the tgz in an app) — that distinguishes a real core bug from a stale published version

5. **Say whether it's a breaking change for consumers** - Three apps track this package, and a core change reaches them deliberately via a version bump. If the issue implies removing or renaming an export, changing a prop contract, or altering a component's rendered structure, say so — that needs coordination across all three apps rather than a quiet patch.

6. **Sanitize for Public Visibility** - This repo is public and the issue is world-readable immediately. Before creating:
   - Remove API keys, JWTs, and session cookies — auth components are a common subject here, and pasted repro state carries credentials
   - Remove customer names, graph IDs, and real financial data from screenshots and console output
   - Remove internal pricing, margins, or cost details
   - For anything security-adjacent, keep the text terse and non-actionable — no exploit mechanics, no payloads. For coordinated disclosure use a private GitHub Security Advisory, never a public issue.
   - Keep ordinary technical implementation details (these are fine to share)

7. **Create the Issue**:

   ```bash
   gh issue create \
     --type <Bug|Task|Feature|RFC|Spec> \
     --title "<clear, concise title>" \
     --body-file /tmp/issue-body.md \
     --label "<labels>"
   ```

   No prefixes like `[SPEC]` in the title. Write the body to a file rather than inlining it, to avoid shell-escaping problems.

## Labels

Enumerate what actually exists rather than working from memory — and raise the limit, since the default truncates at 30:

```bash
gh label list --limit 100
```

**This repo carries only GitHub's stock labels** (`bug`, `documentation`, `enhancement`, `question`, `help wanted`, …). It does **not** have the `area:*` / `priority:*` / `size:*` families the apps and SDK clients use — don't apply labels from memory of those repos, because `gh issue create` fails on a label that doesn't exist. Use the stock set, or mention to the user that the taxonomy could be brought in line with the sibling repos if they want issue triage to match.

## Example Usage

User: "The graph selector dropdown doesn't close on outside click"

Response: Let me confirm this is core rather than an app...

[Read the component under ui-components/ or components/ and its **tests**/]
[Ask which app(s) reproduce it and on which core version]
[Draft a body with import path, apps affected, actual vs expected]
[Create with `gh issue create --type Bug --label bug`]

## Output Format

After creating the issue, provide:

1. The issue URL
2. Brief summary of what was created
3. Issue type and labels applied
4. Which apps are affected, and whether the fix implies a coordinated bump across all three

$ARGUMENTS
