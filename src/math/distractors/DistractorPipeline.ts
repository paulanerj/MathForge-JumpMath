import { MathErrorModel, MathRng } from '../mathTypes';

export interface DistractorCandidate {
  value: number;
  errorModel: MathErrorModel;
}

export interface DistractorPipelineOptions {
  correctAnswer: number;
  candidates: DistractorCandidate[];
  targetCount: number;
  minValue?: number;
  maxValue?: number;
  allowZero?: boolean;
  rng: MathRng;
  fallbackGenerator?: (offsetIndex: number) => number;
}

/**
 * DistractorPipeline provides a reusable, deterministic, domain-constrained
 * pipeline for selecting intentional error-model distractors.
 *
 * Pipeline Flow:
 * 1. Propose error-model candidates from mode
 * 2. Filter invalid (bounds, non-finite, equals correct answer)
 * 3. Deduplicate candidate values
 * 4. Deterministic shuffle via injected RNG
 * 5. Pick up to targetCount
 * 6. Invoke bounded fallback only if necessary
 */
export function generateDistractors(options: DistractorPipelineOptions): DistractorCandidate[] {
  const min = options.minValue !== undefined
    ? options.minValue
    : (options.allowZero ? 0 : 1);
  const max = options.maxValue !== undefined ? options.maxValue : Infinity;

  // Step 1 & 2: Filter invalid candidates
  const validCandidates = options.candidates.filter(c => {
    if (!Number.isFinite(c.value)) return false;
    if (c.value === options.correctAnswer) return false;
    if (c.value < min || c.value > max) return false;
    return true;
  });

  // Step 3: Deduplicate by value (preserve distinct error models)
  const uniqueByValue = new Map<number, MathErrorModel>();
  for (const c of validCandidates) {
    if (!uniqueByValue.has(c.value)) {
      uniqueByValue.set(c.value, c.errorModel);
    }
  }

  const distinctCandidates: DistractorCandidate[] = Array.from(uniqueByValue.entries()).map(
    ([value, errorModel]) => ({ value, errorModel })
  );

  // Step 4: Deterministically shuffle candidates
  const shuffled = options.rng.shuffle(distinctCandidates);

  // Step 5: Select up to targetCount
  const selected: DistractorCandidate[] = [];
  const pickedValues = new Set<number>();

  for (const c of shuffled) {
    if (selected.length >= options.targetCount) break;
    if (!pickedValues.has(c.value)) {
      pickedValues.add(c.value);
      selected.push(c);
    }
  }

  // Step 6: Fallback generator only if necessary
  let fallbackIndex = 1;
  while (selected.length < options.targetCount && fallbackIndex <= 100) {
    let fallbackVal: number;
    if (options.fallbackGenerator) {
      fallbackVal = options.fallbackGenerator(fallbackIndex);
    } else {
      const sign = fallbackIndex % 2 === 1 ? 1 : -1;
      const mag = Math.ceil(fallbackIndex / 2);
      fallbackVal = options.correctAnswer + sign * mag;
    }

    if (
      Number.isFinite(fallbackVal) &&
      fallbackVal !== options.correctAnswer &&
      fallbackVal >= min &&
      fallbackVal <= max &&
      !pickedValues.has(fallbackVal)
    ) {
      pickedValues.add(fallbackVal);
      selected.push({
        value: fallbackVal,
        errorModel: 'FALLBACK'
      });
    }

    fallbackIndex++;
  }

  return selected;
}
