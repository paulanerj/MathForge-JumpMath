import { CAMPAIGN_SECTORS, LEVEL_DATABASE, SectorDef } from '../engine/LevelDatabase';
import { LevelSchema } from '../types';

export interface ReviewLaunch {
  enabled: boolean;
  levelId: string | null;
}

/** Query authority for the inspection catalog. Ordinary campaign URLs stay off. */
export function reviewLaunchFromSearch(search: string): ReviewLaunch {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const level = query.get('level');
  return {
    enabled: query.get('reviewMode') === '1',
    levelId: level && level.length > 0 ? level : null,
  };
}

/** The campaign schemas themselves. Unknown ids fall back to the first level. */
export function campaignReviewPlaylist(): LevelSchema[] {
  return LEVEL_DATABASE;
}

export function reviewIndexForLevel(levelId: string | null): number {
  if (!levelId) return 0;
  const index = LEVEL_DATABASE.findIndex((level) => level.id === levelId);
  return index >= 0 ? index : 0;
}

export function sectorForCampaignLevel(levelId: string): SectorDef | null {
  return CAMPAIGN_SECTORS.find((sector) => sector.levels.some((level) => level.id === levelId)) ?? null;
}
