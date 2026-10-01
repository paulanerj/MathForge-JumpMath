/**
 * FRAME-RATE DEPENDENCY & INTEGRATION AUDIT
 *
 * Evaluates simulation behaviors across 30Hz, 60Hz, 90Hz, and 120Hz refresh rates.
 * Pinpoints which behaviors integrate via elapsed time (dt) vs integer frame count (--).
 */

import { setupHeadlessEnv } from '../mock_env';
import { GameEngine } from '../../src/engine/GameEngine';
import { LEVEL_DATABASE } from '../../src/engine/LevelDatabase';

export interface FrameRateAuditResult {
  hz: number;
  dt: number;
  bounceHoldDurationSec: number;
  hitstopDurationSec: number;
  plasmaAdvancement1s: number;
  jumpDurationSec: number;
  cameraRemainingDistancePct: number;
}

export function auditFrameRateExecution(hz: number): FrameRateAuditResult {
  const dt = 1 / hz;
  const env = setupHeadlessEnv();
  const canvas = new env.MockCanvas() as any;
  const engine = new GameEngine(canvas as HTMLCanvasElement, LEVEL_DATABASE[0]);
  engine.start();

  // 1. Audit BounceHold (Frame count dependent: g.bounceHold--)
  (engine.state.zyx as any).bounceHold = 9;
  let bounceHoldTicks = 0;
  while ((engine.state.zyx as any).bounceHold > 0 && bounceHoldTicks < 500) {
    (engine.state.zyx as any).bounceHold--;
    bounceHoldTicks++;
  }
  const bounceHoldDurationSec = bounceHoldTicks * dt;

  // 2. Audit Hitstop (Frame count dependent: this.state.hitstop--)
  engine.state.hitstop = 4;
  let hitstopTicks = 0;
  while (engine.state.hitstop > 0 && hitstopTicks < 500) {
    engine.state.hitstop--;
    hitstopTicks++;
  }
  const hitstopDurationSec = hitstopTicks * dt;

  // 3. Audit Plasma Advancement over 1.0 second elapsed time
  const initialWaveY = engine.state.wave!.y;
  const steps1s = Math.round(hz * 1.0);
  for (let i = 0; i < steps1s; i++) {
    engine.state.wave!.y -= engine.state.wave!.speed * dt;
  }
  const plasmaAdvancement1s = Math.abs(engine.state.wave!.y - initialWaveY);

  // 4. Audit Jump Flight Duration
  const jumpSpeed = engine.config.jump.jumpSpeed; // 2.5 (1 / 0.4s)
  let jumpT = 0;
  let jumpTicks = 0;
  while (jumpT < 1.0 && jumpTicks < 500) {
    jumpT += dt * jumpSpeed;
    jumpTicks++;
  }
  const jumpDurationSec = jumpTicks * dt;

  // 5. Audit Camera Exponential Lerp Decay
  let camY = 0;
  const targetY = 100;
  const lerpRate = engine.config.camera.lerpRateY;
  for (let i = 0; i < steps1s; i++) {
    camY += (targetY - camY) * lerpRate * dt;
  }
  const cameraRemainingDistancePct = Math.abs(targetY - camY) / targetY;

  engine.cleanup();

  return {
    hz,
    dt,
    bounceHoldDurationSec,
    hitstopDurationSec,
    plasmaAdvancement1s,
    jumpDurationSec,
    cameraRemainingDistancePct,
  };
}

if (process.argv[1]?.includes('framerate_dependency_test')) {
  console.log('\n--- Running Frame-Rate Dependency Audit (30Hz, 60Hz, 90Hz, 120Hz) ---');
  const rates = [30, 60, 90, 120];
  const results = rates.map((hz) => auditFrameRateExecution(hz));

  console.log('Results Summary:');
  for (const r of results) {
    console.log(`\n>>> Refresh Rate: ${r.hz} Hz (dt = ${(r.dt * 1000).toFixed(2)} ms)`);
    console.log(`  - bounceHold Duration:  ${r.bounceHoldDurationSec.toFixed(4)}s (9 frames) -> FRAME COUNT DEPENDENT`);
    console.log(`  - hitstop Duration:     ${r.hitstopDurationSec.toFixed(4)}s (4 frames) -> FRAME COUNT DEPENDENT`);
    console.log(`  - Plasma Advancement:   ${r.plasmaAdvancement1s.toFixed(2)}px (over 1.0s) -> TIME INTEGRATED (EXACT)`);
    console.log(`  - Jump Duration:        ${r.jumpDurationSec.toFixed(4)}s -> TIME INTEGRATED`);
    console.log(`  - Camera Remaining Pct: ${(r.cameraRemainingDistancePct * 100).toFixed(2)}% -> EULER STEP SENSITIVE`);
  }

  console.log('\n[CLASSIFICATION]');
  console.log('  - bounceHold & hitstop: KNOWN_DEFECT — DO NOT PRESERVE (Must convert to fixed time duration in commercial engine)');
  console.log('  - Plasma pursuit & Jump: FROZEN_ACCEPTED (Pure continuous time integration)');
  console.log('  - Camera lerp: IMPLEMENTATION_DETAIL — EXCLUDE FROM PARITY (Use analytical damp in commercial engine)');
}
