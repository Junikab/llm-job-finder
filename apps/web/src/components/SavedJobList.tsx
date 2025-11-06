import React from 'react';
import type { SavedJob } from '@shared/types';
import { formatAppliedDate } from '../utils/date';
import SavedJobCard from './SavedJobCard';

export type SavedJobListProps = {
  items: SavedJob[];
  isApplied: (key: string) => boolean;
  getAppliedAt: (key: string) => string | null;
  setApplied: (key: string, v: boolean) => void;
  isSaved: (key: string) => boolean;
  getSavedAt: (key: string) => string | null;
  setSaved: (key: string, v: boolean) => void;
  draftScores: Record<string, number>;
  onDraftScoreChange: (jobId: string, value: number) => void;
  onCommitScore: (jobId: string) => void;
};

export function SavedJobList(props: SavedJobListProps) {
  const { items, isApplied, getAppliedAt, setApplied, isSaved, getSavedAt, setSaved, draftScores, onDraftScoreChange, onCommitScore } = props;
  return (
    <ol className="savedPage__list">
      {items.map(j => {
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
            onDraftScoreChange={(value) => onDraftScoreChange(j.id, value)}
            onCommitScore={() => onCommitScore(j.id)}
          />
        );
      })}
    </ol>
  );
}
