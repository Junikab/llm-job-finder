import React, { useEffect, useMemo, useState } from 'react';
import type { SavedJob } from '@shared/types';
import { useTrackedJobs } from '../hooks/useTrackedJobs';
import { includeTracked, matchesText, sortJobs } from '../lib/job-filters';
import { parseListedDays, formatAppliedDate } from '../utils/date';
import SavedJobCard from './SavedJobCard';
import SavedFilters from './SavedFilters';
import { useSavedFilters } from '../hooks/useSavedFilters';
import { SavedEmptyState } from './SavedEmptyState';
import '../styles/about-page.css';
import '../styles/SavedPage.css';

export default function SavedList(props: {
  items: SavedJob[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
  onRate: (jobId: string, score: number) => void | Promise<void>;
  onGoLive: () => void;
}) {
  const { items, loading, error, onRefresh, onRate, onGoLive } = props;
  useEffect(() => { onRefresh(); /* fetch when mounted */ }, []);
  const { isApplied, setApplied, getAppliedAt, isSaved, setSaved, getSavedAt } = useTrackedJobs();
  const [minScore, setMinScore] = useState<number>(0);
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [maxDays, setMaxDays] = useState<number | ''>('');
  const { sortBy, setSortBy, query, setQuery, appliedOnly, setAppliedOnly, savedOnly, setSavedOnly, clear } = useSavedFilters();
  const [draftScores, setDraftScores] = useState<Record<string, number>>({});

  const anyTracked = useMemo(() => {
    return items.some((j) => {
      const k = j.key || j.id;
      return isApplied(k) || isSaved(k);
    });
  }, [items, isApplied, isSaved]);

  const filtered = useMemo<SavedJob[]>(() => {
    const comp = company.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    const arr = items.filter((j: SavedJob) => {
      const k = j.key || j.id;
      const applied = isApplied(k);
      const saved = isSaved(k);
      if (!includeTracked(applied, saved, { appliedOnly, savedOnly, defaultTracked: true })) return false;
      if (typeof minScore === 'number' && minScore > 0) {
        if (j.modelScore == null || j.modelScore < minScore) return false;
      }
      if (!matchesText({ title: j.title, company: j.company, location: j.location }, query)) return false;
      // legacy company/location substring filters (left in place; will be removed later)
      if (comp && !(j.company || '').toLowerCase().includes(comp)) return false;
      if (loc) {
        const jl = (j.location || '').toLowerCase();
        if (!jl.includes(loc)) return false;
      }
      if (maxDays !== '') {
        const d = parseListedDays(j.listedAgo);
        if (d != null && d > Number(maxDays)) return false;
      }
      return true;
    });
    return sortJobs(arr, sortBy, { getAppliedAt: (x) => getAppliedAt(x.key || x.id) });
  }, [items, minScore, company, location, maxDays, sortBy, isApplied, isSaved, appliedOnly, savedOnly, query, getAppliedAt]);

  const commitScore = (jobId: string) => {
    const current = draftScores[jobId];
    const job = items.find(j => j.id === jobId);
    if (current == null || !job || current === (job.userScore ?? 0)) {
      // nothing to do
      setDraftScores(prev => {
        if (prev[jobId] == null) return prev;
        const { [jobId]: _omit, ...rest } = prev;
        return rest;
      });
      return;
    }
    onRate(jobId, current);
    setDraftScores(prev => {
      const { [jobId]: _omit, ...rest } = prev;
      return rest;
    });
  };

  return (
    <div>
      {loading && <div className="savedPage__muted">Loading…</div>}
      {!!error && <div className="savedPage__error">{error}</div>}
      {!loading && !error && !anyTracked ? (
        <SavedEmptyState onGoLive={onGoLive} />
      ) : (
        <>
          <SavedFilters
            sortBy={sortBy}
            onSortByChange={(v) => setSortBy(v)}
            query={query}
            onQueryChange={setQuery}
            appliedOnly={appliedOnly}
            onAppliedOnlyChange={setAppliedOnly}
            savedOnly={savedOnly}
            onSavedOnlyChange={setSavedOnly}
            onClear={() => { clear(); setMinScore(0); setCompany(''); setLocation(''); setMaxDays(''); }}
            onRefresh={onRefresh}
          />
          {!loading && !error && filtered.length === 0 && <div className="savedPage__muted">No results.</div>}
          <ol className="savedPage__list">
            {filtered.map(j => {
              const k = j.key || j.id;
              const applied = isApplied(k);
              const appliedAtText = formatAppliedDate(getAppliedAt(k));
              const saved = isSaved(k);
              const savedAtText = formatAppliedDate(getSavedAt(k));
              const draft = draftScores[j.id] ?? (j.userScore ?? 0);
              return (
                <SavedJobCard
                  key={j.id}
                  job={j}
                  jobKey={k}
                  applied={applied}
                  appliedAtText={appliedAtText}
                  onAppliedChange={(checked) => setApplied(k, checked)}
                  saved={saved}
                  savedAtText={savedAtText}
                  onSavedChange={(checked) => setSaved(k, checked)}
                  draftScore={draft}
                  onDraftScoreChange={(value) => setDraftScores(prev => ({ ...prev, [j.id]: value }))}
                  onCommitScore={() => commitScore(j.id)}
                />
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
