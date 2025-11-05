import React, { useState, type FormEvent, type ChangeEvent, type RefObject } from 'react';

export default function LiveForm(props: {
  onSubmit: (e: FormEvent) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  location: string;
  noLocation: boolean;
  onChangeLocation: (value: string) => void;
  onChangeNoLocation: (value: boolean) => void;
  canSubmit: boolean;
  loading: boolean;
  error: string | null;
  fileInputRef?: RefObject<HTMLInputElement>;
  showInlineError?: boolean;
}) {
  const {
    onSubmit,
    onFileChange,
    location,
    noLocation,
    onChangeLocation,
    onChangeNoLocation,
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

      {/* Right column: Location controls */}
      <div className="lf-col">
        <div className="lf-field">
          <label className="lf-label" htmlFor="lf-location">Location</label>
          <input
            id="lf-location"
            className="lf-input lf-control"
            type="text"
            value={location}
            onChange={e => onChangeLocation(e.target.value)}
            placeholder="e.g. Melbourne VIC"
            disabled={noLocation}
          />
          <label className="lf-label" htmlFor="lf-no-location" style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6 }}>
            <input
              id="lf-no-location"
              type="checkbox"
              checked={noLocation}
              onChange={e => onChangeNoLocation(e.target.checked)}
            />
            <span>Worldwide (no location filter)</span>
          </label>
        </div>
      </div>

      <div className="lf-button-row">
        <button 
        className="lf-btn-row" 
        type="submit" 
        aria-busy={loading} 
        disabled={!canSubmit} >
          {loading ? 'Finding…' : 'Find Jobs'}
        </button>
      </div>

      {!!error && showInlineError && (
        <div className="lf-error">{error}</div>
      )}
    </form>
  );
}
