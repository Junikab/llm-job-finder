import React, { type RefObject, type ChangeEvent, type FormEvent } from 'react';
import LiveForm from './LiveForm';
import type { CVMeta } from '../idb';

export default function HeroSection(props: {
  resultsCount: number;
  error: string | null;
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
  fileInputRef?: RefObject<HTMLInputElement>;
}) {
  const {
    resultsCount,
    error,
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
    fileInputRef,
  } = props;

  return (
    <div
      style={{
        position: 'relative',
        backgroundImage:
          'linear-gradient( to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.45) ), url(https://images.unsplash.com/photo-1522120692533-91be08007f30?q=80&w=1800&auto=format&fit=crop)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'white',
        padding: '50px 15px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 980, margin: '0 auto', padding:'0 20px' }}>
        <h1 style={{ fontSize: 42, fontWeight: 800, margin: '0 0' }}>Lets make it personal</h1>
        <LiveForm
          onSubmit={onSubmit}
          onFileChange={onFileChange}
          recent={recent}
          recentSelectedId={recentSelectedId}
          onChangeRecentSelected={onChangeRecentSelected}
          searchUrlSelectValue={searchUrlSelectValue}
          searchUrlHistory={searchUrlHistory}
          searchUrlCustomMode={searchUrlCustomMode}
          setSearchUrlCustomMode={setSearchUrlCustomMode}
          searchUrl={searchUrl}
          onSearchUrlSelectChange={onSearchUrlSelectChange}
          onChangeSearchUrl={onChangeSearchUrl}
          canSubmit={canSubmit}
          loading={loading}
          error={error}
          fileInputRef={fileInputRef}
          showInlineError={false}
        />
        <div style={{ marginTop: 10, fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>
          {resultsCount > 0 ? `We have ${resultsCount} job offers for you!` : 'Upload your CV and optionally pick a recent URL.'}
        </div>
        {!!error && (
          <div style={{ marginTop: 10, background: 'rgba(239, 68, 68, 0.15)', color: '#fee', border: '1px solid rgba(239, 68, 68, 0.35)', padding: '8px 12px', borderRadius: 8, textAlign: 'left' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
