import React, { type FormEvent, type ChangeEvent } from 'react';
import RecentCVs from './RecentCVs';
import SearchUrlPicker from './SearchUrlPicker';
import type { CVMeta } from '../idb';

export default function LiveForm(props: {
  onSubmit: (e: FormEvent) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  recent: CVMeta[];
  recentSelectedId: string;
  onChangeRecentSelected: (id: string) => void;
  onUseSelectedRecent: () => void | Promise<void>;
  onRemoveSelectedRecent: () => void | Promise<void>;
  searchUrlSelectValue: string;
  searchUrlHistory: string[];
  searchUrlCustomMode: boolean;
  searchUrl: string;
  onSearchUrlSelectChange: (value: string) => void;
  onChangeSearchUrl: (value: string) => void;
  canSubmit: boolean;
  loading: boolean;
  error: string | null;
}) {
  const {
    onSubmit,
    onFileChange,
    recent,
    recentSelectedId,
    onChangeRecentSelected,
    onUseSelectedRecent,
    onRemoveSelectedRecent,
    searchUrlSelectValue,
    searchUrlHistory,
    searchUrlCustomMode,
    searchUrl,
    onSearchUrlSelectChange,
    onChangeSearchUrl,
    canSubmit,
    loading,
    error,
  } = props;

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, alignItems: 'center', gridTemplateColumns: '1fr 1fr', marginBottom: 24 }}>
      <label style={{ gridColumn: '1 / -1' }}>
        <div>CV (PDF/DOCX/TXT)</div>
        <input type="file" accept=".pdf,.docx,.txt" onChange={onFileChange} />
      </label>

      <RecentCVs
        recent={recent}
        recentSelectedId={recentSelectedId}
        onChangeSelected={onChangeRecentSelected}
        onUseSelected={onUseSelectedRecent}
        onRemoveSelected={onRemoveSelectedRecent}
      />

      <SearchUrlPicker
        selectValue={searchUrlSelectValue}
        history={searchUrlHistory}
        customMode={searchUrlCustomMode}
        searchUrl={searchUrl}
        onSelectChange={onSearchUrlSelectChange}
        onChangeCustom={onChangeSearchUrl}
      />

      <div style={{ gridColumn: '1 / -1' }}>
        <button aria-busy={loading} disabled={!canSubmit} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #ddd', background: canSubmit ? '#111' : '#888', color: 'white' }}>
          {loading ? 'Finding…' : 'Find Jobs'}
        </button>
      </div>

      {!!error && (
        <div style={{ gridColumn: '1 / -1', color: '#b00' }}>{error}</div>
      )}
    </form>
  );
}
