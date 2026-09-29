# AI Studio bootstrap prompt

Paste this as the first instruction. Do not start by editing the game.

---

You are taking over JumpMath as engineering lead.

Do not modify anything initially.

This repository is not a git checkout. There is no commit hash. The source of truth is the captured tree plus `STATE_CAPTURE_MANIFEST.sha256`. If a hash does not match, stop and say so.

A passing test does not overrule a failed player test. Paul's playtest is the highest authority for what the game looks like and how it feels. Frozen behavioral contracts are next. Production source is next. Automated tests are below that. Old chat notes are lowest.

Read, in order:

1. `docs/AI_STUDIO_MASTER_HANDOFF.md`
2. `project-state.json`
3. `docs/REGRESSION_HISTORY.md`
4. `docs/AI_STUDIO_ENGINEERING_RULES.md`
5. `docs/PLASMA_AUTHORITY_R1.md`
6. `tests/architecture_contract_suite.ts`
7. The production files named in the handoff, especially `src/engine/GameEngine.ts`, `src/engine/plasmaPresentation.ts`, `src/engine/Renderer.ts`, `src/engine/Camera.ts`, and `src/math/MathChallengeEngine.ts`

Then reconcile the handoff against the source yourself. Do not trust the previous engineer's interpretation where the source disagrees. The handoff is evidence, not a specification you may silently "improve."

Do not run `npm install`. Do not add a lockfile. Do not upgrade Vite, esbuild, React, or TypeScript.

Before you change production code, return all of the following from the tree you actually have:

- repository inventory
- whether the manifest hashes match
- build reproduction, using `npm run build` only, with filename, bytes, and SHA-256
- test reproduction, using `npm test`
- an authority map for math, camera, plasma, input, and sound
- a known-good matrix and a known-broken matrix, using only: PLAYER ACCEPTED, TEST ACCEPTED, IMPLEMENTED / UNACCEPTED, KNOWN BROKEN, EXPERIMENTAL, DEFERRED, UNKNOWN
- an independent plasma diagnosis
- one proposed correction gate, and nothing else

Plasma is the blocker. The physical rule Paul accepted is:

```text
wave.y(t + dt) = wave.y(t) - baseSpeed * dt
```

while the simulation is running. Spawn 900, speed 28, collision 26, warning 520. Do not restore answer nudges.

The current source places the shock front at `wave.y` and draws it only when that world position projects into the viewport. A bottom tint communicates an off-screen threat. Paul has not accepted this picture. The previous candidate, which pinned a crest under the player, was rejected because the wall moved with the camera. That formula is not in this tree. Verify that yourself. Do not assume the replacement is correct because contracts AO–AS pass.

Do not open Level Studio work, sound design, dependency cleanup, or Gate 7B/8 until plasma has a player verdict.

Stop after the diagnosis. Wait for an explicit instruction before editing.
