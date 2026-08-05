## Summary

<!-- What this PR does and why. Ground it in the actual change, not the diff mechanics. -->

## Changes

<!-- The substantive changes, grouped by directory (ui-components/, contexts/, hooks/, ...).
     Name the exported surface an app would import. -->

-

## Consumer Impact

<!-- Required judgment, not an optional section. Three apps track this package — robosystems-app,
     roboledger-app, roboinvestor-app — and a change here reaches all of them on their next bump.
     - BREAKING: a removed or renamed export, a changed prop contract, altered rendered structure
       that app CSS or tests depend on, or a narrowed peer range. Say what each app must change.
     - ADDITIVE: new components, new optional props, new exports.
     - INTERNAL: refactors, tests, tooling that leave the emitted surface identical.

     Call out packaging changes here too — they break consumers in ways no test catches:
     'use client'/'use server' directive preservation, ESM-only (no require()), the
     publish-from-dist layout, the sideEffects entry, and peers staying peers. -->

INTERNAL

## Testing

<!-- How the change was verified. Run `npm run test:all` (format:check -> lint -> typecheck ->
     test -> build) before opening. Note this gate is CHECK-ONLY — unlike the apps it does not
     auto-format, so fix and re-stage rather than expecting it to rewrite for you.

     For anything consumer-visible, say whether you validated it in a real app:
       npm run pack:local && cd ../roboledger-app && npm install ../robosystems-core/*.tgz
     Nothing in this repo exercises the package the way an app does. "Not run" is a valid answer. -->
