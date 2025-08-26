import { useCallback, useState } from 'react';
import { listSavedJobs, sendFeedback } from '../api';
import type { SavedJob } from '../../../server/src/types';

export function useSavedJobs(onToast?: (msg: string) => void) {
  const [saved, setSaved] = useState<SavedJob[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedError, setSavedError] = useState<string | null>(null);

  const refreshSaved = useCallback(async () => {
    setSavedLoading(true);
    setSavedError(null);
    try {
      const results = await listSavedJobs();
      setSaved(results);
    } catch (err: any) {
      setSavedError(err?.message || 'Failed to load saved jobs');
    } finally {
      setSavedLoading(false);
    }
  }, []);

  const rate = useCallback(async (jobId: string, nextScore: number) => {
    // optimistic update with revert capture
    let prevScore: number | null = null;
    setSaved(prev => {
      const found = prev.find(j => j.id === jobId);
      prevScore = found?.userScore ?? null;
      return prev.map(j => j.id === jobId ? { ...j, userScore: nextScore } : j);
    });
    try {
      await sendFeedback(jobId, nextScore);
      onToast?.('Saved');
      // refetch latest aggregate
      try {
        setSavedLoading(true);
        const updated = await listSavedJobs();
        setSaved(updated);
      } finally {
        setSavedLoading(false);
      }
    } catch (err: any) {
      onToast?.('Save failed');
      // revert
      setSaved(prev => prev.map(j => j.id === jobId ? { ...j, userScore: prevScore } : j));
    }
  }, [onToast]);

  return { saved, savedLoading, savedError, refreshSaved, rate } as const;
}
