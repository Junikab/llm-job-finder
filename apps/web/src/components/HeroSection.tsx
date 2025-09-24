import React, { type RefObject, type ChangeEvent, type FormEvent } from 'react';
import LiveForm from './LiveForm';

export default function HeroSection(props: {
  resultsCount: number;
  error: string | null;
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
  fileInputRef?: RefObject<HTMLInputElement>;
}) {
  const {
    resultsCount,
    error,
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
    fileInputRef,
  } = props;

  return (
    <div className="hero">
      <div className="hero__inner">
        <h1 className="hero__title">Lets make it personal</h1>
        <LiveForm
          onSubmit={onSubmit}
          onFileChange={onFileChange}
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
        <div className="hero__hint">
          {resultsCount > 0 ? `We have ${resultsCount} job offers for you!` : 'Upload your CV and optionally pick a recent URL.'}
        </div>
        {!!error && (
          <div className="hero__error">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
