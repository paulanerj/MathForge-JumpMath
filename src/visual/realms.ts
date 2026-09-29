/** Grammar is frozen. New motifs are not added. Fixes are contrast and deletions only. */
export const VISUAL_GRAMMAR_FROZEN = true;

export type RealmId = 'lattice' | 'orbital' | 'field' | 'signal' | 'plasma' | 'quantum';
export type PlatformShape = 'bar' | 'disc' | 'narrow' | 'split' | 'ring' | 'hex';
export type CrestStyle = 'smooth' | 'ridged' | 'fringed' | 'filament' | 'scan' | 'doubled';
export type MotifId = 'lattice' | 'shell' | 'field' | 'grid' | 'scan' | 'filament' | 'fringe' | 'ring';

export interface RealmSpec {
  id: RealmId;
  platform: PlatformShape;
  crest: CrestStyle;
  far: [MotifId, MotifId];
  sky: { top: string; mid: string; base: string };
  structure: string;
  accent: string;
  plasma: string;
}

export const REALMS: Record<RealmId, RealmSpec> = {
  lattice: {
    id: 'lattice',
    platform: 'bar',
    crest: 'smooth',
    far: ['lattice', 'ring'],
    sky: { top: '#101628', mid: '#070814', base: '#04040c' },
    structure: '#8fd0ff',
    accent: '#d7e6ff',
    plasma: '#ffb25a',
  },
  orbital: {
    id: 'orbital',
    platform: 'disc',
    crest: 'ridged',
    far: ['shell', 'ring'],
    sky: { top: '#0c2430', mid: '#061018', base: '#03080c' },
    structure: '#7ee0c8',
    accent: '#e8fff6',
    plasma: '#ff8a4a',
  },
  field: {
    id: 'field',
    platform: 'narrow',
    crest: 'fringed',
    far: ['field', 'fringe'],
    sky: { top: '#1a1230', mid: '#0a0614', base: '#05030a' },
    structure: '#c4b4ff',
    accent: '#f4f0ff',
    plasma: '#ff6a3a',
  },
  signal: {
    id: 'signal',
    platform: 'split',
    crest: 'scan',
    far: ['grid', 'scan'],
    sky: { top: '#08241c', mid: '#04110f', base: '#020806' },
    structure: '#3dffb0',
    accent: '#d8ffe8',
    plasma: '#ffb020',
  },
  plasma: {
    id: 'plasma',
    platform: 'ring',
    crest: 'filament',
    far: ['filament', 'ring'],
    sky: { top: '#2a1208', mid: '#140804', base: '#080200' },
    structure: '#ffb080',
    accent: '#fff1e0',
    plasma: '#ff3a1a',
  },
  quantum: {
    id: 'quantum',
    platform: 'hex',
    crest: 'doubled',
    far: ['fringe', 'lattice'],
    sky: { top: '#12182e', mid: '#05060c', base: '#020208' },
    structure: '#9eb6ff',
    accent: '#f0f4ff',
    plasma: '#ff5c7a',
  },
};

/** Missing or unrecognized theme.realm. This is the resolver's existing terminal, not a new realm choice. */
export const DEFAULT_REALM_ID: RealmId = 'lattice';

export function isRealmId(value: unknown): value is RealmId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(REALMS, value);
}

/** Schema theme is the only realm input. Level ids are not consulted. */
export function realmForLevel(theme?: { realm?: string } | null): RealmSpec {
  const key = isRealmId(theme?.realm) ? theme.realm : DEFAULT_REALM_ID;
  return REALMS[key];
}
