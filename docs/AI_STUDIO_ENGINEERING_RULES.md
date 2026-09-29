# AI Studio engineering rules

These rules exist because this project repeatedly lost player-visible behavior while tests stayed green.

## RULE 1 — NO LARGE MIXED GATES

Do not combine physics, renderer, camera, UI, toolchain, and dependencies in one change unless a single defect cannot be isolated.

One semantic subsystem per gate.

## RULE 2 — PLAYER-ACCEPTED BEHAVIOR IS FROZEN

A subsystem marked PLAYER ACCEPTED must not be changed incidentally.

A passing test does not authorize a semantic change to something Paul already accepted.

## RULE 3 — BEFORE DELETION, PROVE OWNERSHIP

Never remove code because it looks dead. Require:

- a runtime search
- a call-site audit
- a behavioral contract
- a named replacement authority

The plasma shock-wave regression happened because presentation code was treated as residue.

## RULE 4 — SOURCE PRESENCE IS NOT BEHAVIOR

A string in a file is not proof that the player can see the feature, and the absence of a string is not proof that the feature is gone from the running game.

## RULE 5 — VISUAL FEATURES NEED GEOMETRIC CONTRACTS AND A PLAYER

For plasma, test the production engine, the production renderer, world coordinates, and viewport intersection.

Still require Paul to play the normal game. The probe cannot overrule the normal game.

## RULE 6 — NEVER SILENTLY CHANGE AUTHORITIES

If responsibility moves, record the old authority, the new authority, the reason, and the contract that proves the intended equivalence.

## RULE 7 — NO DEPENDENCY CHANGES DURING GAMEPLAY FIXES

Toolchain and reproducibility work is its own gate. Do not `npm install`. Do not add a lockfile while fixing gameplay.

## RULE 8 — NO AUTO-CLEANUP

Do not opportunistically clean dead code, dependencies, CSS, the renderer, or schemas while fixing an unrelated behavior.

## RULE 9 — BUILD IDENTITY EVERY GATE

Every review candidate reports the JS filename, bytes, and SHA-256; the CSS filename, bytes, and SHA-256; and the tool versions used to produce them.

## RULE 10 — STOP AFTER A REVIEW CANDIDATE

Do not keep editing a build while Paul is testing it.

Freeze until he says ACCEPT or REJECT.
