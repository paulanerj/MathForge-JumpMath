/**
 * Semantic event → family / bus mapping.
 * Game code emits IDs; SoundEngine resolves playback.
 */

import type { SoundBusId } from './soundLanguage';

export type SoundEventId =
  | 'world.enter'
  | 'contact.select'
  | 'motion.depart'
  | 'math.resolve'
  | 'math.resolve.fluent'
  | 'math.nonresolve'
  | 'progress.level_clear'
  | 'state.death'
  | 'state.pause'
  | 'state.resume'
  | 'ambience.bed'
  | 'momentum.pulse'
  | 'pressure.tick';

export interface SoundEventDef {
  id: SoundEventId;
  family:
    | 'touch'
    | 'motion'
    | 'arrival'
    | 'resolution'
    | 'nonresolution'
    | 'progression'
    | 'transition'
    | 'ambience'
    | 'momentum'
    | 'ui';
  bus: SoundBusId;
  performanceResponsive: boolean;
  notes?: string;
}

export const SOUND_MANIFEST: Record<SoundEventId, SoundEventDef> = {
  'world.enter': {
    id: 'world.enter',
    family: 'transition',
    bus: 'transition',
    performanceResponsive: false,
  },
  'contact.select': {
    id: 'contact.select',
    family: 'touch',
    bus: 'interaction',
    performanceResponsive: false,
  },
  'motion.depart': {
    id: 'motion.depart',
    family: 'motion',
    bus: 'interaction',
    performanceResponsive: false,
  },
  'math.resolve': {
    id: 'math.resolve',
    family: 'resolution',
    bus: 'gameplay',
    performanceResponsive: true,
  },
  'math.resolve.fluent': {
    id: 'math.resolve.fluent',
    family: 'resolution',
    bus: 'gameplay',
    performanceResponsive: true,
  },
  'math.nonresolve': {
    id: 'math.nonresolve',
    family: 'nonresolution',
    bus: 'gameplay',
    performanceResponsive: true,
  },
  'progress.level_clear': {
    id: 'progress.level_clear',
    family: 'progression',
    bus: 'transition',
    performanceResponsive: true,
  },
  'state.death': {
    id: 'state.death',
    family: 'nonresolution',
    bus: 'transition',
    performanceResponsive: false,
  },
  'state.pause': {
    id: 'state.pause',
    family: 'ui',
    bus: 'master',
    performanceResponsive: false,
  },
  'state.resume': {
    id: 'state.resume',
    family: 'ui',
    bus: 'master',
    performanceResponsive: false,
  },
  'ambience.bed': {
    id: 'ambience.bed',
    family: 'ambience',
    bus: 'ambience',
    performanceResponsive: false,
  },
  'momentum.pulse': {
    id: 'momentum.pulse',
    family: 'momentum',
    bus: 'musical',
    performanceResponsive: true,
  },
  'pressure.tick': {
    id: 'pressure.tick',
    family: 'momentum',
    bus: 'musical',
    performanceResponsive: true,
  },
};

export interface PlayContext {
  /** 0–1 continuous fluency (SoundEngine momentum). */
  momentum?: number;
  /** Legacy/coarse: treat as fluent resolve. */
  fluent?: boolean;
  /** Optional math mode id for future coloration. */
  modeId?: string;
  /** Death type passthrough. */
  deathType?: string;
}
