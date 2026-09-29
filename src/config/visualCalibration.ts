/**
 * Visual Calibration — Ambient Target Layer (ATL)
 * Single source of truth. Renderer reads getVisualCalibration() every frame.
 * Calibration Mode: setRuntime (preview) → Apply persists / Cancel restores snapshot.
 */

export interface AmbientTargetCalibration {
  targetNumberScale: number;
  targetNumberOffsetY: number;
  targetNumberOpacity: number;
}

export interface GoalIndicatorCalibration {
  scale: number;
  offsetY: number;
}

export interface VisualCalibrationConfig {
  ambientTarget: AmbientTargetCalibration;
  goalIndicator: GoalIndicatorCalibration;
}

/** Production defaults — paste exported JSON values here after calibration. */
export const DEFAULT_VISUAL_CALIBRATION: VisualCalibrationConfig = {
  ambientTarget: {
    targetNumberScale: 1.2,
    targetNumberOffsetY: 0,
    targetNumberOpacity: 0.1,
  },
  goalIndicator: {
    scale: 0.6,
    offsetY: 54,
  },
};

const STORAGE_KEY = 'zyrxmath_visual_calibration_v2';
export const VISUAL_CONFIG_SCHEMA = 'mathforge-visual-calibration-v1';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function normalizeVisualCalibration(
  raw: Partial<VisualCalibrationConfig> | null | undefined
): VisualCalibrationConfig {
  const a = (raw?.ambientTarget ?? {}) as Partial<AmbientTargetCalibration>;
  const g = (raw?.goalIndicator ?? {}) as Partial<GoalIndicatorCalibration>;
  return {
    ambientTarget: {
      targetNumberScale: clamp(Number(a.targetNumberScale) || 1, 0.5, 2),
      targetNumberOffsetY: clamp(
        Number.isFinite(Number(a.targetNumberOffsetY)) ? Number(a.targetNumberOffsetY) : 0,
        -200,
        200
      ),
      targetNumberOpacity: clamp(Number(a.targetNumberOpacity) || 0.1, 0.05, 1),
    },
    goalIndicator: {
      scale: clamp(Number(g.scale) || 1, 0.5, 4),
      offsetY: clamp(
        Number.isFinite(Number(g.offsetY)) ? Number(g.offsetY) : 0,
        -200,
        200
      ),
    },
  };
}

function cloneConfig(cfg: VisualCalibrationConfig): VisualCalibrationConfig {
  return {
    ambientTarget: { ...cfg.ambientTarget },
    goalIndicator: { ...cfg.goalIndicator },
  };
}

let runtimeConfig: VisualCalibrationConfig = loadVisualCalibrationFromStorage();

export function getVisualCalibration(): VisualCalibrationConfig {
  return runtimeConfig;
}

/** Live preview — does not write localStorage. */
export function setRuntimeVisualCalibration(
  partial: Partial<VisualCalibrationConfig>
): VisualCalibrationConfig {
  runtimeConfig = normalizeVisualCalibration({
    ambientTarget: { ...runtimeConfig.ambientTarget, ...partial.ambientTarget },
    goalIndicator: { ...runtimeConfig.goalIndicator, ...partial.goalIndicator },
  });
  return cloneConfig(runtimeConfig);
}

export function replaceRuntimeVisualCalibration(
  cfg: VisualCalibrationConfig
): VisualCalibrationConfig {
  runtimeConfig = normalizeVisualCalibration(cfg);
  return cloneConfig(runtimeConfig);
}

export function persistVisualCalibration(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runtimeConfig));
  } catch { /* ignore */ }
}

export function setVisualCalibration(
  partial: Partial<VisualCalibrationConfig>
): VisualCalibrationConfig {
  const next = setRuntimeVisualCalibration(partial);
  persistVisualCalibration();
  return next;
}

export function restoreProductionDefaults(): VisualCalibrationConfig {
  runtimeConfig = normalizeVisualCalibration(DEFAULT_VISUAL_CALIBRATION);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
  return cloneConfig(runtimeConfig);
}

export function resetVisualCalibrationToDefaults(): VisualCalibrationConfig {
  runtimeConfig = normalizeVisualCalibration(DEFAULT_VISUAL_CALIBRATION);
  return cloneConfig(runtimeConfig);
}

export function loadVisualCalibrationFromStorage(): VisualCalibrationConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeVisualCalibration(JSON.parse(raw));
  } catch { /* ignore */ }
  return normalizeVisualCalibration(DEFAULT_VISUAL_CALIBRATION);
}

export function loadVisualCalibration(): VisualCalibrationConfig {
  return loadVisualCalibrationFromStorage();
}

export function exportVisualCalibrationJson(
  cfg: VisualCalibrationConfig = runtimeConfig
): string {
  return JSON.stringify(
    {
      schema: VISUAL_CONFIG_SCHEMA,
      ambientTarget: {
        targetNumberScale: cfg.ambientTarget.targetNumberScale,
        targetNumberOffsetY: cfg.ambientTarget.targetNumberOffsetY,
        targetNumberOpacity: cfg.ambientTarget.targetNumberOpacity,
      },
      goalIndicator: {
        scale: cfg.goalIndicator.scale,
        offsetY: cfg.goalIndicator.offsetY,
      },
    },
    null,
    2
  );
}

export function importVisualCalibrationJson(json: string): VisualCalibrationConfig | null {
  try {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    runtimeConfig = normalizeVisualCalibration(parsed);
    return cloneConfig(runtimeConfig);
  } catch {
    return null;
  }
}

export function resetVisualCalibration(): VisualCalibrationConfig {
  return restoreProductionDefaults();
}

export function saveVisualCalibration(cfg: VisualCalibrationConfig): void {
  runtimeConfig = normalizeVisualCalibration(cfg);
  persistVisualCalibration();
}

export function applyVisualCalibrationFromJson(json: string): VisualCalibrationConfig {
  const next = importVisualCalibrationJson(json);
  if (!next) throw new Error('Invalid visual calibration JSON');
  persistVisualCalibration();
  return next;
}
