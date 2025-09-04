import React, { useEffect, type FormEvent, type ChangeEvent, type RefObject } from 'react';
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

  // Inject component styles once (responsive grid and uniform fields)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('liveform-styles')) return;
    const style = document.createElement('style');
    style.id = 'liveform-styles';
    style.textContent = `
      .lf-grid { display: grid; gap: 12px; align-items: start; grid-template-columns: 1fr 1fr; margin-bottom: 24px; }
      @media (max-width: 720px) { .lf-grid { grid-template-columns: 1fr; } }
      .lf-col { display: grid; gap: 10px; }
      .lf-field { display: grid; gap: 6px; text-align: left; }
      .lf-label { color: #334155; font-weight: 600; }
      .lf-input, .lf-select { width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #e5e7eb; background: #fff; box-sizing: border-box; }
      .lf-button-row { grid-column: 1 / -1; display: flex; justify-content: center; }
      .lf-error { grid-column: 1 / -1; color: #b91c1c; background: #fee2e2; padding: 8px 10px; border-radius: 8px; }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <form onSubmit={onSubmit} className="lf-grid">
      {/* Left column: File input + Recent CVs */}
      <div className="lf-col">
        <div className="lf-field">
          <label className="lf-label">Upload CV <span style={{fontSize:"0.7rem"}}>(PDF/DOCX/TXT)</span></label>
          <input className="lf-input" ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={onFileChange} />
        </div>
        {recent.length > 0 && (
          <RecentCVs
            recent={recent}
            recentSelectedId={recentSelectedId}
            onChangeSelected={onChangeRecentSelected}
          />
        )}
      </div>

      {/* Right column: URL picker */}
      <div className="lf-col">
        <SearchUrlPicker
          selectValue={searchUrlSelectValue}
          history={searchUrlHistory}
          customMode={searchUrlCustomMode}
          searchUrl={searchUrl}
          onSelectChange={onSearchUrlSelectChange}
          onChangeCustom={onChangeSearchUrl}
        />
      </div>

      <div className="lf-button-row">
        <button type="submit" aria-busy={loading} disabled={!canSubmit} style={{ padding: '14px 18px', borderRadius: 8, border: 'none', background: canSubmit ? '#2a62ff' : '#a3b3ff', color: 'white', fontWeight: 600 }}>
          {loading ? 'Finding…' : 'Find Jobs'}
        </button>
      </div>

      {!!error && showInlineError && (
        <div className="lf-error">{error}</div>
      )}
    </form>
  );
}
