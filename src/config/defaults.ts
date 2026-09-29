import { ZyxConfig } from './configTypes';

function deepFreeze<T>(obj: T): T {
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const val = (obj as any)[prop];
    if (
      val !== null &&
      (typeof val === 'object' || typeof val === 'function') &&
      !Object.isFrozen(val)
    ) {
      deepFreeze(val);
    }
  });
  return obj;
}

export const DEFAULT_ZYX_CONFIG: ZyxConfig = deepFreeze({
  schemaVersion: 1,
  gameplay: {
    winCondition: 10,
    turnTimeLimit: 10.0,
    hintTimeRatio: 0.50,
    moodDangerRatio: 0.50,
    moodCriticalRatio: 0.20,
    maxDeltaTime: 0.10,
    platformPruneThreshold: 50,
    platformPruneRowsBehind: 5,
  },
  jump: {
    jumpSpeed: 1.25,
    arcKeyframe1: 0.42,
    arcKeyframe2: 0.60,
    squashY: 0.40,
    stretchX: 0.20,
    apexHeight: 220,
    bounceDuration: 0.42,
    bounceHoldFrames: 9,
    bounceApexHeight: 90,
    bounceRotAmplitude: 0.35,
    bounceSquashY: 0.25,
    bounceStretchX: 0.15,
    bounceLandSx: 1.45,
    bounceLandSy: 0.55,
  },
  platform: {
    width: 120,
    height: 50,
    gapX: 140,
    gapY: 220,
    initialSpawnRows: 10,
    impactDuration: 0.15,
    impactParticleCount: 15,
  },
  wave: {
    spawnDistanceBehind: 900,
    baseSpeed: 28.0,
    proximityCollisionDist: 26,
    warningDistance: 520,
    warningHeightFactor: 300,
  },
  camera: {
    lerpRateX: 5.0,
    lerpRateY: 5.0,
    targetOffsetY: 150,
    shakeDecay: 0.90,
    chromaSplitDecay: 1.4,
  },
  flow: {
    comboThreshold: 10,
    minTimeLeft: 5.0,
    bgSpeedMultiplier: 1.8,
    heartbeatInterval: 0.50,
  },
  catastrophe: {
    shardGravity: 800,
    voidSpeed: 3.2,
  },
  audio: {
    masterMusicGain: 0.40,
    masterDroneGain: 0.20,
    defaultTempo: 130,
    filterFreqClosed: 400,
    filterFreqFlow: 1200,
    filterFreqPanic: 2500,
    heartbeatGain: 0.60,
    heartbeatInterval: 0.50,
    panicTickInterval: 0.08,
  },
  player: {
    trailDecayNormal: 3.5,
    trailDecayFlow: 1.5,
    particleGravity: 600,
    particleLifeDecay: 2.0,
  },
});
