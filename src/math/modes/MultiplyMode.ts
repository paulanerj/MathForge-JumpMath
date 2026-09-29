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

export interface MultiplyConfig {
  /** The fixed factor (e.g. 7 for the 7-times table) */
  factor?: number;
  minMultiplier?: number;
  maxMultiplier?: number;
}

/**
 * MULTIPLY mode: player is shown "N × M = ?" and must pick the correct product.
 * State tracks the current multiplier.
 */
export class MultiplyMode implements MathModeDefinition<MultiplyConfig, number> {
  readonly id = 'MULTIPLY';

  initializeState(config: MultiplyConfig, rng: MathRng): number {
    const minM = config.minMultiplier ?? 1;
    const maxM = config.maxMultiplier ?? 12;
    return rng.nextInt(minM, maxM);
  }

  generateChallenge(request: MathChallengeRequest, rng: MathRng): MathChallenge {
    const config = (request.config || {}) as MultiplyConfig;
    const factor = Number(config.factor) || 2;
    const minM = config.minMultiplier ?? 1;
    const maxM = config.maxMultiplier ?? 12;

    let currentMultiplier = typeof request.sequenceState === 'number'
      ? request.sequenceState
      : rng.nextInt(minM, maxM);

    if (currentMultiplier < minM || currentMultiplier > maxM) {
      currentMultiplier = rng.nextInt(minM, maxM);
    }

    const correctAnswer = factor * currentMultiplier;
    const challengeIndex = request.challengeIndex ?? Date.now();
    const challengeId = `ch_mult_${challengeIndex}_${rng.nextInt(1000, 9999)}`;

    const candidates: DistractorCandidate[] = [];

    // Off-by-one multiplier
    candidates.push({ value: factor * (currentMultiplier + 1), errorModel: 'OFF_BY_ONE' });
    candidates.push({ value: factor * Math.max(1, currentMultiplier - 1), errorModel: 'OFF_BY_ONE' });
    // Adjacent factor confusion
    candidates.push({ value: (factor + 1) * currentMultiplier, errorModel: 'NEAR_RESULT' });
    if (factor > 1) candidates.push({ value: (factor - 1) * currentMultiplier, errorModel: 'NEAR_RESULT' });
    // Addition instead of multiplication
    candidates.push({ value: factor + currentMultiplier, errorModel: 'TARGET_CONFUSION' });
    // Common mistakes
    candidates.push({ value: currentMultiplier * currentMultiplier, errorModel: 'FALLBACK' });
    candidates.push({ value: factor * factor, errorModel: 'FALLBACK' });

    const targetDecoyCount = Math.max(1, (request.optionCount ?? 3) - 1);

    const decoys = generateDistractors({
      correctAnswer,
      candidates,
      targetCount: targetDecoyCount,
      minValue: 0,
      maxValue: Math.max(correctAnswer + 50, factor * (maxM + 2)),
      allowZero: true,
      rng,
      fallbackGenerator: (idx) => {
        const offset = Math.ceil(idx / 2);
        const sign = idx % 2 === 1 ? 1 : -1;
        return Math.max(0, correctAnswer + sign * offset * factor);
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
    const nextMultiplier = rng.nextInt(minM, maxM);

    const prompt: MathPrompt = {
      kind: 'multiply',
      operands: [factor, currentMultiplier],
      operator: '*',
      relation: '=',
      unknownPosition: 'result',
      text: `${factor} × ${currentMultiplier}`,
      equation: `${factor} × ${currentMultiplier} = ?`,
      display: `${factor} × ${currentMultiplier}`,
      displayText: `${factor} × ${currentMultiplier} = ?`,
      hintText: `What is ${factor} times ${currentMultiplier}?`,
      metadata: { factor, multiplier: currentMultiplier }
    };

    return {
      id: challengeId,
      modeId: this.id,
      prompt,
      correctAnswer,
      options: shuffledOptions,
      sequenceStateBefore: currentMultiplier,
      sequenceStateAfter: nextMultiplier,
      exhausted: false,
      metadata: { factor, multiplier: currentMultiplier, nextMultiplier }
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
