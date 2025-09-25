import React, { useState, type FormEvent, type ChangeEvent, type RefObject } from 'react';
import SearchUrlPicker from './SearchUrlPicker';

export default function LiveForm(props: {
  onSubmit: (e: FormEvent) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
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

  // Styles are provided globally via styles/form.css and styles/base.css

  // Track uploaded filename for display
  const [uploadedFileName, setUploadedFileName] = useState('');

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setUploadedFileName(f?.name || '');
    onFileChange(e);
  };

  return (
    <form onSubmit={onSubmit} className="lf-grid">
      {/* Left column: File input + Recent CVs */}
      <div className="lf-col">
        <div className="lf-field">
          <label className="lf-label" htmlFor="lf-upload-cv">Upload CV <span style={{fontSize:"0.6rem"}}>(PDF/DOCX/TXT)</span></label>
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
