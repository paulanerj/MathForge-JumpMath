/**
 * Phase 2 — MathForge sonic language lock.
 * Constraints for all synthesis / future assets. Not Monument Valley; original identity.
 */

export const SOUND_LANGUAGE = {
  schema: 'mathforge-sound-language-v1',

  /** Aesthetic keywords (design intent). */
  identity: [
    'digital',
    'organic',
    'tactile',
    'spatial',
    'calm',
    'musical',
    'slightly-mysterious',
    'mathematical',
  ] as const,

  /** Forbidden tropes — do not synthesize toward these. */
  forbid: [
    'coin',
    'casino',
    'slot-machine',
    '8-bit-bleep',
    'piercing-beep',
    'reward-chirp',
    'sparkle-jingle',
    'whistle',
    'generic-bell-reward',
    'cartoon-boing',
    'exaggerated-swoosh',
    'error-buzzer',
    'harsh-failure',
    'laser',
    'fanfare',
    'children-app-reward',
  ] as const,

  /**
   * Restricted pitch collection (Hz at A4=440).
   * Pedal-friendly set: D3–A4 region preferred for interaction/resolve.
   */
  pitchHz: {
    D3: 146.83,
    F3: 174.61,
    G3: 196.0,
    A3: 220.0,
    C4: 261.63,
    D4: 293.66,
    F4: 349.23,
    G4: 392.0,
    A4: 440.0,
  },

  /** Prefer low–mid; avoid bright highs as primary energy. */
  register: {
    ambienceMaxHz: 180,
    interactionCenterHz: 220,
    resolveCenterHz: 294,
    pressureMaxHz: 480,
    absoluteAvoidAboveHz: 2000,
  },

  /** Relative mix intent (not absolute gain). */
  intensity: {
    preferComplexityOverLoudness: true,
    maxTransientGain: 0.35,
    ambienceCeiling: 0.22,
  },

  variation: {
    pitchCents: 18,
    gainDb: 1.5,
    timingMs: 12,
  },
} as const;

export type SoundBusId =
  | 'master'
  | 'ambience'
  | 'interaction'
  | 'gameplay'
  | 'musical'
  | 'transition';
