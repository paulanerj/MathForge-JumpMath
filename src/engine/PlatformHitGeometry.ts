/**
 * PLATFORM HIT GEOMETRY & VIEWPORT COORDINATE AUTHORITY (R1)
 *
 * Implements the semantic invariant:
 * VISIBLE PLATFORM BODY ≈ MINIMUM INTERACTION GEOMETRY
 *
 * Guarantees:
 * 1. Touching or clicking ANY visible pixel of the selectable platform selects that platform.
 * 2. Hit geometry is derived from authoritative platform shape definitions.
 * 3. Text/label geometry does NOT participate in or restrict the hitbox.
 * 4. Modest centralized touch tolerance for mobile accessibility.
 * 5. Deterministic overlap resolution: visual-body containment strictly takes precedence
 *    over tolerance-only containment, with distance to center tie-breaking.
 */

import { Platform } from '../types';
import { RealmSpec, realmForLevel } from '../visual/realms';

export interface PlatformVisualBounds {
  shape: RealmSpec['platform'];
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface PlatformHitResult {
  isInsideVisualBody: boolean;
  isInsideTolerance: boolean;
  distToCenter: number;
  bounds: PlatformVisualBounds;
}

/** Authoritative visual half-width defined in Renderer / worldDraw */
export const VISUAL_PLATFORM_HW = 64;

/**
 * Returns the exact bounding extents and geometry descriptor for a platform in world space.
 */
export function getPlatformVisualBounds(platform: Platform, shape: RealmSpec['platform']): PlatformVisualBounds {
  const hw = VISUAL_PLATFORM_HW;
  const x = platform.x;
  const y = platform.y;

  switch (shape) {
    case 'disc': {
      const rx = hw * 0.72; // 46.08
      const ry = 28;
      return {
        shape,
        centerX: x,
        centerY: y,
        width: rx * 2,
        height: ry * 2,
        minX: x - rx,
        maxX: x + rx,
        minY: y - ry,
        maxY: y + ry,
      };
    }
    case 'ring': {
      const rx = hw * 0.8; // 51.2
      const ry = 30;
      return {
        shape,
        centerX: x,
        centerY: y,
        width: rx * 2,
        height: ry * 2,
        minX: x - rx,
        maxX: x + rx,
        minY: y - ry,
        maxY: y + ry,
      };
    }
    case 'hex': {
      const rx = hw * 0.82; // 52.48
      const ry = 26;
      // Hexagon vertex bounds: width is 2 * (rx * cos(30 deg)) = rx * sqrt(3) ~= 90.9
      const hexW = rx * Math.sqrt(3);
      return {
        shape,
        centerX: x,
        centerY: y,
        width: hexW,
        height: ry * 2,
        minX: x - hexW / 2,
        maxX: x + hexW / 2,
        minY: y - ry,
        maxY: y + ry,
      };
    }
    case 'narrow': {
      const w = hw * 1.1; // 70.4
      const h = 36;
      return {
        shape,
        centerX: x,
        centerY: y,
        width: w,
        height: h,
        minX: x - w / 2,
        maxX: x + w / 2,
        minY: y - h / 2,
        maxY: y + h / 2,
      };
    }
    case 'split': {
      // Two lobes spanning [x - 64, x + 64] with height 32
      const w = hw * 2; // 128
      const h = 32;
      return {
        shape,
        centerX: x,
        centerY: y,
        width: w,
        height: h,
        minX: x - hw,
        maxX: x + hw,
        minY: y - 16,
        maxY: y + 16,
      };
    }
    default: {
      // Standard slab: roundRect(x - hw, y - 22, hw * 2, 40, 10)
      const w = hw * 2; // 128
      const h = 40;
      const centerY = y - 2; // y - 22 to y + 18 has center at y - 2
      return {
        shape: 'slab' as any,
        centerX: x,
        centerY,
        width: w,
        height: h,
        minX: x - hw,
        maxX: x + hw,
        minY: y - 22,
        maxY: y + 18,
      };
    }
  }
}

/**
 * Evaluates whether a world coordinate (worldX, worldY) hits a platform's visual body
 * or lies within its mobile touch tolerance.
 */
export function testPlatformHit(
  worldX: number,
  worldY: number,
  platform: Platform,
  shape: RealmSpec['platform'],
  touchTolerance: number = 8
): PlatformHitResult {
  const bounds = getPlatformVisualBounds(platform, shape);
  const dx = worldX - platform.x;
  const dy = worldY - platform.y;
  const distToCenter = Math.hypot(dx, dy);

  let isInsideVisualBody = false;
  let isInsideTolerance = false;
  const hw = VISUAL_PLATFORM_HW;

  switch (shape) {
    case 'disc': {
      const rx = hw * 0.72; // 46.08
      const ry = 28;
      const normDist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      isInsideVisualBody = normDist <= 1.0;

      const rxTol = rx + touchTolerance;
      const ryTol = ry + touchTolerance;
      const tolDist = (dx * dx) / (rxTol * rxTol) + (dy * dy) / (ryTol * ryTol);
      isInsideTolerance = tolDist <= 1.0;
      break;
    }

    case 'ring': {
      const rx = hw * 0.8; // 51.2
      const ry = 30;
      const normDist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
      isInsideVisualBody = normDist <= 1.0;

      const rxTol = rx + touchTolerance;
      const ryTol = ry + touchTolerance;
      const tolDist = (dx * dx) / (rxTol * rxTol) + (dy * dy) / (ryTol * ryTol);
      isInsideTolerance = tolDist <= 1.0;
      break;
    }

    case 'hex': {
      const rx = hw * 0.82; // 52.48
      const ry = 26;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      // Normalized coordinates: max X vertex is at rx * sqrt(3)/2 = 0.866 * rx
      const halfW = rx * (Math.sqrt(3) / 2);
      if (absX <= halfW && absY <= ry) {
        // Hexagonal slant condition: Y intercept is ry, slope is ry / (rx * sqrt(3))
        isInsideVisualBody = (absX / (rx * Math.sqrt(3))) + (absY / ry) <= 1.0;
      }
      const halfWTol = halfW + touchTolerance;
      const ryTol = ry + touchTolerance;
      if (absX <= halfWTol && absY <= ryTol) {
        isInsideTolerance = (absX / ((rx + touchTolerance) * Math.sqrt(3))) + (absY / ryTol) <= 1.0;
      }
      break;
    }

    case 'narrow': {
      const halfW = (hw * 1.1) / 2; // 35.2
      const halfH = 18;
      const r = 8;
      isInsideVisualBody = isPointInRoundRect(dx, dy, halfW, halfH, r);
      isInsideTolerance = isPointInRoundRect(dx, dy, halfW + touchTolerance, halfH + touchTolerance, r + touchTolerance);
      break;
    }

    case 'split': {
      // Two lobes: [x - 64, x - 24.32] and [x + 24.32, x + 64] with center fill [x - 30, x + 30]
      // Full visual span is [x - 64, x + 64], height 32, vertical offset [-16, 16]
      const halfW = hw; // 64
      const halfH = 16;
      const r = 8;
      isInsideVisualBody = isPointInRoundRect(dx, dy, halfW, halfH, r);
      isInsideTolerance = isPointInRoundRect(dx, dy, halfW + touchTolerance, halfH + touchTolerance, r + touchTolerance);
      break;
    }

    default: {
      // Standard slab: roundRect(x - hw, y - 22, hw * 2, 40, 10)
      // Visual center is at (x, y - 2)
      const halfW = hw; // 64
      const halfH = 20;
      const r = 10;
      const relY = dy + 2; // offset by 2px because visual center is at y - 2
      isInsideVisualBody = isPointInRoundRect(dx, relY, halfW, halfH, r);
      isInsideTolerance = isPointInRoundRect(dx, relY, halfW + touchTolerance, halfH + touchTolerance, r + touchTolerance);
      break;
    }
  }

  return {
    isInsideVisualBody,
    isInsideTolerance: isInsideVisualBody || isInsideTolerance,
    distToCenter,
    bounds,
  };
}

/**
 * Standard 2D point-in-rounded-rectangle containment check centered at (0, 0).
 */
function isPointInRoundRect(dx: number, dy: number, halfW: number, halfH: number, r: number): boolean {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax > halfW || ay > halfH) return false;
  if (ax <= halfW - r || ay <= halfH - r) return true;
  const cx = ax - (halfW - r);
  const cy = ay - (halfH - r);
  return cx * cx + cy * cy <= r * r;
}

/**
 * Converts screen client coordinates (from mouse or touch event) to exact
 * canvas local coordinates, accounting for CSS object-fit: contain scaling and letterboxing.
 */
export function clientToCanvasCoords(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number
): { lx: number; ly: number; inBounds: boolean } {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return { lx: 0, ly: 0, inBounds: false };
  }

  const canvasW = canvas.width || 500;
  const canvasH = canvas.height || 800;

  const lx = (clientX - rect.left) * (canvasW / rect.width);
  const ly = (clientY - rect.top) * (canvasH / rect.height);
  const inBounds = lx >= 0 && lx <= canvasW && ly >= 0 && ly <= canvasH;

  return { lx, ly, inBounds };
}

/**
 * Resolves platform selection deterministically from candidate hit results.
 * Rule:
 * 1. Visual-body containment strictly takes precedence over tolerance-only containment.
 * 2. If multiple platforms hit visual body (or multiple in tolerance), pick closest to center.
 * 3. Platform ID serves as final deterministic tie-breaker.
 */
export function resolvePlatformSelection(
  candidates: { platform: Platform; hit: PlatformHitResult }[]
): { platform: Platform; hit: PlatformHitResult } | null {
  const valid = candidates.filter((c) => c.hit.isInsideTolerance);
  if (valid.length === 0) return null;

  valid.sort((a, b) => {
    // Priority 1: Visual body containment
    if (a.hit.isInsideVisualBody && !b.hit.isInsideVisualBody) return -1;
    if (!a.hit.isInsideVisualBody && b.hit.isInsideVisualBody) return 1;

    // Priority 2: Distance to platform center
    const distDiff = a.hit.distToCenter - b.hit.distToCenter;
    if (Math.abs(distDiff) > 0.001) return distDiff;

    // Priority 3: Deterministic platform ID tie-breaker
    return a.platform.id.localeCompare(b.platform.id);
  });

  return valid[0];
}
