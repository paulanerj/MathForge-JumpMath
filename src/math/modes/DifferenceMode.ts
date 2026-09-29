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

export interface DifferenceConfig {
  /** Maximum minuend value */
  maxValue?: number;
  minValue?: number;
}

/**
 * DIFFERENCE mode: player sees "A − ? = B" and must find the missing subtrahend.
 */
export class DifferenceMode implements MathModeDefinition<DifferenceConfig, number> {
  readonly id = 'DIFFERENCE';

  initializeState(config: DifferenceConfig, rng: MathRng): number {
    const maxV = config.maxValue ?? 20;
    return rng.nextInt(5, maxV);
  }

  generateChallenge(request: MathChallengeRequest, rng: MathRng): MathChallenge {
    const config = (request.config || {}) as DifferenceConfig;
    const maxV = config.maxValue ?? 20;
    const minV = config.minValue ?? 1;

    let minuend = typeof request.sequenceState === 'number'
      ? request.sequenceState
      : rng.nextInt(Math.max(5, minV + 2), maxV);

    if (minuend < 3) minuend = rng.nextInt(5, maxV);

    const maxDiff = minuend - 1;
    const difference = rng.nextInt(1, Math.max(1, maxDiff));
    const correctAnswer = minuend - difference; // the subtrahend

    const challengeIndex = request.challengeIndex ?? Date.now();
    const challengeId = `ch_diff_${challengeIndex}_${rng.nextInt(1000, 9999)}`;

    const candidates: DistractorCandidate[] = [];

    candidates.push({ value: correctAnswer + 1, errorModel: 'OFF_BY_ONE' });
    candidates.push({ value: Math.max(0, correctAnswer - 1), errorModel: 'OFF_BY_ONE' });
    candidates.push({ value: difference, errorModel: 'TARGET_CONFUSION' });
    candidates.push({ value: minuend + difference, errorModel: 'WRONG_DIRECTION' });
    candidates.push({ value: Math.max(0, minuend - difference - 2), errorModel: 'NEAR_RESULT' });
    candidates.push({ value: minuend, errorModel: 'FALLBACK' });

    const targetDecoyCount = Math.max(1, (request.optionCount ?? 3) - 1);

    const decoys = generateDistractors({
      correctAnswer,
      candidates,
      targetCount: targetDecoyCount,
      minValue: 0,
      maxValue: Math.max(maxV + 10, minuend + 5),
      allowZero: true,
      rng,
      fallbackGenerator: (idx) => {
        const offset = Math.ceil(idx / 2);
        const sign = idx % 2 === 1 ? 1 : -1;
        return Math.max(0, correctAnswer + sign * offset);
      }
    });

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
    const nextMinuend = rng.nextInt(Math.max(5, minV + 2), maxV);

    const prompt: MathPrompt = {
      kind: 'difference',
      operands: [minuend, difference],
      operator: '-',
      relation: '=',
      unknownPosition: 'operand_2',
      text: `${minuend} − ? = ${difference}`,
      equation: `${minuend} − ? = ${difference}`,
      display: `${minuend} − ? = ${difference}`,
      displayText: `${minuend} − ? = ${difference}`,
      hintText: `What number subtracted from ${minuend} gives ${difference}?`,
      metadata: { minuend, difference }
    };

    return {
      id: challengeId,
      modeId: this.id,
      prompt,
      correctAnswer,
      options: shuffledOptions,
      sequenceStateBefore: minuend,
      sequenceStateAfter: nextMinuend,
      exhausted: false,
      metadata: { minuend, difference, nextMinuend }
    };
  }

  evaluateResult(challenge: MathChallenge, selectedOptionId: string): MathChallengeResult {
    const selected = challenge.options.find(o => o.id === selectedOptionId);
    const correct = selected?.isCorrect ?? false;
    return {
      challengeId: challenge.id,
      selectedOptionId,
      selectedValue: selected?.value ?? 0,
      correct,
      correctAnswer: challenge.correctAnswer,
      errorModel: selected?.errorModel,
    };
  }
}
