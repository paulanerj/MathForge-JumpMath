# ZYX MATH ARCHITECTURE SPECIFICATION
**Phase 3A/3B — Mathematical Challenge Architecture & Capability Recovery**  
**Governing Authority:** `ZYX-2A-R2`, `ZYX-3A-R1`, `ZYX-3B`  
**Target Release:** `ZYX-3B`  

---

## 1. Architectural Philosophy & Separation of Concerns

The central governing principle of the Phase 3 architecture is:

> **What arithmetic problem the learner must solve must be independent from how that problem is physically presented.**

Prior to Phase 3A (`ZYX-2A-R2`), mathematical sequence logic was intertwined with spatial platform generation (`PlatformManager.ts`). `PlatformManager` evaluated arithmetic formulas, maintained sequence accumulators (`runningZyxVal`), synthesized distractors, and embedded correctness states into physical layout entities.

In Phase 3A/3B, the mathematics subsystem is completely decoupled into an authoritative, presentation-ignorant layer under `src/math/`:

```
                    ┌─────────────────────────┐
                    │      LevelSchema        │
                    │      (mathConfig)       │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │  MathChallengeEngine    │
                    │   - Registry lookup     │
                    │   - Sequence tape state │
                    │   - Active challenges   │
                    │   - Seedable RNG seam   │
                    └───────┬──────────▲──────┘
         Generates Options  │          │ Resolves Selection
                            ▼          │ (Correct / Decoy)
                    ┌──────────────────┴──────┐
                    │       GameEngine        │
                    │   - Jump execution      │
                    │   - Camera / Timing     │
                    │   - Catastrophe trigger │
                    └───────────┬─────────────┘
          Supplies Prepared     │
          Presentation Payloads │
                                ▼
                    ┌─────────────────────────┐
                    │    PlatformManager      │
                    │  (Math-Ignorant Layout) │
                    │   - Orthogonal lanes    │
                    │   - Spatial coordinates │
                    │   - Physical platforms  │
                    └─────────────────────────┘
```

---

## 2. Core Contracts & Data Model (`src/math/mathTypes.ts`)

The math architecture is founded on strict TypeScript interfaces:

### `MathChallenge`
Represents a discrete arithmetic problem presented to the learner:
```typescript
export interface MathChallenge {
  id: string;                               // Globally unique challenge identifier (e.g., 'ch_sumto_1_8471')
  modeId: MathModeId;                       // Target mode (e.g., 'SUM_TO', 'SKIP_COUNT')
  prompt: MathPrompt;                       // Text, equation, and display metadata
  correctAnswer: number | string;           // Authoritative correct value
  options: MathAnswerOption[];              // Shuffled candidate answer options
  sequenceStateBefore: unknown;             // Sequence state prior to resolution
  sequenceStateAfter: unknown;              // Predicted sequence state upon correct resolution
  metadata?: Record<string, unknown>;       // Mode-specific metadata (target, step, direction)
}
```

### `MathAnswerOption`
Represents an individual choice offered to the learner:
```typescript
export interface MathAnswerOption {
  id: string;                               // Unique option identifier (e.g., 'ch_sumto_1_opt0_v6')
  value: number | string;                   // Display and arithmetic value
  isCorrect: boolean;                       // Authoritative correctness flag
  label?: string;                           // Optional display label
}
```

### `MathModeDefinition`
Contract implemented by any mathematical mode:
```typescript
export interface MathModeDefinition<TConfig = unknown, TState = unknown> {
  readonly id: MathModeId;
  initializeState(config: TConfig, rng: MathRng): TState;
  generateChallenge(request: MathChallengeRequest<TConfig, TState>, rng: MathRng): MathChallenge;
  evaluateResult(challenge: MathChallenge, selectedOptionId: string): MathChallengeResult;
}
```

---

## 3. Challenge Lifecycle & Wrong-Answer Stability

### Stability Invariant (Gate MC4)
A critical defect in naive game refactors is regenerating or mutating problem state when the player picks an incorrect answer. In Zyx:

1. **Challenge Generation**: A challenge is generated for row $r$. It receives an immutable `id` and a stable set of `options` with distinct `id`s and `value`s.
2. **Incorrect Selection**:
   - Player taps a decoy platform.
   - `GameEngine` resolves the selection via `mathEngine.resolveAnswer(challengeId, optionId)`.
   - Result reports `correct: false`.
   - Zyx initiates a physical bounce back to the previous safe platform.
   - **Crucial Rule**: The challenge for row $r$ is **neither deleted nor regenerated**. Its `id`, equation, correct answer, and decoy values remain 100% stable.
3. **Correct Selection & Advancement**:
   - Player taps the correct platform.
   - `mathEngine.resolveAnswer` confirms `correct: true`.
   - Zyx lands safely, score increments, and `mathEngine.generateChallengeForRow` is invoked to create the challenge for the newly spawned row ahead.

---

## 4. State Distinction: Committed Learner State vs. Lookahead Generation State

### Dual-State Architecture (Gate MC8)
A foundational architectural requirement closed in Phase 3A-R1 is the explicit, non-conflated separation of:

1. **Committed Learner State (`committedSequenceState`, `committedRow`)**:
   - Represents what the learner has authoritatively earned through verified correct problem resolutions.
   - Starts at `initialVal` and `committedRow = 0`.
   - **Immutable during generation**: Pre-spawning visible platforms ahead does *not* advance committed state.
   - **Immutable on failure**: Incorrect answers leave committed state completely untouched.
   - **Advances strictly on verified correct resolution**: Only when `mathEngine.resolveAnswer` confirms `correct === true` does `committedSequenceState` step forward to `challenge.sequenceStateAfter` and `committedRow` increment.

2. **Lookahead / Generation State (`lookaheadSequenceState`)**:
   - Represents the speculative sequence state used solely to compute mathematical prompts and options for upcoming visible platforms (typically 4–6 rows ahead of the player).
   - Pre-generating rows advances `lookaheadSequenceState`, but leaves `committedSequenceState` at the learner's actual progress mark.

### Double-Commit Protection (Gate MC9)
If a player or subsystem submits a resolution request for an already-resolved challenge:
- The engine checks `resolvedChallenges.has(challengeId)`.
- It returns the cached evaluation idempotently with `alreadyResolved: true`.
- Committed learner state is **never advanced twice**, avoiding corrupted state or double progress scoring.

### Sequential Resolution & Out-of-Order Rejection (Gate MC10)
To prevent out-of-order state mutations (e.g. attempting to commit Row 2 while Row 1 remains unresolved):
- The engine verifies `challengeRow === committedRow + 1`.
- Any out-of-order commit attempt throws an explicit rejection error:
  `Out-of-order resolution rejected: cannot commit row X before row Y is committed.`
- Committed state remains intact at the last certified row.

### Lookahead Parity & Immutability (Gate MC11)
Resolving earlier challenges does not mutate or regenerate speculative challenges already rendered in upcoming rows. Their IDs, equations, correct answers, and distractors remain mathematically immutable.

---

## 5. Platform Presentation Layer Ignorance (Gate MC5)

`PlatformManager.ts` is strictly a presentation and spatial layout engine:
- It **does not import** `MathChallengeEngine` or `LevelSchema`.
- It **does not calculate** arithmetic solutions or distractors.
- It accepts only prepared `MathAnswerOption[]` presentation payloads from `GameEngine`.
- Physical platform objects merely render the numeric labels provided and return option IDs upon collision.

---

## 5. Mode Registry Architecture (`MathModeRegistry`)

The `MathModeRegistry` decouples mode definitions from the game engine.

### Registered Default Modes:
1. **`SumToMode` (`SUM_TO`)**:
   - Equation: $currentVal + answer = target$.
   - Validates that $currentVal \in [1, target - 1]$ and $answer \in [1, target - 1]$.
   - Distractors: Synthesizes distinct positive integers bounded by $[1, \max(target + 2, 1.5 \times target)]$.
2. **`SkipCountMode` (`SKIP_COUNT`)**:
   - Equation: $currentVal + (step \times direction) = nextVal$.
   - Supports bidirectional progression ($direction \in \{1, -1\}$).
   - Distractors: Synthesizes plausible multiples and near-multiples ($answer \pm k \times step$), guaranteeing non-duplication.

### Dynamic Mode Registration:
New modes (such as multiplication tables, modular arithmetic, fraction equivalence, or adaptive sequences) register via:
```typescript
GLOBAL_MATH_REGISTRY.registerMode(new MyCustomMathMode());
```
Neither `GameEngine` nor `PlatformManager` require modification to support new arithmetic modes.

---

## 6. Deterministic RNG & Test Reproducibility (`MathRng`)

To guarantee strict regression testing and automated proof generation, math generation uses explicit `MathRng` abstractions:

- `DefaultMathRng`: Uses standard runtime randomization for production play.
- `SeedableMathRng`: High-performance pseudo-random number generator (Mulberry32) for reproducible tests, regression replay, and seeded competitions.

Under identical seeds, `MathChallengeEngine` produces bit-for-bit identical challenge streams, option ordering, and distractor sets.

---

## 7. Phase 3B Capability Recovery

Phase 3B restored critical mathematical practice capabilities while preserving the clean, decoupled modular engine established in Phase 3A:

### 7.1 Backward Skip Counting & Boundary Alignment
- Backward progression ($direction = -1$) supports counting down by any step (e.g., subtracting 2, 3, 5, 10).
- Explicit start alignment via `resolveStartValue`:
  - `requestedStart`: Raw starting point requested in level configuration.
  - `resolvedStart`: Authoritative starting term calculated so the countdown cleanly hits multiples or zero:
    $$\text{resolvedStart} = \text{requestedStart} - (\text{requestedStart} \bmod \text{step})$$
  - Prevents non-aligned countdowns from skipping zero.

### 7.2 Intentional Pedagogical Error Models (`DistractorPipeline`)
- Distractors are generated via an intentional pedagogical pipeline rather than naive random noise.
- Every wrong answer represents a recognizable learner misconception:
  - `OFF_BY_ONE`: Counting slips ($\text{answer} \pm 1$).
  - `OVER_SKIP`: Overshooting the step ($v = \text{answer} + \text{direction} \times \text{step}$).
  - `UNDER_SKIP`: Stopping short of a full step ($v = \text{answer} - \text{direction} \times \lfloor\text{step}/2\rfloor$).
  - `WRONG_DIRECTION`: Stepping in the opposite direction ($v = \text{current} - \text{direction} \times \text{step}$).
  - `PREVIOUS_TERM`: Repeating the current value without advancing ($v = \text{current}$).
  - `STEP_VALUE_CONFUSION`: Selecting the step parameter itself ($v = \text{step}$).
  - `TARGET_CONFUSION`: Selecting the overall target in addition modes ($v = \text{target}$).
  - `NEAR_RESULT`: Slip of $\pm 2$ in addition modes ($v = \text{answer} \pm 2$).
  - `ADD_ALL_VALUES`: Adding rather than finding the complement ($v = \text{current} + \text{target}$).
- Pipeline ensures:
  - Strict uniqueness (no duplicate options).
  - Domain positivity ($> 0$ for positive sequences, $\ge 0$ for countdowns).
  - Fallback suppression ($< 5\%$ fallback in high-volume generation; 0.00% measured in 15,000-challenge audit).

### 7.3 Sequence Exhaustion & Terminal Platform Semantics
- When a backward sequence reaches its terminal boundary ($\le 0$), `isSessionExhausted` transitions to `true`.
- The engine produces a certified terminal challenge with 3 valid, non-negative options (1 correct boundary option, 2 plausible decoy options) to ensure complete UI and layout stability.

### 7.4 Structured Prompts & Progressive Hints
- Every challenge supplies a typed `MathPrompt`:
  - `equation`: Mathematical representation (e.g., `"14 - 2 = ?"`, `"? + 7 = 10"`).
  - `unknownPosition`: Position of the target unknown (`'first' | 'second' | 'result'`).
  - `operator`: Arithmetic operator (`'+' | '-' | '*' | '/'`).
- Progressive multi-tier hints (`MathHint[]`):
  - Tier 1: General conceptual strategy.
  - Tier 2: Directional step or complement guidance.
  - Tier 3: Concrete computation cue.

### 7.5 Pedagogical Metadata Preservation to Presentation Layer
- `MathAnswerOption.errorModel` is passed cleanly from the math engine through `GameEngine` to physical `Platform.errorModel` entities.
- Enables learner telemetry, diagnostic tracking, and future real-time intervention without violating platform presentation ignorance.

---

## 8. Future Extensibility Roadmap

The Phase 3A/3B architecture directly unlocks future commercialization capabilities:
1. **Adaptive Difficulty**: A dynamic mode decorator can inspect player response times (`timeLeft`) and error history to alter target bounds or distractor difficulty on the fly.
2. **Multiplication & Division Foundations**: Array/grid visualization modes can query `MathChallenge.metadata` without modifying spatial lane logic.
3. **Telemetry & Fluency Evidence**: Every answer resolution emits a structured `MathChallengeResult` including latency, challenge ID, exact option chosen, and associated `errorModel`, ready for pedagogical learning analytics.
