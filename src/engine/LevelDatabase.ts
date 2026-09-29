import { LevelSchema, Vector2D } from '../types';
import { REALMS, type RealmId } from '../visual/realms';

export interface SectorDef {
  id: string;
  name: string;
  description: string;
  unlockRequirement: number;
  levels: LevelSchema[];
  badge: string;
}

const VECTORS: Record<string, Vector2D> = {
  up: { x: 0, y: -1 },
  upRight: { x: 0.35, y: -1 },
  upLeft: { x: -0.35, y: -1 },
  diagonalR: { x: 0.6, y: -0.85 },
  diagonalL: { x: -0.6, y: -0.85 },
};

type Row = {
  id: string;
  route: keyof typeof VECTORS;
  math: LevelSchema['mathConfig'];
};

type SectorSeed = {
  id: string;
  name: string;
  description: string;
  badge: string;
  realm: RealmId;
  levels: Row[];
};

/** 30 rows. Six realms, five each. Review magnitudes only — no new operation. */
const SECTORS: SectorSeed[] = [
  {
    id: 'sector_lattice',
    name: 'LATTICE',
    description: 'Quiet geometry. Bonds and short steps.',
    badge: '⬡',
    realm: 'lattice',
    levels: [
      { id: 'f1_sum10', route: 'up', math: { mode: 'SUM_TO', target: 10 } },
      { id: 'f2_skip2', route: 'up', math: { mode: 'SKIP_COUNT', step: 2 } },
      { id: 'l3_sum12', route: 'up', math: { mode: 'SUM_TO', target: 12 } },
      { id: 'l4_skip2', route: 'up', math: { mode: 'SKIP_COUNT', step: 2 } },
      { id: 'l5_sum14', route: 'up', math: { mode: 'SUM_TO', target: 14 } },
    ],
  },
  {
    id: 'sector_orbital',
    name: 'ORBITAL',
    description: 'Shells and slow rings. The same relationships, rounder space.',
    badge: '◌',
    realm: 'orbital',
    levels: [
      { id: 'f3_sum15', route: 'upRight', math: { mode: 'SUM_TO', target: 15 } },
      { id: 'f4_skip3', route: 'upLeft', math: { mode: 'SKIP_COUNT', step: 3 } },
      { id: 'o3_sum18', route: 'upRight', math: { mode: 'SUM_TO', target: 18 } },
      { id: 'o4_skip4', route: 'upLeft', math: { mode: 'SKIP_COUNT', step: 4 } },
      { id: 'o5_sum16', route: 'upRight', math: { mode: 'SUM_TO', target: 16 } },
    ],
  },
  {
    id: 'sector_field',
    name: 'FIELD',
    description: 'Lines of force. New ideas stay on a gentler path.',
    badge: '∿',
    realm: 'field',
    levels: [
      { id: 'd1_sum20', route: 'diagonalR', math: { mode: 'SUM_TO', target: 20 } },
      { id: 'd2_skip5', route: 'diagonalL', math: { mode: 'SKIP_COUNT', step: 5 } },
      { id: 'd3_mult2', route: 'up', math: { mode: 'MULTIPLY', factor: 2, minMultiplier: 1, maxMultiplier: 10 } },
      { id: 'd4_diff15', route: 'upLeft', math: { mode: 'DIFFERENCE', maxValue: 15 } },
      { id: 'f5_sum22', route: 'diagonalR', math: { mode: 'SUM_TO', target: 22 } },
    ],
  },
  {
    id: 'sector_signal',
    name: 'SIGNAL',
    description: 'Grids and scans. Not a machine. Not a room.',
    badge: '⌁',
    realm: 'signal',
    levels: [
      { id: 'v1_sum25', route: 'upRight', math: { mode: 'SUM_TO', target: 25 } },
      { id: 'v2_skip7', route: 'upLeft', math: { mode: 'SKIP_COUNT', step: 7 } },
      { id: 'v3_mult3', route: 'upRight', math: { mode: 'MULTIPLY', factor: 3, minMultiplier: 1, maxMultiplier: 12 } },
      { id: 'v4_diff25', route: 'upLeft', math: { mode: 'DIFFERENCE', maxValue: 25 } },
      { id: 's5_skip6', route: 'upRight', math: { mode: 'SKIP_COUNT', step: 6 } },
    ],
  },
  {
    id: 'sector_plasma',
    name: 'PLASMA',
    description: 'The front is the scenery. Filaments and coronas.',
    badge: '◎',
    realm: 'plasma',
    levels: [
      { id: 'q1_sum30', route: 'upRight', math: { mode: 'SUM_TO', target: 30 } },
      { id: 'q2_mult5', route: 'upLeft', math: { mode: 'MULTIPLY', factor: 5, minMultiplier: 2, maxMultiplier: 12 } },
      { id: 'p3_sum28', route: 'upRight', math: { mode: 'SUM_TO', target: 28 } },
      { id: 'p4_diff20', route: 'upLeft', math: { mode: 'DIFFERENCE', maxValue: 20 } },
      { id: 'p5_skip8', route: 'upRight', math: { mode: 'SKIP_COUNT', step: 8 } },
    ],
  },
  {
    id: 'sector_quantum',
    name: 'QUANTUM',
    description: 'Interference and sparse dark. The last five.',
    badge: '◈',
    realm: 'quantum',
    levels: [
      { id: 'q3_skip4', route: 'upLeft', math: { mode: 'SKIP_COUNT', step: 4, direction: -1 } },
      { id: 'q4_mult7', route: 'diagonalL', math: { mode: 'MULTIPLY', factor: 7, minMultiplier: 1, maxMultiplier: 10 } },
      { id: 'q5_sum40', route: 'diagonalR', math: { mode: 'SUM_TO', target: 40 } },
      { id: 'u4_sum35', route: 'diagonalL', math: { mode: 'SUM_TO', target: 35 } },
      { id: 'u5_diff30', route: 'diagonalR', math: { mode: 'DIFFERENCE', maxValue: 30 } },
    ],
  },
];

function levelFrom(realm: RealmId, row: Row): LevelSchema {
  const spec = REALMS[realm];
  return {
    id: row.id,
    mathConfig: row.math,
    progressionVector: VECTORS[row.route],
    theme: {
      background: realm,
      skyColors: spec.sky,
      palette: 'content',
      realm: spec.id,
      platform: spec.platform,
      crest: spec.crest,
      structure: spec.structure,
      accent: spec.accent,
      plasma: spec.plasma,
    },
  };
}

export const CAMPAIGN_SECTORS: SectorDef[] = SECTORS.map((sector, index) => ({
  id: sector.id,
  name: sector.name,
  description: sector.description,
  unlockRequirement: index,
  badge: sector.badge,
  levels: sector.levels.map((row) => levelFrom(sector.realm, row)),
}));

export const LEVEL_DATABASE: LevelSchema[] = CAMPAIGN_SECTORS.flatMap((s) => s.levels);

export function getSectorById(id: string): SectorDef | undefined {
  return CAMPAIGN_SECTORS.find((s) => s.id === id);
}

export function getLevelById(id: string): LevelSchema | undefined {
  return LEVEL_DATABASE.find((l) => l.id === id);
}
