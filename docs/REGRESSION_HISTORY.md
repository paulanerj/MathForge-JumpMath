# Regression history

This is a record of failures, not a claim that the current tree is clean.

A passing automated test did not prevent several of these.

## Math stale lookahead

- Symptom: a new sequence could keep a previous level's lookahead state.
- Root cause, as later locked by contract V: lookahead context was not reset when the sequence key changed, so speculative state leaked.
- Why tests missed it: earlier checks did not separate a new sequence context from continuity inside one sequence.
- Protection now: contract V, and MB9 isolation, 200/200 on the capture run.
- Status: TEST ACCEPTED. Not re-confirmed by a fresh Paul playtest in this capture.

## Contract E false failure

- Symptom: a certification run treated two equal numeric values as proof that a commit had or had not happened.
- Root cause: value equality is not identity of a commit. Two different events can produce the same number.
- Why tests missed it: the assertion was the bug.
- Protection now: contract E counts landing commits, including equal-value cases. The capture run reported 24 equal-value commits in 200.
- Status: TEST ACCEPTED.

## DEFAULT_ZYX_CONFIG ReferenceError

- Symptom: production referenced `DEFAULT_ZYX_CONFIG` without a binding. TypeScript only exposed it after empty `@types` packages were removed.
- Root cause: `src/App.tsx` used the name without importing the one export in the config barrel.
- Why tests missed it: the runtime path was not executed under the check that assumed default parameters already supplied it.
- Protection now: contract Z. App imports `DEFAULT_ZYX_CONFIG` from `./config`. One export.
- Status: TEST ACCEPTED. The import is in the current source.

## Plasma presentation deletion

- Symptom: Paul played a candidate and the pursuing shock wave he remembered was gone. Orange floor heat was not a substitute.
- Root cause: cleanup removed or stopped executing the September 18 filled crest and the screen-space heat field. Contracts had locked source strings, not visible geometry, and one visibility test used `wave.y - camera.y` instead of the camera's viewport-center transform.
- Why tests missed it: presence of a comment or a Canvas call was treated as the feature.
- Protection attempted: later contracts AA, AN, AM. They passed on builds Paul still rejected.
- Status: KNOWN UNRESOLVED as a player-visible result. See the synthetic-front entry.

## Review controls covering the heat

- Symptom: a bottom review bar sat on the heat fringe.
- Root cause: a playfield overlay, not the plasma equation.
- Protection: review controls were moved into Settings. Contract AE checks review isolation from saved progress.
- Status: IMPLEMENTED. Paul has not accepted the Settings placement as a finished review UX. Review mode is not the current blocker.

## Plasma answer teleport

- Symptom: the wall jumped when Zyrx landed, especially on a wrong answer.
- Root cause, established by a writer trace: correct landings added a forward displacement and wrong landings pulled the wave back, then a clamp returned the gap toward 900. Those writes were `nudgeWaveByMeter` plus player-relative correction. They were not `speed * dt`.
- Why tests missed it: contracts checked that a wave object existed, not that answer handlers left `wave.y` unchanged at dt = 0.
- Correction Paul confirmed: those writers were removed. The accepted rule is `wave.y(t + dt) = wave.y(t) - baseSpeed * dt` while simulation is active.
- Protection now: contract AB. Capture constants remain spawn 900, speed 28, collision 26, warning 520. `nudgeWaveByMeter` is absent from `src/`.
- Status: PLAYER ACCEPTED for the physical rule. Do not restore +15%, -20%, or the clamp.

## Plasma disappearance after the nudge removal

- Symptom: after the teleport was removed, ordinary play still did not show a shock front. The physical wave starts 900 units behind the player. With the camera settled, that front is below an 800px view.
- Root cause: the true front was off-screen. Removing the nudges did not move it into view. That was correct physics and a presentation problem.
- Why tests missed it: AB only checked world motion.
- Status: this is still the geometric fact in the current source. The crest is drawn at `wave.y`. At a gap of 900 it does not intersect the viewport.

## Synthetic plasma front

- Symptom: Paul played a later candidate and the visible lava wall moved with Zyrx and the camera during a jump.
- Root cause in that candidate, since removed from source: `visualFrontScreenY = playerScreen + shownOffset`. The crest was defined as a screen offset under the player, then converted back into a world position. Because the camera keeps Zyrx in a preferred screen slot, the fake front inherited player and camera motion.
- Why tests missed it: AA at that time required a crest inside the viewport at a distant gap. That requirement created the coupling. World-position contracts did not exist yet.
- What the current source does instead: `shockWorldY = wave.y + SHOCK_FRONT_WORLD_OFFSET` with the offset equal to 0. `playerScreen` and `visualFrontScreenY` are not in `plasmaPresentation.ts`. Contracts AO, AP, AQ, AR, and AS pass on this tree.
- Status: the synthetic formula is not in this capture. The replacement is NOT PLAYER ACCEPTED. Paul asked for a new link to the world-anchored build (`index-w1UmiH7H.js`) and then stopped development before a verdict. Do not tell a new coder that the coupling bug is player-closed.

## Camera landing snap

- Symptom: on a diagonal route, landing produced a second sideways camera correction.
- Claimed code correction: while jumping, `camera.x` interpolates from the current row center to the destination row center. At rest it stays on the landed row. It does not retarget to the following row. Contract AC checks that.
- Status: IMPLEMENTED / TEST ACCEPTED / NOT PLAYER-ACCEPTED. Do not promote it.

## Ambient number rectangle

- Symptom: the large objective number drew inside an opaque rectangle on a phone.
- Claimed correction: `drawAmbientTarget` scales the font and does not use a filled rectangle or a max-width text box. Contract AD checks the source shape of that function.
- Status: IMPLEMENTED / TEST ACCEPTED / NOT PLAYER-ACCEPTED.
