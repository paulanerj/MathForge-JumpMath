# JumpMath — AI Studio master handoff

Capture date: 2026-09-28

Workspace path at capture: `/workspace/artifacts/Zyrxmath-main`

THIS WORKSPACE IS NOT CURRENTLY A GIT CHECKOUT.
NO AUTHORITATIVE COMMIT HASH EXISTS FOR THIS STATE.

There is no branch, no HEAD, and no commit that identifies this tree. `STATE_CAPTURE_MANIFEST.sha256` is the identity. If it does not match the files you have, you do not have this capture.

This document is a state capture. It is not permission to keep building, and it is not a claim that the current build is the game Paul wants.

## 1. Executive state

Application: JumpMath, the current MathForge / Numerix canvas game.

Technology: React 19.3.0, one HTML canvas, Vite 6.4.3, TypeScript 5.8.3.

Campaign in source: 30 levels, 6 realms, 5 levels each. Authority: `src/engine/LevelDatabase.ts` (`SECTORS`) and `src/visual/realms.ts` (`realmForLevel`).

### PLAYER ACCEPTED

- The physical plasma rule, after the answer-teleport fix: during active play, `wave.y` changes only by `-baseSpeed * dt`.
- Paul confirmed that correct and wrong landings no longer teleport the wall.
- Constants he accepted with that rule, still present in `src/config/defaults.ts`: spawn 900, speed 28, collision 26, warning 520.

That acceptance does not cover how the wall looks.

### TEST ACCEPTED

The capture run of `npm test` exited 0. Suites, in order:

1. `tests/architecture_contract_suite.ts`
2. `tests/challenge_trace_suite.ts`
3. `tests/math_challenge_suite.ts`
4. `tests/config_authority_suite.ts`
5. `tests/player_path_suite.ts`
6. `tests/torture_suite.ts`

MB9 inside the trace suite: 200/200. Contract E on that run: 24 equal-value commits in 200.

`src/` has 0 TypeScript diagnostics. `tsc --noEmit` still exits 2 because of test and `vite.config.ts` diagnostics. See section 21.

### IMPLEMENTED BUT UNACCEPTED

- Current plasma picture: world-anchored crest at `wave.y`, plus a viewport heat tint. Build `index-w1UmiH7H.js`. Paul was given a link and did not accept it.
- Diagonal camera row-center framing (contract AC).
- Ambient objective without a filled rectangle (contract AD).
- Review mode inside Settings, `?reviewMode=1` (contract AE).

### KNOWN BROKEN

- Plasma is not a finished player-facing feature. The last verdict on a visible wall was a rejection: the wall moved with Zyrx and the camera. That build is not this source. This source replaced it without a new player verdict.
- At the accepted spawn gap of 900, the physical crest is below an 800px viewport. Ordinary play may show only the bottom tint. Paul previously rejected "heat with no recognizable front."
- No lockfile. A clean install is not known to reproduce this tree. That work was deferred as Gate 8 and was not done.
- `tsc --noEmit` is not clean.

### EXPERIMENTAL

- Level Studio, `?levelStudio=1`. Paul never reviewed it. Plasma kept blocking that review.
- `src/studio/VisualScene.ts` describes the current renderer. It does not author levels. `uniqueOverrides` is 0.

### DEFERRED

- Sound design beyond the current event map.
- Gate 7B (remaining non-`src` TypeScript diagnostics) and Gate 8 (reproducible install).
- Per-level visual authoring. The campaign is 6 realm templates plus route and math, not 30 unique scenes.

## 2. Authority hierarchy

1. Paul's direct playtest.
2. Explicit frozen behavioral contracts.
3. Production source.
4. Automated tests.
5. Historical documents and chat assumptions.

A green suite does not beat a failed playtest. Several plasma contracts passed on builds Paul rejected. Read `docs/REGRESSION_HISTORY.md`.

Three different "current" things exist:

- Source SOT: this captured tree.
- Behavioral SOT: the player-accepted pieces in section 1, chiefly time-only plasma motion. Not the whole game.
- Build candidate: `artifacts/current-build/`. It matches the source that was compiled for this capture. It is not automatically accepted behavior.

## 3. Campaign authority

Defined only by `SECTORS` in `src/engine/LevelDatabase.ts`. Realm comes from the sector seed, stored on `theme.realm`. Level id does not select the realm (contract O).

Routes are vectors in the same file: `up`, `upRight`, `upLeft`, `diagonalR`, `diagonalL`.

| # | Level | Realm | Math | Route |
|---|---|---|---|---|
| 1 | f1_sum10 | lattice | SUM_TO 10 | up |
| 2 | f2_skip2 | lattice | SKIP_COUNT 2 | up |
| 3 | l3_sum12 | lattice | SUM_TO 12 | up |
| 4 | l4_skip2 | lattice | SKIP_COUNT 2 | up |
| 5 | l5_sum14 | lattice | SUM_TO 14 | up |
| 6 | f3_sum15 | orbital | SUM_TO 15 | upRight |
| 7 | f4_skip3 | orbital | SKIP_COUNT 3 | upLeft |
| 8 | o3_sum18 | orbital | SUM_TO 18 | upRight |
| 9 | o4_skip4 | orbital | SKIP_COUNT 4 | upLeft |
| 10 | o5_sum16 | orbital | SUM_TO 16 | upRight |
| 11 | d1_sum20 | field | SUM_TO 20 | diagonalR |
| 12 | d2_skip5 | field | SKIP_COUNT 5 | diagonalL |
| 13 | d3_mult2 | field | MULTIPLY ×2 | up |
| 14 | d4_diff15 | field | DIFFERENCE max 15 | upLeft |
| 15 | f5_sum22 | field | SUM_TO 22 | diagonalR |
| 16 | v1_sum25 | signal | SUM_TO 25 | upRight |
| 17 | v2_skip7 | signal | SKIP_COUNT 7 | upLeft |
| 18 | v3_mult3 | signal | MULTIPLY ×3 | upRight |
| 19 | v4_diff25 | signal | DIFFERENCE max 25 | upLeft |
| 20 | s5_skip6 | signal | SKIP_COUNT 6 | upRight |
| 21 | q1_sum30 | plasma | SUM_TO 30 | upRight |
| 22 | q2_mult5 | plasma | MULTIPLY ×5 | upLeft |
| 23 | p3_sum28 | plasma | SUM_TO 28 | upRight |
| 24 | p4_diff20 | plasma | DIFFERENCE max 20 | upLeft |
| 25 | p5_skip8 | plasma | SKIP_COUNT 8 | upRight |
| 26 | q3_skip4 | quantum | SKIP_COUNT 4, direction −1 | upLeft |
| 27 | q4_mult7 | quantum | MULTIPLY ×7 | diagonalL |
| 28 | q5_sum40 | quantum | SUM_TO 40 | diagonalR |
| 29 | u4_sum35 | quantum | SUM_TO 35 | diagonalL |
| 30 | u5_diff30 | quantum | DIFFERENCE max 30 | diagonalR |

There is no separate per-level camera profile or platform profile in the data. Camera behavior is global, with sideways routes (`progressionVector.x !== 0`) using row-travel X. Platform shape comes from the realm.

## 4. Six realms

| Levels | Sector id | Realm id |
|---|---|---|
| 1–5 | sector_lattice | lattice |
| 6–10 | sector_orbital | orbital |
| 11–15 | sector_field | field |
| 16–20 | sector_signal | signal |
| 21–25 | sector_plasma | plasma |
| 26–30 | sector_quantum | quantum |

`realmForLevel` in `src/visual/realms.ts` reads `theme.realm` and falls back only if the key is not a known realm. Campaign rows set the key explicitly. Contracts N, O, P, and Q lock this.

The realm named "plasma" is a visual theme for levels 21–25. It is not the pursuing wave.

## 5. Math authority

Owner: `src/math/MathChallengeEngine.ts`. Modes live under `src/math/modes/`. Objective strings: `src/math/objectivePresentation.ts`.

Two sequence values:

- `committedSequenceState` — learner state. Changes when an answer is resolved on landing.
- `lookaheadSequenceState` — speculative state used to spawn upcoming rows. `generateChallengeForRow` must not advance the committed state.

Landing path: `GameEngine.handleLanding` calls `mathEngine.resolveAnswer`. A correct platform advances the row, score, and combo. A wrong resolution does not.

Preview: choosing a platform can show the next value on Zyrx before landing (`travelPreview`). Landing is the commit. Contract E is the lock, including the case where the next value equals the current value. Equal numbers are not proof of a commit.

Gate 4.5: if the lookahead context key changes, the new sequence start replaces lookahead. That reset is not a learner commit. Contract V.

Gate 4.6: contract E was rewritten so equal values are still counted as real landing commits. The capture run saw 24 such commits in 200 trials.

## 6. Player path and level completion

`GameEngine` owns the jump, the landing, recovery, and row changes.

Flow that is in the source now:

- A tap selects a platform and starts a jump.
- Landing calls `handleLanding`.
- Correct: row advances, math resolves, combo increases.
- Wrong: math records a non-resolution, the run recovers. It must not write `wave.y` except through the time tick.
- Win: `state.status = 'level_complete'`. WARPING is not assigned anywhere in production (contracts C and K).
- App waits `COMPLETION_HOLD_MS` (750) and then shows the cleared screen.

Sector unlock and campaign progress are React concerns in `App.tsx`, not the canvas.

## 7. Camera

`Camera.update` lerps X toward the X it is given and Y toward `targetY - targetOffsetY`.

Callers:

- `GameEngine.loadSchema` sets camera to 0, 0 before play starts.
- Each playing tick calls `camera.update(dt, 0, logicalY)`. Y follows the player, with the offset, smoothed.
- If the route has a sideways component, the same tick then overwrites `camera.x`: during a jump it interpolates from this row's center to the next row's center; after landing it stays on the landed row. The comment in source says landing must not aim at the row after the one just reached.
- Plasma death recovery sets camera from the safe pose (`respawn`).
- `resetPlasmaLab` is probe-only and sets camera to the spawn framing. It is not a campaign writer.

The reported bug was: jump, land, then a second sideways snap. Contract AC asserts the row-center model on a diagonal route. That is IMPLEMENTED / TEST ACCEPTED / NOT PLAYER-ACCEPTED.

## 8. Plasma — unresolved

Status: NOT PLAYER ACCEPTED.

Do not describe it as solved because AO–AS pass.

### 8.1 What Paul wants

A wall behind Zyrx that exists in the world, advances with time, does not teleport on answers or landings, does not physically follow Zyrx or the camera, and can be recognized as heat plus a shock front.

### 8.2 What he already accepted

Physical motion only:

```text
wave.y(t + dt) = wave.y(t) - baseSpeed * dt
```

while the simulation is active. Constants above. Do not restore `nudgeWaveByMeter`, a +15% correct push, a −20% wrong pull, or a clamp that puts the wave 900 behind the player after an answer.

`nudgeWaveByMeter` is not in the current `src/` tree. Verify that before touching plasma.

### 8.3 September 18 reference

File, if present: `forensics/Zyrxmath-main (3).zip` (zip member dated 2026-09-18).

In that `Renderer.ts`:

- Heat/fog was screen-space. `knY = height - 50 + kilonovaDist * 6.5`, with a radial gradient: white, orange, red, purple, transparent. `kilonovaDist` was its own timer then, not the wave.
- The pursuing shock was drawn at `engine.state.wave.y` inside the camera transform: orange haze, filled sine crest, gold-to-red body, white edge, `#ff4400` shadow.

That combination is visual evidence. It is not a license to copy the drain timer back.

`index-RVFpfK1p.js` (SHA-256 `78ade616c4cd714dc1f88343121f57e1791af731ef1d8e7a477eeb0fe84fbec7`) is NOT AVAILABLE IN CURRENT WORKSPACE. Do not substitute another bundle.

### 8.4 Regressions, short

A. Cleanup dropped the visible shock. Tests still passed.
B. The September 18 crest and fog colors were put back.
C. The wall jumped on landing. Cause: answer nudges and a player-relative clamp. Proven, then removed.
D. Paul confirmed the teleport was gone.
E. With honest physics, the crest stayed below the camera during a normal lead of ~900.
F. A synthetic crest was pinned under Zyrx so something was always visible.
Current rejection: Paul saw that crest move with the jump. Development then replaced the formula. He has not accepted the replacement.

Full write-up: `docs/REGRESSION_HISTORY.md`.

### 8.5 Current implementation

| File | What it does | Reads wave | Writes wave | Uses player | Uses camera | Uses viewport | Atmosphere | Crest | Probe only |
|---|---|---|---|---|---|---|---|---|---|
| `GameEngine.ts` `ensureWave` | Creates the one wave | no | yes, at spawn | yes, for the spawn gap | no | no | no | no | no |
| `GameEngine.ts` `placeWave` | The only `wave.y =` | yes | yes | caller decides | no | no | no | no | new life, and lab |
| `GameEngine.ts` `update` | `wave.y -= speed * dt` | yes | yes | collision test only | no | no | syncs `kilonovaDist` | no | freeze/step are probe |
| `plasmaPresentation.ts` `derivePlasmaPresentation` | Projects the front and computes threat | yes | no | gap and threat only | screen projection only | visibility and tint size | yes | world Y only | no |
| `Renderer.ts` `paintPlasmaWall` | Draws tint, and the crest if it intersects the view | via derivation | no | no | no | yes | yes | yes, at `physical.screenY` | no |
| `defaults.ts` / `configTypes.ts` | 900 / 28 / 26 / 520 | no | no | no | no | no | no | no | no |
| `worldDraw.ts` | Realm mark. Quantum fringe reads the gap | yes | no | yes, as gap | no | no | no | no | no |
| `App.tsx` | Lab buttons when `?plasmaProbe=1` | via engine | probe placement only | probe nudges | probe nudges | no | no | no | yes |

`SHOCK_FRONT_WORLD_OFFSET` is 0. The front's world Y is `wave.y`.

`kilonovaDist` is a 0–100 mirror of the gap (`distance100`). It tints Zyrx. It is not a second clock. Contract M forbids `kilonovaDrainRate` and `kilonovaDist -=`.

### 8.6 What the new coder must verify, not trust

PLAYER-OBSERVED SYMPTOM, on the candidate before this source:

The visible wall moved with the camera and with Zyrx's jump.

THAT CANDIDATE'S FORMULA, no longer in this tree:

```text
visualFrontScreenY = playerScreen + shownOffset
```

CURRENT SOURCE CLAIM, unaccepted:

The crest world position does not read the player's screen position. Camera changes only the projection. Threat may change when the player moves. The crest is not drawn when it is below the view. A bottom gradient remains.

REQUIRED:

Read `derivePlasmaPresentation` and `paintPlasmaWall` yourself. Run AO, AP, AQ, and AR. Then play the normal game. If the tint is visible and the crest is not, that may be the old "I cannot see the wall" rejection in a new form. Do not "fix" it by pinning the crest under Zyrx again.

`docs/PLASMA_AUTHORITY_R1.md` describes this unaccepted model. It is not a player sign-off.

## 9. Plasma contracts

All of these exist in `tests/architecture_contract_suite.ts` and passed on the capture run. None of them is a player acceptance.

| Id | Intent | Passes now | Player showed a failure anyway |
|---|---|---|---|
| AA | Distant: atmosphere on, crest may be off-screen. Danger/collision: crest is the projected wave. | yes | The previous AA required an on-screen crest at gap 900. That version passed while the wall was fake. This version was rewritten with the unaccepted model. |
| AB | `Δwave.y = -speed * dt`. At dt 0, jump, landing, answers, and camera do not move the wave. | yes | Paul accepted this physical rule. Presentation can still be wrong. |
| AH | Six representative levels keep a wave-tied front and some heat during a short run. | yes | Does not prove the crest is recognizable in play. |
| AL | One wave object, one `-=` tick, one derivation, no drain, no review/studio fork. | yes | Architectural only. |
| AM | Screen Y comes from `worldToScreenY` only. | yes | A previous screen test used the wrong formula and still passed. |
| AN | Colors live in `PLASMA_PRESENTATION`. | yes | Colors can be correct while the crest is in the wrong place. |
| AO | Same wave, different player and camera: front world Y unchanged. | yes | Not playtested. |
| AP | Frozen time, move player: front world Y unchanged, threat may change. | yes | Not playtested. |
| AQ | Frozen time, move camera: front world Y unchanged, screen Y follows the helper. | yes | This is the regression test for the rejected symptom. It passes on this source. Paul has not confirmed the picture. |
| AR | One level-6 jump: front world delta equals wave delta, which equals `-speed * time`. | yes | Not playtested. |
| AS | Source must not place the crest from `playerScreen` or a fixed viewport line. | yes | Proves the old formula is absent, not that the new picture is good. |

`npm run test:plasma` runs the architecture file only. It is not the full suite.

## 10. Renderer authority

`Renderer.draw` order, from the current method:

1. Shake translate.
2. `CelestialBackground.draw` — sky, stars, nebula. It does not paint the old `knY` fog.
3. Realm signature (`drawSignature`), screen space. The quantum fringe can react to the warning gap.
4. Ambient objective, screen space, behind the world.
5. Camera translate: `width/2 - camX`, `height/2 - camY`.
6. Platforms, trail, particles, Zyrx.
7. Restore the camera.
8. `paintPlasmaWall`: viewport tint, then the crest only if `physical.visible`.
9. White impact flash and chromatic split. The flash is an opaque full-screen layer and can hide plasma.
10. Foreground debris.
11. Operation label.
12. Death overlay (`MORTICIAN ACTIVE`), also opaque.

Nothing in the campaign HUD is drawn on the canvas. Score, time, and menus are React.

## 11. Ambient objective

`src/math/objectivePresentation.ts` formats two different strings: the level objective and the row objective. DIFFERENCE is not worded as a sum. Contract "objective scopes" locks that split.

`Renderer.drawAmbientTarget` draws the row numeral. Contract AD forbids a filled rectangle behind it.

Status: IMPLEMENTED / TEST ACCEPTED / NOT PLAYER-ACCEPTED.

## 12. Review mode

`?reviewMode=1` is read by `src/review/reviewMode.ts`.

It loads the same 30 schemas, in campaign order, and does not write campaign progress (contract AE). The same engine and renderer run.

Controls live in the Settings sheet, not a bar on the playfield. That move was made because a bottom bar covered the heat.

Status: IMPLEMENTED / TEST ACCEPTED. Paul has not signed off the Settings UX.

## 13. Level Studio

`?levelStudio=1` renders `src/studio/LevelStudio.tsx` from `src/main.tsx`.

It is EXPERIMENTAL, NOT PLAYER TESTED, NOT PLAYER ACCEPTED.

Contract AF says the studio calls the production `GameEngine` to draw and start. Contract AG says `validateVisualScene` rejects a scene that tries to own the wave. Those tests do not make the tool approved.

## 14. Level Studio intent, not approval

The direction discussed, and not accepted, was: one `VisualScene` description shared by the runtime and a studio, with the studio using the production renderer. The studio would eventually edit background, parallax, props, platform look, ambient type, particles, light, camera presentation, and plasma presentation. Math and the wave would stay in the engine.

Do not build that next. Plasma is open. The current `VisualScene` is a read-only inventory, and its plasma field still says `historical-heat`, which is not a precise description of `paintPlasmaWall`.

## 15. Visual completeness

`sceneFromLevel` gives every level the same `productionLayers()`:

- 5 background layers
- 4 of those have non-zero parallax
- 23 motif objects (3 + 6 + 14)
- transparent ambient number
- global landing particles
- default lighting
- 0 unique overrides

So the campaign is 6 realm palettes and platform shapes, plus route variation, plus math variation. It is not 30 authored environments. That is why a studio was proposed. It is not a reason to start the studio now.

## 16. Sound

`new SoundEngine` is constructed by `GameEngine` only (contract H).

`src/audio/soundManifest.ts` maps events: world enter, contact, depart, math resolve, fluent resolve, non-resolve, level clear, death, pause, resume, ambience bed, momentum pulse, pressure tick.

There has been no realm-by-realm sound design pass. Desired direction, not built: atmospheric, organic and digital, not arcade stingers, adaptive, realm-aware, plasma-aware, usable on a phone speaker.

Status of the ownership rule: TEST ACCEPTED. The design pass: DEFERRED.

## 17. Input

`App.tsx` listens on the play surface for `click` and `touchend`. UI targets (`button`, links, `[data-ui]`, and the same list in `isUiEventTarget`) do not count as jumps.

Contract W: one activation produces one jump, and a later separate tap still jumps. Gate 5 audited the touchend-plus-synthetic-click risk. The contract is the lasting guard. Do not assume the audit found a live double-fire; the contract is what the tree enforces now.

## 18. Toolchain

Project Vite is 6.4.3, resolved from this project's `node_modules`.

A parent install at `/workspace/node_modules/vite` is 8.3.1. `npx vite` can hit that parent. Do not use it.

Certified commands:

- `npm test` → `node ./scripts/run-tests.mjs`
- `npm run build` → `node ./scripts/run-vite.mjs build`
- `npm run dev` → `node ./scripts/run-vite.mjs --port=8080 --host=0.0.0.0`

`scripts/project-toolchain.mjs` resolves binaries from this project's `node_modules` and refuses a package that resolves outside it.

## 19. esbuild split

Do not treat "esbuild" as one version.

| Binary | Version | Mode at capture |
|---|---|---|
| `node_modules/esbuild` (Vite's production build) | 0.25.12 | `bin/esbuild` is mode 644 and does not execute in place |
| `node_modules/tsx/node_modules/esbuild` (tests) | 0.28.2 | used by tsx |

`project-toolchain.mjs` copies a binary into `os.tmpdir()`, chmods the copy, and sets `ESBUILD_BINARY_PATH`. That is a workaround for a fuse/filesystem mode of 644, not a dependency change.

## 20. Lockfile

NO TRUSTED LOCKFILE.

`package.json` ranges are not the installed tree. Previous notes, not re-tested by an install in this capture because install is forbidden:

- Installed Vite esbuild 0.25.12 versus a fresh resolve that selected 0.28.2.
- Installed `@esbuild/linux-x64` 0.25.12 versus 0.28.2.
- Installed `ws` 8.21.3 versus a fresh 8.22.0.

Those fresh numbers are historical observations. They were not reproduced here. Do not run `npm install` to "check." Gate 8 was the intended place for that and it has not started.

Installed versions that were read from this tree without installing:

- Node v22.23.3
- npm 10.9.9
- Vite 6.4.3
- React 19.3.0
- React DOM 19.3.0
- TypeScript 5.8.3
- tsx 4.23.15
- esbuild 0.25.12 and, under tsx, 0.28.2

`package.json` declares wider ranges (`vite ^6.2.0`, `typescript ~5.8.2`, `tsx ^4.21.0`). The installed versions above are the ones that actually ran.

## 21. TypeScript

Command: `node ./node_modules/typescript/bin/tsc --noEmit`

Exit code: 2

`src/` diagnostics: 0

Remaining diagnostics at capture:

- `tests/architecture_contract_suite.ts(7,31)` TS2307 Cannot find module `url`
- `tests/architecture_contract_suite.ts(129,18)`, `(212,33)`, `(240,39)` TS2352 MockCanvas cast to HTMLCanvasElement
- `tests/architecture_contract_suite.ts(292,10)` and `(296,10)` TS2367 `"DYING"` compared to `"playing"`
- `tests/architecture_contract_suite.ts(583,10)` and `(583,38)` TS2367 `0` compared to `1`
- `tests/challenge_trace_suite.ts(21,18)` TS2352 MockCanvas cast
- `tests/torture_suite.ts(319,11)` TS2367 `10` compared to `0`
- `vite.config.ts(2,31)` TS2307 Cannot find module `node:url`

Do not say TypeScript passes.

## 22. Contract table

Pass column is the capture `npm test`, exit 0. Player column is only what Paul actually confirmed. "No" means he did not accept it, not that he rejected that specific letter.

| Contract | Purpose | Pass | Player validated | Limitation |
|---|---|---|---|---|
| A | 30 levels, 6 realms, 5 each | yes | no | Schema test, not a playtest |
| B | Math stays in MathChallengeEngine | yes | no | |
| C | No WARPING assignment | yes | no | |
| D | A winning landing secures the sim | yes | no | |
| E | Preview does not commit; landing commits once, including equal values | yes | no | Capture run: 24 equal-value commits in 200 |
| F | One wave; distances ordered | yes | partial | The time rule is accepted; this test is broader |
| G | Recovery keeps the same wave and committed math | yes | no | |
| H | One SoundEngine, owned by GameEngine | yes | no | |
| I | Canvas does not own menus; React does not own the wave | yes | no | |
| J | No unused framework imports | yes | no | |
| objective scopes | Shared formatter, distinct difference wording | yes | no | |
| K | WARPING tokens absent | yes | no | |
| L | Removed death variants absent | yes | no | |
| M | No kilonova drain | yes | no | |
| N–Q | Realm mapping | yes | no | |
| R | No unused wave slowdown | yes | no | |
| S | No dormant pause/settings screen states | yes | no | Settings UI still exists; these were old screen enums |
| T | No obsolete clear-next hook | yes | no | |
| U | No unused audio barrel | yes | no | |
| V | New sequence does not keep stale lookahead | yes | no | |
| W | One activation, one jump | yes | no | Gate 5 was an audit plus this contract |
| X | No Gemini/API-key runtime | yes | no | |
| Y | Direct dependencies match the live set | yes | no | Does not create a lockfile |
| Z | One DEFAULT_ZYX_CONFIG; probe must not change spawn | yes | no | |
| AA–AS | Plasma group in section 9 | yes | AB's rule only | See section 9 |
| AC | Diagonal camera continuity | yes | no | |
| AD | Ambient number has no rectangle | yes | no | |
| AE | Review uses 30 levels and does not save progress | yes | no | |
| AF | Studio uses the production renderer | yes | no | Studio not reviewed |
| AG | VisualScene cannot own the wave | yes | no | |

## 23. MB9

MB9 is the structured prompt and hint contract in `tests/challenge_trace_suite.ts`, plus MB9-ISO for sequence-context isolation.

It failed in the past when a new level inherited lookahead from the previous sequence. Gate 4.5 reset lookahead when the context key changed, without committing learner progress.

Capture result: `MB9 200/200`.

## 24. Build authority

Only:

```text
npm run build
```

which is `node ./scripts/run-vite.mjs build`.

Do not run `npx vite`. Parent Vite is 8.3.1. This project is 6.4.3.

Capture build, also copied to `artifacts/current-build/`:

| Asset | Bytes | SHA-256 |
|---|---:|---|
| `index-w1UmiH7H.js` | 342151 | `b3eb41d72e6ccbb6939f9714e8594220028945b806e7f850357fa33654801d31` |
| `index-DSooJG3U.css` | 8739 | `c2fa2fd1051bc097604b2dc27fe3b7e60b06d3b26e1182e1a44e832307f07dd8` |

Vite reported 60 modules on that build.

## 25. Known-good / known-bad

| Subsystem | Status | Evidence |
|---|---|---|
| Campaign schemas | TEST ACCEPTED | Contract A. Table in section 3 matches `LevelDatabase.ts` |
| Math engine | TEST ACCEPTED | Contract B, math suite |
| Preview vs landing commit | TEST ACCEPTED | Contract E |
| Wrong-answer math | TEST ACCEPTED | Contract E and handleLanding |
| MB9 lookahead | TEST ACCEPTED | 200/200 |
| Level completion | TEST ACCEPTED | status `level_complete`, 750 ms hold |
| Realm authority | TEST ACCEPTED | Contracts N–Q |
| Input | TEST ACCEPTED | Contract W |
| Sound ownership | TEST ACCEPTED | Contract H. Design is DEFERRED |
| Camera diagonal continuity | IMPLEMENTED / UNACCEPTED | Contract AC passes. No player sign-off |
| Ambient number transparency | IMPLEMENTED / UNACCEPTED | Contract AD passes. No player sign-off |
| Review mode | IMPLEMENTED / UNACCEPTED | Contract AE. Not the current blocker |
| Plasma physical time movement | PLAYER ACCEPTED | Paul confirmed after nudge removal. AB passes |
| Plasma answer independence | PLAYER ACCEPTED | Same confirmation. Nudges are gone from source |
| Plasma visible presentation | KNOWN BROKEN | Last playtest of a visible wall was a rejection. This candidate is unaccepted |
| Plasma camera independence | IMPLEMENTED / UNACCEPTED | AQ passes. Paul has not confirmed the new build |
| Level Studio | EXPERIMENTAL | Not played |
| VisualScene | EXPERIMENTAL | Inventory only, 0 overrides |
| Toolchain | TEST ACCEPTED | Project-local scripts. Parent Vite must not be used |
| Lockfile / reproducibility | DEFERRED | No lockfile. Gate 8 not started |
| TypeScript | KNOWN BROKEN | Exit 2. `src/` is clean |

## 26. Drift history

See `docs/REGRESSION_HISTORY.md`.

## 27. Rules for the next engineer

See `docs/AI_STUDIO_ENGINEERING_RULES.md`.

## 28. What to preserve

Preserve:

- Time-only `wave.y` advancement and the four constants.
- One `MathChallengeEngine`, with commit on landing only.
- One `SoundEngine` owned by `GameEngine`.
- Realm-by-sector mapping, not mapping by level-id prefix.
- Project-local Vite and the esbuild temp-binary workaround.
- The absence of a lockfile until a reproducibility gate says otherwise.

Reconsider, do not treat as settled:

- Whether a crest at `wave.y` plus a bottom tint is the presentation Paul wants.
- Camera X row-center framing.
- Ambient drawing.
- Review Settings UX.
- Level Studio and `VisualScene.plasma = 'historical-heat'`.

## 29. Restart sequence

Do not code first.

1. Check the manifest.
2. Run the tree as-is.
3. `npm test`.
4. `npm run build`, and compare hashes to section 24.
5. Play, or watch a capture of, the normal game. Do not judge plasma from the lab alone.
6. Audit plasma from source.
7. Only then propose one plasma gate that keeps the accepted time rule.
8. Paul playtests the normal game.
9. Freeze whatever he accepts.
10. Camera, ambient, and review only after that.
11. Level Studio last.

## 30. Files that are not authority

These are in the tree from older phases. They are notes, not the current game:

`GAME_DESIGN_DOCUMENT.md`, `PHASE_*`, `ZYX_*`, `fix_app.sh`, `fix_engine.sh`, `patch.cjs`, `patch_engine.cjs`, `zyx_*_sot.tar.gz`.

If they disagree with `src/`, `src/` wins, and Paul's playtest wins over both.
