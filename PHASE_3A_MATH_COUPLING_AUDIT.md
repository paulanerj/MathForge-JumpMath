# PHASE 3A — MATH COUPLING AUDIT
**Subsystem Authority Audit: Mathematical Generation vs. Spatial Presentation**  
**Governing Source:** `ZYX-2A-R2`  
**Date:** September 2026  

---

## 1. Executive Summary

In `ZYX-2A-R2`, the runtime successfully decoupled physical configuration and camera/lane geometry from hardcoded engine literals. However, **mathematical problem generation remains tightly and inappropriately coupled to the spatial platform generation subsystem** (`PlatformManager.ts`) and mixed into `GameEngine.ts` and `LevelDatabase.ts`.

Specifically, `PlatformManager` currently:
1. Maintains internal mathematical sequence state (`runningZyxVal`).
2. Calculates operation-specific correct answers (`target - runningZyxVal` and `runningZyxVal + step`).
3. Generates decoy values using ad-hoc random heuristics directly inside platform row positioning loops.
4. Shuffles answer values and embeds correctness semantics into physical platform objects.
5. Advances the logical mathematical sequence as a side-effect of spatial row spawning.

This coupling violates the governing architectural principle:
> **What arithmetic problem the learner must solve must be independent from how that problem is physically presented.**

---

## 2. Inventory of Current Coupling

The following table documents every location in `ZYX-2A-R2` where mathematical sequence state, problem generation, distractor logic, platform creation, correctness evaluation, and run progression are intermixed.

| Source File | Function / Location | Responsibility Currently Performed | Why It Belongs to Math vs. Presentation/Runtime | Proposed Authority After Recovery |
| :--- | :--- | :--- | :--- | :--- |
| `src/engine/PlatformManager.ts` | Property `runningZyxVal: number` (line 11) | Tracks the running value of Zyx for future row calculations across pre-spawned rows. | **Math State:** A physical platform manager should not know or care about numeric sequence accumulators. | `MathChallengeEngine` (session sequence state) |
| `src/engine/PlatformManager.ts` | `init(schema)` (lines 25–42) | Evaluates `schema.mathConfig.mode` (`SUM_TO` vs `SKIP_COUNT`), calculates initial seed value for Zyx, and pre-spawns rows. | **Mixed:** Mode evaluation and seed calculation are Math. Pre-spawning platform geometry is Presentation. | Math seed belongs to `MathModeRegistry` / `MathChallengeEngine`. `PlatformManager` only accepts prepared options. |
| `src/engine/PlatformManager.ts` | `shuffleArray(array)` (lines 45–52) | Shuffles candidate platform values using unseeded `Math.random()`. | **Math / Candidate Presentation:** Shuffling candidate options should be deterministic/testable. | `MathRng` in `MathChallengeEngine`. |
| `src/engine/PlatformManager.ts` | `spawnRow(schema)` (lines 66–99) | Calculates `correctAnswer`, generates decoys with while-loops, evaluates next Zyx value, branching on `SUM_TO` vs `SKIP_COUNT`. | **Pure Math Problem Generation:** Contains all domain arithmetic, target differences, step multiples, and distractor ranges. | `MathModeDefinition` in `MathModeRegistry`. |
| `src/engine/PlatformManager.ts` | `spawnRow(schema)` (lines 101–125) | Combines correct answer with decoys, shuffles them, and maps them to `Platform.val` and `Platform.isCorrect`. | **Coupling Seam:** Spatial layout (`px`, `py`, `width`, `height`) is mixed with semantic correctness determination. | `PlatformManager` receives `MathAnswerOption[]` containing pre-resolved values and IDs. |
| `src/engine/PlatformManager.ts` | `spawnRow(schema)` (line 128) | Mutates `this.runningZyxVal = nextZyxVal`. | **Math State Mutation:** Advancing sequence tape happens during spatial generation, not during gameplay resolution. | `MathChallengeEngine` advances sequence state upon legitimate challenge completion. |
| `src/engine/GameEngine.ts` | `init()` & `restart()` (lines 90, 194) | Calls `this.platformManager.init()` and sets `state.zyx.val` from platform manager's return value. | **Runtime Coordination:** Engine queries platform manager for initial math state rather than a math authority. | `GameEngine` requests initial challenge session from `MathChallengeEngine`. |
| `src/engine/GameEngine.ts` | `handleLanding()` (lines 533–534) | Reads `targetPlatform.nextZyxVal` directly from platform and passes `state.schema` to `platformManager.spawnRow()`. | **Progression Coupling:** Engine relies on platform to store mathematical transition values and delegates math generation back to platform manager. | `GameEngine` reports selection to `MathChallengeEngine`, receives `ChallengeResult`, and supplies new challenge options to `PlatformManager`. |
| `src/engine/LevelDatabase.ts` | Schema definitions (lines 1–50) | Defines `mathConfig: { mode: 'SUM_TO' \| 'SKIP_COUNT', target?: number, step?: number }`. | **Content Specification:** Correctly specifies intent, but types are constrained to two hardcoded union strings without extensible registry schemas. | Extensible `MathModeId` and typed mode configs. |
| `src/types.ts` | `Platform` interface (lines 91–105) | Contains `val: number`, `isCorrect: boolean`, `nextZyxVal?: number`. | **Entity Representation:** Uses raw numeric value without explicit `optionId` or challenge reference. | `Platform` includes `optionId: string`, `val: number \| string`, `isCorrect: boolean`. |

---

## 3. Existing Data Flow Diagram (Coupled State)

```text
LevelDatabase (schema.mathConfig)
        │
        ▼
GameEngine
        │ calls platformManager.init(schema)
        ▼
PlatformManager ────► [Holds runningZyxVal]
        │
        ├── Evaluates if (mode === 'SUM_TO') vs else
        ├── Generates correctAnswer & decoys with Math.random()
        ├── Shuffles array
        ├── Calculates nextZyxVal
        └── Spawns Platform objects { val, isCorrect, nextZyxVal }
                │
                ▼
GameEngine (handleLanding)
        ├── Checks platform.isCorrect (boolean)
        ├── If true: zyx.val = platform.nextZyxVal
        └── Calls platformManager.spawnRow(schema) ──► repeats math in PlatformManager
```

---

## 4. Target Architecture & Authority Boundaries

After Phase 3A recovery:

1. **Math Challenge Engine (`src/math/`):**
   - Sole authority for mathematical problem generation, distractor selection, prompt text, correctness calculation, and sequence state progression.
   - Powered by a registry of `MathModeDefinition` objects (`SUM_TO`, `SKIP_COUNT`, and future modes).
   - Uses an explicit `MathRng` seam so math generation is 100% reproducible in automated tests.

2. **Platform Manager (`src/engine/PlatformManager.ts`):**
   - Completely mathematically ignorant.
   - Only knows spatial coordinates, row indices, lane offsets (-1, 0, 1), dimensions, impact animations, shards, and platform pruning.
   - Receives prepared presentation payloads (`MathAnswerOption[]`) and positions them in the physical world.

3. **Game Engine (`src/engine/GameEngine.ts`):**
   - Pure runtime coordinator.
   - Connects player physical actions (jumping to a platform) to mathematical resolutions (`MathChallengeEngine.resolveAnswer`).
   - Applies game feedback (combo, score, audio, screen flash, kilonova push/drain).
   - Advances challenges only upon legitimate correct resolution; leaves the active challenge untouched on wrong-answer bounces.
