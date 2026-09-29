/**
 * Physical shock front and screen-space atmosphere.
 * The front's world position is the wave. The camera only projects it.
 * The player changes threat, not the front's world position.
 */

export const PLASMA_LAB_GAPS = {
  distant: 900,
  approaching: 700,
  warning: 520,
  danger: 90,
  collision: 26,
} as const;

export type PlasmaLabState = keyof typeof PLASMA_LAB_GAPS;

/** Fixed world offset from the physical wave to the painted leading edge. */
export const SHOCK_FRONT_WORLD_OFFSET = 0;

/** Signature look. Realms do not replace these. */
export const PLASMA_PRESENTATION = {
  heat: {
    white: 'rgba(255, 255, 255, 0.9)',
    orange: 'rgba(255, 120, 0, 0.85)',
    red: 'rgba(255, 60, 0, 0.55)',
    purple: 'rgba(40, 0, 80, 0.35)',
    clear: 'rgba(40, 0, 80, 0)',
  },
  crest: {
    haze: 'rgba(255,90,0,0.42)',
    hazeMid: 'rgba(200,30,0,0.22)',
    hazeEnd: 'rgba(60,0,0,0)',
    gold: 'rgba(255,200,60,0.55)',
    red: 'rgba(255,80,0,0.40)',
    bodyEnd: 'rgba(90,0,0,0.10)',
    edge: '#ffffff',
    glow: '#ff4400',
    edgeWidth: 3.5,
    glowBlur: 26,
    body: 260,
    rollA: 9,
    rollB: 5,
  },
} as const;

export interface PlasmaPresentationInput {
  waveY: number;
  playerY: number;
  cameraY: number;
  viewportHeight: number;
  spawnDistance: number;
  collisionDistance: number;
  warningDistance: number;
}

export interface PlasmaPresentation {
  physicalGap: number;
  distance100: number;
  physical: {
    worldY: number;
    screenY: number;
    visible: boolean;
    bodyTop: number;
    bodyBottom: number;
    viewportBottom: number;
    distBelowViewport: number;
  };
  atmosphere: {
    threat01: number;
    heatIntensity: number;
    glowIntensity: number;
    warningIntensity: number;
    viewportCoverage: number;
  };
}

/** The only world-to-screen conversion for the plasma wall. */
export function worldToScreenY(worldY: number, cameraY: number, viewportHeight: number): number {
  return viewportHeight / 2 - cameraY + worldY;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function derivePlasmaPresentation(input: PlasmaPresentationInput): PlasmaPresentation {
  const gap = input.waveY - input.playerY;
  const spawn = Math.max(1, input.spawnDistance);
  const collision = input.collisionDistance;
  const span = Math.max(1, spawn - collision);
  const threat01 = clamp01((spawn - gap) / span);
  const shockWorldY = input.waveY + SHOCK_FRONT_WORLD_OFFSET;
  const screenY = worldToScreenY(shockWorldY, input.cameraY, input.viewportHeight);
  const body = PLASMA_PRESENTATION.crest.body;
  const bodyTop = screenY;
  const bodyBottom = screenY + body;
  const visible = bodyBottom > 0 && bodyTop < input.viewportHeight;
  const distBelowViewport = screenY - input.viewportHeight;
  return {
    physicalGap: gap,
    distance100: Math.max(0, Math.min(100, (gap / spawn) * 100)),
    physical: {
      worldY: shockWorldY,
      screenY,
      visible,
      bodyTop,
      bodyBottom,
      viewportBottom: input.viewportHeight,
      distBelowViewport,
    },
    atmosphere: {
      threat01,
      heatIntensity: 0.34 + 0.66 * threat01,
      glowIntensity: 0.2 + 0.8 * threat01,
      warningIntensity: clamp01((spawn - gap) / Math.max(1, spawn - input.warningDistance)),
      viewportCoverage: 0.1 + 0.28 * threat01,
    },
  };
}
