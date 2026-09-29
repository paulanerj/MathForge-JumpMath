import { DeepPartial, ZyxConfig } from './configTypes';
import { DEFAULT_ZYX_CONFIG } from './defaults';

function isPlainObject(item: unknown): item is Record<string, any> {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

function deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
  const result: any = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (sourceVal !== undefined) {
      if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
        result[key] = deepMerge(targetVal, sourceVal);
      } else {
        result[key] = sourceVal;
      }
    }
  }
  return result;
}

/**
 * Creates an authoritative Zyx configuration, merging any partial overrides
 * on top of the immutable DEFAULT_ZYX_CONFIG.
 */
export function createZyxConfig(overrides?: DeepPartial<ZyxConfig>): ZyxConfig {
  if (!overrides) {
    return DEFAULT_ZYX_CONFIG;
  }
  const merged = deepMerge(DEFAULT_ZYX_CONFIG, overrides as Record<string, any>);
  return {
    ...merged,
    schemaVersion: 1,
  };
}
