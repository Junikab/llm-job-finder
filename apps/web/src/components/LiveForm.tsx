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
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 14, alignItems: 'start', gridTemplateColumns: '1fr 1fr', marginBottom: 24 }}>
      <label style={{ gridColumn: '1 / -1', color: '#334155', fontWeight: 600 }}>
        <div style={{ marginBottom: 6 }}>CV (PDF/DOCX/TXT)</div>
        <input type="file" accept=".pdf,.docx,.txt" onChange={onFileChange} style={{ padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }} />
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
        <button aria-busy={loading} disabled={!canSubmit} style={{ padding: '12px 16px', borderRadius: 8, border: 'none', background: canSubmit ? '#2a62ff' : '#a3b3ff', color: 'white', fontWeight: 600 }}>
          {loading ? 'Finding…' : 'Find Jobs'}
        </button>
      </div>

      {!!error && (
        <div style={{ gridColumn: '1 / -1', color: '#b91c1c', background: '#fee2e2', padding: '8px 10px', borderRadius: 8 }}>{error}</div>
      )}
    </form>
  );
}
