# ZYX / JUMPMATH - PHASE 0 SOURCE AUTHORITY & CAPABILITY RECOVERY AUDIT

## DELIVERABLE A — EXECUTIVE FINDING

**Forward Candidate:** The Modular Implementation (Current AI Studio branch).
**Source-of-Truth Status:** **NOT YET EARNED**. 

The current modular implementation provides a significantly better foundation for integrating with a modern UI stack (React), handling level schemas, and isolating visual state (via `Renderer.ts` and `MorticianAPI.ts`). However, it has suffered substantial **configuration loss** and **domain-logic regressions** during migration. It cannot safely be declared the baseline until its core math ruleset matches v19's capabilities, its configuration is un-hardcoded, and two P0 state machine / lifecycle defects are repaired.

**Largest Strengths:**
*   Clean separation of the main loop (`GameEngine.ts`) from pure visual output (`Renderer.ts`).
*   React integration successfully brackets the Canvas without immediately choking performance.
*   Dedicated `PlatformManager` handles geometric state decoupling well conceptually.

**Largest Regressions/Losses:**
*   **Math Rigor:** Intentional distractor logic (off-by-one, over-skipping) was replaced with generic random numbers. `skipDown` was completely lost. 
*   **Configuration:** The entire `CONFIG_DEFAULTS` philosophy was abandoned; physical constants and geometries are scattered as magic numbers throughout the classes.
*   **World System:** The `SPACE_REGISTRY` capability to swap rendering layers per environment was flattened into a single monolithic renderer that only swaps colors.

**Highest-Risk Runtime Problems:**
*   A critical decoupling failure between React state transitions and the Canvas `requestAnimationFrame` loop (Defect B).
*   A state mutation sequencing error where traversal progression commits before mathematical validation (Defect A).

---

## DELIVERABLE B — RECOVERY MATRIX

| Capability / Behavior | v19 Monolith | Current Modular | Same / Changed / Missing | Probable Authority | Required Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Math: SUM_TO** | Distractors = `target * rand`, specific rules | Generic random * 1.5 | Changed | v19 | RECOVER FROM V19 (better distractor logic) |
| **Math: skipUp** | Intentional distractors (off-by-1, wrong-dir) | Random multiplier | Changed | v19 | RECOVER FROM V19 |
| **Math: skipDown** | Present, exhaustion checks | Absent entirely | Missing | v19 | RECOVER FROM V19 |
| **Configuration** | Centralized `CONFIG_DEFAULTS` | Hardcoded magic numbers | Changed | v19 | RECOVER FROM V19 |
| **Worlds / Spaces** | Extensible `SPACE_REGISTRY` | Monolithic `Renderer.ts` logic | Changed | Hybrid | REIMPLEMENT CLEANLY |
| **Readability Scrim** | `scrimAlpha` backing for contrast | Absent | Missing | v19 | RECOVER FROM V19 |
| **Death Definitions** | 8 specific causes (some manual) | 5 specific causes | Missing | Modular | KEEP MODULAR (but restore manual/retired ones as P2) |
| **Flow Trigger** | Combo/Timer threshold | Combo/Timer threshold | Same | Modular | NO ACTION |
| **Platform Spawning** | Even horizontal lane distribution | Vector-based spawning (Diagonal) | Changed | Modular | KEEP MODULAR (Better spatial flexibility) |
| **Wrong-Answer Recovery** | Rejection bounce | Rejection bounce | Same | Modular | INVESTIGATE (See Defect A) |
| **Live Tuning UI** | Dat.gui / Dev controls present | Absent | Missing | v19 | REIMPLEMENT CLEANLY (as Zyx Studio) |

---

## DELIVERABLE C — RUNTIME DEFECT REPORT

### DEFECT A: Premature Row Advancement (Confirmed)
*   **Severity:** P0 (Game-Breaking Logic Flaw)
*   **Subsystem:** GameEngine (`handleLanding`)
*   **Reproduction:**
    1. Learner jumps to a WRONG platform.
    2. Wait for the bounce animation to return Zyx to the start.
    3. Attempt to click the ACTUAL correct platform in the same row.
*   **Expected:** Zyx jumps to the correct platform.
*   **Actual:** The input is ignored.
*   **Probable Cause:** In `GameEngine.ts`, `handleLanding()` unconditionally sets `this.state.zyx.currentRow = this.targetPlatform.rowIdx;` *before* checking `if (this.targetPlatform.isCorrect)`. Consequently, the engine thinks Zyx has already progressed past that row. `executeJump` contains `if (platform.rowIdx <= this.state.zyx.currentRow) return;`, blocking further jumps.
*   **Evidence:** Verified via static analysis of `GameEngine.ts` lines 109-111 and 462-464.
*   **Recommended Repair:** Move `currentRow` assignment *inside* the `if (this.targetPlatform.isCorrect)` block.

### DEFECT B: Lifecycle Animation Loop Termination (Confirmed)
*   **Severity:** P0 (Total Progression Block)
*   **Subsystem:** App.tsx / GameEngine
*   **Reproduction:**
    1. Complete a level successfully. The `SECTOR CLEARED` UI appears.
    2. Click `Enter Next Dimension`.
*   **Expected:** The next level starts and Zyx continues.
*   **Actual:** The UI overlay disappears but the Canvas remains entirely frozen.
*   **Probable Cause:** When `gameState` changes to `cleared`, `App.tsx`'s `useEffect` cleanup fires, calling `engineRef.current.cleanup()`. This executes `cancelAnimationFrame()`. When `gameState` switches back to `playing`, `engine.loadSchema()` is called, which calls `restart()`. However, `restart()` only resets state variables; it *does not* invoke `requestAnimationFrame`. The game loop is dead.
*   **Evidence:** Analyzed `App.tsx` lines 38-40 (cleanup) and `GameEngine.ts` (absence of loop trigger in `restart`).
*   **Recommended Repair:** Expose a `start()` or `resume()` method on `GameEngine` that safely re-establishes the animation frame, and invoke it during level transitions in `App.tsx`.

---

## DELIVERABLE D — CONFIGURATION LOSS REPORT

Significant behavior that was centralized and tunable in v19 has been scattered and hardcoded in the modular implementation:
*   **Platform Geometry:** Width, height, and spacing are hardcoded in `PlatformManager.ts` (`pW = 120, pH = 50, gapX = 140, gapY = 220`).
*   **Physics/Timing:** Jump duration (`0.3s`), bounce duration (`0.42s`), bounce hold (`9` frames), and gravity curves are hardcoded in `GameEngine.ts`.
*   **Timer Decay:** The rate at which the player loses time is statically coupled rather than parameterized.
*   **Wave Speed/Thresholds:** The speed of the Plasma Wave is hardcoded.
*   **Renderer Constants:** Colors, alphas, particle counts, and blur radii are magic strings/numbers throughout `Renderer.ts`.

---

## DELIVERABLE E — MATH PARITY REPORT

*   **sumTo:** Exists as `SUM_TO`. Distractor generation lost intentionality; it currently uses generic `target * 1.5` randomness rather than structured edge cases. 
*   **skip forward:** Exists as `SKIP_COUNT`. Distractors lost intentional rule-sets (off-by-one, wrong direction).
*   **skip backward:** **Missing entirely.** 
*   **Sequence State:** `PlatformManager` tracks `runningZyxVal` successfully across rows.
*   **Starting Values:** Retained via `runningZyxVal` seeding in `init()`.
*   **Hints:** HUD hint subsystems (e.g. "? + x = target" text) were **lost** and are not rendered.

---

## DELIVERABLE F — ARCHITECTURE AUTHORITY TABLE

| Subsystem | Authority | Reason |
| :--- | :--- | :--- |
| **Runtime (Game Loop)** | Modular | Better separation of tick vs. draw. |
| **State Management** | Modular | Clean TS interfaces (`GameState`, `EntityState`) instead of global vars. |
| **Math / Distractors** | v19 | Modular lost the intentional educational distractor logic and modes. |
| **Platform Generation** | Modular | The vector-based orthogonal spawning allows multidirectional play (diagonals). |
| **Wave / Catastrophes** | Hybrid | Modular's `MorticianAPI` structure is cleaner, but v19's weightings and causes must be restored. |
| **Environments** | v19 | The `SPACE_REGISTRY` layering was superior to the current monolithic draw loop. |
| **Configuration** | v19 | Centralized JSON/JS objects are required; Modular has heavy technical debt here. |

---

## DELIVERABLE G — RECOVERY BACKLOG

*   **P0 (Baseline Blockers):**
    *   Fix Defect A (Wrong-answer row advancement lock).
    *   Fix Defect B (Animation loop termination on level transition).
*   **P1 (Capability Recovery):**
    *   Restore central `CONFIG_DEFAULTS` and strip magic numbers from the Engine.
    *   Restore educational Math Parity (intentional distractors, `skipDown`, hints).
    *   Implement readability scrims / HUD legibility protections.
*   **P2 (Future Architecture):**
    *   Re-implement the `SPACE_REGISTRY` using modular Canvas compositing.
    *   Build the `Zyx Studio` developer tooling panel for tuning physics/config live.
*   **P3 (Future Product Work):**
    *   Add new math modes (fractions, algebra).
    *   Expand Flow state mechanics.
    *   Audio polish and particle expansions.

---

## DELIVERABLE H — CHANGED FILES

*   **No production files were modified.** 
*   All assessments were conducted via non-invasive static analysis (grep, cat).
