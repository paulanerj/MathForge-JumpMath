import {
  MathAnswerOption,
  MathChallenge,
  MathChallengeRequest,
  MathChallengeResult,
  MathModeDefinition,
  MathPrompt,
  MathRng
} from '../mathTypes';
import { DistractorCandidate, generateDistractors } from '../distractors/DistractorPipeline';

export interface SkipCountConfig {
  step?: number;
  direction?: 1 | -1;
  startValue?: number;
  requestedStart?: number;
  resolvedStart?: number;
  minValue?: number;
  maxValue?: number;
  allowZero?: boolean;
}

/**
 * Resolves a requested start value by aligning it to the nearest mathematically
 * valid multiple of `step` within the allowed numerical domain.
 */
export function resolveStartValue(config: SkipCountConfig): {
  requestedStart?: number;
  resolvedStart: number;
} {
  const step = Number(config?.step) || 2;
  const direction: 1 | -1 = config?.direction === -1 ? -1 : 1;
  const minValue = config?.minValue !== undefined
    ? config.minValue
    : (direction === -1 ? 0 : 1);

  const requested = config?.requestedStart ?? config?.startValue;

  if (requested !== undefined) {
    let aligned = Math.round(requested / step) * step;
    if (direction === -1 && aligned < minValue + step) {
      aligned = minValue + step;
    }
    return {
      requestedStart: requested,
      resolvedStart: aligned
    };
  }

  // Default starting value
  if (direction === -1) {
    // Parity default for backward skip counting
    return {
      requestedStart: undefined,
      resolvedStart: step * 10
    };
  } else {
    // Forward skip count starts at step
    return {
      requestedStart: undefined,
      resolvedStart: step
    };
  }
}

export class SkipCountMode implements MathModeDefinition<SkipCountConfig, number> {
  readonly id = 'SKIP_COUNT';

  initializeState(config: SkipCountConfig, _rng: MathRng): number {
    const { resolvedStart } = resolveStartValue(config);
    return resolvedStart;
  }

  isExhausted(state: number, config?: SkipCountConfig): boolean {
    const step = Number(config?.step) || 2;
    const direction: 1 | -1 = config?.direction === -1 ? -1 : 1;
    const minValue = config?.minValue !== undefined
      ? config.minValue
      : (direction === -1 ? 0 : 1);

    if (direction === -1) {
      return (state - step) < minValue;
    }
    if (config?.maxValue !== undefined) {
      return (state + step) > config.maxValue;
    }
    return false;
  }

  generateChallenge(request: MathChallengeRequest, rng: MathRng): MathChallenge {
    const config = (request.config || {}) as SkipCountConfig;
    const step = Number(config.step) || 2;
    const direction: 1 | -1 = config.direction === -1 ? -1 : 1;
    const minValue = config.minValue !== undefined
      ? config.minValue
      : (direction === -1 ? 0 : 1);
    const allowZero = config.allowZero !== undefined
      ? config.allowZero
      : (direction === -1 || minValue === 0);

    const { requestedStart, resolvedStart } = resolveStartValue(config);

    const currentVal = typeof request.sequenceState === 'number'
      ? request.sequenceState
      : resolvedStart;

    const challengeIndex = request.challengeIndex ?? Date.now();
    const challengeId = `ch_skip_${direction === -1 ? 'dn' : 'up'}_${challengeIndex}_${rng.nextInt(1000, 9999)}`;

    // Boundary / Exhaustion check
    const isExhaustedNow = this.isExhausted(currentVal, config);
    if (isExhaustedNow) {
      const prompt: MathPrompt = {
        kind: direction === -1 ? 'skip_backward' : 'skip_forward',
        operands: [currentVal, step],
        operator: direction === -1 ? '-' : '+',
        relation: '=',
        unknownPosition: 'result',
        text: 'Sequence Complete!',
        displayText: 'Boundary Reached',
        hintText: 'The sequence has reached its boundary.',
        metadata: { step, direction, currentVal, exhausted: true }
      };

      const boundaryVal = Math.max(minValue, currentVal);
      const decoys = generateDistractors({
        correctAnswer: boundaryVal,
        candidates: [
          { value: boundaryVal + step, errorModel: 'OVER_SKIP' },
          { value: boundaryVal + 2 * step, errorModel: 'OVER_SKIP' },
          { value: boundaryVal + 1, errorModel: 'OFF_BY_ONE' },
          { value: step, errorModel: 'STEP_VALUE_CONFUSION' }
        ],
        targetCount: Math.max(1, (request.optionCount ?? 3) - 1),
        minValue,
        maxValue: Math.max(config.maxValue ?? 999, boundaryVal + step * 5),
        allowZero,
        rng,
        fallbackGenerator: (idx) => boundaryVal + (idx + 1) * step
      });

      const options: MathAnswerOption[] = [
        {
          id: `${challengeId}_opt0_boundary`,
          value: boundaryVal,
          isCorrect: true,
          metadata: { rawValue: boundaryVal, boundary: true }
        },
        ...decoys.map((d, idx) => ({
          id: `${challengeId}_opt_decoy_${idx}_v${d.value}`,
          value: d.value,
          isCorrect: false,
          errorModel: d.errorModel,
          metadata: { rawValue: d.value, isCorrect: false, errorModel: d.errorModel }
        }))
      ];

      return {
        id: challengeId,
        modeId: this.id,
        prompt,
        correctAnswer: boundaryVal,
        options: rng.shuffle(options),
        sequenceStateBefore: boundaryVal,
        sequenceStateAfter: boundaryVal,
        exhausted: true,
        metadata: {
          step,
          direction,
          currentVal: boundaryVal,
          nextZyxVal: boundaryVal,
          requestedStart,
          resolvedStart,
          exhausted: true
        }
      };
    }

    const correctAnswer = currentVal + (step * direction);
    const operator = direction === -1 ? '-' : '+';

    // Deliberate Error-Model Distractor Candidates
    const candidates: DistractorCandidate[] = [];

    // 1. OFF_BY_ONE: count slip (+/- 1 from correct answer)
    candidates.push({ value: correctAnswer + 1, errorModel: 'OFF_BY_ONE' });
    candidates.push({ value: correctAnswer - 1, errorModel: 'OFF_BY_ONE' });

    // 2. OVER_SKIP: overshooting by another step in progression direction
    candidates.push({ value: correctAnswer + direction * step, errorModel: 'OVER_SKIP' });

    // 3. UNDER_SKIP: stopping short of a full step
    if (step > 1) {
      const shortStep = Math.max(1, Math.floor(step / 2));
      candidates.push({ value: correctAnswer - direction * shortStep, errorModel: 'UNDER_SKIP' });
      if (step > 3) {
        candidates.push({ value: currentVal + direction * (step - 1), errorModel: 'UNDER_SKIP' });
      }
    }

    // 4. WRONG_DIRECTION: stepping in opposite direction
    candidates.push({ value: currentVal - direction * step, errorModel: 'WRONG_DIRECTION' });

    // 5. PREVIOUS_TERM: staying at current position
    candidates.push({ value: currentVal, errorModel: 'PREVIOUS_TERM' });

    // 6. STEP_VALUE_CONFUSION: picking the step value itself
    candidates.push({ value: step, errorModel: 'STEP_VALUE_CONFUSION' });

    const targetDecoyCount = Math.max(1, (request.optionCount ?? 3) - 1);

    const decoys = generateDistractors({
      correctAnswer,
      candidates,
      targetCount: targetDecoyCount,
      minValue,
      maxValue: config.maxValue,
      allowZero,
      rng,
      fallbackGenerator: (idx) => {
        const mult = Math.ceil(idx / 2);
        const sign = idx % 2 === 1 ? 1 : -1;
        return correctAnswer + sign * mult * step;
      }
    });

    const nextZyxVal = correctAnswer;

    const rawOptions: MathAnswerOption[] = [
      {
        id: `${challengeId}_opt_correct`,
        value: correctAnswer,
        isCorrect: true,
        metadata: { rawValue: correctAnswer, isCorrect: true }
      },
      ...decoys.map((decoy, idx) => ({
        id: `${challengeId}_opt_decoy_${idx}_v${decoy.value}`,
        value: decoy.value,
        isCorrect: false,
        errorModel: decoy.errorModel,
        metadata: { rawValue: decoy.value, isCorrect: false, errorModel: decoy.errorModel }
      }))
    ];

    const shuffledOptions = rng.shuffle(rawOptions);

    const prompt: MathPrompt = {
      kind: direction === -1 ? 'skip_backward' : 'skip_forward',
      operands: [currentVal, step],
      operator,
      relation: '=',
      unknownPosition: 'result',
      text: direction === -1 ? `Skip down by ${step}` : `Skip count by ${step}`,
      equation: `${currentVal} ${operator} ${step} = ?`,
      display: `Step: ${operator}${step}`,
      displayText: `${currentVal} ${operator} ${step} = ?`,
      hintText: direction === -1
        ? `Count backward by ${step} from ${currentVal}`
        : `Count forward by ${step} from ${currentVal}`,
      metadata: {
        step,
        direction,
        currentVal,
        requestedStart,
        resolvedStart
      }
    };

    return {
      id: challengeId,
      modeId: this.id,
      prompt,
      correctAnswer,
      options: shuffledOptions,
      sequenceStateBefore: currentVal,
      sequenceStateAfter: nextZyxVal,
      exhausted: false,
      metadata: {
        step,
        direction,
        currentVal,
        nextZyxVal,
        requestedStart,
        resolvedStart,
        challengeIndex
      }
    };
  }

  evaluateResult(challenge: MathChallenge, selectedOptionId: string): MathChallengeResult {
    const selected = challenge.options.find(opt => opt.id === selectedOptionId);
    if (!selected) {
      return {
        challengeId: challenge.id,
        selectedOptionId,
        selectedValue: NaN,
        correct: false,
        correctAnswer: challenge.correctAnswer
      };
    }

    return {
      challengeId: challenge.id,
      selectedOptionId: selected.id,
      selectedValue: selected.value,
      correct: selected.isCorrect,
      correctAnswer: challenge.correctAnswer,
      errorModel: selected.isCorrect ? undefined : selected.errorModel,
      metadata: {
        ...challenge.metadata,
        selectedOption: selected
      }
    };
  }
}
