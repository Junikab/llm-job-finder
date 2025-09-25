import { useEffect, useState } from 'react';

export type ProfileMeta = { id: string; label: string | null };

/**
 * Manage the active profile meta with localStorage persistence.
 * - Restores on mount from localStorage using the provided key (default 'activeProfileMeta:v1').
 * - setActiveProfileMeta persists and updates state.
 */
export function useActiveProfileMeta(storageKey: string = 'activeProfileMeta:v1') {
  const [activeProfileMeta, _setActiveProfileMeta] = useState<ProfileMeta | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const meta = JSON.parse(raw) as ProfileMeta | null;
      if (meta && typeof meta.id === 'string') {
        _setActiveProfileMeta({ id: meta.id, label: meta.label ?? null });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setActiveProfileMeta = (meta: ProfileMeta) => {
    _setActiveProfileMeta(meta);
    try {
      localStorage.setItem(storageKey, JSON.stringify(meta));
    } catch {}
  };

  return { activeProfileMeta, setActiveProfileMeta } as const;
}
