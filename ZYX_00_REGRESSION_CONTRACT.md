# ZYX-00 — REGRESSION CONTRACT

**Contract Baseline:** `ZYX-00 — FREEZE CANDIDATE`  
**Applicability:** All subsequent development phases (Phase 2+ Feature Recovery, Polish, Commercialization)  
**Enforcement Authority:** CI / Automated Test Harness (`npm test`), Architecture Lead, PR Reviewers

---

## 1. Purpose & Guiding Principle

The core runtime foundation of Zyx has been verified as mathematically sound and defect-free under torture testing. This document defines the non-negotiable architectural and behavioral invariants established by `ZYX-00`.

**Any future modification, refactoring, feature recovery, or performance optimization that violates any clause of this contract is a P0 regression and MUST be rejected immediately.**

---

## 2. Core Architectural & Behavioral Invariants

### Invariant 1: Progression Advance Rule (Correctness Invariant)
1. Mathematical progression (`state.zyx.currentRow`, `correctInRow`, `state.score`) **MUST ONLY** advance when:
   - Zyx executes a jump toward a platform where `platform.isCorrect === true`.
   - Zyx completes the jump arc (`zyx.t >= 1.0`).
   - `handleLanding()` resolves with `this.targetPlatform.isCorrect === true`.
2. A wrong-answer selection (`platform.isCorrect === false`) **MUST NEVER** increment `currentRow`, `correctInRow`, or `score`.
3. Wrong answers **MUST** trigger a physical bounce-back recovery to the starting platform, leaving the current row and active math challenge intact and reachable.

### Invariant 2: Single Animation Loop Guarantee (Animation Invariant)
1. Exactly **ONE** runtime animation loop (`requestAnimationFrame`) may operate during active gameplay.
2. Ownership of the loop belongs strictly to `GameEngine`.
3. Calling `engine.start()` **MUST be strictly idempotent**:
   - If `this.animationFrameId !== null`, calling `start()` **MUST NOT** spawn an additional loop or increment `loopInstanceId`.
4. Calling `engine.cleanup()` **MUST** immediately cancel the active frame request (`cancelAnimationFrame`) and set `this.animationFrameId = null`.
5. Under no circumstances may React re-renders, component unmounts, sector changes, or failure restarts spawn parallel or orphaned frame loops.

### Invariant 3: Challenge Authority Rule (Authority Invariant)
1. Exactly **ONE** active mathematical challenge exists for the player's current row.
2. The active challenge remains the authoritative target until correctly resolved.
3. Decoy selections do not replace or invalidate the active challenge.
4. Correct answers on a row spawn the next row's challenge and platforms seamlessly without skipping.

### Invariant 4: Rapid-Input & Race-Condition Guard (Input Invariant)
1. A jump or challenge resolution **MUST NOT** execute more than once from duplicate or rapid inputs.
2. Both `handleInput()` and `executeJump()` **MUST enforce strict guards**:
   - If `state.zyx.jumping === true`: REJECT input.
   - If `state.zyx.bouncing === true`: REJECT input.
   - If `state.zyx.falling === true`: REJECT input.
   - If `state.status !== 'playing'`: REJECT input.
3. Tapping during jump animations, bounce-back recoveries, catastrophe death states, or warp transitions **MUST NEVER** alter game state or mutate target coordinates.

### Invariant 5: Restart Cleanliness Rule (Lifecycle Invariant)
1. Triggering `engine.restart()` **MUST** return the simulation to an absolute clean slate:
   - `state.status = 'playing'`
   - `state.score = 0`, `state.combo = 0`, `correctInRow = 0`
   - `state.zyx.currentRow = 0`
   - Movement flags (`jumping`, `bouncing`, `falling`) cleared to `false`
   - Camera offsets reset (`camera.x = 0`, `camera.y = 0`)
   - Catastrophe flags (`voidState`, `waveState`, `wormholeState`, etc.) cleared via `clearDeathStates()`
   - Particles and active animations wiped or reset
2. A restart **MUST NOT** inherit state, velocities, or stale timers from a previous run.
3. Simulation speed (`timeScale`, delta-time) must not drift across consecutive restart cycles.

### Invariant 6: Sector Transition Lifecycle Sequence
1. Progression through sectors **MUST** adhere to the following deterministic sequence:
   - Active gameplay (`status === 'playing'`)
   - `correctInRow` reaches `WIN_CONDITION` (10)
   - `state.status` transitions to `'WARPING'`
   - Warp animation plays for 1.0–1.2 seconds
   - `state.status` transitions to `'level_complete'`
   - `engine.onLevelComplete()` callback fires
   - Host application loads next `LevelSchema` via `engine.loadSchema(schema)`
   - Host application invokes `engine.start()` to resume simulation
2. No intermediate transition state may terminate the animation loop or leave the canvas detached.

### Invariant 7: Viewport Transformation & Hit-Testing Fidelity
1. Coordinate conversion in `handleInput(clientX, clientY)` **MUST** dynamically account for:
   - Canvas bounding rectangle offset (`rect.left`, `rect.top`)
   - Display scaling ratios (`canvas.width / rect.width`, `canvas.height / rect.height`)
   - Active camera translation (`camera.x`, `camera.y`)
2. Clicking the visible center of a platform on any screen size or DPI scaling **MUST** resolve strictly to that specific platform's bounds.

---

## 3. Automated Verification & CI Requirement

Every pull request, commit, or proposed modification to the Zyx codebase **MUST** run the 9-suite automated torture harness (covering the 8 certification gates C1–C8 and their subordinate regression assertions):

```bash
npm test
# Equivalent to: npx tsx tests/torture_suite.ts
```

The 9-suite harness exercises:
- **Suite 1 (Gate C1):** 20+ wrong-then-recover challenge sequences
- **Suite 2 (Gate C5):** 80+ rapid input spam attempts during active jump/bounce
- **Suite 3 (Gate C3):** 15+ consecutive sector transitions
- **Suite 4 (Gate C6):** Explicit animation loop ID tracking & idempotency proof
- **Suite 5 (Gate C4):** 25+ failure/restart cycles with state validation
- **Suite 6 (Gate C2):** 100+ sustained gameplay challenges across 10+ sectors
- **Suite 7 (Gates C2, C3, C4):** Mixed real-world chaos lifecycle torture
- **Suite 8 (Gates C1, C8):** Multi-viewport scaling & hit-testing geometry
- **Suite 9 (Gate C7):** Background tab delta-time clamping

**Execution Rule:**  
A single failure or regression in `npm test` automatically blocks code merging.

---

## 4. Source Authority Boundary

The modular implementation is the forward runtime authority beginning at `ZYX-00`. `jumpmath_v19.html` remains a recovery/reference authority for functionality identified in the Phase 0 recovery matrix until each capability is deliberately recovered, replaced, or retired.
