# ZYX COMMERCIALIZATION PROGRAM
## PHASE 2A-R1 — SOURCE IDENTITY RECOVERY & PLAYER-PATH CERTIFICATION REPORT

**Status:** FORMAL SUBMISSION FOR PM & AUDIT ACCEPTANCE  
**Authority Reference:** `ZYX-00-R1 — FORMALLY ACCEPTED`  
**Governing Contract:** `ZYX_00_REGRESSION_CONTRACT.md`  
**Date:** September 18, 2026  

---

### EXECUTIVE SUMMARY

In accordance with the PM directive for Phase 2A-R1, the source identity of the working tree has been recovered and verified within `/app/applet`. The P0 player-path defect identified during independent inspection—wherein diagonal traversal levels (`level_3` with `pv = [1, -1]` and `level_4` with `pv = [-1, -1]`) moved platforms outside the visible/tappable screen viewport due to hardcoded horizontal camera locking—has been completely diagnosed, mathematically rectified, and certified across three independent test layers.

All 9 ZYX-00 torture test gates, all 5 Phase 2A configuration authority gates, and all 5 new player-path/reachability gates pass with zero runtime defects.

---

## 1. WORKING DIRECTORY CLARIFICATION & ARTIFACT SHA-256

### 1.1 Source Location Clarification
The active, forward Phase 2A working tree resides at `/app/applet`.
The prior audit mismatch was caused by inspecting an unmigrated parent root archive rather than the active applet workspace where `src/config/`, `tests/config_authority_suite.ts`, and the Phase 2A architecture files were developed.

### 1.2 Cryptographic SOT Identity
* **Phase 2A Initial SOT Archive (`zyx_phase_2a_sot.tar.gz`):**  
  `65d63a22dc6b9dcbba3ee450a807cf141a3b8c9e8726e6c683fabca296a9cd0f`
* **Phase 2A-R1 Certified SOT Archive (`zyx_phase_2a_r1_sot.tar.gz`):**  
  `679a9068b697d0990d536522a26f4e09f5dae0aab579598d249005f76cab3db0`

### 1.3 Key File Manifest & Checksums
| File | SHA-256 |
|---|---|
| `src/engine/GameEngine.ts` | `e07ae8eccb98c393591f655497ea17117509d15b63f5a47701c8545712b9c17f` |
| `src/engine/Camera.ts` | `fac9ab892c873c81416988df660cb7ad47569729622e0803e486429129179c26` |
| `src/engine/PlatformManager.ts` | `968059c01b8566e29c3dd7d8e6359d99249fabec24635b19e47c1532c9b147c1` |
| `src/engine/LevelDatabase.ts` | `fceee6ac6adc435203d7210893086e74e78346856d2c029308f043edd8f32058` |
| `src/config/defaults.ts` | `48322d7c4a5c226c13ac46d8e49ded88e5274c872d815f31738aa326be3e2b1a` |
| `tests/torture_suite.ts` | `9a072a3533224bc746249449bf8d55261fe76e1b3fa47c12cf87439f63f080ab` |
| `tests/config_authority_suite.ts` | `05f826b7c5f806db66a3b9beb59fdef2bcc358228f23d6605b6e560bb20b1e55` |
| `tests/player_path_suite.ts` | `20a31dfa626a3939ecb1db1b146f8564b97011cd53fe9ac04c08aff4aa28f041` |

---

## 2. DEFECT ANALYSIS: DIAGONAL LEVEL PROGRESSION & REACHABILITY

### 2.1 Symptoms & Audit Finding
During external audit inspection of `LevelDatabase.ts`:
* `level_1` & `level_2`: `progressionVector = { x: 0, y: -1 }` (vertical traversal).
* `level_3`: `progressionVector = { x: 1, y: -1 }` (diagonal up-right traversal).
* `level_4`: `progressionVector = { x: -1, y: -1 }` (diagonal up-left traversal).

When running `level_3` or `level_4`, platforms for row 2 and above were generated with world coordinates that drifted horizontally by `220px` per row:
* Row 1: `baseX = 220px` -> Platform screen X = `330px`, `470px`, `610px`
* Row 2: `baseX = 440px` -> Platform screen X = `550px`, `690px`, `830px`
* Row 3: `baseX = 660px` -> Platform screen X = `770px`, `910px`, `1050px`
* Row 4: `baseX = 880px` -> Platform screen X = `990px`, `1130px`, `1270px`

On a standard 500px wide display (`width = 500`), all platforms on row 2, 3, and 4 exceeded `500px`. They became completely invisible, culled by `Renderer.ts` (`Math.abs(p.x - camX) > width`), and unreachable via user tap.

### 2.2 Root Cause
In `src/engine/GameEngine.ts` (line 418 of ZYX-00-R1):
```typescript
this.camera.update(dt, 0, logicalY); // Disabling horizontal pan
```
The horizontal camera coordinate was hardcoded to `0`, preventing the camera from panning horizontally to track diagonal level geometry. Furthermore, during warp transitions (`status === 'WARPING'`), camera acceleration only modified `this.camera.y` without updating `this.camera.x`.

---

## 3. CODE CHANGES MADE

### 3.1 Dynamic Horizontal Camera Tracking (`src/engine/GameEngine.ts`)
To preserve `progressionVector` as an architectural capability while ensuring all upcoming platforms remain comfortably centered within the tappable viewport:

```typescript
// Calculate upcoming row track center along the schema's progressionVector
const pv = this.state.schema.progressionVector;
const targetTrackX = (zyx.currentRow + (zyx.jumping ? zyx.t : 0) + 1) * pv.x * this.platformManager.gapY;
this.camera.update(dt, targetTrackX, logicalY);
```

**Mathematical Invariants Maintained:**
1. **Vertical Levels (`pv.x === 0`):** `targetTrackX === 0`. The camera X-coordinate remains exactly `0.00`, preserving 100% byte-for-byte behavioral identity with ZYX-00-R1.
2. **Diagonal Levels (`pv.x !== 0`):** The camera smoothly lerps toward `targetTrackX`. For upcoming row `r + 1`, the three platform lanes appear on screen at approximately `110px`, `250px`, and `390px` (with `55px` safety margins on the 500px display), exactly mirroring the horizontal layout of vertical levels.
3. **During Jumps:** Camera tracking uses continuous interpolation `(zyx.currentRow + zyx.t + 1)` so that the viewport glides smoothly into the upcoming row rather than jumping abruptly.
4. **On Wrong Answers:** `currentRow` does not advance; the camera remains centered on the retry row.

### 3.2 2D Warp Vector Acceleration (`src/engine/GameEngine.ts`)
Warp acceleration now respects the 2D progression vector:
```typescript
const pv = this.state.schema.progressionVector;
const warpStep = this.config.gameplay.warpAccelMultiplier * dt * (this.state.warpElapsed / 1000);
this.camera.y += pv.y * warpStep;
this.camera.x += pv.x * warpStep;
```

### 3.3 Test Runner Expansion (`package.json`)
Updated `"test"` script to execute all three test layers consecutively:
```json
"scripts": {
  "test": "tsx tests/torture_suite.ts && tsx tests/config_authority_suite.ts && tsx tests/player_path_suite.ts"
}
```

---

## 4. SUMMARY OF THE THREE TEST LAYERS

### Layer 1: ZYX-00 Torture Test Suite (`tests/torture_suite.ts`)
* **Purpose:** Proves that all foundational gameplay mechanics, state machines, RAF loop lifecycles, wrong-answer semantics, and error handling remain unregressed.
* **Coverage:**
  * Test 1: Wrong-Answer Torture & Semantics (20 challenges, double-wrong-then-correct pattern).
  * Test 2: Rapid Input / Input Spam Torture (81 spam attempts during animation).
  * Test 3: Sector Transition Torture (15 consecutive sectors crossed).
  * Test 4: Animation Loop Ownership Proof (Single RAF loop across 7 mounts/unmounts).
  * Test 5: Failure / Restart Torture (25 failure/restart cycles with camera reset verification).
  * Test 6: Long-Run Sustained Gameplay (120 challenges resolved across 12 sectors).
  * Test 7: Mixed Real-World Lifecycle Torture (5 chaotic rounds).
  * Test 8: Resize & Hit-Testing Coordinate Transforms (500x800 and 375x600 scaled).
  * Test 9: Browser Lifecycle Simulation (5-second tab switch dt clamp).
* **Result:** 9 of 9 tests PASS. Zero runtime errors, zero duplicate resolutions, zero state corruption.

### Layer 2: Phase 2A Configuration Authority Suite (`tests/config_authority_suite.ts`)
* **Purpose:** Proves that all runtime modules derive behavior from the centralized configuration system (`src/config/`) rather than hardcoded constants.
* **Coverage:**
  * Test 1: Default Configuration Baseline Integrity (All ZYX-00-R1 values verified).
  * Test 2: Factory Deep Merging & Default Immutability (`createZyxConfig` deep clone protection).
  * Test 3: PlatformManager Custom Geometry Injection (Dynamic gapX/gapY/widths).
  * Test 4: Camera Smoothing & Offset Injection (`lerpRateX`, `lerpRateY`, `targetOffsetY`).
  * Test 5: GameEngine Full-Stack Runtime Responsiveness (`jumpSpeed`, `turnTimeLimit`, `voidSpeed`).
* **Result:** 5 of 5 tests PASS. 100% configuration authority certified.

### Layer 3: Phase 2A-R1 Player-Path & Reachability Suite (`tests/player_path_suite.ts`)
* **Purpose:** Validates end-to-end player path reachability, inverse-coordinate mathematical invariance, and finite-coordinate safety under real input simulation.
* **Coverage:**
  * **Gate PR1 (Level Reachability):** Full 8-row automated traversal for every database level (`level_1` through `level_4`) using `handleInput(screenX, screenY)`. All platforms guaranteed inside viewport bounds `[0, 500] x [0, 800]`.
  * **Gate PR1 (Diagonal Wrong-Bounce-Recover):** 5-row wrong-answer bounce, safe return, and recovery validation in diagonal levels.
  * **Gate PR2 (Coordinate Round-Trip Invariance):** Mathematical round-trip identity `world -> screen -> handleInput -> hitTest -> world` verified with sub-pixel precision across 5 distinct viewports (Desktop, Mobile CSS, iPhone Pro, Tablet, Android Compact), 4 progression vectors, and 80 distinct platform targets.
  * **Gate PR3 (Strict Finite-Coordinate Audit):** Zero tolerance for `NaN`, `Infinity`, `-Infinity`, `null`, or `undefined` across Zyx state, camera state, platforms, particles, and wave during jumps, bounces, deaths, respawns, warps, and 5-second tab-switch dt spikes.
  * **Negative Proof:** Automated regression verification demonstrating that the ZYX-00-R1 fixed-camera logic fails on diagonal levels (`level_3`), proving the test suite actively catches the defect.
* **Result:** 5 of 5 tests PASS. 100% player-path certified.

---

## 5. EXACT OUTPUT OF `npm test`

```text
> react-example@0.0.0 test
> tsx tests/torture_suite.ts && tsx tests/config_authority_suite.ts && tsx tests/player_path_suite.ts

================================================================
  ZYX COMMERCIALIZATION PROGRAM — PHASE 1B TORTURE TEST SUITE  
================================================================

>>> [TEST 1] Wrong-Answer Torture & Semantics (Gate C1)
[GameEngine] start() called. Spawning loop instance 1
  [PASS] 20 challenges verified with double-wrong-then-correct pattern.

>>> [TEST 2] Rapid Input / Input Spam Torture (Gate C5)
[GameEngine] start() called. Spawning loop instance 1
  [PASS] Rapid input spam completely rejected during jump, bounce, and transitions.

>>> [TEST 3] Sector Transition Torture (Gate C3)
[GameEngine] start() called. Spawning loop instance 1
  [PASS] Successfully crossed 15 consecutive sectors with flawless reset.

>>> [TEST 4] Animation Loop Ownership Proof (Gate C6)
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] cleanup() called. Terminating loop instance 1
[GameEngine] start() called. Spawning loop instance 2
[GameEngine] cleanup() called. Terminating loop instance 2
[GameEngine] start() called. Spawning loop instance 3
[GameEngine] cleanup() called. Terminating loop instance 3
[GameEngine] start() called. Spawning loop instance 4
[GameEngine] cleanup() called. Terminating loop instance 4
[GameEngine] start() called. Spawning loop instance 5
[GameEngine] cleanup() called. Terminating loop instance 5
[GameEngine] start() called. Spawning loop instance 6
[GameEngine] cleanup() called. Terminating loop instance 6
[GameEngine] start() called. Spawning loop instance 7
  [PASS] Mathematical proof: exactly 1 active RAF loop maintained across all lifecycles.

>>> [TEST 5] Failure / Restart Torture (Gate C4)
[GameEngine] start() called. Spawning loop instance 1
  [PASS] 25 failure/restart cycles executed cleanly with complete state scrubbing.

>>> [TEST 6] Long-Run Sustained Gameplay (Gate C2)
[GameEngine] start() called. Spawning loop instance 1
  [PASS] Long run completed: 120 challenges resolved across 12 sectors.

>>> [TEST 7] Mixed Real-World Lifecycle Torture (Gate C2, C3, C4)
[GameEngine] start() called. Spawning loop instance 1
  [PASS] Mixed chaos lifecycle executed with zero crashes or corrupted state.

>>> [TEST 8] Resize & Hit-Testing Coordinate Transforms (Gate C1, C8)
[GameEngine] start() called. Spawning loop instance 1
  [PASS] Viewport resizing and hit-test scaling perfectly aligned.

>>> [TEST 9] Browser Lifecycle Simulation (Gate C7)
[GameEngine] start() called. Spawning loop instance 1
  [PASS] Tab switch delta-time clamp verified.

================================================================
  ALL TORTURE TESTS PASSED WITH ZERO RUNTIME DEFECTS!           
================================================================

FINAL TORTURE METRICS:
{
  "challengesAttempted": 340,
  "challengesResolved": 340,
  "correctAnswers": 340,
  "wrongAnswers": 83,
  "wrongAnswerRecoveries": 51,
  "sectorsCrossed": 27,
  "restartCycles": 25,
  "rapidInputAttempts": 81,
  "browserLifecycleCycles": 1,
  "freezes": 0,
  "duplicateResolutions": 0,
  "incorrectRowAdvances": 0,
  "unexpectedStateTransitions": 0,
  "consoleErrors": 0,
  "consoleWarnings": 0
}

================================================================
  PHASE 2A — CONFIGURATION AUTHORITY VERIFICATION SUITE         
================================================================

>>> [TEST 1] Default Configuration Baseline Integrity
  [PASS] All baseline configuration values verify against ZYX-00-R1 constants.

>>> [TEST 2] Factory Deep Merging & Default Immutability
  [PASS] Deep merging selectively overrides targets while preserving default immutability.

>>> [TEST 3] PlatformManager Custom Geometry Injection
  [PASS] PlatformManager geometry strictly respects injected PlatformConfig.

>>> [TEST 4] Camera Smoothing & Offset Injection
  [PASS] Camera follows injected CameraConfig parameters.

>>> [TEST 5] GameEngine Runtime Responsiveness to Injected ZyxConfig
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] cleanup() called. Terminating loop instance 1
  [PASS] GameEngine runtime dynamically governed by injected ZyxConfig.

================================================================
  ALL CONFIGURATION TESTS PASSED WITH 100% AUTHORITY VERIFIED!  
================================================================

================================================================
  PHASE 2A-R1 — PLAYER-PATH & REACHABILITY CERTIFICATION SUITE 
================================================================

>>> [TEST 1] Full-Depth Level Reachability Across All Progression Vectors (Gate PR1)
[GameEngine] start() called. Spawning loop instance 1
  -> Testing Level "level_1" (progressionVector: [0, -1], mode: SUM_TO)
     [PASS] Successfully traversed 8 rows in Level "level_1".
[GameEngine] start() called. Spawning loop instance 1
  -> Testing Level "level_2" (progressionVector: [0, -1], mode: SKIP_COUNT)
     [PASS] Successfully traversed 8 rows in Level "level_2".
[GameEngine] start() called. Spawning loop instance 1
  -> Testing Level "level_3" (progressionVector: [1, -1], mode: SUM_TO)
     [PASS] Successfully traversed 8 rows in Level "level_3".
[GameEngine] start() called. Spawning loop instance 1
  -> Testing Level "level_4" (progressionVector: [-1, -1], mode: SKIP_COUNT)
     [PASS] Successfully traversed 8 rows in Level "level_4".

>>> [TEST 2] Wrong-Answer Bounce & Recovery Reachability in Diagonal Levels
[GameEngine] start() called. Spawning loop instance 1
  -> Testing wrong-bounce recovery on "level_3" (pv: [1, -1])
     [PASS] Wrong-bounce-recovery certified on "level_3".
[GameEngine] start() called. Spawning loop instance 1
  -> Testing wrong-bounce recovery on "level_4" (pv: [-1, -1])
     [PASS] Wrong-bounce-recovery certified on "level_4".

>>> [TEST 3] Mathematical Coordinate Round-Trip Invariance (Gate PR2)
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
  [PASS] 100% round-trip precision verified across 5 viewports, 4 progression vectors, and 80 platforms.

>>> [TEST 4] Strict Finite-Coordinate & Anti-Corruption Audit (Gate PR3)
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
[GameEngine] start() called. Spawning loop instance 1
  [PASS] Strict finite-coordinate certification verified across all states and catastrophe lifecycles.

>>> [TEST 5] Regression Negative Proof (Simulating ZYX-00-R1 Fixed-Cam Bug)
[GameEngine] start() called. Spawning loop instance 1
  [PASS] Negative proof confirmed: ZYX-00-R1 behavior reliably fails: "Row 1 correct platform could not be tapped at (330.0, 171.4)"

================================================================
  ALL PLAYER-PATH TESTS PASSED WITH 100% CERTIFICATION!        
================================================================
```

---

## 6. V19 COMPATIBILITY & REGRESSION CONTRACT STATEMENT

1. **`jumpmath_v19.html` Compatibility:**
   All core gameplay formulas (apex height calculation, jump timing, combo mechanics, flow state triggers, catastrophe acceleration, and theme rendering) continue to adhere strictly to the accepted v19 reference parameters.
2. **`ZYX_00_REGRESSION_CONTRACT.md` Preservation:**
   * Invariant C1 (Wrong-Answer Semantics): Verified intact via Test 1.
   * Invariant C2 (Sustained Gameplay Continuity): Verified intact via Test 6.
   * Invariant C3 (Sector Warp & Reset): Verified intact via Test 3.
   * Invariant C4 (Catastrophe & Resets): Verified intact via Test 5.
   * Invariant C5 (Input Lockout): Verified intact via Test 2.
   * Invariant C6 (RAF Lifecycle Ownership): Verified intact via Test 4.
   * Invariant C7 (Browser Visibility Clamping): Verified intact via Test 9.
   * Invariant C8 (Hit-Test Coordinate Transforms): Verified intact and mathematically extended in Test 8 and Player-Path Test 3.
3. **TypeScript Compilation & Linting:**
   `npm run lint` (`tsc --noEmit`) and `npm run build` (`vite build`) execute with zero errors and zero warnings.

---

## 7. RECOMMENDATION

With the source identity conclusively established at `/app/applet`, the diagonal progression defect repaired without side-effects or regressions, and all three test suites executing cleanly in under 7 seconds, **Phase 2A is formally certified and ready for PM acceptance as `ZYX-2A-R1`**.
