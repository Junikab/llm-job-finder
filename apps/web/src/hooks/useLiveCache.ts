import { useCallback } from 'react';

import type { CVAnalysis, RankedJob } from '@shared/types';

export type LiveCache = {
  analysis?: CVAnalysis;
  searchUrls?: string[];
  results: RankedJob[];
  llmGoodTraits?: string;
  llmBadTraits?: string;
  llmPromptUserPreview?: string;
  llmPromptSystem?: string;
  savedAt?: string;
};

const LIVE_CACHE_KEY = 'liveResults:v1';

export function useLiveCache() {
  const restoreLatest = useCallback((): LiveCache | null => {
    try {
      const raw = localStorage.getItem(LIVE_CACHE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.results)) return null;
      return obj as LiveCache;
    } catch {
      return null;
    }
  }, []);

  const persistLatest = useCallback((payload: LiveCache) => {
    try {
      localStorage.setItem(
        LIVE_CACHE_KEY,
        JSON.stringify({ ...payload, savedAt: new Date().toISOString() }),
      );
    } catch {
      // ignore quota/serialization errors
    }
  }, []);

  return { restoreLatest, persistLatest } as const;
}
