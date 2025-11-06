import React from 'react';
import type { SavedJob } from '@shared/types';
import { SavedHeader } from '../components/SavedHeader';
import SavedList from '../components/SavedList';

export type SavedPageProps = {
  saved: SavedJob[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void | Promise<void>;
  onRate: (jobId: string, score: number) => void | Promise<void>;
  onGoLive: () => void;
};

export default function SavedPage({ saved, loading, error, onRefresh, onRate, onGoLive }: SavedPageProps) {
  return (
    <div className="saved-section">
      <SavedHeader items={saved} />
      <SavedList
        items={saved}
        loading={loading}
        error={error}
        onRefresh={onRefresh}
        onRate={onRate}
        onGoLive={onGoLive}
      />
    </div>
  );
}
