import { PlatformConfig } from '../config/configTypes';
import { DEFAULT_ZYX_CONFIG } from '../config/defaults';
import { Platform, Vector2D } from '../types';
import { MathAnswerOption } from '../math/mathTypes';

export interface RowPresentationPayload {
  rowIdx: number;
  options: MathAnswerOption[];
  challengeId?: string;
  nextZyxVal?: number;
}

/**
 * PlatformManager is strictly responsible for spatial platform presentation:
 * - Geometry & spacing calculations
 * - Lane distribution along orthogonal progression vectors
 * - Physical Platform entity creation
 * - Platform lifecycle & pruning
 *
 * It is completely mathematically ignorant:
 * It contains NO math engine fallback, computes no arithmetic,
 * calculates no answers, and places only already-prepared options in space.
 */
export class PlatformManager {
  platforms: Platform[] = [];
  rowCursor: number = 1; // start spawning at row 1
  config: PlatformConfig;

  constructor(config: PlatformConfig = DEFAULT_ZYX_CONFIG.platform) {
    this.config = config;
  }

  get gapY(): number {
    return this.config.gapY;
  }

  get gapX(): number {
    return this.config.gapX;
  }

  /**
   * Resets platform state to empty at row cursor 1.
   */
  reset(): void {
    this.platforms = [];
    this.rowCursor = 1;
  }

  /**
   * Optional presentation batch initialization using prepared payloads only.
   */
  init(
    payloads?: RowPresentationPayload[],
    progressionVector: Vector2D = { x: 0, y: -1 }
  ): void {
    this.reset();
    if (payloads && Array.isArray(payloads)) {
      for (const payload of payloads) {
        this.spawnRowFromPayload(payload, progressionVector);
      }
    }
  }

  /**
   * Places a row of platforms in space with already-prepared answer options.
   * PlatformManager is completely mathematically ignorant.
   */
  spawnRow(
    rowIdx: number,
    progressionVector: Vector2D,
    options: MathAnswerOption[],
    challengeId?: string,
    nextZyxVal?: number
  ): void {
    const mag = Math.hypot(progressionVector.x, progressionVector.y) || 1;
    const pv = { x: progressionVector.x / mag, y: progressionVector.y / mag };
     
    const baseY = rowIdx * pv.y * this.gapY;
    const baseX = rowIdx * pv.x * this.gapY;
    
    const ox = -pv.y;
    const oy = pv.x;

    const pW = this.config.width;
    const pH = this.config.height;

    for (let i = 0; i < options.length; i++) {
      const offset = i - 1; // -1, 0, 1 spread along orthogonal vector
      const px = baseX + ox * offset * this.gapX;
      const py = baseY + oy * offset * this.gapX;
      const opt = options[i];
      const numVal = typeof opt.value === 'number' ? opt.value : (Number(opt.value) || 0);

      this.platforms.push({
        id: `r${rowIdx}_p${i}`,
        rowIdx,
        x: px,
        y: py,
        width: pW,
        height: pH,
        val: numVal,
        isCorrect: opt.isCorrect,
        optionId: opt.id,
        challengeId,
        errorModel: opt.errorModel,
        nextZyxVal: opt.isCorrect ? nextZyxVal : undefined,
      });
    }

    this.rowCursor = Math.max(this.rowCursor, rowIdx + 1);
  }

  /**
   * Convenience method to spawn a row from a RowPresentationPayload.
   */
  spawnRowFromPayload(
    payload: RowPresentationPayload,
    progressionVector: Vector2D
  ): void {
    this.spawnRow(
      payload.rowIdx,
      progressionVector,
      payload.options,
      payload.challengeId,
      payload.nextZyxVal
    );
  }
}

