/**
 * SCENARIO MODEL SPECIFICATION
 *
 * Defines deterministic, repeatable characterization scenarios for testing
 * JumpMath runtime behavior against golden reference oracles.
 */

export type ScenarioCategory =
  | 'APP_SESSION'
  | 'MATH'
  | 'PLATFORM'
  | 'PLAYER'
  | 'PLASMA'
  | 'TIMER'
  | 'CAMPAIGN'
  | 'REVIEW'
  | 'SETTINGS'
  | 'MOBILE';

export type ScenarioStep =
  | { type: 'ADVANCE_TIME'; dt: number; steps?: number }
  | { type: 'SELECT_PLATFORM_AT'; clientX: number; clientY: number }
  | { type: 'SELECT_CORRECT_ANSWER'; rowIdx: number }
  | { type: 'SELECT_WRONG_ANSWER'; rowIdx: number }
  | { type: 'TRIGGER_DEATH'; cause: 'wave' | 'timer' }
  | { type: 'RESIZE_VIEWPORT'; width: number; height: number }
  | { type: 'CAPTURE_OBSERVATION'; label: string };

export interface CharacterizationScenario {
  id: string;
  name: string;
  category: ScenarioCategory;
  description: string;
  levelId: string;
  seed: number;
  viewport: { width: number; height: number; dpr: number };
  initialSettings?: {
    reviewMode?: boolean;
    reviewUnlockAllLevels?: boolean;
    muted?: boolean;
    telemetryEnabled?: boolean;
  };
  steps: ScenarioStep[];
}
