import { MathChallenge } from './mathTypes';
import { LevelSchema } from '../types';

/**
 * Learner-facing objective text.
 *
 * One formatter owns every label. Two scopes stay distinct:
 *
 * - level: the rule for the whole level (Get Ready, Level Clear).
 * - row: the actionable value for the current challenge (in-world plaque).
 *
 * SUM TO, SKIP BY, and TIMES use the same number at both scopes because the
 * rule itself is constant. DIFFERENCE does not. The level value is the
 * configured maximum minuend (the size of the fact family). The row value is
 * that challenge's actual difference. They must not be collapsed into one number.
 */
export type ObjectiveScope = 'level' | 'row';

export type ObjectiveValueRole =
  | 'target'
  | 'step'
  | 'factor'
  | 'maxMinuend'
  | 'rowDifference';

export interface LearnerObjective {
  scope: ObjectiveScope;
  label: string;
  value: number;
  valueRole: ObjectiveValueRole;
  modeId: string;
  challengeId?: string;
}

type MathConfig = LevelSchema['mathConfig'];

function finite(n: unknown): number | null {
  const value = Number(n);
  return Number.isFinite(value) ? value : null;
}

export function describeLevelObjective(config: MathConfig | undefined | null): LearnerObjective | null {
  if (!config) return null;
  const modeId = String(config.mode || '');
  if (modeId === 'SUM_TO') {
    const value = finite(config.target);
    if (value == null) return null;
    return { scope: 'level', label: 'SUM TO', value, valueRole: 'target', modeId };
  }
  if (modeId === 'SKIP_COUNT' || modeId === 'skipUp' || modeId === 'skipDown') {
    const value = finite(config.step);
    if (value == null) return null;
    return { scope: 'level', label: 'SKIP BY', value, valueRole: 'step', modeId };
  }
  if (modeId === 'MULTIPLY') {
    const value = finite(config.factor);
    if (value == null) return null;
    return { scope: 'level', label: 'TIMES', value, valueRole: 'factor', modeId };
  }
  if (modeId === 'DIFFERENCE') {
    const value = finite(config.maxValue);
    if (value == null) return null;
    return { scope: 'level', label: 'FIND', value, valueRole: 'maxMinuend', modeId };
  }
  return null;
}

export function describeRowObjective(challenge: MathChallenge | undefined | null): LearnerObjective | null {
  if (!challenge) return null;
  const meta = (challenge.metadata || {}) as Record<string, unknown>;
  const modeId = String(challenge.modeId || '');
  let label = 'FIND';
  let value: number | null = null;
  let valueRole: ObjectiveValueRole = 'target';

  if (modeId === 'SUM_TO') {
    label = 'SUM TO';
    value = finite(meta.target);
    valueRole = 'target';
  } else if (modeId === 'SKIP_COUNT' || modeId === 'skipUp' || modeId === 'skipDown') {
    label = 'SKIP BY';
    value = finite(meta.step);
    valueRole = 'step';
  } else if (modeId === 'MULTIPLY') {
    label = 'TIMES';
    value = finite(meta.factor);
    valueRole = 'factor';
  } else if (modeId === 'DIFFERENCE') {
    label = 'FIND';
    value = finite(meta.difference);
    valueRole = 'rowDifference';
  } else if (typeof meta.target === 'number') {
    label = 'REACH';
    value = finite(meta.target);
    valueRole = 'target';
  } else if (typeof meta.step === 'number') {
    label = 'SKIP BY';
    value = finite(meta.step);
    valueRole = 'step';
  }

  if (value == null) return null;
  return {
    scope: 'row',
    label,
    value,
    valueRole,
    modeId,
    challengeId: challenge.id,
  };
}
