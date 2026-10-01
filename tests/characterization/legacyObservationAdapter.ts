/**
 * LEGACY OBSERVATION ADAPTER
 *
 * Maps current R2 GameEngine state into the pure CanonicalObservation schema.
 * Observational only; never mutates engine state.
 */

import { GameEngine } from '../../src/engine/GameEngine';
import { CanonicalObservation, CanonicalPlatformObservation, CanonicalDomainEvent } from './canonicalObservation';

export class LegacyObservationAdapter {
  private eventHistory: CanonicalDomainEvent[] = [];
  private eventSeq: number = 0;

  recordEvent(type: string, payload: Record<string, unknown> = {}) {
    this.eventSeq++;
    this.eventHistory.push({
      seq: this.eventSeq,
      type,
      payload: { ...payload },
    });
  }

  getEvents(): CanonicalDomainEvent[] {
    return [...this.eventHistory];
  }

  resetEvents() {
    this.eventHistory = [];
    this.eventSeq = 0;
  }

  captureObservation(
    engine: GameEngine,
    scenarioId: string,
    stepIndex: number,
    label: string
  ): CanonicalObservation {
    const { state, camera } = engine;
    const currentRow = state.zyx.currentRow;
    const actionableRow = currentRow + 1;

    // Filter actionable row platforms
    const actionablePlatforms = engine.platformManager.platforms
      .filter((p) => p.rowIdx === actionableRow)
      .map((p): CanonicalPlatformObservation => ({
        id: p.id,
        rowIdx: p.rowIdx,
        val: p.val,
        isCorrect: p.isCorrect,
        shattered: !!p.shattered,
        worldX: Math.round(p.x * 100) / 100,
        worldY: Math.round(p.y * 100) / 100,
      }));

    // Active challenge from lookahead
    let activeChallenge: CanonicalObservation['activeChallenge'] = undefined;
    try {
      const ch = (engine as any).mathEngine?.getChallengeForRow(actionableRow);
      if (ch) {
        activeChallenge = {
          id: ch.id,
          prompt: ch.prompt,
          correctAnswer: ch.correctAnswer,
          optionCount: ch.options.length,
        };
      }
    } catch {
      // Non-fatal if lookahead row is past maxRows
    }

    // Actionable row framing evaluation
    const framingEval = engine.evaluateActionableRowFraming();

    const waveY = state.wave ? Math.round(state.wave.y * 100) / 100 : 0;
    const waveSpeed = state.wave ? state.wave.speed : 0;
    const gapToPlayer = state.wave ? Math.round((state.zyx.y - state.wave.y) * 100) / 100 : 0;

    return {
      scenarioId,
      stepIndex,
      label,
      session: {
        status: (state.status || 'ready') as any,
        score: state.score,
        streak: state.streak,
        timeLeft: Math.round(state.timeLeft * 100) / 100,
        levelIndex: engine.levelIndex,
        levelId: state.schema.id,
      },
      player: {
        currentRow: state.zyx.currentRow,
        x: Math.round(state.zyx.x * 100) / 100,
        y: Math.round(state.zyx.y * 100) / 100,
        jumping: !!state.zyx.jumping,
        bouncing: !!state.zyx.bouncing,
        falling: !!state.zyx.falling,
      },
      camera: {
        x: Math.round(camera.x * 100) / 100,
        y: Math.round(camera.y * 100) / 100,
      },
      plasma: {
        waveY,
        speed: waveSpeed,
        gapToPlayer,
        shieldActive: engine.plasmaShield > 0,
      },
      activeChallenge,
      actionableRowPlatforms: actionablePlatforms,
      framing: {
        isFramedCorrectly: framingEval.isFramedCorrectly,
        nextRowMinX: Math.round(framingEval.nextRowBounds.minX * 100) / 100,
        nextRowMaxX: Math.round(framingEval.nextRowBounds.maxX * 100) / 100,
      },
      safePose: (engine as any).safePose
        ? {
            x: Math.round((engine as any).safePose.x * 100) / 100,
            y: Math.round((engine as any).safePose.y * 100) / 100,
            row: (engine as any).safePose.row,
            val: (engine as any).safePose.val,
          }
        : null,
      travelPreview: (engine as any).travelPreview ?? null,
      recoveryState: {
        isRecovering: (engine as any).state.status === 'DYING',
        shieldRemaining: Math.round(engine.plasmaShield * 100) / 100,
        deathType: (engine as any).state.deathType,
      },
      timerState: {
        timeLeft: Math.round(state.timeLeft * 100) / 100,
        isExpired: state.timeLeft <= 0,
      },
      pendingTransition: (engine as any).completionPosted
        ? 'LEVEL_COMPLETE'
        : (engine as any).state.status === 'DYING'
        ? 'DEATH'
        : null,
      domainEvents: this.getEvents(),
    };
  }
}
