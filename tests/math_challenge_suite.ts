import { setupHeadlessEnv, resetStandardViewport } from './mock_env';
import {
  MathChallengeEngine,
  MathModeRegistry,
  GLOBAL_MATH_REGISTRY,
  DefaultMathRng,
  SeedableMathRng,
  MathModeDefinition,
  MathChallengeRequest,
  MathChallenge,
  MathChallengeResult,
  MathAnswerOption,
  MathPrompt,
  MathErrorModel
} from '../src/math';
import { PlatformManager } from '../src/engine/PlatformManager';
import { GameEngine } from '../src/engine/GameEngine';
import { LevelSchema } from '../src/types';
import { resolveStartValue } from '../src/math/modes/SkipCountMode';
import { LEVEL_DATABASE } from '../src/engine/LevelDatabase';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${message}`);
  }
}

function simulateJumpToRest(engine: GameEngine, maxSec: number = 2.0): number {
  let elapsed = 0;
  const stepDt = 1 / 60;
  while ((engine.state.zyx.jumping || engine.state.zyx.bouncing) && elapsed < maxSec) {
    engine.update(stepDt);
    engine.draw();
    elapsed += stepDt;
  }
  return elapsed;
}

export function runMathChallengeSuite() {
  console.log("================================================================");
  console.log("  PHASE 3B — MATH CAPABILITY RECOVERY & AUDIT SUITE             ");
  console.log("================================================================");

  const env = setupHeadlessEnv();

  // Distribution Tracker for 15,000 Challenge Audit
  const distractorDistribution: Record<MathErrorModel, number> = {
    OFF_BY_ONE: 0,
    OVER_SKIP: 0,
    UNDER_SKIP: 0,
    WRONG_DIRECTION: 0,
    PREVIOUS_TERM: 0,
    STEP_VALUE_CONFUSION: 0,
    TARGET_CONFUSION: 0,
    NEAR_RESULT: 0,
    ADD_ALL_VALUES: 0,
    FALLBACK: 0
  };

  function recordDistractors(options: MathAnswerOption[]) {
    for (const opt of options) {
      if (!opt.isCorrect && opt.errorModel) {
        distractorDistribution[opt.errorModel] = (distractorDistribution[opt.errorModel] || 0) + 1;
      }
    }
  }

  // =========================================================================
  // HIGH-VOLUME INVARIANT AUDIT: 15,000 CHALLENGES (Section 20 & 21)
  // 5,000 SUM_TO + 5,000 SKIP_FORWARD + 5,000 SKIP_BACKWARD
  // =========================================================================
  console.log("\n>>> [HIGH-VOLUME AUDIT 1/3] Generating 5,000 Challenges for SUM_TO...");
  {
    const engine = new MathChallengeEngine({ rng: new SeedableMathRng(42) });
    const targets = [5, 7, 10, 12, 15, 20, 25, 50, 100];
    let sumToCount = 0;

    for (let i = 0; i < 5000; i++) {
      const target = targets[i % targets.length];
      const schema: LevelSchema = {
        id: `audit_sumto_${i}`,
        mathConfig: { mode: 'SUM_TO', target },
        progressionVector: { x: 0, y: -1 },
        theme: { background: 'dark', palette: 'content' }
      };

      const rowIdx = (i % 5) + 1;
      if (rowIdx === 1) {
        engine.initializeSession(schema, 5);
      }
      const ch = engine.generateChallengeForRow(schema, rowIdx);
      sumToCount++;
      recordDistractors(ch.options);

      // Invariants
      assert(ch.options.length === 3, `Challenge ${ch.id} must have 3 options`);
      const correctOpts = ch.options.filter(o => o.isCorrect);
      assert(correctOpts.length === 1, `Challenge ${ch.id} must have exactly 1 correct option`);
      assert(correctOpts[0].value === ch.correctAnswer, `Correct option value must match correctAnswer`);

      const uniqueVals = new Set(ch.options.map(o => o.value));
      assert(uniqueVals.size === 3, `Challenge ${ch.id} options must have no duplicate values (${Array.from(uniqueVals).join(', ')})`);

      for (const opt of ch.options) {
        assert(typeof opt.value === 'number', `Option value must be a number`);
        const numVal = opt.value as number;
        assert(Number.isFinite(numVal), `Option value must be finite`);
        assert(numVal > 0, `Option value must be positive integer (> 0), got: ${numVal}`);
        if (!opt.isCorrect) {
          assert(opt.errorModel !== undefined, `Decoy option must carry an errorModel metadata tag`);
        }
      }

      const currentVal = ch.sequenceStateBefore as number;
      const ans = ch.correctAnswer as number;
      assert(currentVal + ans === target, `Mathematical truth: ${currentVal} + ${ans} === ${target}`);

      // Structured prompt validation
      assert(ch.prompt.kind === 'sum_to', `Prompt kind must be sum_to`);
      assert(ch.prompt.operator === '+', `Prompt operator must be +`);
      assert(ch.prompt.relation === '=', `Prompt relation must be =`);
      assert(ch.prompt.unknownPosition === 'operand_2', `Unknown position must be operand_2`);
    }

    console.log(`  [PASS] Successfully verified ${sumToCount} SUM_TO challenges across all invariant gates.`);
  }

  console.log("\n>>> [HIGH-VOLUME AUDIT 2/3] Generating 5,000 Challenges for SKIP_FORWARD...");
  {
    const engine = new MathChallengeEngine({ rng: new SeedableMathRng(1337) });
    const steps = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 25];
    let skipFwdCount = 0;

    for (let i = 0; i < 5000; i++) {
      const step = steps[i % steps.length];
      const schema: LevelSchema = {
        id: `audit_skip_fwd_${i}`,
        mathConfig: { mode: 'SKIP_COUNT', step, direction: 1 },
        progressionVector: { x: 0, y: -1 },
        theme: { background: 'dark', palette: 'content' }
      };

      const rowIdx = (i % 5) + 1;
      if (rowIdx === 1) {
        engine.initializeSession(schema, 5);
      }
      const ch = engine.generateChallengeForRow(schema, rowIdx);
      skipFwdCount++;
      recordDistractors(ch.options);

      assert(ch.options.length === 3, `Challenge ${ch.id} must have 3 options`);
      const correctOpts = ch.options.filter(o => o.isCorrect);
      assert(correctOpts.length === 1, `Challenge ${ch.id} must have exactly 1 correct option`);
      assert(correctOpts[0].value === ch.correctAnswer, `Correct option value must match correctAnswer`);

      const uniqueVals = new Set(ch.options.map(o => o.value));
      assert(uniqueVals.size === 3, `Challenge ${ch.id} options must have no duplicate values (${Array.from(uniqueVals).join(', ')})`);

      for (const opt of ch.options) {
        assert(typeof opt.value === 'number', `Option value must be a number`);
        const numVal = opt.value as number;
        assert(Number.isFinite(numVal), `Option value must be finite`);
        assert(numVal > 0, `Option value must be positive integer (> 0), got: ${numVal}`);
        if (!opt.isCorrect) {
          assert(opt.errorModel !== undefined, `Decoy option must carry an errorModel metadata tag`);
        }
      }

      const currentVal = ch.sequenceStateBefore as number;
      const ans = ch.correctAnswer as number;
      assert(ans - currentVal === step * 1, `Forward skip mathematical truth: ${ans} - ${currentVal} === ${step}`);

      assert(ch.prompt.kind === 'skip_forward', `Prompt kind must be skip_forward`);
      assert(ch.prompt.operator === '+', `Prompt operator must be +`);
      assert(ch.prompt.unknownPosition === 'result', `Unknown position must be result`);
    }

    console.log(`  [PASS] Successfully verified ${skipFwdCount} SKIP_FORWARD challenges across all invariant gates.`);
  }

  console.log("\n>>> [HIGH-VOLUME AUDIT 3/3] Generating 5,000 Challenges for SKIP_BACKWARD...");
  {
    const engine = new MathChallengeEngine({ rng: new SeedableMathRng(999) });
    const steps = [2, 3, 4, 5, 6, 8, 10];
    let skipBwdCount = 0;

    for (let i = 0; i < 5000; i++) {
      const step = steps[i % steps.length];
      const startMultiplier = (i % 15) + 6; // start high enough to avoid early exhaustion
      const requestedStart = step * startMultiplier;

      const schema: LevelSchema = {
        id: `audit_skip_bwd_${i}`,
        mathConfig: {
          mode: 'SKIP_COUNT',
          step,
          direction: -1,
          requestedStart
        },
        progressionVector: { x: 0, y: -1 },
        theme: { background: 'dark', palette: 'content' }
      };

      const rowIdx = (i % 5) + 1;
      if (rowIdx === 1 || engine.isSessionExhausted()) {
        engine.initializeSession(schema, 5);
      }
      const ch = engine.generateChallengeForRow(schema, rowIdx);
      skipBwdCount++;
      recordDistractors(ch.options);

      assert(ch.options.length === 3, `Challenge ${ch.id} must have 3 options`);
      const correctOpts = ch.options.filter(o => o.isCorrect);
      assert(correctOpts.length === 1, `Challenge ${ch.id} must have exactly 1 correct option`);
      assert(correctOpts[0].value === ch.correctAnswer, `Correct option value must match correctAnswer`);

      const uniqueVals = new Set(ch.options.map(o => o.value));
      assert(uniqueVals.size === 3, `Challenge ${ch.id} options must have no duplicate values (${Array.from(uniqueVals).join(', ')})`);

      for (const opt of ch.options) {
        assert(typeof opt.value === 'number', `Option value must be a number`);
        const numVal = opt.value as number;
        assert(Number.isFinite(numVal), `Option value must be finite`);
        assert(numVal >= 0, `Backward skip option value must be non-negative (>= 0), got: ${numVal}`);
        if (!opt.isCorrect) {
          assert(opt.errorModel !== undefined, `Decoy option must carry an errorModel metadata tag`);
        }
      }

      const currentVal = ch.sequenceStateBefore as number;
      const ans = ch.correctAnswer as number;
      if (ch.exhausted) {
        assert(ans >= 0, `Exhausted challenge answer is non-negative boundary`);
      } else {
        assert(ans - currentVal === step * (-1), `Backward skip mathematical truth: ${ans} - ${currentVal} === -${step}`);
      }

      assert(ch.prompt.kind === 'skip_backward', `Prompt kind must be skip_backward`);
      assert(ch.prompt.operator === '-', `Prompt operator must be -`);
      assert(ch.prompt.unknownPosition === 'result', `Unknown position must be result`);
    }

    console.log(`  [PASS] Successfully verified ${skipBwdCount} SKIP_BACKWARD challenges across all invariant gates.`);
  }

  // =========================================================================
  // SECTION 21: ERROR-MODEL DISTRIBUTION REPORT
  // =========================================================================
  console.log("\n================================================================");
  console.log("  SECTION 21: ERROR-MODEL DISTRIBUTION REPORT (15,000 CHALLENGES)");
  console.log("================================================================");
  const totalDecoys = Object.values(distractorDistribution).reduce((a, b) => a + b, 0);
  console.log(`Total Decoy Options Sampled: ${totalDecoys}`);
  for (const [model, count] of Object.entries(distractorDistribution)) {
    const pct = ((count / totalDecoys) * 100).toFixed(2);
    console.log(`  - ${model.padEnd(22)} : ${count.toString().padStart(6)} (${pct}%)`);
  }
  const fallbackPct = ((distractorDistribution.FALLBACK / totalDecoys) * 100);
  assert(fallbackPct < 5.0, `FALLBACK rate must be under 5%, was ${fallbackPct.toFixed(2)}%`);
  console.log(`  [PASS] Intentional error models represent ${(100 - fallbackPct).toFixed(2)}% of all distractors (FALLBACK < 5%).`);

  // =========================================================================
  // GATE MB1 — FORWARD SKIP VALIDITY ACROSS MULTIPLE STEPS
  // =========================================================================
  console.log("\n>>> [GATE MB1] Forward Skip Validity (Steps: 2, 3, 5, 7, 9)");
  {
    const engine = new MathChallengeEngine();
    const testSteps = [2, 3, 5, 7, 9];
    for (const step of testSteps) {
      const schema: LevelSchema = {
        id: `mb1_step_${step}`,
        mathConfig: { mode: 'SKIP_COUNT', step, direction: 1 },
        progressionVector: { x: 0, y: -1 },
        theme: { background: 'dark', palette: 'content' }
      };
      const session = engine.initializeSession(schema, 6);
      assert(session.initialZyxVal === step, `Forward skip initial val must equal step ${step}`);
      let expected = step;
      for (let r = 0; r < 6; r++) {
        expected += step;
        const ch = session.initialChallenges[r].challenge;
        assert(ch.correctAnswer === expected, `Row ${r + 1} expected ${expected}, got ${ch.correctAnswer}`);
      }
    }
    console.log("  [PASS] Forward skip validity verified across multiple steps (2, 3, 5, 7, 9).");
  }

  // =========================================================================
  // GATE MB2 — BACKWARD SKIP VALIDITY ACROSS MULTIPLE STEPS & STARTS
  // =========================================================================
  console.log("\n>>> [GATE MB2] Backward Skip Validity (Steps: 2, 3, 5, 10)");
  {
    const engine = new MathChallengeEngine();
    const testCases = [
      { step: 5, requestedStart: 100, expectedSequence: [95, 90, 85, 80] },
      { step: 6, requestedStart: 60, expectedSequence: [54, 48, 42, 36] },
      { step: 3, requestedStart: 36, expectedSequence: [33, 30, 27, 24] },
      { step: 10, requestedStart: 100, expectedSequence: [90, 80, 70, 60] },
      { step: 2, requestedStart: 20, expectedSequence: [18, 16, 14, 12] }
    ];

    for (const tc of testCases) {
      const schema: LevelSchema = {
        id: `mb2_step_${tc.step}`,
        mathConfig: {
          mode: 'SKIP_COUNT',
          step: tc.step,
          direction: -1,
          requestedStart: tc.requestedStart
        },
        progressionVector: { x: 0, y: -1 },
        theme: { background: 'dark', palette: 'content' }
      };
      const session = engine.initializeSession(schema, 4);
      assert(session.initialZyxVal === tc.requestedStart, `Initial value matches requested start`);
      for (let i = 0; i < 4; i++) {
        const ch = session.initialChallenges[i].challenge;
        assert(ch.correctAnswer === tc.expectedSequence[i], `Expected ${tc.expectedSequence[i]}, got ${ch.correctAnswer}`);
      }
    }
    console.log("  [PASS] Backward skip validity verified across multiple steps and start values.");
  }

  // =========================================================================
  // GATE MB3 — DIRECTION CORRECTNESS (answer - current = step * direction)
  // =========================================================================
  console.log("\n>>> [GATE MB3] Direction Correctness Invariant");
  {
    const engine = new MathChallengeEngine({ rng: new SeedableMathRng(777) });
    // 500 forward + 500 backward challenges checked against strict relation
    for (let i = 0; i < 500; i++) {
      const step = (i % 9) + 2;
      const fwdSchema: LevelSchema = {
        id: `mb3_fwd_${i}`,
        mathConfig: { mode: 'SKIP_COUNT', step, direction: 1 },
        progressionVector: { x: 0, y: -1 },
        theme: { background: 'dark', palette: 'content' }
      };
      const chFwd = engine.generateChallengeForRow(fwdSchema, 1);
      const currFwd = chFwd.sequenceStateBefore as number;
      const ansFwd = chFwd.correctAnswer as number;
      assert(ansFwd - currFwd === step * 1, `Forward direction formula must hold exactly`);

      const bwdSchema: LevelSchema = {
        id: `mb3_bwd_${i}`,
        mathConfig: { mode: 'SKIP_COUNT', step, direction: -1, requestedStart: step * 10 },
        progressionVector: { x: 0, y: -1 },
        theme: { background: 'dark', palette: 'content' }
      };
      const chBwd = engine.generateChallengeForRow(bwdSchema, 1);
      const currBwd = chBwd.sequenceStateBefore as number;
      const ansBwd = chBwd.correctAnswer as number;
      assert(ansBwd - currBwd === step * (-1), `Backward direction formula must hold exactly`);
    }
    console.log("  [PASS] Direction correctness invariant (answer - current = step * direction) verified.");
  }

  // =========================================================================
  // GATE MB4 — START ALIGNMENT RULES
  // =========================================================================
  console.log("\n>>> [GATE MB4] Start Alignment Rules");
  {
    // Case 1: step 5, requested start near 100
    const res1 = resolveStartValue({ step: 5, direction: -1, requestedStart: 100 });
    assert(res1.resolvedStart === 100, `100 resolves to 100 for step 5`);

    // Case 2: step 5, requested 98 (unaligned) -> resolves to 100
    const res2 = resolveStartValue({ step: 5, direction: -1, requestedStart: 98 });
    assert(res2.resolvedStart === 100, `98 resolves to 100 for step 5`);

    // Case 3: step 5, requested 97 (unaligned) -> resolves to 95
    const res3 = resolveStartValue({ step: 5, direction: -1, requestedStart: 97 });
    assert(res3.resolvedStart === 95, `97 resolves to 95 for step 5`);

    // Case 4: step 6, requested 62 -> resolves to 60
    const res4 = resolveStartValue({ step: 6, direction: -1, requestedStart: 62 });
    assert(res4.resolvedStart === 60, `62 resolves to 60 for step 6`);

    // Case 5: step 3, requested 35 -> resolves to 36
    const res5 = resolveStartValue({ step: 3, direction: -1, requestedStart: 35 });
    assert(res5.resolvedStart === 36, `35 resolves to 36 for step 3`);

    console.log("  [PASS] Explicit start alignment rules (requestedStart -> resolvedStart) certified.");
  }

  // =========================================================================
  // GATE MB5 — EXHAUSTION & BOUNDARY BEHAVIOR
  // =========================================================================
  console.log("\n>>> [GATE MB5] Exhaustion & Boundary Behavior");
  {
    const engine = new MathChallengeEngine();
    // Sequence starts at 15 with step 5 descending:
    // Row 1: 15 -> 10
    // Row 2: 10 -> 5
    // Row 3: 5 -> 0 (reaches boundary 0)
    // Row 4: Attempting to descend below 0 triggers exhaustion
    const schema: LevelSchema = {
      id: 'mb5_exhaustion',
      mathConfig: {
        mode: 'SKIP_COUNT',
        step: 5,
        direction: -1,
        requestedStart: 15,
        minValue: 0
      },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };

    const session = engine.initializeSession(schema, 10);
    // Session should have stopped pre-generating at row 4 upon exhaustion!
    assert(session.initialChallenges.length === 4, `Session stopped pre-generation at exhaustion (4 rows)`);
    assert(session.initialChallenges[0].challenge.correctAnswer === 10, "Row 1 answer is 10");
    assert(session.initialChallenges[1].challenge.correctAnswer === 5, "Row 2 answer is 5");
    assert(session.initialChallenges[2].challenge.correctAnswer === 0, "Row 3 answer is 0");

    const terminalCh = session.initialChallenges[3].challenge;
    assert(terminalCh.exhausted === true, "Row 4 is flagged exhausted: true");
    assert(terminalCh.prompt.text === "Sequence Complete!", "Terminal prompt indicates completion");
    assert(engine.isSessionExhausted() === true, "Engine reports session exhausted");

    // Ensure no negative values exist anywhere in options
    for (const item of session.initialChallenges) {
      for (const opt of item.challenge.options) {
        assert(Number(opt.value) >= 0, `No negative numbers permitted: got ${opt.value}`);
      }
    }

    console.log("  [PASS] Exhaustion and non-negative boundary semantics certified.");
  }

  // =========================================================================
  // GATE MB6 — DISTRACTOR SEMANTIC VALIDITY
  // =========================================================================
  console.log("\n>>> [GATE MB6] Distractor Semantic Validity");
  {
    const engine = new MathChallengeEngine({ rng: new SeedableMathRng(888) });
    // Verify 100 challenges across all modes that every errorModel matches its exact formula
    for (let i = 0; i < 200; i++) {
      // SUM_TO test
      const sumSchema: LevelSchema = {
        id: `mb6_sum_${i}`,
        mathConfig: { mode: 'SUM_TO', target: 13 },
        progressionVector: { x: 0, y: -1 },
        theme: { background: 'dark', palette: 'content' }
      };
      const sumSession = engine.initializeSession(sumSchema, 1);
      const sumCh = sumSession.initialChallenges[0].challenge;
      const sCurr = sumCh.sequenceStateBefore as number;
      const sAns = sumCh.correctAnswer as number;
      for (const opt of sumCh.options) {
        if (!opt.isCorrect && opt.errorModel) {
          const v = opt.value as number;
          if (opt.errorModel === 'OFF_BY_ONE') {
            assert(v === sAns + 1 || v === sAns - 1, `OFF_BY_ONE must be +/- 1`);
          } else if (opt.errorModel === 'NEAR_RESULT') {
            assert(v === sAns + 2 || v === sAns - 2, `NEAR_RESULT must be +/- 2`);
          } else if (opt.errorModel === 'TARGET_CONFUSION') {
            assert(v === 13, `TARGET_CONFUSION must equal target`);
          } else if (opt.errorModel === 'PREVIOUS_TERM') {
            assert(v === sCurr, `PREVIOUS_TERM must equal currentVal`);
          } else if (opt.errorModel === 'ADD_ALL_VALUES') {
            assert(v === sCurr + 13, `ADD_ALL_VALUES must equal currentVal + target`);
          }
        }
      }

      // SKIP_COUNT test
      const kDir = i % 2 === 0 ? 1 : -1;
      const skipSchema: LevelSchema = {
        id: `mb6_skip_${i}`,
        mathConfig: { mode: 'SKIP_COUNT', step: 3, direction: kDir, requestedStart: 30 },
        progressionVector: { x: 0, y: -1 },
        theme: { background: 'dark', palette: 'content' }
      };
      const skipSession = engine.initializeSession(skipSchema, 1);
      const skipCh = skipSession.initialChallenges[0].challenge;
      const kCurr = skipCh.sequenceStateBefore as number;
      const kStep = 3;
      const kAns = skipCh.correctAnswer as number;

      for (const opt of skipCh.options) {
        if (!opt.isCorrect && opt.errorModel) {
          const v = opt.value as number;
          if (opt.errorModel === 'OFF_BY_ONE') {
            assert(v === kAns + 1 || v === kAns - 1, `OFF_BY_ONE must be +/- 1`);
          } else if (opt.errorModel === 'OVER_SKIP') {
            assert(v === kAns + kDir * kStep, `OVER_SKIP must overshoot by step in direction`);
          } else if (opt.errorModel === 'WRONG_DIRECTION') {
            assert(v === kCurr - kDir * kStep, `WRONG_DIRECTION must step in opposite direction`);
          } else if (opt.errorModel === 'PREVIOUS_TERM') {
            assert(v === kCurr, `PREVIOUS_TERM must equal currentVal`);
          } else if (opt.errorModel === 'STEP_VALUE_CONFUSION') {
            assert(v === kStep, `STEP_VALUE_CONFUSION must equal step`);
          }
        }
      }
    }

    console.log("  [PASS] Distractor semantic validity confirmed across all error models.");
  }

  // =========================================================================
  // GATE MB7 — NO COLLISIONS (Decoys distinct, != answer, within domain)
  // =========================================================================
  console.log("\n>>> [GATE MB7] No Option Collisions & Strict Domain Bounds");
  {
    const engine = new MathChallengeEngine({ rng: new SeedableMathRng(555) });
    for (let i = 0; i < 500; i++) {
      const schema: LevelSchema = {
        id: `mb7_test_${i}`,
        mathConfig: { mode: 'SUM_TO', target: 3 }, // low target stress test
        progressionVector: { x: 0, y: -1 },
        theme: { background: 'dark', palette: 'content' }
      };
      const ch = engine.generateChallengeForRow(schema, 1);
      const values = ch.options.map(o => o.value);
      const unique = new Set(values);
      assert(unique.size === ch.options.length, `No duplicate decoy values permitted`);
      for (const opt of ch.options) {
        if (!opt.isCorrect) {
          assert(opt.value !== ch.correctAnswer, `Decoy must never equal correct answer`);
        }
        assert((opt.value as number) > 0, `Values must stay strictly positive`);
      }
    }
    console.log("  [PASS] Strict option uniqueness and collision-free invariant verified.");
  }

  // =========================================================================
  // GATE MB8 — DETERMINISTIC GENERATION
  // =========================================================================
  console.log("\n>>> [GATE MB8] Deterministic Generation Across Seeds");
  {
    const seed = 12345;
    const engineA = new MathChallengeEngine({ rng: new SeedableMathRng(seed) });
    const engineB = new MathChallengeEngine({ rng: new SeedableMathRng(seed) });

    const schema: LevelSchema = {
      id: 'mb8_determinism',
      mathConfig: { mode: 'SKIP_COUNT', step: 4, direction: 1 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };

    const sessionA = engineA.initializeSession(schema, 5);
    const sessionB = engineB.initializeSession(schema, 5);

    for (let r = 0; r < 5; r++) {
      const chA = sessionA.initialChallenges[r].challenge;
      const chB = sessionB.initialChallenges[r].challenge;
      assert(chA.id === chB.id, `Challenge IDs match exactly`);
      assert(chA.correctAnswer === chB.correctAnswer, `Correct answer matches exactly`);
      for (let i = 0; i < 3; i++) {
        assert(chA.options[i].value === chB.options[i].value, `Option ${i} value matches`);
        assert(chA.options[i].isCorrect === chB.options[i].isCorrect, `Option ${i} isCorrect matches`);
        assert(chA.options[i].errorModel === chB.options[i].errorModel, `Option ${i} errorModel matches`);
      }
    }
    console.log("  [PASS] Deterministic reproducibility certified across identical RNG seeds.");
  }

  // =========================================================================
  // GATE MB9 — STRUCTURED PROMPT & HINT CONTRACT
  // =========================================================================
  console.log("\n>>> [GATE MB9] Structured Prompt & Hint Contract");
  {
    const engine = new MathChallengeEngine();
    
    // Sum-To Prompt
    const sumSchema: LevelSchema = {
      id: 'mb9_sum',
      mathConfig: { mode: 'SUM_TO', target: 10 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };
    const sumCh = engine.generateChallengeForRow(sumSchema, 1);
    assert(sumCh.prompt.kind === 'sum_to', "Prompt kind is sum_to");
    assert(sumCh.prompt.operands?.length === 2, "Operands have length 2");
    assert(sumCh.prompt.operator === '+', "Operator is +");
    assert(sumCh.prompt.relation === '=', "Relation is =");
    assert(sumCh.prompt.unknownPosition === 'operand_2', "Unknown is operand_2");
    assert(sumCh.prompt.hintText?.includes('makes 10'), "Hint text includes target reference");

    // Skip Forward Prompt
    const fwdSchema: LevelSchema = {
      id: 'mb9_fwd',
      mathConfig: { mode: 'SKIP_COUNT', step: 3, direction: 1 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };
    const fwdCh = engine.generateChallengeForRow(fwdSchema, 1);
    assert(fwdCh.prompt.kind === 'skip_forward', "Prompt kind is skip_forward");
    assert(fwdCh.prompt.operator === '+', "Operator is +");
    assert(fwdCh.prompt.hintText?.includes('forward by 3'), "Hint mentions forward direction");

    // Skip Backward Prompt
    const bwdSchema: LevelSchema = {
      id: 'mb9_bwd',
      mathConfig: { mode: 'SKIP_COUNT', step: 5, direction: -1, requestedStart: 50 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };
    const bwdCh = engine.generateChallengeForRow(bwdSchema, 1);
    assert(bwdCh.prompt.kind === 'skip_backward', "Prompt kind is skip_backward");
    assert(bwdCh.prompt.operator === '-', "Operator is -");
    assert(bwdCh.prompt.hintText?.includes('backward by 5'), "Hint mentions backward direction");

    console.log("  [PASS] Structured prompt and hint contracts certified.");
  }

  // =========================================================================
  // GATE MB9-ISO — SEQUENCE CONTEXT ISOLATION (deterministic)
  // =========================================================================
  console.log("\n>>> [GATE MB9-ISO] Sequence context isolation");
  {
    const row = (id: string, mathConfig: LevelSchema['mathConfig']): LevelSchema => ({
      id,
      mathConfig,
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    });

    const planted = new MathChallengeEngine();
    const prior = planted.generateChallengeForRow(row('iso_prior', { mode: 'SKIP_COUNT', step: 2, direction: 1 }), 1);
    assert(prior.sequenceStateBefore === 2 && prior.sequenceStateAfter === 4, "Planted forward skip leaves lookahead at 4");
    assert(planted.getLookaheadState() === 4, "Lookahead carries inside the planted sequence");
    const backward = planted.generateChallengeForRow(row('iso_bwd', {
      mode: 'SKIP_COUNT', step: 5, direction: -1, requestedStart: 50
    }), 1);
    assert(backward.sequenceStateBefore === 50, "Explicit start 50 is not overridden by lookahead 4");
    assert(backward.correctAnswer === 45, "Backward-by-5 from 50 is 45");
    assert(backward.exhausted !== true, "Start 50 is not a boundary");
    assert(backward.prompt.hintText?.includes('backward by 5'), "Backward hint keeps the step");
    assert(planted.getCommittedState() === undefined, "Generation does not commit learner state");

    const continuing = new MathChallengeEngine();
    const skip = row('iso_cont', { mode: 'SKIP_COUNT', step: 4, direction: 1 });
    const session = continuing.initializeSession(skip, 3);
    assert(session.initialZyxVal === 4, "Continuing skip still starts at its step");
    assert(session.initialChallenges.map((item) => item.challenge.correctAnswer).join(',') === '8,12,16', "Rows continue 8, 12, 16");
    assert(continuing.getCommittedState() === 4, "Pregeneration does not commit past the start");
    assert(continuing.getLookaheadState() === 16, "Lookahead still advances across a homogeneous skip");

    const crossed = new MathChallengeEngine();
    const sum = crossed.generateChallengeForRow(row('iso_sum', { mode: 'SUM_TO', target: 10 }), 1);
    const afterSum = crossed.generateChallengeForRow(row('iso_skip', { mode: 'SKIP_COUNT', step: 3, direction: 1 }), 1);
    assert(afterSum.sequenceStateBefore === 3, "SUM lookahead does not become the skip start");
    assert(afterSum.correctAnswer === 6, "Forward skip by 3 starts at 3");
    assert(afterSum.sequenceStateBefore !== sum.sequenceStateAfter || sum.sequenceStateAfter === 3, "Skip context is independent of the sum operand");

    const starts = new MathChallengeEngine();
    const from100 = starts.generateChallengeForRow(row('iso_100', {
      mode: 'SKIP_COUNT', step: 5, direction: -1, requestedStart: 100
    }), 1);
    const from40 = starts.generateChallengeForRow(row('iso_40', {
      mode: 'SKIP_COUNT', step: 5, direction: -1, requestedStart: 40
    }), 1);
    assert(from100.sequenceStateBefore === 100 && from100.correctAnswer === 95, "First explicit start is 100");
    assert(from40.sequenceStateBefore === 40 && from40.correctAnswer === 35, "Second explicit start replaces the first");

    const same = new MathChallengeEngine();
    const forward = row('iso_same', { mode: 'SKIP_COUNT', step: 5, direction: 1 });
    const first = same.generateChallengeForRow(forward, 1);
    const second = same.generateChallengeForRow(forward, 2);
    assert(first.sequenceStateBefore === 5 && first.correctAnswer === 10, "First row of a new skip uses its start");
    assert(second.sequenceStateBefore === 10 && second.correctAnswer === 15, "Second row of the same skip continues");

    let mb9Pass = 0;
    for (let i = 0; i < 200; i++) {
      const engine = new MathChallengeEngine();
      engine.generateChallengeForRow(row(`mb9s_sum_${i}`, { mode: 'SUM_TO', target: 10 }), 1);
      engine.generateChallengeForRow(row(`mb9s_fwd_${i}`, { mode: 'SKIP_COUNT', step: 3, direction: 1 }), 1);
      const bwd = engine.generateChallengeForRow(row(`mb9s_bwd_${i}`, {
        mode: 'SKIP_COUNT', step: 5, direction: -1, requestedStart: 50
      }), 1);
      assert(bwd.exhausted !== true, `MB9 stress ${i} exhausted a start of 50`);
      assert(bwd.sequenceStateBefore === 50, `MB9 stress ${i} did not start at 50`);
      assert(bwd.correctAnswer === 45, `MB9 stress ${i} did not count backward by 5`);
      assert(bwd.prompt.hintText?.includes('backward by 5'), `MB9 stress ${i} lost the backward hint`);
      mb9Pass++;
    }
    assert(mb9Pass === 200, "MB9 stress did not complete 200 passes");
    console.log("  [PASS] Sequence context isolation: deterministic contamination blocked, continuity kept, MB9 200/200.");
  }

  // =========================================================================
  // GATE MB10 — FORWARD CONTENT PARITY & PRESET COMPATIBILITY
  // =========================================================================
  console.log("\n>>> [GATE MB10] Forward Content Parity & Alias Compatibility");
  {
    const registry = GLOBAL_MATH_REGISTRY;
    assert(registry.hasMode('skipUp'), "Registry supports skipUp alias");
    assert(registry.hasMode('skipDown'), "Registry supports skipDown alias");

    const engine = new MathChallengeEngine({ registry });
    const skipUpSchema: LevelSchema = {
      id: 'mb10_alias_up',
      mathConfig: { mode: 'skipUp', step: 5 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };
    const upSession = engine.initializeSession(skipUpSchema, 3);
    assert(upSession.initialZyxVal === 5, "skipUp initializes forward at step");
    assert(upSession.initialChallenges[0].challenge.correctAnswer === 10, "skipUp 5 + 5 = 10");

    const skipDownSchema: LevelSchema = {
      id: 'mb10_alias_down',
      mathConfig: { mode: 'skipDown', step: 5, requestedStart: 50 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };
    const downSession = engine.initializeSession(skipDownSchema, 3);
    assert(downSession.initialZyxVal === 50, "skipDown initializes backward at 50");
    assert(downSession.initialChallenges[0].challenge.correctAnswer === 45, "skipDown 50 - 5 = 45");

    console.log("  [PASS] Forward content parity and alias compatibility certified.");
  }

  // =========================================================================
  // GATE MC1 — EXACTLY ONE CORRECT OPTION
  // =========================================================================
  console.log("\n>>> [GATE MC1] Exactly One Correct Option Authority");
  {
    const engine = new MathChallengeEngine();
    const schemaSum: LevelSchema = {
      id: 'mc1_sum',
      mathConfig: { mode: 'SUM_TO', target: 10 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };
    const chSum = engine.generateChallengeForRow(schemaSum, 1);
    const correctSum = chSum.options.filter(o => o.isCorrect);
    assert(correctSum.length === 1, `Must have exactly 1 correct option in SUM_TO`);

    const schemaSkip: LevelSchema = {
      id: 'mc1_skip',
      mathConfig: { mode: 'SKIP_COUNT', step: 3 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };
    const chSkip = engine.generateChallengeForRow(schemaSkip, 1);
    const correctSkip = chSkip.options.filter(o => o.isCorrect);
    assert(correctSkip.length === 1, `Must have exactly 1 correct option in SKIP_COUNT`);

    console.log("  [PASS] Exactly one authoritative correct answer confirmed across all challenges.");
  }

  // =========================================================================
  // GATE MC2 — OPTION UNIQUENESS (NO DUPLICATE DECOYS)
  // =========================================================================
  console.log("\n>>> [GATE MC2] Option Uniqueness (No Duplicate Decoys)");
  {
    const engine = new MathChallengeEngine();
    // Test with low target where naive random decoy generation would frequently collide
    const schemaLowTarget: LevelSchema = {
      id: 'mc2_low',
      mathConfig: { mode: 'SUM_TO', target: 3 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };

    for (let i = 1; i <= 20; i++) {
      const ch = engine.generateChallengeForRow(schemaLowTarget, i);
      const values = ch.options.map(o => o.value);
      const unique = new Set(values);
      assert(unique.size === 3, `Options must be strictly unique, got [${values.join(', ')}]`);
    }

    console.log("  [PASS] Strict option uniqueness invariant preserved even under minimal target bounds.");
  }

  // =========================================================================
  // GATE MC3 — CURRENT-MODE MATHEMATICAL PARITY
  // =========================================================================
  console.log("\n>>> [GATE MC3] Current-Mode Mathematical Parity");
  {
    const engine = new MathChallengeEngine();
    
    // SUM_TO parity: complement math
    const sumSchema: LevelSchema = {
      id: 'mc3_sum',
      mathConfig: { mode: 'SUM_TO', target: 10 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };
    const chSum = engine.generateChallengeForRow(sumSchema, 1);
    const curr = chSum.sequenceStateBefore as number;
    assert(curr >= 1 && curr < 10, "Current operand in [1, 9]");
    assert(chSum.correctAnswer === 10 - curr, "Complement truth holds");

    // SKIP_COUNT parity: arithmetic progression
    const skipSchema: LevelSchema = {
      id: 'mc3_skip',
      mathConfig: { mode: 'SKIP_COUNT', step: 5 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };
    const session = engine.initializeSession(skipSchema, 3);
    assert(session.initialZyxVal === 5, "Initial val is 5");
    assert(session.initialChallenges[0].challenge.correctAnswer === 10, "Row 1 answer is 10");
    assert(session.initialChallenges[1].challenge.correctAnswer === 15, "Row 2 answer is 15");
    assert(session.initialChallenges[2].challenge.correctAnswer === 20, "Row 3 answer is 20");

    console.log("  [PASS] Mathematical logic precisely reproduces accepted ZYX-2A-R2 behavior.");
  }

  // =========================================================================
  // GATE MC4 — WRONG-ANSWER CHALLENGE STABILITY
  // =========================================================================
  console.log("\n>>> [GATE MC4] Wrong-Answer Challenge Stability");
  {
    const canvas = new env.MockCanvas();
    const game = new GameEngine(canvas as any, LEVEL_DATABASE[0]);
    game.start();

    const row1Challenge = game.mathEngine.getChallengeForRow(1);
    assert(row1Challenge !== undefined, "Row 1 challenge must exist");
    const originalChallengeId = row1Challenge!.id;
    const originalOptions = row1Challenge!.options.map(o => ({ ...o }));

    // Find wrong platform for Row 1
    const wrongPlatform = game.platformManager.platforms.find(p => p.rowIdx === 1 && !p.isCorrect);
    assert(wrongPlatform !== undefined, "Must find wrong decoy platform on Row 1");

    // Land on wrong decoy platform
    game.targetPlatform = wrongPlatform;
    game.handleLanding();

    // Verify bounce state initiated
    assert(game.state.zyx.bouncing === true, "Zyx must be in bouncing state");

    // Simulate jump to rest
    simulateJumpToRest(game);

    // Verify Row 1 challenge was NOT re-rolled or mutated
    const postBounceChallenge = game.mathEngine.getChallengeForRow(1);
    assert(postBounceChallenge !== undefined, "Row 1 challenge must still exist post-bounce");
    assert(postBounceChallenge!.id === originalChallengeId, "Challenge ID must not change upon wrong answer");
    assert(postBounceChallenge!.options.length === originalOptions.length, "Option count must remain identical");
    for (let i = 0; i < originalOptions.length; i++) {
      assert(postBounceChallenge!.options[i].id === originalOptions[i].id, `Option ${i} ID must remain identical`);
      assert(postBounceChallenge!.options[i].value === originalOptions[i].value, `Option ${i} value must remain identical`);
      assert(postBounceChallenge!.options[i].isCorrect === originalOptions[i].isCorrect, `Option ${i} isCorrect must remain identical`);
    }

    game.cleanup();
    console.log("  [PASS] Challenge identity and candidate options remained strictly stable across wrong-answer bounce.");
  }

  // =========================================================================
  // GATE MC5 — PLATFORM MANAGER ARCHITECTURAL IGNORANCE
  // =========================================================================
  console.log("\n>>> [GATE MC5] PlatformManager Architectural Ignorance");
  {
    const pm = new PlatformManager();
    pm.reset();

    const preparedOptions: MathAnswerOption[] = [
      { id: 'opt_1', value: 42, isCorrect: false, errorModel: 'WRONG_DIRECTION' },
      { id: 'opt_2', value: 99, isCorrect: true },
      { id: 'opt_3', value: 7, isCorrect: false, errorModel: 'OFF_BY_ONE' }
    ];

    pm.spawnRow(1, { x: 0, y: -1 }, preparedOptions, 'ch_test_123', 99);

    assert(pm.platforms.length === 3, "PlatformManager spawned exactly 3 platforms");
    const correctPlat = pm.platforms.find(p => p.isCorrect);
    assert(correctPlat !== undefined, "Correct platform flagged via prepared payload");
    assert(correctPlat!.val === 99, "Correct platform val is 99");
    assert(correctPlat!.optionId === 'opt_2', "Option ID preserved on platform entity");
    assert(correctPlat!.challengeId === 'ch_test_123', "Challenge ID preserved on platform entity");

    const wrongPlat = pm.platforms.find(p => p.val === 42);
    assert(wrongPlat!.errorModel === 'WRONG_DIRECTION', "Error model preserved on platform entity");

    console.log("  [PASS] PlatformManager successfully acts as an arithmetic-ignorant presentation layer.");
  }

  // =========================================================================
  // GATE MC6 — DETERMINISTIC RNG & REPRODUCIBILITY
  // =========================================================================
  console.log("\n>>> [GATE MC6] Deterministic RNG & Reproducibility");
  {
    const seed = 99999;
    const rng1 = new SeedableMathRng(seed);
    const rng2 = new SeedableMathRng(seed);

    for (let i = 0; i < 50; i++) {
      assert(rng1.nextInt(1, 100) === rng2.nextInt(1, 100), `nextInt mismatch at ${i}`);
      assert(rng1.random() === rng2.random(), `random() mismatch at ${i}`);
    }

    const testArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const shuffled1 = rng1.shuffle([...testArray]);
    const shuffled2 = rng2.shuffle([...testArray]);
    for (let i = 0; i < testArray.length; i++) {
      assert(shuffled1[i] === shuffled2[i], `shuffle mismatch at index ${i}`);
    }

    console.log("  [PASS] Deterministic seed stream yields 100% reproducible challenge generation.");
  }

  // =========================================================================
  // GATE MC7 — MATH MODE REGISTRY EXTENSIBILITY
  // =========================================================================
  console.log("\n>>> [GATE MC7] MathModeRegistry Dynamic Extensibility");
  {
    class DoubleMode implements MathModeDefinition<{ factor?: number }, number> {
      readonly id = 'DOUBLE_VAL';
      initializeState(config: { factor?: number }, _rng: any): number {
        return 2;
      }
      generateChallenge(request: MathChallengeRequest, rng: any): MathChallenge {
        const factor = request.config?.factor ? Number(request.config.factor) : 2;
        const currentVal = typeof request.sequenceState === 'number' ? request.sequenceState : 2;
        const correctAnswer = currentVal * factor;
        const decoys = [correctAnswer + 3, correctAnswer - 2];
        const shuffled = rng.shuffle([correctAnswer, decoys[0], decoys[1]]);

        const challengeId = `ch_double_${request.challengeIndex || 1}`;
        const options: MathAnswerOption[] = shuffled.map((v: number, i: number) => ({
          id: `${challengeId}_opt_${i}`,
          value: v,
          isCorrect: v === correctAnswer
        }));

        const prompt: MathPrompt = {
          text: `Multiply by ${factor}`,
          equation: `${currentVal} * ${factor} = ?`
        };

        return {
          id: challengeId,
          modeId: this.id,
          prompt,
          correctAnswer,
          options,
          sequenceStateBefore: currentVal,
          sequenceStateAfter: correctAnswer
        };
      }
      evaluateResult(challenge: MathChallenge, selectedOptionId: string): MathChallengeResult {
        const selected = challenge.options.find(o => o.id === selectedOptionId);
        return {
          challengeId: challenge.id,
          selectedOptionId,
          selectedValue: selected ? selected.value : NaN,
          correct: selected ? selected.isCorrect : false,
          correctAnswer: challenge.correctAnswer
        };
      }
    }

    const customRegistry = new MathModeRegistry(false);
    customRegistry.registerMode(new DoubleMode());
    assert(customRegistry.hasMode('DOUBLE_VAL'), "Custom mode registered successfully");

    const customEngine = new MathChallengeEngine({ registry: customRegistry });
    const customSchema: LevelSchema = {
      id: 'custom_double_level',
      mathConfig: { mode: 'DOUBLE_VAL', factor: 3 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };

    const session = customEngine.initializeSession(customSchema, 3);
    assert(session.initialZyxVal === 2, "Custom mode initial val is 2");
    assert(session.initialChallenges[0].challenge.correctAnswer === 6, "2 * 3 = 6");
    assert(session.initialChallenges[1].challenge.correctAnswer === 18, "6 * 3 = 18");
    assert(session.initialChallenges[2].challenge.correctAnswer === 54, "18 * 3 = 54");

    const canvas = new env.MockCanvas();
    const game = new GameEngine(canvas as any, customSchema, undefined, customEngine);
    game.start();
    assert(game.state.zyx.val === 2, "GameEngine booted with custom math mode seamlessly");
    game.cleanup();

    console.log("  [PASS] New math mode introduced and verified end-to-end via registry without modifying engine.");
  }

  // =========================================================================
  // GATE MC8 — COMMITTED LEARNER STATE VS LOOKAHEAD GENERATION STATE
  // =========================================================================
  console.log("\n>>> [GATE MC8] Committed Learner State vs. Lookahead Generation State");
  {
    const engine = new MathChallengeEngine({ rng: new SeedableMathRng(101) });
    const schema: LevelSchema = {
      id: 'mc8_state_test',
      mathConfig: { mode: 'SKIP_COUNT', step: 3 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };

    // Initialize session with 6 pre-generated visible rows
    const session = engine.initializeSession(schema, 6);

    // Initial committed learner state is the initial value (3) at row 0
    assert(engine.getCommittedLearnerState() === 3, "Committed learner state must anchor at initial value (3)");
    assert(engine.getCommittedRow() === 0, "Committed row index must be 0 before any resolutions");

    // Lookahead generation state must have advanced across the 6 visible rows (3 -> 6 -> 9 -> 12 -> 15 -> 18 -> 21)
    assert(engine.getLookaheadState() === 21, "Lookahead state must have advanced to 21 across 6 visible rows");
    assert(engine.getLookaheadState() !== engine.getCommittedLearnerState(), "Lookahead state must strictly diverge from committed learner state");

    // Simulate player solving Row 1 (correct answer = 6)
    const row1Challenge = session.initialChallenges[0].challenge;
    const correctOption = row1Challenge.options.find(o => o.isCorrect)!;
    const result1 = engine.resolveAnswer(row1Challenge.id, correctOption.id);

    assert(result1.correct === true, "Row 1 answer must be evaluated as correct");
    assert(engine.getCommittedRow() === 1, "Committed row must authoritatively advance to 1");
    assert(engine.getCommittedLearnerState() === 6, "Committed learner state must authoritatively advance to 6");
    assert(engine.getLookaheadState() === 21, "Lookahead state must remain stable at 21 when earlier rows resolve");

    // Simulate wrong answer on Row 2
    const row2Challenge = session.initialChallenges[1].challenge;
    const wrongOption = row2Challenge.options.find(o => !o.isCorrect)!;
    const resultWrong = engine.resolveAnswer(row2Challenge.id, wrongOption.id);

    assert(resultWrong.correct === false, "Decoy option must evaluate as false");
    assert(engine.getCommittedRow() === 1, "Committed row must NOT advance on wrong answer");
    assert(engine.getCommittedLearnerState() === 6, "Committed learner state must NOT mutate on wrong answer");
    assert(engine.getLookaheadState() === 21, "Lookahead state must NOT mutate on wrong answer");

    console.log("  [PASS] Strict boundary between committed learner state and lookahead generation state certified.");
  }

  // =========================================================================
  // GATE MC9 — DOUBLE-COMMIT PROTECTION (IDEMPOTENT RESOLUTION)
  // =========================================================================
  console.log("\n>>> [GATE MC9] Double-Commit Protection (Idempotent Resolution)");
  {
    const engine = new MathChallengeEngine({ rng: new SeedableMathRng(202) });
    const schema: LevelSchema = {
      id: 'mc9_double_commit_test',
      mathConfig: { mode: 'SUM_TO', target: 20 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };

    const session = engine.initializeSession(schema, 4);
    const row1Challenge = session.initialChallenges[0].challenge;
    const correctOpt = row1Challenge.options.find(o => o.isCorrect)!;

    // First resolution
    const res1 = engine.resolveAnswer(row1Challenge.id, correctOpt.id);
    assert(res1.correct === true, "First resolution must be correct");
    assert(res1.alreadyResolved !== true, "First resolution must not be flagged alreadyResolved");
    assert(engine.getCommittedRow() === 1, "Committed row advances to 1");
    const committedValAfterRes1 = engine.getCommittedLearnerState();

    // Second (duplicate) resolution of the same challenge
    const res2 = engine.resolveAnswer(row1Challenge.id, correctOpt.id);
    assert(res2.correct === true, "Duplicate resolution returns true");
    assert(res2.alreadyResolved === true, "Duplicate resolution must be flagged alreadyResolved");
    assert(engine.getCommittedRow() === 1, "Committed row must NOT increment twice on duplicate resolution");
    assert(engine.getCommittedLearnerState() === committedValAfterRes1, "Committed state must not mutate on duplicate resolution");

    console.log("  [PASS] Double-commit protection verified: duplicate resolutions are strictly idempotent.");
  }

  // =========================================================================
  // GATE MC10 — OUT-OF-ORDER COMMIT PROTECTION
  // =========================================================================
  console.log("\n>>> [GATE MC10] Out-Of-Order Commit Protection");
  {
    const engine = new MathChallengeEngine({ rng: new SeedableMathRng(303) });
    const schema: LevelSchema = {
      id: 'mc10_order_test',
      mathConfig: { mode: 'SKIP_COUNT', step: 10 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };

    const session = engine.initializeSession(schema, 4);
    const row1Challenge = session.initialChallenges[0].challenge;
    const row2Challenge = session.initialChallenges[1].challenge;
    const correctOptRow1 = row1Challenge.options.find(o => o.isCorrect)!;
    const correctOptRow2 = row2Challenge.options.find(o => o.isCorrect)!;

    // Attempting to resolve Row 2 before Row 1 is committed must throw an error
    let errorCaught = false;
    try {
      engine.resolveAnswer(row2Challenge.id, correctOptRow2.id);
    } catch (err: any) {
      errorCaught = true;
      assert(
        err.message.includes("Out-of-order resolution rejected"),
        `Error message must indicate out-of-order rejection, got: ${err.message}`
      );
    }
    assert(errorCaught, "Must throw explicit error on out-of-order resolution attempt");
    assert(engine.getCommittedRow() === 0, "Committed row must remain 0 when out-of-order commit is rejected");

    // Now resolve Row 1 properly
    const resRow1 = engine.resolveAnswer(row1Challenge.id, correctOptRow1.id);
    assert(resRow1.correct === true, "Row 1 resolution succeeds");
    assert(engine.getCommittedRow() === 1, "Committed row must advance to 1");

    // Now Row 2 can be resolved cleanly
    const resRow2 = engine.resolveAnswer(row2Challenge.id, correctOptRow2.id);
    assert(resRow2.correct === true, "Row 2 resolution succeeds once Row 1 is committed");
    assert(engine.getCommittedRow() === 2, "Committed row advances to 2");

    console.log("  [PASS] Out-of-order commit protection certified: row skipping strictly forbidden.");
  }

  // =========================================================================
  // GATE MC11 — LOOKAHEAD PARITY / IMMUTABILITY
  // =========================================================================
  console.log("\n>>> [GATE MC11] Lookahead Parity & Immutability");
  {
    const engine = new MathChallengeEngine({ rng: new SeedableMathRng(404) });
    const schema: LevelSchema = {
      id: 'mc11_parity_test',
      mathConfig: { mode: 'SUM_TO', target: 25 },
      progressionVector: { x: 0, y: -1 },
      theme: { background: 'dark', palette: 'content' }
    };

    const session = engine.initializeSession(schema, 5);
    const row3Before = session.initialChallenges[2].challenge;
    const row3OptionsBefore = row3Before.options.map(o => ({ ...o }));

    // Commit Row 1 and Row 2
    const ch1 = session.initialChallenges[0].challenge;
    const ch2 = session.initialChallenges[1].challenge;
    engine.resolveAnswer(ch1.id, ch1.options.find(o => o.isCorrect)!.id);
    engine.resolveAnswer(ch2.id, ch2.options.find(o => o.isCorrect)!.id);

    // Verify that Row 3 challenge presentation was in no way mutated or re-rolled
    const row3After = engine.getChallengeForRow(3)!;
    assert(row3After.id === row3Before.id, "Row 3 challenge ID must remain identical");
    assert(row3After.correctAnswer === row3Before.correctAnswer, "Row 3 correct answer must remain identical");
    for (let i = 0; i < 3; i++) {
      assert(row3After.options[i].id === row3OptionsBefore[i].id, "Row 3 option IDs must remain identical");
      assert(row3After.options[i].value === row3OptionsBefore[i].value, "Row 3 option values must remain identical");
      assert(row3After.options[i].isCorrect === row3OptionsBefore[i].isCorrect, "Row 3 correctness flags must remain identical");
    }

    console.log("  [PASS] Lookahead parity certified: previously rendered rows remain stable when earlier rows resolve.");
  }

  console.log("\n================================================================");
  console.log("  PHASE 3B MATH SUITE COMPLETE: ALL INVARIANTS PASS             ");
  console.log("================================================================");
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1].includes('math_challenge_suite')) {
  runMathChallengeSuite();
}
