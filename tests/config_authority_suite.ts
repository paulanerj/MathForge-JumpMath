/**
 * Phase 2A Configuration Authority Verification Suite
 * Verifies typed config architecture, injection, deep merging, and runtime parameter responsiveness.
 */

import { setupHeadlessEnv } from './mock_env';
import { DEFAULT_ZYX_CONFIG, createZyxConfig } from '../src/config';
import { GameEngine } from '../src/engine/GameEngine';
import { PlatformManager } from '../src/engine/PlatformManager';
import { Camera } from '../src/engine/Camera';

const env = setupHeadlessEnv();

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[CONFIG ASSERTION FAILED] ${msg}`);
  }
}

function runConfigTests() {
  console.log("================================================================");
  console.log("  PHASE 2A — CONFIGURATION AUTHORITY VERIFICATION SUITE         ");
  console.log("================================================================");

  // TEST 1: Default Config Integrity
  console.log("\n>>> [TEST 1] Default Configuration Baseline Integrity");
  {
    assert(DEFAULT_ZYX_CONFIG.gameplay.turnTimeLimit === 10, "Default turnTimeLimit must be 10");
    assert(DEFAULT_ZYX_CONFIG.gameplay.winCondition === 10, "Default winCondition must be 10");
    assert(DEFAULT_ZYX_CONFIG.platform.gapY === 220, "Default gapY must be 220");
    assert(DEFAULT_ZYX_CONFIG.platform.gapX === 140, "Default gapX must be 140");
    assert(DEFAULT_ZYX_CONFIG.platform.width === 120, "Default platform width must be 120");
    assert(DEFAULT_ZYX_CONFIG.platform.height === 50, "Default platform height must be 50");
    assert(DEFAULT_ZYX_CONFIG.jump.jumpSpeed === 1.25, "Default jumpSpeed must be 1.25");
    assert(DEFAULT_ZYX_CONFIG.jump.apexHeight === 220, "Default apexHeight must be 220");
    assert(DEFAULT_ZYX_CONFIG.camera.lerpRateY === 5.0, "Default camera lerpRateY must be 5.0");
    assert(DEFAULT_ZYX_CONFIG.camera.targetOffsetY === 150, "Default camera targetOffsetY must be 150");
    assert(DEFAULT_ZYX_CONFIG.wave.warningDistance === 520, "Default wave warningDistance must be 520");
    assert(DEFAULT_ZYX_CONFIG.flow.comboThreshold === 10, "Default flow comboThreshold must be 10");
    assert(DEFAULT_ZYX_CONFIG.catastrophe.voidSpeed === 3.2, "Default voidSpeed must be 3.2");
    assert(DEFAULT_ZYX_CONFIG.audio.defaultTempo === 130, "Default audio tempo must be 130");
    console.log("  [PASS] All baseline configuration values verify against ZYX-00-R1 constants.");
  }

  // TEST 2: Factory Deep Merging & Immutability
  console.log("\n>>> [TEST 2] Factory Deep Merging & Default Immutability");
  {
    const customConfig = createZyxConfig({
      gameplay: { winCondition: 5 },
      platform: { gapY: 300 }
    });

    assert(customConfig.gameplay.winCondition === 5, "Overridden winCondition must be 5");
    assert(customConfig.gameplay.turnTimeLimit === 10, "Unspecified gameplay.turnTimeLimit must remain default (10)");
    assert(customConfig.platform.gapY === 300, "Overridden platform.gapY must be 300");
    assert(customConfig.platform.gapX === 140, "Unspecified platform.gapX must remain default (140)");
    assert(DEFAULT_ZYX_CONFIG.gameplay.winCondition === 10, "DEFAULT_ZYX_CONFIG must NOT be mutated by overrides");
    assert(DEFAULT_ZYX_CONFIG.platform.gapY === 220, "DEFAULT_ZYX_CONFIG must NOT be mutated by overrides");
    console.log("  [PASS] Deep merging selectively overrides targets while preserving default immutability.");
  }

  // TEST 3: PlatformManager Injection & Geometry Tuning
  console.log("\n>>> [TEST 3] PlatformManager Custom Geometry Injection");
  {
    const customPlatformConfig = {
      ...DEFAULT_ZYX_CONFIG.platform,
      gapY: 320,
      gapX: 210,
      width: 160,
      height: 50,
      initialSpawnRows: 4
    };
    const pm = new PlatformManager(customPlatformConfig);
    pm.reset();
    for (let r = 1; r <= customPlatformConfig.initialSpawnRows; r++) {
      pm.spawnRow(r, { x: 0, y: -1 }, [
        { id: `opt_${r}_0`, value: 10, isCorrect: false },
        { id: `opt_${r}_1`, value: 20, isCorrect: true },
        { id: `opt_${r}_2`, value: 30, isCorrect: false },
      ], `ch_${r}`, 20);
    }

    assert(pm.gapY === 320, "PlatformManager.gapY must reflect injected config");
    assert(pm.gapX === 210, "PlatformManager.gapX must reflect injected config");
    assert(pm.platforms.length === 12, "4 rows of 3 platforms must yield 12 platforms");
    assert(pm.platforms[0].width === 160, "Platform width must reflect injected config (160)");
    assert(pm.platforms[0].height === 50, "Platform height must reflect injected config (50)");
    
    // Check vertical spacing between row 1 and row 2
    const row1P = pm.platforms.find(p => p.rowIdx === 1)!;
    const row2P = pm.platforms.find(p => p.rowIdx === 2)!;
    const measuredGapY = Math.abs(row2P.y - row1P.y);
    assert(measuredGapY === 320, `Measured row gap (${measuredGapY}) must match injected gapY (320)`);
    console.log("  [PASS] PlatformManager geometry strictly respects injected PlatformConfig.");
  }

  // TEST 4: Camera Injection & Smoothing Tuning
  console.log("\n>>> [TEST 4] Camera Smoothing & Offset Injection");
  {
    const customCamConfig = {
      ...DEFAULT_ZYX_CONFIG.camera,
      lerpRateY: 5.0,
      targetOffsetY: 200
    };
    const cam = new Camera(customCamConfig);
    assert(cam.config.lerpRateY === 5.0, "Camera must store custom lerpRateY");
    assert(cam.config.targetOffsetY === 200, "Camera must store custom targetOffsetY");

    cam.update(0.1, 0, 500);
    // targetY = 500 - 200 = 300
    // after lerp at rate 5.0 with dt 0.1: y moved towards 300
    assert(cam.y !== 0, "Camera Y must move towards target with custom lerp rate");
    console.log("  [PASS] Camera follows injected CameraConfig parameters.");
  }

  // TEST 5: GameEngine Full-Stack Config Authority
  console.log("\n>>> [TEST 5] GameEngine Runtime Responsiveness to Injected ZyxConfig");
  {
    const canvas = new env.MockCanvas() as unknown as HTMLCanvasElement;
    const fastConfig = createZyxConfig({
      gameplay: {
        turnTimeLimit: 15,
        winCondition: 3
      },
      jump: {
        jumpSpeed: 2.5
      },
      platform: {
        gapY: 280
      }
    });

    const engine = new GameEngine(canvas, undefined, fastConfig);
    assert(engine.config.gameplay.turnTimeLimit === 15, "Engine config must match fastConfig");
    assert(engine.state.timeLeft === 15, "Initial timeLeft must match injected turnTimeLimit (15)");
    assert(engine.WIN_CONDITION === 3, "Engine WIN_CONDITION getter must match injected winCondition (3)");
    assert(engine.platformManager.gapY === 280, "Injected sub-config must propagate to PlatformManager");

    // Test fast jump
    const nextP = engine.platformManager.platforms.find(p => p.rowIdx === 1 && p.isCorrect)!;
    engine.executeJump(nextP);
    assert(engine.state.zyx.jumping === true, "Zyx must be jumping");
    
    // Step engine forward: at 2.5 jumpSpeed, 0.4s should complete the jump (0.4 * 2.5 = 1.0)
    engine.update(0.45);
    assert(engine.state.zyx.jumping === false, "Jump must complete rapidly under 2.5x speed");
    assert(engine.state.zyx.currentRow === 1, "Zyx row must advance on landing");

    // Landing resets timeLeft to configured turnTimeLimit
    assert(engine.state.timeLeft === 15, "Landing must reset timeLeft to configured turnTimeLimit (15)");

    engine.cleanup();
    console.log("  [PASS] GameEngine runtime dynamically governed by injected ZyxConfig.");
  }

  console.log("\n================================================================");
  console.log("  CONFIGURATION AUTHORITY VERIFIED: CORE ENGINE MECHANICS CENTRALIZED");
  console.log("================================================================\n");
}

runConfigTests();
