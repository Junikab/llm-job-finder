import React from 'react';
import type { CVAnalysis, Profile } from '@shared/types';
import { listProfiles, saveProfile } from '../api';
import '../styles/ProfileControls.css';

export type ProfileControlsProps = {
  draft: CVAnalysis | null;
  isEditing: boolean;
  onApplyProfile: (a: CVAnalysis) => void;
  onProfileLoadMeta?: (meta: { id: string; label: string | null }) => void;
};

/**
 * Minimal save/load controls for candidate profiles.
 * - Save profile persists the current analysis with an optional label
 * - Load profile applies a saved analysis to the editor draft
 */
export function ProfileControls({ draft, isEditing, onApplyProfile, onProfileLoadMeta }: ProfileControlsProps) {
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = React.useState('');
  const [profileLabel, setProfileLabel] = React.useState('');
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [loadingProfiles, setLoadingProfiles] = React.useState(false);

  // Load profiles when entering edit mode
  React.useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;
    setLoadingProfiles(true);
    (async () => {
      try {
        const items = await listProfiles();
        if (!cancelled) setProfiles(items);
      } finally {
        if (!cancelled) setLoadingProfiles(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isEditing]);

  async function handleSaveProfile() {
    if (!draft) return;
    try {
      setSavingProfile(true);
      const saved = await saveProfile({ label: profileLabel || undefined, analysis: draft });
      // Bubble up saved profile meta so parent can mark it as active
      onProfileLoadMeta?.({ id: saved.id, label: saved.label ?? null });
      setSelectedProfileId(saved.id);
      // Refresh list so the new/updated profile appears
      const items = await listProfiles();
      setProfiles(items);
      // keep label as-is; user may want to re-save quickly
    } finally {
      setSavingProfile(false);
    }
  }

  function handleLoadProfile() {
    const p = profiles.find(x => x.id === selectedProfileId);
    if (!p) return;
    onApplyProfile({ ...p.analysis });
    onProfileLoadMeta?.({ id: p.id, label: p.label ?? null });
  }

  if (!isEditing) return null;

  return (
    <div className="pc-container">
      <div className="pc-row">
        <select
          className="pc-select"
          value={selectedProfileId}
          onChange={e => setSelectedProfileId(e.target.value)}
          disabled={loadingProfiles}
        >
          <option value="">{loadingProfiles ? 'Loading profiles…' : 'Select profile'}</option>
          {profiles.map(p => (
            <option key={p.id} value={p.id}>{p.label || (p.analysis?.summary || '').slice(0, 24)}</option>
          ))}
        </select>
        <button className="pc-button" type="button" onClick={handleLoadProfile} disabled={!selectedProfileId}>Load</button>
      </div>
      <div className="pc-row">
        <input
          className="pc-input"
          type="text"
          placeholder="Profile label"
          value={profileLabel}
          onChange={e => setProfileLabel(e.target.value)}
        />
        <button className="pc-button" type="button" onClick={handleSaveProfile} disabled={savingProfile}>
          {savingProfile ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </div>
  );
}
