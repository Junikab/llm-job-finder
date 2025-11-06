import React, { useEffect, useMemo, useState } from 'react';
import type { SavedJob } from '@shared/types';
import { useAppliedJobs } from '../hooks/useAppliedJobs';
import { useSavedForLater } from '../hooks/useSavedForLater';
import { parseListedDays, formatAppliedDate } from '../utils/date';
import SavedJobCard from './SavedJobCard';
import SavedFilters from './SavedFilters';
import '../styles/about-page.css';

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
  const { isApplied, setApplied, getAppliedAt } = useAppliedJobs();
  const { isSaved, setSaved, getSavedAt } = useSavedForLater();
  const [minScore, setMinScore] = useState<number>(0);
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [query, setQuery] = useState('');
  const [maxDays, setMaxDays] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<'model' | 'user' | 'recency' | 'applied'>('model');
  const [appliedOnly, setAppliedOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
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
    const q = query.trim().toLowerCase();
    const arr = items.filter((j: SavedJob) => {
      const k = j.key || j.id;
      const applied = isApplied(k);
      const saved = isSaved(k);
      // filtering semantics:
      // - both checked => OR (tracked: applied OR saved)
      // - one checked => respective filter
      // - none checked => default tracked view (applied OR saved)
      if (appliedOnly && savedOnly) {
        if (!(applied || saved)) return false;
      } else if (appliedOnly) {
        if (!applied) return false;
      } else if (savedOnly) {
        if (!saved) return false;
      } else {
        if (!(applied || saved)) return false;
      }
      // min model score
      if (typeof minScore === 'number' && minScore > 0) {
        if (j.modelScore == null || j.modelScore < minScore) return false;
      }
      // quick search across title/company/location (keeps existing company/location filters for now)
      if (q) {
        const t = (j.title || '').toLowerCase();
        const c = (j.company || '').toLowerCase();
        const jl = (j.location || '').toLowerCase();
        if (!(t.includes(q) || c.includes(q) || jl.includes(q))) return false;
      }
      // legacy company/location substring filters (left in place; will be removed later)
      if (comp && !(j.company || '').toLowerCase().includes(comp)) return false;
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
      const ts = (x: SavedJob) => {
        const k = x.key || x.id;
        const localAt = getAppliedAt(k);
        const effective = localAt || x.appliedAt;
        return effective ? Date.parse(effective) : -Infinity;
      };
      // Newest applied first
      copy.sort((a, b) => ts(b) - ts(a));
    }
    return copy;
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
      {loading && <div style={{ color: '#666' }}>Loading…</div>}
      {!!error && <div style={{ color: '#b00' }}>{error}</div>}
      {!loading && !error && !anyTracked ? (
        <div style={{ textAlign: 'center', padding: '40px 12px', color: '#374151' }}>
          <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>No saved jobs yet.</h3>
          <p style={{ margin: '10px 0 18px', color: '#666' }}>Save jobs from Live to track them here.</p>
          <button type="button" onClick={onGoLive} className="aboutPage__cta">Find jobs</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <SavedFilters
              sortBy={sortBy}
              onSortByChange={(v) => setSortBy(v)}
              query={query}
              onQueryChange={setQuery}
              appliedOnly={appliedOnly}
              onAppliedOnlyChange={setAppliedOnly}
              savedOnly={savedOnly}
              onSavedOnlyChange={setSavedOnly}
              onClear={() => { setMinScore(0); setCompany(''); setLocation(''); setQuery(''); setMaxDays(''); setAppliedOnly(false); setSavedOnly(false); }}
              onRefresh={onRefresh}
            />
          </div>
          {!loading && !error && filtered.length === 0 && <div style={{ color: '#666' }}>No results.</div>}
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
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
