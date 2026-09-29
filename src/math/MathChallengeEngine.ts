import { LevelSchema } from '../types';
import { ChallengeLifecycleStatus, MathChallenge, MathChallengeResult, MathModeDefinition, MathRng } from './mathTypes';
import { DefaultMathRng } from './MathRng';
import { GLOBAL_MATH_REGISTRY, MathModeRegistry } from './MathModeRegistry';
import { describeRowObjective } from './objectivePresentation';

export interface MathChallengeEngineOptions {
  registry?: MathModeRegistry;
  rng?: MathRng;
}

/**
 * Identity of one sequence. Rows of the same config continue.
 * A different mode, step, direction, or explicit start does not.
 */
function sequenceContextKey(schema: LevelSchema): string {
  const config = schema.mathConfig;
  const fields = Object.keys(config)
    .filter((key) => key !== 'mode' && config[key] !== undefined)
    .sort();
  return [String(config.mode), ...fields.map((key) => `${key}:${String(config[key])}`)].join('|');
}

/**
 * MathChallengeEngine coordinates mathematical sessions, maintaining an authoritative
 * distinction between:
 * 1. Committed Learner State: What the learner has earned through verified correct resolutions.
 * 2. Lookahead / Generation State: Speculative next term inside the active sequence context.
 * 3. Sequence context: the level math config. A new context takes its own start.
 *    Re-establishing that start is not a commit.
 */
export class MathChallengeEngine {
  private registry: MathModeRegistry;
  private rng: MathRng;

  // Authoritative Learner State (committed upon verified correct resolution)
  private committedSequenceState: unknown;
  private committedRow: number = 0;

  // Speculative Lookahead State (used for generating upcoming visible rows)
  private lookaheadSequenceState: unknown;
  private lookaheadContextKey: string | null = null;
  private sessionExhausted: boolean = false;

  private activeChallenges: Map<string, MathChallenge> = new Map();
  private challengesByRow: Map<number, MathChallenge> = new Map();
  private challengeRowMap: Map<string, number> = new Map();
  private resolvedChallenges: Set<string> = new Set();
  private cachedResults: Map<string, MathChallengeResult> = new Map();
  private challengeCounter: number = 0;

  constructor(options: MathChallengeEngineOptions = {}) {
    this.registry = options.registry || GLOBAL_MATH_REGISTRY;
    this.rng = options.rng || new DefaultMathRng();
  }

  getRng(): MathRng {
    return this.rng;
  }

  getRegistry(): MathModeRegistry {
    return this.registry;
  }

  /**
   * Returns what the learner has authoritatively earned through correct resolutions.
   */
  getCommittedState(): unknown {
    return this.committedSequenceState;
  }

  getCommittedLearnerState(): unknown {
    return this.getCommittedState();
  }

  /**
   * Returns the lookahead state after speculative generation of upcoming visible rows.
   */
  getLookaheadState(): unknown {
    return this.lookaheadSequenceState;
  }

  getGenerationState(): unknown {
    return this.getLookaheadState();
  }

  /**
   * Backward-compatibility alias: returns lookahead generation sequence state.
   */
  getSequenceState(): unknown {
    return this.getLookaheadState();
  }

  /**
   * Returns the highest consecutively completed/committed row index (0 if none completed yet).
   */
  getCommittedRow(): number {
    return this.committedRow;
  }

  isChallengeResolved(challengeId: string): boolean {
    return this.resolvedChallenges.has(challengeId);
  }

  isSessionExhausted(): boolean {
    return this.sessionExhausted;
  }

  getChallengeStatus(challengeId: string): ChallengeLifecycleStatus {
    return this.resolvedChallenges.has(challengeId) ? 'resolved-correct' : 'unresolved';
  }

  private getModeOrThrow(modeId: string): MathModeDefinition {
    const mode = this.registry.getMode(modeId);
    if (!mode) {
      throw new Error(`[MathChallengeEngine] Unregistered math mode: "${modeId}"`);
    }
    return mode;
  }

  reset(): void {
    this.committedSequenceState = undefined;
    this.lookaheadSequenceState = undefined;
    this.lookaheadContextKey = null;
    this.committedRow = 0;
    this.sessionExhausted = false;
    this.activeChallenges.clear();
    this.challengesByRow.clear();
    this.challengeRowMap.clear();
    this.resolvedChallenges.clear();
    this.cachedResults.clear();
    this.challengeCounter = 0;
  }

  /**
   * Initializes a session for the given level schema and pre-generates the initial batch of challenges.
   * Invariant: committedSequenceState starts at initialVal, while lookaheadSequenceState advances
   * across initial pre-generated rows.
   */
  initializeSession(
    schema: LevelSchema,
    initialRowCount: number = 6
  ): { initialZyxVal: number; initialChallenges: { rowIdx: number; challenge: MathChallenge }[] } {
    this.reset();
    const modeId = schema.mathConfig.mode;
    const mode = this.getModeOrThrow(modeId);

    const initialVal = mode.initializeState(schema.mathConfig, this.rng);
    this.committedSequenceState = initialVal;
    this.lookaheadSequenceState = initialVal;
    this.lookaheadContextKey = sequenceContextKey(schema);
    this.committedRow = 0;

    const initialChallenges: { rowIdx: number; challenge: MathChallenge }[] = [];

    for (let rowIdx = 1; rowIdx <= initialRowCount; rowIdx++) {
      const challenge = this.generateChallengeForRow(schema, rowIdx);
      initialChallenges.push({ rowIdx, challenge });
      if (challenge.exhausted) {
        this.sessionExhausted = true;
        break;
      }
    }

    return {
      initialZyxVal: typeof initialVal === 'number' ? initialVal : Number(initialVal) || 0,
      initialChallenges
    };
  }

  /**
   * Generates a challenge for a specific row index, advancing the speculative lookahead sequence state.
   * Invariant: Does NOT advance committedSequenceState.
   */
  generateChallengeForRow(schema: LevelSchema, rowIdx: number): MathChallenge {
    const modeId = schema.mathConfig.mode;
    const mode = this.getModeOrThrow(modeId);
    const contextKey = sequenceContextKey(schema);
    if (this.lookaheadContextKey !== contextKey) {
      // New sequence. Its start wins. This does not commit learner progress.
      this.lookaheadSequenceState = mode.initializeState(schema.mathConfig, this.rng);
      this.lookaheadContextKey = contextKey;
      this.sessionExhausted = false;
    }

    this.challengeCounter++;
    const challenge = mode.generateChallenge(
      {
        modeId,
        sequenceState: this.lookaheadSequenceState,
        config: schema.mathConfig as unknown as Record<string, unknown>,
        optionCount: 3,
        challengeIndex: rowIdx
      },
      this.rng
    );

    challenge.metadata = {
      ...challenge.metadata,
      rowIdx,
      modeId
    };

    if (challenge.exhausted) {
      this.sessionExhausted = true;
    }

    this.lookaheadSequenceState = challenge.sequenceStateAfter;
    this.activeChallenges.set(challenge.id, challenge);
    this.challengesByRow.set(rowIdx, challenge);
    this.challengeRowMap.set(challenge.id, rowIdx);

    return challenge;
  }

  /**
   * Evaluates player selection against an active challenge and authoritatively commits state on correct answer.
   * Invariants:
   * 1. Incorrect answer commits NOTHING; challenge remains unresolved and authoritative.
   * 2. Correct answer commits learner state exactly ONCE.
   * 3. Double-resolution returns the previous result idempotently and does NOT advance state twice.
   * 4. Out-of-order resolution (skipping rows ahead) is rejected to protect sequence integrity.
   */
  resolveAnswer(challengeId: string, selectedOptionId: string): MathChallengeResult {
    const challenge = this.activeChallenges.get(challengeId);
    if (!challenge) {
      throw new Error(`[MathChallengeEngine] Challenge "${challengeId}" not found in active session.`);
    }

    // Double-commit protection: return cached result idempotently
    if (this.resolvedChallenges.has(challengeId)) {
      const cached = this.cachedResults.get(challengeId);
      if (cached) {
        return { ...cached, alreadyResolved: true };
      }
      return {
        challengeId,
        selectedOptionId,
        selectedValue: challenge.correctAnswer,
        correct: true,
        correctAnswer: challenge.correctAnswer,
        alreadyResolved: true
      };
    }

    const mode = this.getModeOrThrow(challenge.modeId);
    const result = mode.evaluateResult(challenge, selectedOptionId);

    // Wrong answer: commit nothing, challenge remains unresolved
    if (!result.correct) {
      return result;
    }

    // Correct answer: enforce sequential resolution order
    const challengeRow = this.challengeRowMap.get(challengeId);
    const expectedRow = this.committedRow + 1;

    if (challengeRow !== undefined && challengeRow !== expectedRow) {
      throw new Error(
        `[MathChallengeEngine] Out-of-order resolution rejected: cannot commit row ${challengeRow} before row ${expectedRow} is committed.`
      );
    }

    // Commit learner state exactly once
    this.committedSequenceState = challenge.sequenceStateAfter;
    this.committedRow = challengeRow ?? expectedRow;
    this.resolvedChallenges.add(challengeId);
    this.cachedResults.set(challengeId, result);

    return result;
  }

  getChallengeForRow(rowIdx: number): MathChallenge | undefined {
    return this.challengesByRow.get(rowIdx);
  }

  getChallenge(id: string): MathChallenge | undefined {
    return this.activeChallenges.get(id);
  }

  /**
   * Ambient Target Layer — single source of truth for learner-facing objective.
   * Derived strictly from the active challenge at the given row (normally zyx.currentRow + 1).
   * Returns null when no challenge is available for that row.
   */
  getAmbientObjectiveForRow(rowIdx: number): {
    label: string;
    ambientValue: number;
    modeId: string;
    challengeId: string;
    valueRole: string;
  } | null {
    const described = describeRowObjective(this.challengesByRow.get(rowIdx));
    if (!described?.challengeId) return null;
    return {
      label: described.label,
      ambientValue: described.value,
      modeId: described.modeId,
      challengeId: described.challengeId,
      valueRole: described.valueRole,
    };
  }

  pruneChallengesBeforeRow(minRow: number): void {
    for (const [rowIdx, challenge] of this.challengesByRow.entries()) {
      if (rowIdx < minRow) {
        this.activeChallenges.delete(challenge.id);
        this.challengesByRow.delete(rowIdx);
        this.challengeRowMap.delete(challenge.id);
      }
    }
  }
}

