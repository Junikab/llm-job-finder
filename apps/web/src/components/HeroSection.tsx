import React, { type RefObject, type ChangeEvent, type FormEvent } from 'react';
import LiveForm from './LiveForm';

export default function HeroSection(props: {
  resultsCount: number;
  error: string | null;
  onSubmit: (e: FormEvent) => void;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  location: string;
  worldwide: boolean;
  onChangeLocation: (value: string) => void;
  onChangeWorldwide: (value: boolean) => void;
  canSubmit: boolean;
  loading: boolean;
  fileInputRef?: RefObject<HTMLInputElement>;
}) {
  const {
    resultsCount,
    error,
    onSubmit,
    onFileChange,
    location,
    worldwide,
    onChangeLocation,
    onChangeWorldwide,
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
          location={location}
          noLocation={worldwide}
          onChangeLocation={onChangeLocation}
          onChangeNoLocation={onChangeWorldwide}
          canSubmit={canSubmit}
          loading={loading}
          error={error}
          fileInputRef={fileInputRef}
          showInlineError={false}
        />
        <div className="hero__hint">
          {resultsCount > 0 ? `We have ${resultsCount} job offers for you!` : 'Upload your CV and add a location or choose Worldwide.'}
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
