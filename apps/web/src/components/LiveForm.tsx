import React, { type FormEvent, type ChangeEvent, type RefObject } from 'react';
import RecentCVs from './RecentCVs';
import SearchUrlPicker from './SearchUrlPicker';
import type { CVMeta } from '../idb';

export default function LiveForm(props: {
  onSubmit: (e: FormEvent) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  recent: CVMeta[];
  recentSelectedId: string;
  onChangeRecentSelected: (id: string) => void;
  searchUrlSelectValue: string;
  searchUrlHistory: string[];
  searchUrlCustomMode: boolean;
  searchUrl: string;
  onSearchUrlSelectChange: (value: string) => void;
  onChangeSearchUrl: (value: string) => void;
  canSubmit: boolean;
  loading: boolean;
  error: string | null;
  fileInputRef?: RefObject<HTMLInputElement>;
  showInlineError?: boolean;
}) {
  const {
    onSubmit,
    onFileChange,
    recent,
    recentSelectedId,
    onChangeRecentSelected,
    searchUrlSelectValue,
    searchUrlHistory,
    searchUrlCustomMode,
    searchUrl,
    onSearchUrlSelectChange,
    onChangeSearchUrl,
    canSubmit,
    loading,
    error,
    fileInputRef,
    showInlineError = true,
  } = props;

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, alignItems: 'start', gridTemplateColumns: '1fr 1fr', marginBottom: 24 }}>
      {/* Left column: File input + Recent CVs */}
      <div style={{ display: 'grid', gap: 8, alignItems: 'center' }}>
        <label style={{ color: '#334155', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span>Upload CV</span>
            <span style={{ fontSize: '0.6em', color: '#334155', fontWeight: 600 }}>(PDF/DOCX/TXT)</span>
          </span>
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={onFileChange} style={{ marginTop: 0, padding: 8, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }} />
        </label>
        {recent.length > 0 && (
          <RecentCVs
            recent={recent}
            recentSelectedId={recentSelectedId}
            onChangeSelected={onChangeRecentSelected}
            fullWidth={false}
          />
        )}
      </div>

      {/* Right column: URL picker + Submit */}
      <div style={{ display: 'grid', gap: 10 }}>
        <SearchUrlPicker
          selectValue={searchUrlSelectValue}
          history={searchUrlHistory}
          customMode={searchUrlCustomMode}
          searchUrl={searchUrl}
          onSelectChange={onSearchUrlSelectChange}
          onChangeCustom={onChangeSearchUrl}
          fullWidth={false}
        />
        <button type="submit" aria-busy={loading} disabled={!canSubmit} style={{ padding: '14px 18px', borderRadius: 8, border: 'none', background: canSubmit ? '#2a62ff' : '#a3b3ff', color: 'white', fontWeight: 600 }}>
          {loading ? 'Finding…' : 'Find Jobs'}
        </button>
      </div>

      {!!error && showInlineError && (
        <div style={{ gridColumn: '1 / -1', color: '#b91c1c', background: '#fee2e2', padding: '8px 10px', borderRadius: 8 }}>{error}</div>
      )}
    </form>
  );
}
