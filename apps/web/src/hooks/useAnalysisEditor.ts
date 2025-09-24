import { useCallback, useState } from 'react';
import type { CVAnalysis, RankedJob, JobItem } from '@shared/types';
import { rescoreJobs } from '../api';
import { mapRankedToJobItem } from '../utils/jobMapping';

export function useAnalysisEditor({ analysis, onToast }: { analysis: CVAnalysis | null; onToast?: (msg: string) => void }) {
  const [draft, setDraft] = useState<CVAnalysis | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [rescoring, setRescoring] = useState(false);

  const startEdit = useCallback(() => {
    if (!analysis) return;
    setDraft({
      summary: analysis.summary || '',
      titles: [...(analysis.titles || [])],
      topSkills: [...(analysis.topSkills || [])],
      locationHints: [...(analysis.locationHints || [])],
    });
    setIsEditing(true);
  }, [analysis]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setDraft(null);
  }, []);

  const onChangeDraft = useCallback((next: CVAnalysis) => {
    setDraft(next);
  }, []);

  const handleRescore = useCallback(
    async (
      results: RankedJob[],
      opts: {
        onResults: (r: RankedJob[]) => void;
        onAnalysisCommitted?: (a: CVAnalysis) => void;
        onEditingDone?: () => void;
        onPromptUpdated?: (p: { user?: string; system?: string }) => void;
        onSearchUrlsUpdated?: (urls: string[]) => void;
      }
    ) => {
      if (!draft) return;
      if (results.length === 0) {
        onToast?.('No results to rescore');
        return;
      }
      try {
        setRescoring(true);
        const jobs: JobItem[] = results.map(mapRankedToJobItem);
        // If location hints changed, ask server to rebuild search URLs and re-scrape
        const normalize = (arr?: readonly string[]) => (arr || []).map(s => s.trim().toLowerCase()).filter(Boolean).sort();
        const prevLoc = normalize(analysis?.locationHints);
        const nextLoc = normalize(draft.locationHints);
        const locationChanged = prevLoc.length !== nextLoc.length || prevLoc.some((v, i) => v !== nextLoc[i]);
        const resp = await rescoreJobs(
          draft,
          jobs,
          locationChanged
            ? { refreshSearch: true, location: (draft.locationHints && draft.locationHints[0]) || undefined }
            : undefined
        );
        opts.onResults(resp.results);
        opts.onAnalysisCommitted?.(draft);
        opts.onPromptUpdated?.({ user: resp.llmPromptUserPreview, system: resp.llmPromptSystem });
        if (resp.searchUrls && resp.searchUrls.length) {
          opts.onSearchUrlsUpdated?.(resp.searchUrls);
        }
        setIsEditing(false);
        onToast?.('Rescored');
      } catch (err) {
        console.error(err);
        onToast?.('Rescore failed');
      } finally {
        setRescoring(false);
        opts.onEditingDone?.();
      }
    },
    [draft, onToast]
  );

  return { draft, isEditing, rescoring, startEdit, cancelEdit, onChangeDraft, handleRescore } as const;
}
