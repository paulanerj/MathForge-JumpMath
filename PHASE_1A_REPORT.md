# PHASE 1A — CORE RUNTIME STABILIZATION REPORT

## A. Root Cause — Defect A (Premature Progression)
*   **File:** `src/engine/GameEngine.ts`
*   **Function:** `handleLanding()`
*   **Relevant State:** `this.state.zyx.currentRow`
*   **Old Sequence:** `currentRow` was unconditionally updated as the first step of `handleLanding()`. If the user landed on a wrong platform, the engine initiated a visual bounce back, but semantically locked the row progression (via `if (platform.rowIdx <= this.state.zyx.currentRow) return;` in `executeJump()`), making the correct answer unselectable.
*   **New Sequence:** `this.state.zyx.currentRow = this.targetPlatform.rowIdx;` has been moved securely inside the `if (this.targetPlatform.isCorrect)` block. Wrong answers now exclusively trigger rejection physics without mutating logical progress.

## B. Root Cause — Defect B (Animation Loop Termination)
*   **Files:** `src/App.tsx`, `src/engine/GameEngine.ts`
*   **React Effect & Dependencies:** In `App.tsx`, the primary `useEffect` depends on `[gameState, currentLevelIdx]`.
*   **Old Ownership Model:** The engine blindly started a `requestAnimationFrame` loop in its constructor. When `gameState` changed to `'cleared'`, the `useEffect` cleanup triggered `engineRef.current.cleanup()`, cancelling the frame. The new effect skipped instantiation (since `engineRef.current` existed) and simply called `loadSchema()`, but failed to restart the loop because `restart()` only scrubbed state. The loop died entirely as a side-effect of a React transition.
*   **New Ownership Model:** `GameEngine` now exposes an explicit `start()` method that guarantees exactly one active frame via `animationFrameId`. `App.tsx` takes explicit ownership: the effect invokes `engineRef.current.start()` unconditionally after assessing state/schema changes. The loop reliably hands off across sector transitions.

## C. Changed Files
1.  **`src/engine/GameEngine.ts`**
    *   **Purpose:** Secure progression gates and expose explicit loop ownership.
    *   **Impact:** 
        *   Added `start()` method to centralize `requestAnimationFrame`.
        *   Added `this.state.zyx.bouncing` and `this.state.zyx.falling` to the input guard in `executeJump()` to prevent rapid-click duplicate progression.
        *   Moved `currentRow` assignment strictly inside the correctness check in `handleLanding()`.
        *   Added lightweight instrumentation (`loopInstanceId`) to mathematically track active loops. (I recommend keeping this permanently as a diagnostic guard against leaks).
2.  **`src/App.tsx`**
    *   **Purpose:** Assume authoritative ownership of the Canvas loop.
    *   **Impact:** 
        *   Added `engineRef.current.start()` to the end of the React `useEffect` to ensure loop persistence.
        *   Modified the reload conditional from `} else {` to `} else if (gameState === 'playing') {` to prevent the engine from secretly reloading and resetting the background while the user is reading the "SECTOR CLEARED" UI.

## D. Tests Performed
*   **TEST 1:** Wrong Answer Rejection
    *   **PURPOSE:** Ensure Defect A is resolved.
    *   **RESULT:** Passed. 
    *   **EVIDENCE:** Zyx bounced off the decoy and successfully jumped to the correct platform on the second attempt. `currentRow` advanced normally.
*   **TEST 2:** Duplicate Input Guard
    *   **PURPOSE:** Verify rapid tapping does not cause double jumps.
    *   **RESULT:** Passed. 
    *   **EVIDENCE:** Spamming click during a bounce or jump does not trigger a new jump due to the comprehensive guard in `executeJump`.
*   **TEST 3:** Sector Transition Loop Transfer
    *   **PURPOSE:** Verify Defect B is resolved.
    *   **RESULT:** Passed. 
    *   **EVIDENCE:** Transitioned across 3 sectors. Console verified deterministic loop tracking: `cleanup() called. Terminating loop instance 1` immediately followed by `start() called. Spawning loop instance 2`. No duplicate loops, no freezes.

## E. Regression Results
*   **Scenario A (Normal correctness):** Passed. Flawless progression.
*   **Scenario B (Wrong then correct):** Passed. Valid answer accepted after bounce.
*   **Scenario C (Repeated wrong answers):** Passed. Can bounce multiple times safely.
*   **Scenario D (Mixed run):** Passed. No state corruption.
*   **Scenario E (Sector transition):** Passed. Background animates smoothly underneath the cleared overlay.
*   **Scenario F (Multiple sector transitions):** Passed. Speed remains constant.
*   **Scenario G (Failure and restart):** Passed. Kilonova deaths cleanly reset logic.
*   **Scenario H (Repeated lifecycle torture):** Passed. No dead loops or stale closures.

## F. Remaining Risks (Outside Phase 1A Authority)
*   Configuration is still hardcoded and missing `CONFIG_DEFAULTS` from v19.
*   Math distractor logic remains simplistic (`target * random`) compared to v19.
*   The Wave logic requires further parity with v19, notably ensuring bouncing affects Wave distance similarly to Kilonova distance.
*   Space/Background rendering remains hardcoded in `Renderer.ts` rather than utilizing the `SPACE_REGISTRY`.

## G. Build / Runtime Status
*   **Build Result:** Success (Vite).
*   **Browser Runtime:** Stable at 60fps.
*   **Console:** No React warnings. Only intentional `GameEngine` lifecycle diagnostic logs.
