export type MathModeId = 'SUM_TO' | 'SKIP_COUNT' | string;

export type MathErrorModel =
  | 'OFF_BY_ONE'
  | 'OVER_SKIP'
  | 'UNDER_SKIP'
  | 'WRONG_DIRECTION'
  | 'PREVIOUS_TERM'
  | 'STEP_VALUE_CONFUSION'
  | 'TARGET_CONFUSION'
  | 'NEAR_RESULT'
  | 'ADD_ALL_VALUES'
  | 'FALLBACK';

export interface MathPrompt {
  kind?: 'sum_to' | 'skip_forward' | 'skip_backward' | string;
  operands?: number[];
  operator?: '+' | '-' | '*' | '/' | string;
  relation?: '=' | string;
  unknownPosition?: 'operand_1' | 'operand_2' | 'result' | string;
  text: string;
  equation?: string;
  display?: string;
  displayText?: string;
  hintText?: string;
  metadata?: Record<string, unknown>;
}

export interface MathAnswerOption {
  id: string;
  value: number | string;
  isCorrect: boolean;
  errorModel?: MathErrorModel;
  metadata?: Record<string, unknown>;
}

export interface MathChallenge {
  id: string;
  modeId: MathModeId;
  prompt: MathPrompt;
  correctAnswer: number | string;
  options: MathAnswerOption[];
  sequenceStateBefore?: unknown;
  sequenceStateAfter?: unknown;
  exhausted?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MathChallengeRequest {
  modeId: MathModeId;
  sequenceState?: unknown;
  config?: Record<string, unknown>;
  optionCount?: number;
  challengeIndex?: number;
}

export type ChallengeLifecycleStatus = 'unresolved' | 'resolved-correct';

export interface MathChallengeResult {
  challengeId: string;
  selectedOptionId: string;
  selectedValue: number | string;
  correct: boolean;
  correctAnswer: number | string;
  alreadyResolved?: boolean;
  errorModel?: MathErrorModel;
  metadata?: Record<string, unknown>;
}

export interface MathRng {
  random(): number;
  nextInt(min: number, max: number): number; // inclusive min, inclusive max
  shuffle<T>(array: T[]): T[];
}

export interface MathModeDefinition<TConfig = Record<string, unknown>, TState = unknown> {
  id: MathModeId;
  initializeState(config: TConfig, rng: MathRng): TState;
  generateChallenge(request: MathChallengeRequest, rng: MathRng): MathChallenge;
  evaluateResult(challenge: MathChallenge, selectedOptionId: string): MathChallengeResult;
  isExhausted?(state: TState, config?: TConfig): boolean;
}
