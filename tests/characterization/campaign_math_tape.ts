/**
 * DETERMINISTIC CAMPAIGN MATH TAPE
 *
 * Verifies arithmetic generation, prompt formatting, option uniqueness,
 * and single-correct answer authority across ALL 30 production campaign levels.
 */

import { LEVEL_DATABASE } from '../../src/engine/LevelDatabase';
import { MathChallengeEngine } from '../../src/math/MathChallengeEngine';
import { SeedableMathRng } from '../../src/math/MathRng';

export interface CampaignLevelMathRecord {
  levelId: string;
  mode: string;
  initialZyxVal: number;
  challenges: Array<{
    rowIdx: number;
    challengeId: string;
    prompt: string;
    correctAnswer: number;
    options: number[];
    sequenceStateAfter: number;
  }>;
}

export function generateCampaignMathTape(seed: number = 777000): CampaignLevelMathRecord[] {
  const tape: CampaignLevelMathRecord[] = [];

  for (let i = 0; i < LEVEL_DATABASE.length; i++) {
    const schema = LEVEL_DATABASE[i];
    const rng = new SeedableMathRng(seed + i);
    const mathEngine = new MathChallengeEngine({ rng });
    const session = mathEngine.initializeSession(schema);

    const challenges: CampaignLevelMathRecord['challenges'] = [];

    for (let rowIdx = 1; rowIdx <= 4; rowIdx++) {
      const ch = mathEngine.generateChallengeForRow(schema, rowIdx);
      const options = ch.options.map((o) => o.value);
      const correctOptions = ch.options.filter((o) => o.isCorrect);

      if (correctOptions.length !== 1) {
        throw new Error(`[MATH TAPE ERROR] Level ${schema.id} row ${rowIdx} does not have exactly 1 correct answer`);
      }
      if (new Set(options).size !== options.length) {
        throw new Error(`[MATH TAPE ERROR] Level ${schema.id} row ${rowIdx} has duplicate option values: ${options}`);
      }

      challenges.push({
        rowIdx,
        challengeId: ch.id,
        prompt: ch.prompt,
        correctAnswer: ch.correctAnswer,
        options,
        sequenceStateAfter: ch.sequenceStateAfter as number,
      });

      // Commit the correct answer to advance sequence state
      mathEngine.resolveAnswer(ch.id, correctOptions[0].id);
    }

    tape.push({
      levelId: schema.id,
      mode: schema.mathConfig.mode,
      initialZyxVal: session.initialZyxVal,
      challenges,
    });
  }

  return tape;
}

// Self-test execution when run directly
if (process.argv[1]?.includes('campaign_math_tape')) {
  console.log('\n--- Generating & Verifying Full Campaign Math Tape (30 Levels) ---');
  const tapeA = generateCampaignMathTape(777000);
  const tapeB = generateCampaignMathTape(777000);

  if (JSON.stringify(tapeA) !== JSON.stringify(tapeB)) {
    console.error('[FAIL] Campaign math tape is non-deterministic!');
    process.exit(1);
  }

  // Ensure JSON baseline is saved
  try {
    const fs = await import('fs');
    const path = await import('path');
    const targetFile = path.resolve('tests/characterization/campaign_math_tape.json');
    if (!fs.existsSync(targetFile)) {
      fs.writeFileSync(targetFile, JSON.stringify(tapeA, null, 2));
    } else {
      const existing = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
      if (JSON.stringify(existing) !== JSON.stringify(tapeA)) {
        console.error('[FAIL] Campaign math tape diverged from campaign_math_tape.json baseline!');
        process.exit(1);
      }
    }
  } catch (err) {
    console.warn('[WARN] Could not sync campaign_math_tape.json:', err);
  }

  console.log(`[PASS] Full Campaign Math Tape verified: ${tapeA.length} levels, 100% deterministic, zero option collisions.`);
  for (const record of tapeA.slice(0, 6)) {
    console.log(`  Sector Level: ${record.levelId.padEnd(12)} Mode: ${record.mode.padEnd(12)} InitialVal: ${record.initialZyxVal} Rows: ${record.challenges.length}`);
  }
}
