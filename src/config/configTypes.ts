export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export interface GameplayConfig {
  winCondition: number;
  turnTimeLimit: number;
  hintTimeRatio: number;
  moodDangerRatio: number;
  moodCriticalRatio: number;
  maxDeltaTime: number;
  platformPruneThreshold: number;
  platformPruneRowsBehind: number;
}

export interface JumpConfig {
  jumpSpeed: number;
  arcKeyframe1: number;
  arcKeyframe2: number;
  squashY: number;
  stretchX: number;
  apexHeight: number;
  bounceDuration: number;
  bounceHoldFrames: number;
  bounceApexHeight: number;
  bounceRotAmplitude: number;
  bounceSquashY: number;
  bounceStretchX: number;
  bounceLandSx: number;
  bounceLandSy: number;
}

export interface PlatformConfig {
  width: number;
  height: number;
  gapX: number;
  gapY: number;
  initialSpawnRows: number;
  impactDuration: number;
  impactParticleCount: number;
}

export interface WaveConfig {
  spawnDistanceBehind: number;
  baseSpeed: number;
  proximityCollisionDist: number;
  warningDistance: number;
  warningHeightFactor: number;
}

export interface CameraConfig {
  lerpRateX: number;
  lerpRateY: number;
  targetOffsetY: number;
  shakeDecay: number;
  chromaSplitDecay: number;
}

export interface FlowConfig {
  comboThreshold: number;
  minTimeLeft: number;
  bgSpeedMultiplier: number;
  heartbeatInterval: number;
}

export interface CatastropheConfig {
  shardGravity: number;
  voidSpeed: number;
}

export interface AudioConfig {
  masterMusicGain: number;
  masterDroneGain: number;
  defaultTempo: number;
  filterFreqClosed: number;
  filterFreqFlow: number;
  filterFreqPanic: number;
  heartbeatGain: number;
  heartbeatInterval: number;
  panicTickInterval: number;
}

export interface PlayerConfig {
  trailDecayNormal: number;
  trailDecayFlow: number;
  particleGravity: number;
  particleLifeDecay: number;
}

export interface ZyxConfig {
  readonly schemaVersion: 1;
  readonly gameplay: GameplayConfig;
  readonly jump: JumpConfig;
  readonly platform: PlatformConfig;
  readonly wave: WaveConfig;
  readonly camera: CameraConfig;
  readonly flow: FlowConfig;
  readonly catastrophe: CatastropheConfig;
  readonly audio: AudioConfig;
  readonly player: PlayerConfig;
}
