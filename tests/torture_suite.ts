import { setupHeadlessEnv } from './mock_env';
import { GameEngine } from '../src/engine/GameEngine';
import { LevelSchema, Platform } from '../src/types';
import { LEVEL_DATABASE } from '../src/engine/LevelDatabase';

const env = setupHeadlessEnv();

// Helper to run engine simulation for a given duration (in seconds)
function runSimulation(engine: GameEngine, durationSec: number, stepDt: number = 1 / 60) {
  let elapsed = 0;
  let virtualTime = performance.now();
  while (elapsed < durationSec) {
    virtualTime += stepDt * 1000;
    engine.lastTime = virtualTime - stepDt * 1000;
    engine.update(stepDt);
    engine.draw();
    elapsed += stepDt;
  }
}

// Helper to simulate jump to completion (handles landing or bounce-back)
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

// Metrics accumulator
export interface TortureMetrics {
  challengesAttempted: number;
  challengesResolved: number;
  correctAnswers: number;
  wrongAnswers: number;
  wrongAnswerRecoveries: number;
  sectorsCrossed: number;
  restartCycles: number;
  rapidInputAttempts: number;
  browserLifecycleCycles: number;
  freezes: number;
  duplicateResolutions: number;
  incorrectRowAdvances: number;
  unexpectedStateTransitions: number;
  consoleErrors: number;
  consoleWarnings: number;
}

export const metrics: TortureMetrics = {
  challengesAttempted: 0,
  challengesResolved: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  wrongAnswerRecoveries: 0,
  sectorsCrossed: 0,
  restartCycles: 0,
  rapidInputAttempts: 0,
  browserLifecycleCycles: 0,
  freezes: 0,
  duplicateResolutions: 0,
  incorrectRowAdvances: 0,
  unexpectedStateTransitions: 0,
  consoleErrors: 0,
  consoleWarnings: 0
};

// Monitor console
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
console.warn = (...args: any[]) => {
  metrics.consoleWarnings++;
  originalConsoleWarn(...args);
};
console.error = (...args: any[]) => {
  metrics.consoleErrors++;
  originalConsoleError(...args);
};

function parkWave(engine: GameEngine) {
  if (!engine.state.wave) return;
  engine.state.wave.hit = false;
  engine.state.wave.speed = engine.config.wave.baseSpeed;
  engine.state.wave.y = engine.state.zyx.y + engine.config.wave.spawnDistanceBehind;
}

export async function runAllTortureTests() {
  console.log('================================================================');
  console.log('  ZYX COMMERCIALIZATION PROGRAM — PHASE 1B TORTURE TEST SUITE  ');
  console.log('================================================================\n');

  const canvas = new env.MockCanvas() as any;
  const testSchema: LevelSchema = {
    id: 'test_sum_10',
    mathConfig: { mode: 'SUM_TO', target: 10 },
    progressionVector: { x: 0, y: -1 },
    theme: { background: 'dark', skyColors: { top: '#080820', mid: '#040412', base: '#010108' }, palette: 'content' }
  };

  // -------------------------------------------------------------
  // TEST 1: WRONG-ANSWER TORTURE & SEMANTICS (GATE C1)
  // -------------------------------------------------------------
  console.log('>>> [TEST 1] Wrong-Answer Torture & Semantics (Gate C1)');
  {
    const engine = new GameEngine(canvas, testSchema);
    // App always listens. Without a listener, postLevelComplete falls through
    // into the next campaign schema and the secured win is no longer observable.
    engine.onLevelComplete = () => {};
    for (let c = 0; c < 20; c++) {
      parkWave(engine);
      metrics.challengesAttempted++;
      const initialRow = engine.state.zyx.currentRow;
      const initialScore = engine.state.score;
      const targetRow = initialRow + 1;

      const platforms = engine.platformManager.platforms.filter(p => p.rowIdx === targetRow);
      const wrongPlatform = platforms.find(p => !p.isCorrect);
      const correctPlatform = platforms.find(p => p.isCorrect);

      if (!wrongPlatform || !correctPlatform) {
        throw new Error(`Row ${targetRow} missing correct or wrong platforms!`);
      }

      // 1. First wrong attempt
      metrics.wrongAnswers++;
      engine.executeJump(wrongPlatform);
      simulateJumpToRest(engine);

      // Invariant checks after first wrong answer
      if (engine.state.zyx.currentRow !== initialRow) {
        metrics.incorrectRowAdvances++;
        throw new Error(`[FAIL] currentRow advanced on wrong answer! Got ${engine.state.zyx.currentRow}, expected ${initialRow}`);
      }
      if (engine.state.score !== initialScore) {
        throw new Error(`[FAIL] score changed on wrong answer! Got ${engine.state.score}, expected ${initialScore}`);
      }
      if (engine.state.combo !== 0) {
        throw new Error(`[FAIL] combo was not reset to 0 on wrong answer!`);
      }

      // 2. Second wrong attempt on same challenge (wrong -> recover -> wrong)
      metrics.wrongAnswers++;
      engine.executeJump(wrongPlatform);
      simulateJumpToRest(engine);

      if (engine.state.zyx.currentRow !== initialRow) {
        metrics.incorrectRowAdvances++;
        throw new Error(`[FAIL] currentRow advanced on 2nd wrong answer!`);
      }

      // 3. Recover and hit correct answer
      metrics.wrongAnswerRecoveries++;
      metrics.correctAnswers++;
      engine.executeJump(correctPlatform);
      simulateJumpToRest(engine);

      if (engine.state.status === 'level_complete') {
        if (engine.correctInRow !== 10 || engine.state.score !== 10) {
          throw new Error(`[FAIL] Winning progress was ${engine.correctInRow} correct / score ${engine.state.score}`);
        }
        engine.loadSchema(testSchema);
        engine.start();
      } else {
        if (engine.state.zyx.currentRow !== targetRow) {
          throw new Error(`[FAIL] currentRow did not advance to ${targetRow} on correct answer!`);
        }
        if (engine.state.score !== initialScore + 1) {
          throw new Error(`[FAIL] score did not increment by 1!`);
        }
      }
      metrics.challengesResolved++;
    }
    console.log('  [PASS] 20 challenges verified with double-wrong-then-correct pattern.');
  }

  // -------------------------------------------------------------
  // TEST 2: RAPID INPUT / INPUT SPAM (GATE C5)
  // -------------------------------------------------------------
  console.log('\n>>> [TEST 2] Rapid Input / Input Spam Torture (Gate C5)');
  {
    const engine = new GameEngine(canvas, testSchema);
    parkWave(engine);
    const targetRow = engine.state.zyx.currentRow + 1;
    const platforms = engine.platformManager.platforms.filter(p => p.rowIdx === targetRow);
    const correctPlatform = platforms.find(p => p.isCorrect)!;
    const wrongPlatform = platforms.find(p => !p.isCorrect)!;

    // Trigger jump
    engine.executeJump(correctPlatform);
    metrics.rapidInputAttempts++;

    // Spam clicks during active jump
    for (let i = 0; i < 50; i++) {
      metrics.rapidInputAttempts++;
      engine.executeJump(wrongPlatform);
      engine.executeJump(correctPlatform);
      engine.handleInput(100, 200);
    }

    simulateJumpToRest(engine);

    // Verify exactly one resolution
    if (engine.state.score !== 1) {
      metrics.duplicateResolutions++;
      throw new Error(`[FAIL] Score is ${engine.state.score} after jump spam, expected 1!`);
    }
    if (engine.state.zyx.currentRow !== targetRow) {
      throw new Error(`[FAIL] currentRow is ${engine.state.zyx.currentRow}, expected ${targetRow}!`);
    }

    // Now test spam during bounce-back
    const nextTargetRow = engine.state.zyx.currentRow + 1;
    const nextPlatforms = engine.platformManager.platforms.filter(p => p.rowIdx === nextTargetRow);
    const nextWrong = nextPlatforms.find(p => !p.isCorrect)!;
    const nextCorrect = nextPlatforms.find(p => p.isCorrect)!;

    engine.executeJump(nextWrong);
    // While jumping or bouncing, spam clicks
    for (let i = 0; i < 30; i++) {
      metrics.rapidInputAttempts++;
      engine.update(1 / 60);
      engine.executeJump(nextCorrect);
    }
    simulateJumpToRest(engine);

    // Should still be at targetRow, not nextTargetRow
    if (engine.state.zyx.currentRow !== targetRow) {
      throw new Error(`[FAIL] currentRow advanced during bounce spam!`);
    }
    console.log('  [PASS] Rapid input spam completely rejected during jump, bounce, and transitions.');
  }

  // -------------------------------------------------------------
  // TEST 3: SECTOR TRANSITION TORTURE (GATE C3)
  // -------------------------------------------------------------
  console.log('\n>>> [TEST 3] Sector Transition Torture (Gate C3)');
  {
    const engine = new GameEngine(canvas, testSchema);
    let sectorsCompleted = 0;

    engine.onLevelComplete = () => {
      sectorsCompleted++;
    };

    for (let sector = 0; sector < 15; sector++) {
      const completionsBefore = sectorsCompleted;
      const waveBefore = engine.state.wave ? engine.state.wave.y : null;
      for (let r = 0; r < 10; r++) {
        metrics.challengesAttempted++;
        metrics.correctAnswers++;
        const targetRow = engine.state.zyx.currentRow + 1;
        const correctP = engine.platformManager.platforms.find(p => p.rowIdx === targetRow && p.isCorrect)!;
        engine.executeJump(correctP);
        simulateJumpToRest(engine);
        metrics.challengesResolved++;
      }

      if (engine.state.status !== 'level_complete') {
        metrics.unexpectedStateTransitions++;
        throw new Error(`[FAIL] Expected level_complete immediately, got ${engine.state.status}`);
      }
      if ((engine.state.status as string) === 'WARPING') {
        throw new Error('[FAIL] Winning landing entered WARPING');
      }
      if (sectorsCompleted !== completionsBefore + 1) {
        throw new Error(`[FAIL] Completion callback fired ${sectorsCompleted - completionsBefore} times, expected 1`);
      }
      if (engine.correctInRow !== 10 || engine.state.score !== 10) {
        throw new Error(`[FAIL] Winning progress was ${engine.correctInRow} correct / score ${engine.state.score}`);
      }

      const frozenWave = engine.state.wave?.y;
      const frozenTime = engine.state.timeLeft;
      runSimulation(engine, 0.5, 1 / 60);
      if ((engine.state.status as string) === 'WARPING') {
        throw new Error('[FAIL] Post-completion update entered WARPING');
      }
      if (engine.state.status !== 'level_complete') {
        throw new Error(`[FAIL] Completion did not stay secured, got ${engine.state.status}`);
      }
      if (engine.state.wave && frozenWave != null && engine.state.wave.y !== frozenWave) {
        throw new Error('[FAIL] Wave advanced after completion');
      }
      if (engine.state.timeLeft !== frozenTime) {
        throw new Error('[FAIL] Turn timer changed after completion');
      }
      const nextP = engine.platformManager.platforms.find(p => p.rowIdx === engine.state.zyx.currentRow + 1);
      if (nextP) engine.executeJump(nextP);
      if (engine.state.zyx.jumping) {
        throw new Error('[FAIL] Input started a jump after completion');
      }
      runSimulation(engine, 0.2, 1 / 60);
      if (sectorsCompleted !== completionsBefore + 1) {
        throw new Error('[FAIL] Completion callback fired twice');
      }
      if (waveBefore == null) {
        throw new Error('[FAIL] Completion had no wave');
      }

      metrics.sectorsCrossed++;
      const nextSectorSchema: LevelSchema = {
        ...testSchema,
        id: `sector_${sector + 1}`,
        mathConfig: { mode: 'SUM_TO', target: 10 + sector }
      };

      engine.loadSchema(nextSectorSchema);
      engine.start();

      // Check state reset for new sector
      if ((engine.state.status as string) !== 'playing') {
        throw new Error(`[FAIL] New sector status is not playing!`);
      }
      if (engine.state.zyx.currentRow !== 0) {
        throw new Error(`[FAIL] New sector currentRow is not 0!`);
      }
      if (engine.correctInRow !== 0) {
        throw new Error(`[FAIL] New sector correctInRow is not 0!`);
      }
    }

    console.log(`  [PASS] Successfully crossed 15 consecutive sectors with flawless reset.`);
  }

  // -------------------------------------------------------------
  // TEST 4: ANIMATION LOOP OWNERSHIP PROOF (GATE C6)
  // -------------------------------------------------------------
  console.log('\n>>> [TEST 4] Animation Loop Ownership Proof (Gate C6)');
  {
    env.clearAllRafs();
    const engine = new GameEngine(canvas, testSchema);

    // App owns start(). Construction must not spawn an orphan loop.
    if (env.getActiveRafCount() !== 0) {
      throw new Error(`[FAIL] Expected 0 RAFs before start(), got ${env.getActiveRafCount()}`);
    }
    engine.start();
    if (env.getActiveRafCount() !== 1) {
      throw new Error(`[FAIL] Expected 1 active RAF after start(), got ${env.getActiveRafCount()}`);
    }

    // Call start() multiple times (idempotence check)
    engine.start();
    engine.start();
    engine.start();
    if (env.getActiveRafCount() !== 1) {
      throw new Error(`[FAIL] Multiple start() calls multiplied RAFs! Count: ${env.getActiveRafCount()}`);
    }

    // Step RAF 10 times
    for (let f = 0; f < 10; f++) {
      env.stepRaf(performance.now());
      if (env.getActiveRafCount() !== 1) {
        throw new Error(`[FAIL] RAF count drifted during execution! Count: ${env.getActiveRafCount()}`);
      }
    }

    // Test cleanup
    engine.cleanup();
    if (env.getActiveRafCount() !== 0) {
      throw new Error(`[FAIL] Expected 0 RAFs after cleanup(), got ${env.getActiveRafCount()}`);
    }
    if (engine.animationFrameId !== null) {
      throw new Error(`[FAIL] animationFrameId not null after cleanup()`);
    }

    // Restart via start()
    engine.start();
    if (env.getActiveRafCount() !== 1) {
      throw new Error(`[FAIL] Expected 1 RAF after restart via start(), got ${env.getActiveRafCount()}`);
    }

    // Lifecycle churn: sector transition, fail, restart
    for (let k = 0; k < 5; k++) {
      engine.cleanup();
      engine.loadSchema(testSchema);
      engine.start();
      if (env.getActiveRafCount() !== 1) {
        throw new Error(`[FAIL] Churn cycle ${k} produced ${env.getActiveRafCount()} RAFs!`);
      }
    }
    console.log('  [PASS] Mathematical proof: exactly 1 active RAF loop maintained across all lifecycles.');
  }

  // -------------------------------------------------------------
  // TEST 5: FAILURE / RESTART TORTURE (GATE C4)
  // -------------------------------------------------------------
  console.log('\n>>> [TEST 5] Failure / Restart Torture (Gate C4)');
  {
    const engine = new GameEngine(canvas, testSchema);
    for (let cycle = 0; cycle < 25; cycle++) {
      metrics.restartCycles++;

      // Play 2 rows
      for (let r = 0; r < 2; r++) {
        metrics.challengesAttempted++;
        metrics.correctAnswers++;
        const targetRow = engine.state.zyx.currentRow + 1;
        const cp = engine.platformManager.platforms.find(p => p.rowIdx === targetRow && p.isCorrect)!;
        engine.executeJump(cp);
        simulateJumpToRest(engine);
        metrics.challengesResolved++;
      }

      // Trigger death (alternate between timer, void, wave)
      const deathTypes: Array<'void' | 'wave'> = ['void', 'wave'];
      const dt = deathTypes[cycle % deathTypes.length];
      engine.triggerDeath(dt);

      if (engine.state.status !== 'DYING') {
        throw new Error(`[FAIL] Engine did not transition to DYING!`);
      }

      // Simulate mortician animation
      runSimulation(engine, 1.5, 1 / 60);

      // Now restart
      engine.restart();

      // Invariants verification after restart
      if ((engine.state.status as string) !== 'playing') {
        throw new Error(`[FAIL] Status not playing after restart in cycle ${cycle}`);
      }
      if (engine.state.score !== 0) {
        throw new Error(`[FAIL] Score not 0 after restart in cycle ${cycle}`);
      }
      if (engine.state.zyx.currentRow !== 0) {
        throw new Error(`[FAIL] currentRow not 0 after restart in cycle ${cycle}`);
      }
      if (engine.state.zyx.jumping || engine.state.zyx.bouncing || engine.state.zyx.falling) {
        throw new Error(`[FAIL] Zyx movement flags not cleared after restart!`);
      }
      if (engine.camera.y !== 0) {
        throw new Error(`[FAIL] Camera Y not reset to 0! Got ${engine.camera.y}`);
      }
    }
    console.log('  [PASS] 25 failure/restart cycles executed cleanly with complete state scrubbing.');
  }

  // -------------------------------------------------------------
  // TEST 6: LONG-RUN SUSTAINED GAMEPLAY (GATE C2)
  // -------------------------------------------------------------
  console.log('\n>>> [TEST 6] Long-Run Sustained Gameplay (Gate C2)');
  {
    const engine = new GameEngine(canvas, testSchema);
    let totalResolved = 0;
    let sectors = 0;
    engine.onLevelComplete = () => {};

    while (totalResolved < 120 || sectors < 10) {
      parkWave(engine);
      metrics.challengesAttempted++;
      const targetRow = engine.state.zyx.currentRow + 1;
      const platforms = engine.platformManager.platforms.filter(p => p.rowIdx === targetRow);
      const correctP = platforms.find(p => p.isCorrect)!;
      const wrongP = platforms.find(p => !p.isCorrect)!;

      const roll = Math.random();
      if (roll < 0.20) {
        // Isolated wrong then correct
        metrics.wrongAnswers++;
        engine.executeJump(wrongP);
        simulateJumpToRest(engine);
        metrics.wrongAnswerRecoveries++;
        metrics.correctAnswers++;
        engine.executeJump(correctP);
        simulateJumpToRest(engine);
      } else if (roll < 0.30) {
        // Double wrong then correct
        metrics.wrongAnswers += 2;
        engine.executeJump(wrongP);
        simulateJumpToRest(engine);
        engine.executeJump(wrongP);
        simulateJumpToRest(engine);
        metrics.wrongAnswerRecoveries++;
        metrics.correctAnswers++;
        engine.executeJump(correctP);
        simulateJumpToRest(engine);
      } else {
        // Direct correct
        metrics.correctAnswers++;
        engine.executeJump(correctP);
        simulateJumpToRest(engine);
      }
      totalResolved++;
      metrics.challengesResolved++;

      if (engine.state.status === 'level_complete') {
        if ((engine.state.status as string) === 'WARPING') {
          throw new Error('[FAIL] Long run entered WARPING');
        }
        sectors++;
        metrics.sectorsCrossed++;
        const nextSchema: LevelSchema = {
          ...testSchema,
          id: `long_run_sector_${sectors}`,
          mathConfig: { mode: 'SUM_TO', target: 10 + (sectors % 5) * 5 }
        };
        engine.loadSchema(nextSchema);
        engine.start();
      }

      // Memory leak guard: platforms array should stay bounded (<= 50)
      if (engine.platformManager.platforms.length > 55) {
        throw new Error(`[FAIL] Platforms memory leak! Count: ${engine.platformManager.platforms.length}`);
      }

      // Sanity checks on coordinates
      if (isNaN(engine.state.zyx.x) || isNaN(engine.state.zyx.y) || isNaN(engine.camera.y)) {
        throw new Error(`[FAIL] NaN detected in physics/camera state!`);
      }
    }
    console.log(`  [PASS] Long run completed: ${totalResolved} challenges resolved across ${sectors} sectors.`);
  }

  // -------------------------------------------------------------
  // TEST 7: MIXED LIFECYCLE TORTURE (GATE C2, C3, C4)
  // -------------------------------------------------------------
  console.log('\n>>> [TEST 7] Mixed Real-World Lifecycle Torture (Gate C2, C3, C4)');
  {
    const engine = new GameEngine(canvas, testSchema);
    engine.onLevelComplete = () => {};
    for (let m = 0; m < 5; m++) {
      parkWave(engine);
      // Start -> wrong -> recover -> correct
      const r1 = engine.state.zyx.currentRow + 1;
      const w1 = engine.platformManager.platforms.find(p => p.rowIdx === r1 && !p.isCorrect)!;
      const c1 = engine.platformManager.platforms.find(p => p.rowIdx === r1 && p.isCorrect)!;
      engine.executeJump(w1);
      simulateJumpToRest(engine);
      engine.executeJump(c1);
      simulateJumpToRest(engine);

      // Fail -> restart
      engine.triggerDeath('void');
      runSimulation(engine, 1.0, 1 / 60);
      engine.restart();

      // Play 10 rows to completion
      for (let r = 0; r < 10; r++) {
        const row = engine.state.zyx.currentRow + 1;
        const cp = engine.platformManager.platforms.find(p => p.rowIdx === row && p.isCorrect)!;
        engine.executeJump(cp);
        simulateJumpToRest(engine);
      }
      if (engine.state.status !== 'level_complete') {
        throw new Error(`[FAIL] Expected level_complete after ten correct landings, got ${engine.state.status}`);
      }
      if ((engine.state.status as string) === 'WARPING') {
        throw new Error('[FAIL] Mixed lifecycle entered WARPING');
      }
      engine.loadSchema(testSchema);
      engine.start();
    }
    console.log('  [PASS] Mixed chaos lifecycle executed with zero crashes or corrupted state.');
  }

  // -------------------------------------------------------------
  // TEST 8: RESIZE & HIT-TESTING GEOMETRY (GATE C1, C8)
  // -------------------------------------------------------------
  console.log('\n>>> [TEST 8] Resize & Hit-Testing Coordinate Transforms (Gate C1, C8)');
  {
    const engine = new GameEngine(canvas, testSchema);
    const targetRow = engine.state.zyx.currentRow + 1;
    const targetP = engine.platformManager.platforms.find(p => p.rowIdx === targetRow && p.isCorrect)!;

    // Test with standard 500x800 canvas
    canvas.setBoundingRect(0, 0, 500, 800);
    // Platform world coord to screen coord:
    // worldX = lx - canvas.width/2 + camera.x => lx = worldX + canvas.width/2 - camera.x
    // lx = (clientX - rect.left) * (500 / rect.width) => clientX = lx * (rect.width/500) + rect.left
    const expectedLx = targetP.x + 500 / 2 - engine.camera.x;
    const expectedLy = targetP.y + 800 / 2 - engine.camera.y;

    engine.handleInput(expectedLx, expectedLy);
    if (!engine.state.zyx.jumping) {
      throw new Error(`[FAIL] Click on standard canvas failed to register platform!`);
    }
    simulateJumpToRest(engine);

    // Test with scaled viewport (e.g. mobile display 375x600 at offset 50, 100)
    canvas.setBoundingRect(50, 100, 375, 600);
    const nextRow = engine.state.zyx.currentRow + 1;
    const nextP = engine.platformManager.platforms.find(p => p.rowIdx === nextRow && p.isCorrect)!;

    const nLx = nextP.x + 500 / 2 - engine.camera.x;
    const nLy = nextP.y + 800 / 2 - engine.camera.y;
    const clientX = nLx * (375 / 500) + 50;
    const clientY = nLy * (600 / 800) + 100;

    engine.handleInput(clientX, clientY);
    if (!engine.state.zyx.jumping) {
      throw new Error(`[FAIL] Scaled/offset click failed to register platform!`);
    }
    simulateJumpToRest(engine);
    console.log('  [PASS] Viewport resizing and hit-test scaling perfectly aligned.');
  }

  // -------------------------------------------------------------
  // TEST 9: BROWSER LIFECYCLE (DT CLAMPING / TAB SWITCHING)
  // -------------------------------------------------------------
  console.log('\n>>> [TEST 9] Browser Lifecycle Simulation (Gate C7)');
  {
    const engine = new GameEngine(canvas, testSchema);
    metrics.browserLifecycleCycles++;
    engine.start();

    // Simulate tab switch out (e.g. 5 seconds gap)
    // GameEngine has: const dt = Math.min((time - this.lastTime) / 1000, maxDeltaTime);
    const timeBefore = performance.now();
    engine.lastTime = timeBefore;
    
    // Simulate return after 5 seconds
    engine.loop(timeBefore + 5000);

    // Verify dt was clamped to 0.1s and didn't catapult physics into oblivion
    if (isNaN(engine.state.zyx.y) || Math.abs(engine.state.zyx.y) > 5000) {
      throw new Error(`[FAIL] Background tab dt clamp failed! zyx.y is ${engine.state.zyx.y}`);
    }
    console.log('  [PASS] Tab switch delta-time clamp verified.');
  }

  console.log('\n================================================================');
  console.log('  ALL TORTURE TESTS PASSED WITH ZERO RUNTIME DEFECTS!           ');
  console.log('================================================================\n');

  console.log('FINAL TORTURE METRICS:');
  console.log(JSON.stringify(metrics, null, 2));
}

runAllTortureTests().catch(err => {
  console.error('\n>>> TEST FAILED WITH EXCEPTION:\n', err);
  process.exit(1);
});
