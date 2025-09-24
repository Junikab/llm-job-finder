import React from 'react';
import type { CVAnalysis, Profile } from '@shared/types';
import { listProfiles, saveProfile } from '../api';

export type ProfileControlsProps = {
  draft: CVAnalysis | null;
  isEditing: boolean;
  onApplyProfile: (a: CVAnalysis) => void;
};

/**
 * Minimal save/load controls for candidate profiles.
 * - Save profile persists the current analysis with an optional label
 * - Load profile applies a saved analysis to the editor draft
 */
export function ProfileControls({ draft, isEditing, onApplyProfile }: ProfileControlsProps) {
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
      await saveProfile({ label: profileLabel || undefined, analysis: draft });
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
  }

  if (!isEditing) return null;

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Profile label"
          value={profileLabel}
          onChange={e => setProfileLabel(e.target.value)}
          style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', minWidth: 160 }}
        />
        <button type="button" onClick={handleSaveProfile} disabled={savingProfile}>
          {savingProfile ? 'Saving…' : 'Save profile'}
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <select
          value={selectedProfileId}
          onChange={e => setSelectedProfileId(e.target.value)}
          disabled={loadingProfiles}
          style={{ padding: 6, borderRadius: 6, border: '1px solid #ddd', minWidth: 180 }}
        >
          <option value="">{loadingProfiles ? 'Loading profiles…' : 'Select profile'}</option>
          {profiles.map(p => (
            <option key={p.id} value={p.id}>{p.label || (p.analysis?.summary || '').slice(0, 24)}</option>
          ))}
        </select>
        <button type="button" onClick={handleLoadProfile} disabled={!selectedProfileId}>Load</button>
      </div>
    </div>
  );
}
