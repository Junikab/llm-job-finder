import { useEffect, useState } from 'react';

export type SavedSortKey = 'model' | 'user' | 'recency' | 'applied';

export type SavedFiltersState = {
  sortBy: SavedSortKey;
  query: string;
  appliedOnly: boolean;
  savedOnly: boolean;
};

const STORAGE_KEY = 'savedFilters:v1';

function load(): SavedFiltersState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sortBy: 'model', query: '', appliedOnly: false, savedOnly: false };
    const obj = JSON.parse(raw);
    return {
      sortBy: (obj?.sortBy as SavedSortKey) ?? 'model',
      query: String(obj?.query ?? ''),
      appliedOnly: Boolean(obj?.appliedOnly ?? false),
      savedOnly: Boolean(obj?.savedOnly ?? false),
    };
  } catch {
    return { sortBy: 'model', query: '', appliedOnly: false, savedOnly: false };
  }
}

function save(state: SavedFiltersState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function useSavedFilters() {
  const [state, setState] = useState<SavedFiltersState>(() => load());

  useEffect(() => { save(state); }, [state]);

  const setSortBy = (v: SavedSortKey) => setState(s => ({ ...s, sortBy: v }));
  const setQuery = (v: string) => setState(s => ({ ...s, query: v }));
  const setAppliedOnly = (v: boolean) => setState(s => ({ ...s, appliedOnly: v }));
  const setSavedOnly = (v: boolean) => setState(s => ({ ...s, savedOnly: v }));
  const clear = () => setState({ sortBy: 'model', query: '', appliedOnly: false, savedOnly: false });

  return { ...state, setSortBy, setQuery, setAppliedOnly, setSavedOnly, clear } as const;
}
