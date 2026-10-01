/**
 * PARITY COMPARATOR
 *
 * Compares actual runtime observations against approved golden traces.
 * Enforces strict exact equality on discrete state while evaluating
 * continuous kinematics against tightly documented tolerances.
 */

import { CanonicalObservation, GoldenScenarioTrace } from './canonicalObservation';

export interface ComparisonDiff {
  scenarioId: string;
  stepIndex: number;
  label: string;
  fieldPath: string;
  expected: unknown;
  actual: unknown;
  tolerance?: number;
  message: string;
}

export interface ComparisonResult {
  passed: boolean;
  scenarioId: string;
  diffs: ComparisonDiff[];
  summary: string;
}

export class ParityComparator {
  private static readonly TOLERANCES: Record<string, number> = {
    'player.x': 1.0,
    'player.y': 1.0,
    'camera.x': 1.0,
    'camera.y': 1.0,
    'plasma.waveY': 1.0,
    'plasma.gapToPlayer': 1.0,
    'session.timeLeft': 0.05,
    'framing.nextRowMinX': 2.0,
    'framing.nextRowMaxX': 2.0,
    'platform.worldX': 1.0,
    'platform.worldY': 1.0,
  };

  compareTraces(actual: CanonicalObservation[], golden: GoldenScenarioTrace): ComparisonResult {
    const diffs: ComparisonDiff[] = [];
    const scenarioId = golden.scenarioId;

    if (actual.length !== golden.observations.length) {
      diffs.push({
        scenarioId,
        stepIndex: -1,
        label: 'TRACE_LENGTH',
        fieldPath: 'observations.length',
        expected: golden.observations.length,
        actual: actual.length,
        message: `Scenario ${scenarioId}: Expected ${golden.observations.length} observations, got ${actual.length}`,
      });
      return {
        passed: false,
        scenarioId,
        diffs,
        summary: diffs[0].message,
      };
    }

    for (let i = 0; i < actual.length; i++) {
      const act = actual[i];
      const exp = golden.observations[i];

      // Exact comparisons: Session
      this.assertExact(diffs, scenarioId, i, act.label, 'session.status', exp.session.status, act.session.status);
      this.assertExact(diffs, scenarioId, i, act.label, 'session.score', exp.session.score, act.session.score);
      this.assertExact(diffs, scenarioId, i, act.label, 'session.streak', exp.session.streak, act.session.streak);
      this.assertExact(diffs, scenarioId, i, act.label, 'session.levelId', exp.session.levelId, act.session.levelId);
      this.assertExact(diffs, scenarioId, i, act.label, 'session.levelIndex', exp.session.levelIndex, act.session.levelIndex);
      this.assertTolerance(diffs, scenarioId, i, act.label, 'session.timeLeft', exp.session.timeLeft, act.session.timeLeft);

      // Comparisons: Player
      this.assertExact(diffs, scenarioId, i, act.label, 'player.currentRow', exp.player.currentRow, act.player.currentRow);
      this.assertExact(diffs, scenarioId, i, act.label, 'player.jumping', exp.player.jumping, act.player.jumping);
      this.assertExact(diffs, scenarioId, i, act.label, 'player.bouncing', exp.player.bouncing, act.player.bouncing);
      this.assertExact(diffs, scenarioId, i, act.label, 'player.falling', exp.player.falling, act.player.falling);
      // Cosmetic death glitch in MorticianAPI mutates player coordinates during DYING status with unseeded Math.random()
      const isDying = String(act.session.status).toLowerCase() === 'dying';
      if (!isDying) {
        this.assertTolerance(diffs, scenarioId, i, act.label, 'player.x', exp.player.x, act.player.x);
        this.assertTolerance(diffs, scenarioId, i, act.label, 'player.y', exp.player.y, act.player.y);
      }

      // Comparisons: Camera
      this.assertTolerance(diffs, scenarioId, i, act.label, 'camera.x', exp.camera.x, act.camera.x);
      this.assertTolerance(diffs, scenarioId, i, act.label, 'camera.y', exp.camera.y, act.camera.y);

      // Comparisons: Plasma
      this.assertExact(diffs, scenarioId, i, act.label, 'plasma.shieldActive', exp.plasma.shieldActive, act.plasma.shieldActive);
      this.assertTolerance(diffs, scenarioId, i, act.label, 'plasma.speed', exp.plasma.speed, act.plasma.speed, 0.1);
      this.assertTolerance(diffs, scenarioId, i, act.label, 'plasma.waveY', exp.plasma.waveY, act.plasma.waveY);
      this.assertTolerance(diffs, scenarioId, i, act.label, 'plasma.gapToPlayer', exp.plasma.gapToPlayer, act.plasma.gapToPlayer);

      // Comparisons: Framing
      this.assertExact(diffs, scenarioId, i, act.label, 'framing.isFramedCorrectly', exp.framing.isFramedCorrectly, act.framing.isFramedCorrectly);
      this.assertTolerance(diffs, scenarioId, i, act.label, 'framing.nextRowMinX', exp.framing.nextRowMinX, act.framing.nextRowMinX);
      this.assertTolerance(diffs, scenarioId, i, act.label, 'framing.nextRowMaxX', exp.framing.nextRowMaxX, act.framing.nextRowMaxX);

      // Comparisons: Active Challenge
      if (exp.activeChallenge && act.activeChallenge) {
        this.assertExact(diffs, scenarioId, i, act.label, 'activeChallenge.prompt', exp.activeChallenge.prompt, act.activeChallenge.prompt);
        this.assertExact(diffs, scenarioId, i, act.label, 'activeChallenge.correctAnswer', exp.activeChallenge.correctAnswer, act.activeChallenge.correctAnswer);
        this.assertExact(diffs, scenarioId, i, act.label, 'activeChallenge.optionCount', exp.activeChallenge.optionCount, act.activeChallenge.optionCount);
      } else if (exp.activeChallenge || act.activeChallenge) {
        diffs.push({
          scenarioId,
          stepIndex: i,
          label: act.label,
          fieldPath: 'activeChallenge',
          expected: exp.activeChallenge?.id ?? null,
          actual: act.activeChallenge?.id ?? null,
          message: `Active challenge presence mismatch at step ${i} (${act.label})`,
        });
      }

      // Comparisons: Actionable Platforms
      if (exp.actionableRowPlatforms.length !== act.actionableRowPlatforms.length) {
        diffs.push({
          scenarioId,
          stepIndex: i,
          label: act.label,
          fieldPath: 'actionableRowPlatforms.length',
          expected: exp.actionableRowPlatforms.length,
          actual: act.actionableRowPlatforms.length,
          message: `Actionable platforms count mismatch at step ${i}: expected ${exp.actionableRowPlatforms.length}, got ${act.actionableRowPlatforms.length}`,
        });
      } else {
        for (let pIdx = 0; pIdx < exp.actionableRowPlatforms.length; pIdx++) {
          const ep = exp.actionableRowPlatforms[pIdx];
          const ap = act.actionableRowPlatforms[pIdx];
          this.assertExact(diffs, scenarioId, i, act.label, `platform[${pIdx}].val`, ep.val, ap.val);
          this.assertExact(diffs, scenarioId, i, act.label, `platform[${pIdx}].isCorrect`, ep.isCorrect, ap.isCorrect);
          this.assertExact(diffs, scenarioId, i, act.label, `platform[${pIdx}].shattered`, ep.shattered, ap.shattered);
          this.assertTolerance(diffs, scenarioId, i, act.label, `platform[${pIdx}].worldX`, ep.worldX, ap.worldX);
          this.assertTolerance(diffs, scenarioId, i, act.label, `platform[${pIdx}].worldY`, ep.worldY, ap.worldY);
        }
      }

      // Comparisons: SafePose & Recovery State
      if (exp.safePose || act.safePose) {
        if (!exp.safePose || !act.safePose) {
          diffs.push({
            scenarioId,
            stepIndex: i,
            label: act.label,
            fieldPath: 'safePose',
            expected: exp.safePose ?? null,
            actual: act.safePose ?? null,
            message: `safePose presence mismatch at step ${i} (${act.label})`,
          });
        } else {
          this.assertExact(diffs, scenarioId, i, act.label, 'safePose.row', exp.safePose.row, act.safePose.row);
          this.assertExact(diffs, scenarioId, i, act.label, 'safePose.val', exp.safePose.val, act.safePose.val);
          this.assertTolerance(diffs, scenarioId, i, act.label, 'safePose.x', exp.safePose.x, act.safePose.x);
          this.assertTolerance(diffs, scenarioId, i, act.label, 'safePose.y', exp.safePose.y, act.safePose.y);
        }
      }
      this.assertExact(diffs, scenarioId, i, act.label, 'travelPreview', exp.travelPreview, act.travelPreview);

      if (exp.recoveryState || act.recoveryState) {
        if (!exp.recoveryState || !act.recoveryState) {
          diffs.push({
            scenarioId,
            stepIndex: i,
            label: act.label,
            fieldPath: 'recoveryState',
            expected: exp.recoveryState ?? null,
            actual: act.recoveryState ?? null,
            message: `recoveryState presence mismatch at step ${i} (${act.label})`,
          });
        } else {
          this.assertExact(diffs, scenarioId, i, act.label, 'recoveryState.isRecovering', exp.recoveryState.isRecovering, act.recoveryState.isRecovering);
          this.assertExact(diffs, scenarioId, i, act.label, 'recoveryState.deathType', exp.recoveryState.deathType, act.recoveryState.deathType);
          this.assertTolerance(diffs, scenarioId, i, act.label, 'recoveryState.shieldRemaining', exp.recoveryState.shieldRemaining, act.recoveryState.shieldRemaining, 0.1);
        }
      }

      if (exp.timerState && act.timerState) {
        this.assertExact(diffs, scenarioId, i, act.label, 'timerState.isExpired', exp.timerState.isExpired, act.timerState.isExpired);
        this.assertTolerance(diffs, scenarioId, i, act.label, 'timerState.timeLeft', exp.timerState.timeLeft, act.timerState.timeLeft);
      }

      this.assertExact(diffs, scenarioId, i, act.label, 'pendingTransition', exp.pendingTransition, act.pendingTransition);
    }

    const passed = diffs.length === 0;
    const summary = passed
      ? `Scenario ${scenarioId}: 100% PARITY (${actual.length} observations matched)`
      : `Scenario ${scenarioId}: ${diffs.length} divergence(s) detected.\nFirst divergence: ${diffs[0].message}`;

    return {
      passed,
      scenarioId,
      diffs,
      summary,
    };
  }

  private assertExact(
    diffs: ComparisonDiff[],
    scenarioId: string,
    stepIndex: number,
    label: string,
    fieldPath: string,
    expected: unknown,
    actual: unknown
  ) {
    const isMatch =
      typeof expected === 'object' && expected !== null
        ? JSON.stringify(expected) === JSON.stringify(actual)
        : expected === actual;

    if (!isMatch) {
      diffs.push({
        scenarioId,
        stepIndex,
        label,
        fieldPath,
        expected,
        actual,
        message: `Scenario: ${scenarioId} [step ${stepIndex}: ${label}]\nObservation: ${fieldPath}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`,
      });
    }
  }

  private assertTolerance(
    diffs: ComparisonDiff[],
    scenarioId: string,
    stepIndex: number,
    label: string,
    fieldPath: string,
    expected: number,
    actual: number,
    overrideTol?: number
  ) {
    const tolKey = Object.keys(ParityComparator.TOLERANCES).find((k) => fieldPath.endsWith(k)) || '';
    const tolerance = overrideTol ?? ParityComparator.TOLERANCES[tolKey] ?? 0.5;

    const delta = Math.abs(expected - actual);
    if (delta > tolerance) {
      diffs.push({
        scenarioId,
        stepIndex,
        label,
        fieldPath,
        expected,
        actual,
        tolerance,
        message: `Scenario: ${scenarioId} [step ${stepIndex}: ${label}]\nObservation: ${fieldPath}\nExpected: ${expected}\nActual: ${actual}\nTolerance: ±${tolerance} (delta: ${delta.toFixed(4)})`,
      });
    }
  }
}
