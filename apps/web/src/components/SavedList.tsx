import React, { useEffect, useMemo, useState } from 'react';
import type { SavedJob } from '../../../server/src/types';
import { useAppliedJobs } from '../hooks/useAppliedJobs';
import { parseListedDays, formatAppliedDate } from '../utils/date';
import SavedJobCard from './SavedJobCard';
import SavedFilters from './SavedFilters';

export default function SavedList(props: {
  items: SavedJob[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
  onRate: (jobId: string, score: number) => void | Promise<void>;
}) {
  const { items, loading, error, onRefresh, onRate } = props;
  useEffect(() => { onRefresh(); /* fetch when mounted */ }, []);
  const { isApplied, setApplied, getAppliedAt } = useAppliedJobs();
  const [minScore, setMinScore] = useState<number>(0);
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [maxDays, setMaxDays] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'model' | 'user' | 'recency' | 'applied'>('model');
  const [appliedOnly, setAppliedOnly] = useState(false);
  const [draftScores, setDraftScores] = useState<Record<string, number>>({});

  const filtered = useMemo<SavedJob[]>(() => {
    const comp = company.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    const arr = items.filter((j: SavedJob) => {
      // applied filter
      if (appliedOnly && j.applied !== true) return false;
      // min model score
      if (typeof minScore === 'number' && minScore > 0) {
        if (j.modelScore == null || j.modelScore < minScore) return false;
      }
      // company substring
      if (comp && !(j.company || '').toLowerCase().includes(comp)) return false;
      // location substring
      if (loc) {
        const jl = (j.location || '').toLowerCase();
        if (!jl.includes(loc)) return false;
      }
      // days filter (keep unknowns)
      if (maxDays !== '') {
        const d = parseListedDays(j.listedAgo);
        if (d != null && d > Number(maxDays)) return false;
      }
      return true;
    });
    const copy = [...arr];
    if (sortBy === 'model') {
      copy.sort((a, b) => (b.modelScore ?? -Infinity) - (a.modelScore ?? -Infinity));
    } else if (sortBy === 'user') {
      copy.sort((a, b) => (b.userScore ?? -Infinity) - (a.userScore ?? -Infinity));
    } else if (sortBy === 'recency') {
      const ad = (x: SavedJob) => {
        const d = parseListedDays(x.listedAgo);
        return d == null ? Infinity : d;
      };
      copy.sort((a, b) => ad(a) - ad(b));
    } else if (sortBy === 'applied') {
      const ts = (x: SavedJob) => (x.appliedAt ? Date.parse(x.appliedAt) : -Infinity);
      // Newest applied first
      copy.sort((a, b) => ts(b) - ts(a));
    }
    return copy;
  }, [items, minScore, company, location, maxDays, sortBy]);

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <SavedFilters
          sortBy={sortBy}
          onSortByChange={(v) => setSortBy(v)}
          appliedOnly={appliedOnly}
          onAppliedOnlyChange={setAppliedOnly}
          onClear={() => { setMinScore(0); setCompany(''); setLocation(''); setMaxDays(''); }}
          onReload={onRefresh}
        />
      </div>
      {loading && <div style={{ color: '#666' }}>Loading…</div>}
      {!!error && <div style={{ color: '#b00' }}>{error}</div>}
      {!loading && !error && filtered.length === 0 && <div style={{ color: '#666' }}>No saved jobs yet.</div>}
      <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
        {filtered.map(j => {
          const k = j.key || j.id;
          const applied = isApplied(k);
          const appliedAtText = formatAppliedDate(getAppliedAt(k));
          const draft = draftScores[j.id] ?? (j.userScore ?? 0);
          return (
            <SavedJobCard
              key={j.id}
              job={j}
              jobKey={k}
              applied={applied}
              appliedAtText={appliedAtText}
              onAppliedChange={(checked) => setApplied(k, checked)}
              draftScore={draft}
              onDraftScoreChange={(value) => setDraftScores(prev => ({ ...prev, [j.id]: value }))}
              onCommitScore={() => commitScore(j.id)}
            />
          );
        })}
      </ol>
    </div>
  );
}
