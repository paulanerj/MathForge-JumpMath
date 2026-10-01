/**
 * ARCH-1 SAFETY TEST: OBSERVATIONAL INVARIANCE
 *
 * Proves that the characterization harness and observation adapter are strictly
 * observational and cannot alter game-domain simulation outcomes or state.
 */

import { setupHeadlessEnv } from '../mock_env';
import { GameEngine } from '../../src/engine/GameEngine';
import { LEVEL_DATABASE } from '../../src/engine/LevelDatabase';
import { MathChallengeEngine } from '../../src/math/MathChallengeEngine';
import { SeedableMathRng } from '../../src/math/MathRng';
import { LegacyObservationAdapter } from './legacyObservationAdapter';

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(`[SAFETY TEST FAILED] ${msg}`);
}

console.log('\n--- Running ARCH-1 Safety Test (Observational Invariance) ---');

function runSession(enableCharacterization: boolean) {
  const env = setupHeadlessEnv();
  const canvas = new env.MockCanvas() as any;
  canvas.width = 500;
  canvas.height = 800;
  canvas.setBoundingRect(0, 0, 500, 800);

  const schema = LEVEL_DATABASE[0]; // f1_sum10
  const mathEngine = new MathChallengeEngine({ rng: new SeedableMathRng(777) });
  const engine = new GameEngine(canvas as HTMLCanvasElement, schema, undefined, mathEngine);
  engine.start();

  const adapter = enableCharacterization ? new LegacyObservationAdapter() : null;

  // Jump row 1
  if (adapter) adapter.captureObservation(engine, 'SAFETY_TEST', 0, 'row0_start');
  let target = engine.platformManager.platforms.find((p) => p.rowIdx === 1 && p.isCorrect)!;
  engine.handleInput(target.x - engine.camera.x + 250, target.y - engine.camera.y + 400);
  for (let i = 0; i < 30; i++) {
    engine.update(1 / 60);
    engine.draw();
  }

  // Jump row 2
  if (adapter) adapter.captureObservation(engine, 'SAFETY_TEST', 1, 'row1_landed');
  target = engine.platformManager.platforms.find((p) => p.rowIdx === 2 && p.isCorrect)!;
  engine.handleInput(target.x - engine.camera.x + 250, target.y - engine.camera.y + 400);
  for (let i = 0; i < 30; i++) {
    engine.update(1 / 60);
    engine.draw();
  }

  // Jump row 3
  if (adapter) adapter.captureObservation(engine, 'SAFETY_TEST', 2, 'row2_landed');
  target = engine.platformManager.platforms.find((p) => p.rowIdx === 3 && p.isCorrect)!;
  engine.handleInput(target.x - engine.camera.x + 250, target.y - engine.camera.y + 400);
  for (let i = 0; i < 30; i++) {
    engine.update(1 / 60);
    engine.draw();
  }

  // Jump row 4
  if (adapter) adapter.captureObservation(engine, 'SAFETY_TEST', 3, 'row3_landed');
  target = engine.platformManager.platforms.find((p) => p.rowIdx === 4 && p.isCorrect)!;
  engine.handleInput(target.x - engine.camera.x + 250, target.y - engine.camera.y + 400);
  for (let i = 0; i < 30; i++) {
    engine.update(1 / 60);
    engine.draw();
  }

  if (adapter) adapter.captureObservation(engine, 'SAFETY_TEST', 4, 'level_won');

  const snapshot = {
    status: engine.state.status,
    score: engine.state.score,
    streak: engine.state.streak,
    currentRow: engine.state.zyx.currentRow,
    zyxX: engine.state.zyx.x,
    zyxY: engine.state.zyx.y,
    waveY: engine.state.wave ? engine.state.wave.y : 0,
    timeLeft: engine.state.timeLeft,
    cameraX: engine.camera.x,
    cameraY: engine.camera.y,
  };

  engine.cleanup();
  return snapshot;
}

const runWithoutHarness = runSession(false);
const runWithHarness = runSession(true);

console.log('Comparing outcomes:');
console.log('Without harness:', runWithoutHarness);
console.log('With harness:   ', runWithHarness);

assert(runWithoutHarness.status === runWithHarness.status, 'status mismatch');
assert(runWithoutHarness.score === runWithHarness.score, 'score mismatch');
assert(runWithoutHarness.streak === runWithHarness.streak, 'streak mismatch');
assert(runWithoutHarness.currentRow === runWithHarness.currentRow, 'currentRow mismatch');
assert(Math.abs(runWithoutHarness.zyxX - runWithHarness.zyxX) < 1e-6, 'zyxX mismatch');
assert(Math.abs(runWithoutHarness.zyxY - runWithHarness.zyxY) < 1e-6, 'zyxY mismatch');
assert(Math.abs(runWithoutHarness.waveY - runWithHarness.waveY) < 1e-6, 'waveY mismatch');
assert(Math.abs(runWithoutHarness.timeLeft - runWithHarness.timeLeft) < 1e-6, 'timeLeft mismatch');
assert(Math.abs(runWithoutHarness.cameraX - runWithHarness.cameraX) < 1e-6, 'cameraX mismatch');
assert(Math.abs(runWithoutHarness.cameraY - runWithHarness.cameraY) < 1e-6, 'cameraY mismatch');

console.log('[PASS] ARCH-1 Safety Invariant: Observational harness produced 100% identical game domain state.\n');
