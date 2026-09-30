import { CAMPAIGN_SECTORS, LEVEL_DATABASE, SectorDef } from '../engine/LevelDatabase';
import { LevelSchema } from '../types';

export interface ReviewLaunch {
  enabled: boolean;
  levelId: string | null;
  reviewUnlockAllLevels: boolean;
}

/** Query authority for the inspection catalog. Ordinary campaign URLs stay off. */
export function reviewLaunchFromSearch(search: string): ReviewLaunch {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const level = query.get('level');
  const enabled = query.get('reviewMode') === '1';
  return {
    enabled,
    levelId: level && level.length > 0 ? level : null,
    reviewUnlockAllLevels: enabled && (query.get('reviewUnlock') === '1' || query.get('unlockAll') === '1'),
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

/**
 * Authoritative check whether a sector is unlocked under legitimate player progression.
 */
export function isSectorNormallyUnlocked(sector: SectorDef, sectorsCleared: string[]): boolean {
  if (sector.unlockRequirement === 0) return true;
  return sectorsCleared.length >= sector.unlockRequirement;
}

/**
 * Authoritative check whether a campaign level is unlocked under legitimate player progression.
 */
export function isLevelNormallyUnlocked(levelId: string, sectorsCleared: string[]): boolean {
  const sector = sectorForCampaignLevel(levelId);
  if (!sector) return false;
  return isSectorNormallyUnlocked(sector, sectorsCleared);
}

/**
 * Authoritative single derived rule:
 * canSelectLevel = normallyUnlocked(level) OR (reviewMode && reviewUnlockAllLevels)
 */
export function canSelectCampaignLevel(
  levelId: string,
  sectorsCleared: string[],
  reviewMode: boolean,
  reviewUnlockAllLevels: boolean
): boolean {
  const normallyUnlocked = isLevelNormallyUnlocked(levelId, sectorsCleared);
  return normallyUnlocked || (reviewMode && reviewUnlockAllLevels);
}

/**
 * Authoritative single derived rule for sectors:
 * canSelectSector = normallyUnlocked(sector) OR (reviewMode && reviewUnlockAllLevels)
 */
export function canSelectCampaignSector(
  sector: SectorDef,
  sectorsCleared: string[],
  reviewMode: boolean,
  reviewUnlockAllLevels: boolean
): boolean {
  const normallyUnlocked = isSectorNormallyUnlocked(sector, sectorsCleared);
  return normallyUnlocked || (reviewMode && reviewUnlockAllLevels);
}
