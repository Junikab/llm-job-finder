import React, { useEffect, useState, type FormEvent, type ChangeEvent, type RefObject } from 'react';
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
  setSearchUrlCustomMode?: (v: boolean) => void;
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
    setSearchUrlCustomMode,
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
      .lf-filebar { display: flex; align-items: center; gap: 10px; }
      .lf-file-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); border: 0; }
      .lf-control { height: 44px; display: inline-flex; align-items: center; }
      .lf-btn-primary { height: 44px; padding: 0 18px; border-radius: 8px; border: none; background: #2a62ff; color: #fff; font-weight: 600; cursor: pointer; }
      .lf-button-row { grid-column: 1 / -1; display: flex; justify-content: center; }
      .lf-error { grid-column: 1 / -1; color: #b91c1c; background: #fee2e2; padding: 8px 10px; border-radius: 8px; }
    `;
    document.head.appendChild(style);
  }, []);

  // Track uploaded filename for display
  const [uploadedFileName, setUploadedFileName] = useState('');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setUploadedFileName(f?.name || '');
    onFileChange(e);
  };

  // Clear displayed filename if a recent CV is chosen (mutually exclusive source)
  useEffect(() => {
    if (recentSelectedId) setUploadedFileName('');
  }, [recentSelectedId]);

  return (
    <form onSubmit={onSubmit} className="lf-grid">
      {/* Left column: File input + Recent CVs */}
      <div className="lf-col">
        <div className="lf-field">
          <label className="lf-label" htmlFor="lf-upload-cv">Upload CV <span style={{fontSize:"0.7rem"}}>(PDF/DOCX/TXT)</span></label>
          <div className="lf-filebar">
            <button
              type="button"
              onClick={() => fileInputRef?.current?.click()}
              className="lf-btn-primary"
            >
              Choose File
            </button>
            {/* Hidden real file input to drive selection and keep label association for tests */}
            <input
              id="lf-upload-cv"
              ref={fileInputRef}
              className="lf-file-hidden"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
            />
            {/* Read-only white field showing the chosen filename */}
            <input
              className="lf-input lf-control"
              type="text"
              value={uploadedFileName}
              placeholder=""
              readOnly
            />
          </div>
        </div>
        <RecentCVs
          recent={recent}
          recentSelectedId={recentSelectedId}
          onChangeSelected={onChangeRecentSelected}
        />
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
          setCustomMode={setSearchUrlCustomMode}
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
