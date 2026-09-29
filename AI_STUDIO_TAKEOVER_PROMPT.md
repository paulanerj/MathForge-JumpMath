# JUMPMATH --- AI STUDIO TAKEOVER / BASELINE RECONCILIATION PROMPT

You are taking over engineering responsibility for JumpMath, a React +
Canvas mathematics game that is intended eventually to become a
MathForge surface.

## Critical instruction

DO NOT MODIFY PRODUCTION CODE YET.

Your first job is to establish an independently verified baseline from
the supplied migration package. The package is a faithful state capture
from the previous coding environment, not a declaration that the current
game is correct.

Do not assume that a passing test means player-visible behavior is
correct. Several regressions passed automated contracts while failing
direct playtests.

## Read first, in this order

1.  `MIGRATION_START_HERE.md`
2.  `docs/AI_STUDIO_MASTER_HANDOFF.md`
3.  `project-state.json`
4.  `docs/REGRESSION_HISTORY.md`
5.  `docs/AI_STUDIO_ENGINEERING_RULES.md`
6.  `docs/mathforge/MATHFORGE_SDK_COMPATIBILITY_STANDARD.md`
7.  `docs/PLASMA_AUTHORITY_R1.md`
8.  current tests
9.  production source

Treat `forensics/` as read-only evidence, not production authority.

## Authority hierarchy

For player-visible/gameplay behavior:

1.  Paul's explicit playtest acceptance.
2.  Explicit frozen behavioral contracts.
3.  Current production source.
4.  Automated tests.
5.  Historical documents and old implementation artifacts.

A test may demonstrate an invariant. It cannot overrule a failed player
test.

## Current state you must preserve accurately

JumpMath currently contains a 30-level campaign in six realms, five
levels per realm. The math engine, campaign definitions, renderer,
camera, plasma system, input, sound engine, Review Mode, and an
experimental Level Studio are present in the capture.

The capture has no authoritative Git history. There was no `.git`
checkout in the previous workspace.

The capture also has no trusted lockfile and intentionally excludes
`node_modules`. Do not pretend dependency reproducibility has already
been solved.

The previous environment used project-local Vite 6.4.3, React 19.3.0,
React DOM 19.3.0, TypeScript 5.8.3, tsx 4.23.15, Vite-side esbuild
0.25.12 and tsx-side esbuild 0.28.2. The old workspace had special
esbuild execution handling. Reconcile these facts before changing
dependencies.

## Current critical blocker: plasma

The plasma subsystem is NOT player accepted.

What is accepted:

-   The physical plasma wave is a world-state threat.
-   During active simulation its accepted movement is time-driven:
    `wave.y(t + dt) = wave.y(t) - 28 * dt`, subject to the project's
    coordinate convention.
-   Spawn distance 900, collision distance 26, warning distance 520 were
    the accepted constants at capture.
-   Correct answers must not teleport the physical wave.
-   Wrong answers must not teleport the physical wave.
-   Landings must not teleport the physical wave.
-   Old answer-driven +15% / -20% nudges and the player-relative clamp
    must not return.

What repeatedly broke:

-   the historical shock-wave presentation disappeared during cleanup;
-   it was restored;
-   answer/landing behavior teleported the wave;
-   removing those nudges left the physical front offscreen in normal
    play;
-   a synthetic visible crest was introduced;
-   Paul then observed the visible lava/shock wave moving with
    Zyrx/camera;
-   the captured source represents an unresolved state, not an accepted
    solution.

Do not immediately patch plasma. First reconstruct its physical, camera,
and rendering authorities and show the diagnosis.

## Other unaccepted or experimental areas

-   Camera diagonal/row-travel continuity: implemented/tested
    previously, but not assume player accepted.
-   Ambient objective transparency: implemented/tested previously, but
    not assume player accepted.
-   Review Mode: useful capability; controls are intended to live inside
    Settings, not dominate gameplay.
-   Level Studio: experimental and not yet reviewed by Paul. Do not
    expand it during baseline reconciliation.
-   Major sound/music redesign: deferred.
-   Gate 7B TypeScript closure: not completed.
-   Gate 8 dependency/reproducibility work: not completed.

## MathForge SDK compatibility

The supplied MathForge SDK compatibility standard is a governing
architecture constraint, NOT an instruction to implement a speculative
SDK.

Do not invent: - MathForge SDK event names, - learner identity APIs, -
platform XP, - mastery rules, - host persistence, - platform completion
semantics, - host routing APIs, - or a fake `mathforge` adapter.

The immediate target is HOST-NEUTRAL READY.

JumpMath should ultimately expose a small surface-local boundary so a
future thin adapter can translate between the real MathForge SDK and the
game. The standalone game must remain runnable without MathForge.

Use the standard to identify coupling and future seams. Do not redesign
the entire application during takeover.

## First assignment --- reconciliation only

Without changing production behavior:

### A. Repository inventory

Report all production, test, build, review, studio, documentation and
forensic areas. Identify obsolete-looking files but do not delete them.

### B. Package/config reconciliation

Read `package.json`, TypeScript/Vite config and build scripts. Explain
what can and cannot be reproduced in AI Studio from the captured files.
Do not silently substitute newer packages.

### C. Build plan

Propose the smallest safe way to establish a reproducible AI Studio
baseline. If dependency changes are necessary, enumerate them before
applying them.

### D. Test reproduction

Run the existing authoritative tests if the environment permits. Report
exact failures. Do not weaken tests.

### E. Production build reproduction

Attempt the supported project-local build after the environment is
understood. Report tool versions and resulting asset hashes.

### F. Authority map

For each subsystem identify the production owner: - campaign/level
schemas - math challenge generation - preview vs committed math state -
player movement - platform generation/recycling - camera - plasma
physical state - plasma presentation - renderer - input - audio - Review
Mode - Level Studio / VisualScene

### G. Status matrix

Use only: - PLAYER ACCEPTED - TEST ACCEPTED - IMPLEMENTED / UNACCEPTED -
KNOWN BROKEN - EXPERIMENTAL - DEFERRED - UNKNOWN

Do not use "done" as a substitute.

### H. MathForge host-neutral audit

Against `docs/mathforge/MATHFORGE_SDK_COMPATIBILITY_STANDARD.md`,
classify the current surface as: - NOT READY - HOST-NEUTRAL READY -
ADAPTER READY

For each failed criterion, cite the exact source coupling. Do not
implement the SDK.

### I. Plasma forensic diagnosis

Before modifying plasma, trace: - physical wave writers, - player world
position, - camera world position, - world-to-screen transform, -
physical shock front, - any synthetic/presentation front, -
atmosphere/heat, - render order, - probe/debug behavior.

Explain why the captured implementation can produce the player-observed
camera/player coupling, or state that the evidence disproves that
hypothesis and show the actual cause.

### J. Proposed first correction gate

After reconciliation, propose ONE narrow first production gate. It
should normally be plasma-only unless your evidence demonstrates a more
fundamental blocker.

Do not implement that gate until Paul approves the plan.

## Drift-control rules

1.  One semantic subsystem per gate.
2.  Freeze each review candidate while Paul tests it.
3.  Do not opportunistically clean unrelated code.
4.  Do not combine dependency work with gameplay repair.
5.  Do not delete code until ownership and replacement are proven.
6.  Source presence is not proof of player-visible behavior.
7.  Signature visual features require real
    production-state/render-coordinate evidence plus player review.
8.  Every candidate reports build identity and hashes.
9.  Never promote IMPLEMENTED / UNACCEPTED to PLAYER ACCEPTED without
    Paul's explicit playtest.
10. Preserve the capture as an immutable forensic baseline.

## Required response before any production edit

Return:

1.  Baseline identity and environment.
2.  Repository inventory.
3.  Build/reproducibility findings.
4.  Existing test results.
5.  Production authority map.
6.  Status matrix.
7.  MathForge host-neutral readiness audit.
8.  Plasma forensic diagnosis.
9.  Discrepancies between handoff documents and source.
10. One proposed first correction gate.
11. Files you would change in that gate.
12. Risks and explicit non-goals.

Then STOP.

Do not modify production code until this reconciliation is reviewed.
