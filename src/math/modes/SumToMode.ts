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

export interface SumToConfig {
  target?: number;
  minValue?: number;
  allowZero?: boolean;
}

export class SumToMode implements MathModeDefinition<SumToConfig, number> {
  readonly id = 'SUM_TO';

  initializeState(config: SumToConfig, rng: MathRng): number {
    const target = Number(config?.target) || 10;
    // Current starting operand strictly in [1, target - 1] so that complement is >= 1
    return rng.nextInt(1, Math.max(1, target - 1));
  }

  generateChallenge(request: MathChallengeRequest, rng: MathRng): MathChallenge {
    const config = (request.config || {}) as SumToConfig;
    const target = Number(config.target) || 10;
    const minValue = config.minValue !== undefined ? config.minValue : 1;
    const allowZero = config.allowZero ?? false;

    let currentVal = typeof request.sequenceState === 'number'
      ? request.sequenceState
      : -1;

    if (currentVal < 1 || currentVal >= target) {
      currentVal = rng.nextInt(1, Math.max(1, target - 1));
    }

    const correctAnswer = target - currentVal;
    const challengeIndex = request.challengeIndex ?? Date.now();
    const challengeId = `ch_sumto_${challengeIndex}_${rng.nextInt(1000, 9999)}`;

    // Deliberate Error-Model Distractor Candidates
    const candidates: DistractorCandidate[] = [];

    // 1. OFF_BY_ONE: +/- 1 from correct complement
    candidates.push({ value: correctAnswer + 1, errorModel: 'OFF_BY_ONE' });
    candidates.push({ value: correctAnswer - 1, errorModel: 'OFF_BY_ONE' });

    // 2. NEAR_RESULT: +/- 2 from correct complement
    candidates.push({ value: correctAnswer + 2, errorModel: 'NEAR_RESULT' });
    candidates.push({ value: correctAnswer - 2, errorModel: 'NEAR_RESULT' });

    // 3. TARGET_CONFUSION: learner picks the target sum itself
    candidates.push({ value: target, errorModel: 'TARGET_CONFUSION' });

    // 4. PREVIOUS_TERM / Starting operand confusion: picks currentVal
    candidates.push({ value: currentVal, errorModel: 'PREVIOUS_TERM' });

    // 5. ADD_ALL_VALUES: adds visible operands together
    candidates.push({ value: currentVal + target, errorModel: 'ADD_ALL_VALUES' });

    const targetDecoyCount = Math.max(1, (request.optionCount ?? 3) - 1);

    const decoys = generateDistractors({
      correctAnswer,
      candidates,
      targetCount: targetDecoyCount,
      minValue,
      maxValue: Math.max(target + 10, target * 2),
      allowZero,
      rng,
      fallbackGenerator: (idx) => {
        const offset = Math.ceil(idx / 2);
        const sign = idx % 2 === 1 ? 1 : -1;
        return correctAnswer + sign * offset;
      }
    });

    // Predicted next operand Zyx will have after landing
    const nextZyxVal = rng.nextInt(1, Math.max(1, target - 1));

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
      kind: 'sum_to',
      operands: [currentVal, target],
      operator: '+',
      relation: '=',
      unknownPosition: 'operand_2',
      text: `Sum to ${target}`,
      equation: `${currentVal} + ? = ${target}`,
      display: `Target: ${target}`,
      displayText: `${currentVal} + ? = ${target}`,
      hintText: `What number added to ${currentVal} makes ${target}?`,
      metadata: { target, currentVal }
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
        target,
        currentVal,
        nextZyxVal,
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
