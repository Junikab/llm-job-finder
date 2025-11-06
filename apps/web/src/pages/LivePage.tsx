import React from 'react';
import '../styles/LivePage.css';
import type { CVAnalysis, RankedJob } from '@shared/types';
import HeroSection from '../components/HeroSection';
import { ProfileControls } from '../components/ProfileControls';
import AnalysisHeader from '../components/AnalysisHeader';
import SortSelect from '../components/SortSelect';
import LiveResults from '../components/LiveResults';

export type LivePageProps = {
  results: RankedJob[];
  loading: boolean;
  sortBy: 'model' | 'recency';
  onChangeSortBy: (v: 'model' | 'recency') => void;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  location: string;
  worldwide: boolean;
  onChangeLocation: (v: string) => void;
  onChangeWorldwide: (v: boolean) => void;
  canSubmit: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  draftAnalysis: CVAnalysis | null;
  analysis: CVAnalysis | null;
  isEditingAnalysis: boolean;
  onApplyProfile: (a: CVAnalysis) => void;
  onProfileLoadMeta?: (meta: { id: string; label: string | null }) => void;
  searchUrls: string[];
  llmGoodTraits: string;
  llmBadTraits: string;
  llmPromptUserPreview?: string;
  llmPromptSystem?: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onChangeDraft: (next: CVAnalysis) => void;
  onRescore: () => void;
  rescoring: boolean;
  activeProfileMeta?: { id: string; label: string | null } | null;
};

export default function LivePage(props: LivePageProps) {
  const {
    results,
    loading,
    sortBy,
    onChangeSortBy,
    error,
    onSubmit,
    onFileChange,
    location,
    worldwide,
    onChangeLocation,
    onChangeWorldwide,
    canSubmit,
    fileInputRef,
    draftAnalysis,
    analysis,
    isEditingAnalysis,
    onApplyProfile,
    onProfileLoadMeta,
    searchUrls,
    llmGoodTraits,
    llmBadTraits,
    llmPromptUserPreview,
    llmPromptSystem,
    onStartEdit,
    onCancelEdit,
    onChangeDraft,
    onRescore,
    rescoring,
    activeProfileMeta,
  } = props;

  return (
    <>
      <HeroSection
        resultsCount={results.length}
        error={error}
        onSubmit={onSubmit}
        onFileChange={onFileChange}
        location={location}
        worldwide={worldwide}
        onChangeLocation={onChangeLocation}
        onChangeWorldwide={onChangeWorldwide}
        canSubmit={canSubmit}
        loading={loading}
        fileInputRef={fileInputRef}
      />

      <div className="content-container">
        <div className="livePage__profiles">
          <ProfileControls
            draft={draftAnalysis || analysis}
            isEditing={isEditingAnalysis}
            onApplyProfile={onApplyProfile}
            onProfileLoadMeta={onProfileLoadMeta}
          />
        </div>

        <AnalysisHeader
          analysis={analysis}
          searchUrls={searchUrls}
          llmGoodTraits={llmGoodTraits}
          llmBadTraits={llmBadTraits}
          llmPromptUserPreview={llmPromptUserPreview}
          llmPromptSystem={llmPromptSystem}
          draft={draftAnalysis}
          isEditing={isEditingAnalysis}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onChangeDraft={onChangeDraft}
          onRescore={onRescore}
          rescoring={rescoring}
          activeProfileMeta={activeProfileMeta}
        />

        <SortSelect sortBy={sortBy} onChange={onChangeSortBy} />

        <LiveResults results={results} loading={loading} sortBy={sortBy} />
      </div>
    </>
  );
}
