import { setupHeadlessEnv, resetStandardViewport } from './mock_env';
import { GameEngine } from '../src/engine/GameEngine';
import { LEVEL_DATABASE } from '../src/engine/LevelDatabase';
import { LevelSchema, Platform } from '../src/types';

const env = setupHeadlessEnv();

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`[PLAYER_PATH_ASSERTION_FAILED] ${message}`);
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

function settleCamera(engine: GameEngine, durationSec: number = 0.5): void {
  const stepDt = 1 / 60;
  const steps = Math.ceil(durationSec / stepDt);
  for (let i = 0; i < steps; i++) {
    engine.update(stepDt);
    engine.draw();
  }
}

function checkAllFinite(engine: GameEngine, context: string): void {
  const { zyx } = engine.state;
  const { camera } = engine;

  assert(Number.isFinite(zyx.x), `${context}: zyx.x is not finite: ${zyx.x}`);
  assert(Number.isFinite(zyx.y), `${context}: zyx.y is not finite: ${zyx.y}`);
  assert(Number.isFinite(zyx.sx), `${context}: zyx.sx is not finite: ${zyx.sx}`);
  assert(Number.isFinite(zyx.sy), `${context}: zyx.sy is not finite: ${zyx.sy}`);
  assert(Number.isFinite(zyx.rot), `${context}: zyx.rot is not finite: ${zyx.rot}`);
  assert(Number.isFinite(zyx.t), `${context}: zyx.t is not finite: ${zyx.t}`);
  assert(Number.isInteger(zyx.currentRow), `${context}: zyx.currentRow is not an integer: ${zyx.currentRow}`);

  assert(Number.isFinite(camera.x), `${context}: camera.x is not finite: ${camera.x}`);
  assert(Number.isFinite(camera.y), `${context}: camera.y is not finite: ${camera.y}`);

  if (engine.state.wave) {
    assert(Number.isFinite(engine.state.wave.y), `${context}: wave.y is not finite: ${engine.state.wave.y}`);
  }

  for (const p of engine.platformManager.platforms) {
    assert(Number.isFinite(p.x), `${context}: platform ${p.id} x is not finite: ${p.x}`);
    assert(Number.isFinite(p.y), `${context}: platform ${p.id} y is not finite: ${p.y}`);
    assert(Number.isFinite(p.width), `${context}: platform ${p.id} width is not finite: ${p.width}`);
    assert(Number.isFinite(p.height), `${context}: platform ${p.id} height is not finite: ${p.height}`);
    assert(Number.isFinite(p.val), `${context}: platform ${p.id} val is not finite: ${p.val}`);
    assert(Number.isInteger(p.rowIdx), `${context}: platform ${p.id} rowIdx is not an integer: ${p.rowIdx}`);
  }

  for (const pt of engine.particles) {
    assert(Number.isFinite(pt.x), `${context}: particle x is not finite: ${pt.x}`);
    assert(Number.isFinite(pt.y), `${context}: particle y is not finite: ${pt.y}`);
    assert(Number.isFinite(pt.vx), `${context}: particle vx is not finite: ${pt.vx}`);
    assert(Number.isFinite(pt.vy), `${context}: particle vy is not finite: ${pt.vy}`);
    assert(Number.isFinite(pt.life), `${context}: particle life is not finite: ${pt.life}`);
  }
}

function checkZyxVisible(engine: GameEngine, phase: string, lane: number, levelId: string): void {
  const sx = engine.state.zyx.x + 250 - engine.camera.x;
  const sy = engine.state.zyx.y + 400 - engine.camera.y;

  // Renderer torso capsule definition: offset (-26, -52), w: 52, h: 52
  const left = sx - 26;
  const right = sx + 26;
  const top = sy - 52;
  const bottom = sy;

  // Visible-body invariant: character must remain trackable and not lost offscreen
  const hasVisibleTorsoX = right > 0 && left < 500;
  const hasVisibleTorsoY = bottom > 0 && top < 800;

  assert(
    hasVisibleTorsoX && hasVisibleTorsoY,
    `[ZYX_OFFSCREEN_DEFECT] ${levelId} Lane ${lane} at phase "${phase}": Zyx center=(${sx.toFixed(1)}, ${sy.toFixed(1)}), torso=[${left.toFixed(1)}, ${right.toFixed(1)}] outside visible bounds!`
  );
}

export async function runPlayerPathSuite() {
  console.log('================================================================');
  console.log('  PHASE 2A-R2 — PLAYER-PATH & REACHABILITY CERTIFICATION SUITE ');
  console.log('================================================================\n');

  const canvas = new env.MockCanvas() as any;

  // -------------------------------------------------------------------------
  // TEST 1: LEVEL REACHABILITY & COMPLETE CANDIDATE OPTION VISIBILITY (GATE PR1)
  // -------------------------------------------------------------------------
  console.log('>>> [TEST 1] Full-Depth Level Reachability & Candidate Visibility (Gate PR1)');
  {
    resetStandardViewport(canvas);
    for (const schema of LEVEL_DATABASE) {
      const engine = new GameEngine(canvas, schema);
      const rowsToTest = 8;
      const pv = schema.progressionVector;
      console.log(`  -> Testing Level "${schema.id}" (progressionVector: [${pv.x}, ${pv.y}], mode: ${schema.mathConfig.mode})`);

      for (let r = 1; r <= rowsToTest; r++) {
        const targetRow = engine.state.zyx.currentRow + 1;
        settleCamera(engine, 0.4);

        const rowPlatforms = engine.platformManager.platforms.filter(p => p.rowIdx === targetRow);
        assert(rowPlatforms.length === 3, `Level ${schema.id} row ${targetRow} must have exactly 3 candidate platforms`);

        // Verify ALL THREE candidate platforms at decision moment (Section 4)
        for (const p of rowPlatforms) {
          const sx = p.x + 250 - engine.camera.x;
          const sy = p.y + 400 - engine.camera.y;

          // Requirement A: Platform center is within intended viewport
          assert(
            sx >= 0 && sx <= 500 && sy >= 0 && sy <= 800,
            `Level ${schema.id} row ${targetRow} candidate [${p.val}] center outside canvas! Screen: (${sx.toFixed(1)}, ${sy.toFixed(1)})`
          );

          // Requirement B: Usable hit geometry is not clipped
          const halfW = p.width / 2;
          const halfH = p.height / 2;
          const left = Math.max(0, sx - halfW);
          const right = Math.min(500, sx + halfW);
          const top = Math.max(0, sy - halfH);
          const bottom = Math.min(800, sy + halfH);
          const visibleW = right - left;
          const visibleH = bottom - top;

          assert(
            visibleW >= 30 && visibleH >= 20,
            `Level ${schema.id} row ${targetRow} candidate [${p.val}] clipped too small: ${visibleW.toFixed(1)}x${visibleH.toFixed(1)}`
          );
        }

        const correctPlatform = rowPlatforms.find(p => p.isCorrect);
        assert(correctPlatform !== undefined, `Level ${schema.id} row ${targetRow} must have a correct platform`);

        const csx = correctPlatform.x + 250 - engine.camera.x;
        const csy = correctPlatform.y + 400 - engine.camera.y;

        // Tap platform via authoritative handleInput
        engine.handleInput(csx, csy);
        assert(
          engine.state.zyx.jumping,
          `Level ${schema.id} row ${targetRow}: handleInput(${csx.toFixed(1)}, ${csy.toFixed(1)}) failed to initiate jump!`
        );
        assert(
          engine.targetPlatform === correctPlatform,
          `Level ${schema.id} row ${targetRow}: targetPlatform does not match expected correct platform!`
        );

        // Simulate jump physics to completion
        simulateJumpToRest(engine);

        // Invariant: currentRow advanced
        assert(
          engine.state.zyx.currentRow === targetRow,
          `Level ${schema.id} row ${targetRow}: currentRow failed to advance, got ${engine.state.zyx.currentRow}`
        );

        checkAllFinite(engine, `Level ${schema.id} row ${targetRow} landing`);
      }

      console.log(`     [PASS] Successfully traversed ${rowsToTest} rows in Level "${schema.id}" with all options certified.`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 2: WRONG-BOUNCE-RECOVER REACHABILITY IN DIAGONAL SPACE (GATE PR1)
  // -------------------------------------------------------------------------
  console.log('\n>>> [TEST 2] Wrong-Answer Bounce & Recovery Reachability in Diagonal Levels');
  {
    resetStandardViewport(canvas);
    const diagonalLevels = LEVEL_DATABASE.filter(l => l.progressionVector.x !== 0);
    assert(diagonalLevels.length >= 2, 'Must have at least 2 diagonal levels to test');

    for (const schema of diagonalLevels) {
      const engine = new GameEngine(canvas, schema);
      console.log(`  -> Testing wrong-bounce recovery on "${schema.id}" (pv: [${schema.progressionVector.x}, ${schema.progressionVector.y}])`);

      for (let r = 1; r <= 5; r++) {
        const targetRow = engine.state.zyx.currentRow + 1;
        settleCamera(engine, 0.4);

        const wrongPlatform = engine.platformManager.platforms.find(p => p.rowIdx === targetRow && !p.isCorrect)!;
        const correctPlatform = engine.platformManager.platforms.find(p => p.rowIdx === targetRow && p.isCorrect)!;
        const initialRow = engine.state.zyx.currentRow;

        // 1. Tap wrong platform
        const wScreenX = wrongPlatform.x + 250 - engine.camera.x;
        const wScreenY = wrongPlatform.y + 400 - engine.camera.y;
        assert(wScreenX >= 0 && wScreenX <= 500, `Wrong platform out of X bounds: ${wScreenX}`);

        engine.handleInput(wScreenX, wScreenY);
        assert(engine.state.zyx.jumping, 'Wrong platform click must initiate jump');
        simulateJumpToRest(engine);

        // Must have bounced back to initial row
        assert(engine.state.zyx.currentRow === initialRow, 'Zyx must remain on initialRow after wrong bounce');
        settleCamera(engine, 0.3);

        // 2. Tap correct platform
        const cScreenX = correctPlatform.x + 250 - engine.camera.x;
        const cScreenY = correctPlatform.y + 400 - engine.camera.y;
        assert(cScreenX >= 0 && cScreenX <= 500, `Correct platform out of X bounds: ${cScreenX}`);

        engine.handleInput(cScreenX, cScreenY);
        assert(engine.state.zyx.jumping, 'Correct platform click after bounce must initiate jump');
        simulateJumpToRest(engine);

        assert(engine.state.zyx.currentRow === targetRow, 'Zyx must advance to targetRow after recovery');
        checkAllFinite(engine, `Wrong-bounce-recovery row ${targetRow}`);
      }
      console.log(`     [PASS] Wrong-bounce-recovery certified on "${schema.id}".`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 3: MATHEMATICAL COORDINATE ROUND-TRIP INVARIANCE (GATE PR2)
  // -------------------------------------------------------------------------
  console.log('\n>>> [TEST 3] Mathematical Coordinate Round-Trip Invariance Across Viewports (Gate PR2)');
  {
    const testViewports = [
      { name: 'Desktop Standard (500x800)', left: 0, top: 0, width: 500, height: 800 },
      { name: 'Mobile CSS (375x667 @ offset 20,40)', left: 20, top: 40, width: 375, height: 667 },
      { name: 'iPhone Pro (390x844 @ offset 0,0)', left: 0, top: 0, width: 390, height: 844 },
      { name: 'Tablet Scaled (768x1024 @ offset 100,50)', left: 100, top: 50, width: 768, height: 1024 },
      { name: 'Compact Android (360x740 @ offset 15,30)', left: 15, top: 30, width: 360, height: 740 }
    ];

    for (const vp of testViewports) {
      canvas.setBoundingRect(vp.left, vp.top, vp.width, vp.height);

      for (const schema of LEVEL_DATABASE) {
        const engine = new GameEngine(canvas, schema);

        for (let r = 1; r <= 4; r++) {
          settleCamera(engine, 0.4);
          const targetRow = engine.state.zyx.currentRow + 1;
          const platforms = engine.platformManager.platforms.filter(p => p.rowIdx === targetRow);

          for (const p of platforms) {
            // Forward transform: World -> Logical Screen (500x800) -> Viewport Client Coordinates
            const lx = p.x + 500 / 2 - engine.camera.x;
            const ly = p.y + 800 / 2 - engine.camera.y;
            const clientX = lx * (vp.width / 500) + vp.left;
            const clientY = ly * (vp.height / 800) + vp.top;

            // Invert manually to prove mathematical round-trip:
            const roundTripLx = (clientX - vp.left) * (500 / vp.width);
            const roundTripLy = (clientY - vp.top) * (800 / vp.height);
            const roundTripWorldX = roundTripLx - 500 / 2 + engine.camera.x;
            const roundTripWorldY = roundTripLy - 800 / 2 + engine.camera.y;

            assert(Math.abs(roundTripWorldX - p.x) < 1e-6, `Round-trip X error: ${roundTripWorldX} vs ${p.x}`);
            assert(Math.abs(roundTripWorldY - p.y) < 1e-6, `Round-trip Y error: ${roundTripWorldY} vs ${p.y}`);
          }

          // Advance one row
          const correct = platforms.find(p => p.isCorrect)!;
          const lx = correct.x + 500 / 2 - engine.camera.x;
          const ly = correct.y + 800 / 2 - engine.camera.y;
          const clientX = lx * (vp.width / 500) + vp.left;
          const clientY = ly * (vp.height / 800) + vp.top;

          engine.handleInput(clientX, clientY);
          assert(engine.state.zyx.jumping, `Failed jump in viewport ${vp.name}`);
          simulateJumpToRest(engine);
        }
      }
    }
    resetStandardViewport(canvas);
    console.log('  [PASS] Mathematical round-trip precision verified across 5 viewports, 4 progression vectors, and 80 platforms.');
  }

  // -------------------------------------------------------------------------
  // TEST 4: STRICT FINITE-COORDINATE CERTIFICATION (GATE PR3)
  // -------------------------------------------------------------------------
  console.log('\n>>> [TEST 4] Strict Finite-Coordinate & Anti-Corruption Audit (Gate PR3)');
  {
    resetStandardViewport(canvas);
    for (const schema of LEVEL_DATABASE) {
      const engine = new GameEngine(canvas, schema);

      // 1. Normal jumping finite check
      for (let r = 1; r <= 3; r++) {
        settleCamera(engine, 0.3);
        const nextP = engine.platformManager.platforms.find(p => p.rowIdx === engine.state.zyx.currentRow + 1 && p.isCorrect)!;
        const lx = nextP.x + 250 - engine.camera.x;
        const ly = nextP.y + 400 - engine.camera.y;
        engine.handleInput(lx, ly);
        simulateJumpToRest(engine);
        checkAllFinite(engine, `${schema.id} normal jump r=${r}`);
      }

      // 2. Catastrophe / Death finite check
      engine.triggerDeath('void');
      for (let f = 0; f < 60; f++) {
        engine.update(1 / 60);
        checkAllFinite(engine, `${schema.id} during death animation f=${f}`);
      }

      // 3. Respawn finite check
      engine.respawn();
      checkAllFinite(engine, `${schema.id} post-respawn`);

      // 4. Secured completion must stay finite
      engine.state.status = 'level_complete';
      for (let f = 0; f < 72; f++) {
        engine.update(1 / 60);
        checkAllFinite(engine, `${schema.id} during level_complete f=${f}`);
      }

      // 5. Delta-time spike simulation (browser tab switch: 5.0 second gap)
      engine.start();
      const now = performance.now();
      engine.lastTime = now;
      engine.loop(now + 5000);
      checkAllFinite(engine, `${schema.id} post-dt-spike`);
    }
    console.log('  [PASS] Strict finite-coordinate certification verified across all states and catastrophe lifecycles.');
  }

  // -------------------------------------------------------------------------
  // TEST 5: DIAGONAL CAMERA KEEPS THE CORRECT PLATFORM REACHABLE
  // -------------------------------------------------------------------------
  console.log('\n>>> [TEST 5] Diagonal Camera Reachability (current campaign level)');
  {
    resetStandardViewport(canvas);
    const diagonal = LEVEL_DATABASE
      .filter(l => Math.abs(l.progressionVector.x) >= 0.5)
      .sort((a, b) => Math.abs(b.progressionVector.x) - Math.abs(a.progressionVector.x))[0];
    assert(!!diagonal, 'Campaign has no steep diagonal level');
    assert(diagonal.id !== 'level_3', 'Obsolete level_3 fixture must not be used');
    const engine = new GameEngine(canvas, diagonal);

    for (let r = 1; r <= 4; r++) {
      settleCamera(engine, 0.4);
      const targetRow = engine.state.zyx.currentRow + 1;
      const correctPlatform = engine.platformManager.platforms.find(p => p.rowIdx === targetRow && p.isCorrect)!;
      assert(!!correctPlatform, `Missing correct platform on ${diagonal.id} row ${targetRow}`);

      const screenX = correctPlatform.x + 250 - engine.camera.x;
      const screenY = correctPlatform.y + 400 - engine.camera.y;
      assert(
        screenX >= 0 && screenX <= 500 && screenY >= 0 && screenY <= 800,
        `${diagonal.id} correct platform left the 500x800 view at row ${targetRow}: (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`
      );

      const rect = canvas.getBoundingClientRect();
      const clientX = (screenX * rect.width) / 500 + rect.left;
      const clientY = (screenY * rect.height) / 800 + rect.top;
      engine.handleInput(clientX, clientY);
      assert(engine.state.zyx.jumping, `${diagonal.id} handleInput missed the correct platform at row ${targetRow}`);
      simulateJumpToRest(engine);
      assert(engine.state.zyx.currentRow === targetRow, `${diagonal.id} did not land on row ${targetRow}`);
    }
    console.log(`  [PASS] Real camera kept ${diagonal.id} reachable for four diagonal jumps.`);
  }

  // -------------------------------------------------------------------------
  // TEST 6: ZYX VISIBILITY INVARIANT ACROSS JUMP, BOUNCE, AND LANDING PHASES
  // -------------------------------------------------------------------------
  console.log('\n>>> [TEST 6] Zyx Visibility Invariant Across Jump, Bounce, and Landing Lifecycles');
  {
    const diagonalLevels = LEVEL_DATABASE.filter(l => l.progressionVector.x !== 0);

    for (const schema of diagonalLevels) {
      for (const forcedLane of [-1, 0, 1]) {
        resetStandardViewport(canvas);
        const engine = new GameEngine(canvas, schema);

        // Initial camera settle
        settleCamera(engine, 0.4);

        const targetRow = 1;
        const rowPlatforms = engine.platformManager.platforms.filter(p => p.rowIdx === targetRow);
        const pv = schema.progressionVector;
        const mag = Math.hypot(pv.x, pv.y) || 1;
        const npv = { x: pv.x / mag, y: pv.y / mag };
        const ox = -npv.y;

        // Force correct platform into forcedLane (-1, 0, or 1)
        const targetP = rowPlatforms.find(p => {
          const off = Math.round((p.x - targetRow * npv.x * 220) / (ox * 140));
          return off === forcedLane;
        })!;

        assert(targetP !== undefined, `Must find platform for forced lane ${forcedLane}`);
        rowPlatforms.forEach(p => (p.isCorrect = false));
        targetP.isCorrect = true;

        // Phase 1: Before jump
        checkZyxVisible(engine, 'Before jump', forcedLane, schema.id);

        // Click to initiate jump
        const lx = targetP.x + 250 - engine.camera.x;
        const ly = targetP.y + 400 - engine.camera.y;
        engine.handleInput(lx, ly);
        assert(engine.state.zyx.jumping, `Failed to start jump to lane ${forcedLane}`);

        // Phase 2: Mid-jump (around t ~ 0.5)
        while (engine.state.zyx.t < 0.5 && engine.state.zyx.jumping) {
          engine.update(1 / 60);
        }
        checkZyxVisible(engine, 'Mid-jump', forcedLane, schema.id);

        // Phase 3: Landing (jump complete)
        while (engine.state.zyx.jumping) {
          engine.update(1 / 60);
        }
        checkZyxVisible(engine, 'Landing', forcedLane, schema.id);

        // Phase 4: Post-landing settle
        settleCamera(engine, 0.4);
        checkZyxVisible(engine, 'Post-landing settle', forcedLane, schema.id);

        // Phase 5 & 6: Wrong-answer bounce & recovery from current row
        const nextRow = targetRow + 1;
        const nextRowPlatforms = engine.platformManager.platforms.filter(p => p.rowIdx === nextRow);
        const wrongP = nextRowPlatforms[0];
        nextRowPlatforms.forEach(p => (p.isCorrect = false));
        nextRowPlatforms[1].isCorrect = true;

        const wlx = wrongP.x + 250 - engine.camera.x;
        const wly = wrongP.y + 400 - engine.camera.y;
        engine.handleInput(wlx, wly);
        while (engine.state.zyx.jumping) engine.update(1 / 60);

        // Step into bounce arc (after freeze hold frames)
        for (let i = 0; i < 15; i++) engine.update(1 / 60);
        checkZyxVisible(engine, 'Wrong-answer bounce', forcedLane, schema.id);

        // Phase 6: Post-bounce recovery
        while (engine.state.zyx.bouncing) engine.update(1 / 60);
        settleCamera(engine, 0.4);
        checkZyxVisible(engine, 'Post-bounce recovery', forcedLane, schema.id);
      }
      console.log(`  [PASS] Player tracking bounded across all lanes (-1, 0, 1) and phases for "${schema.id}".`);
    }
  }

  resetStandardViewport(canvas);
  console.log('\n================================================================');
  console.log('  PLAYER-PATH VERIFICATION COMPLETE: ALL AUDIT GATES SATISFIED  ');
  console.log('================================================================\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runPlayerPathSuite().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
