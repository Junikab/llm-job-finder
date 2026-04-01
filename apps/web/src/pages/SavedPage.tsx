import React from 'react';

import { SavedHeader } from '../components/SavedHeader';
import SavedList from '../components/SavedList';

import type { SavedJob } from '@shared/types';

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
    <main className='savedPage'>
      <section className="savedPage__heroImage">
        <div className="savedPage__heroContent">
          <SavedHeader items={saved} />
        </div>
      </section>

      <div className="savedPage__content">
        <SavedList
          items={saved}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
          onRate={onRate}
          onGoLive={onGoLive}
        />
      </div>
    </main>
  );
}
