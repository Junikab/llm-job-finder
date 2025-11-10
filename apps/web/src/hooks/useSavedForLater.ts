import { useCallback, useEffect, useMemo, useState } from 'react';

import { sendSaved } from '../api';

const STORAGE_KEY = 'savedForLater:v1';
const STORAGE_KEY_AT = 'savedForLaterAt:v1';

function loadSet(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map(String));
    if (arr && typeof arr === 'object') return new Set(Object.keys(arr as Record<string, unknown>));
    return new Set();
  } catch {
    return new Set();
  }
}

function saveSet(s: Set<string>) {
  try {
    const arr = Array.from(s.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch (_e) { void 0; }
}

function loadDates(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AT);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (typeof v === 'string') out[k] = v;
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

function saveDates(rec: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY_AT, JSON.stringify(rec));
  } catch (_e) { void 0; }
}

export function useSavedForLater() {
  const [setState, setSetState] = useState<Set<string>>(() => loadSet());
  const [atState, setAtState] = useState<Record<string, string>>(() => loadDates());

  const savedSet = useMemo(() => setState, [setState]);

  const isSaved = useCallback((id: string) => savedSet.has(id), [savedSet]);
  const getSavedAt = useCallback((id: string) => atState[id] ?? null, [atState]);

  const setSaved = useCallback((id: string, value: boolean) => {
    setSetState(prev => {
      const next = new Set(prev);
      if (value) next.add(id); else next.delete(id);
      return next;
    });
    // Best-effort persist to server DB snapshots
    (async () => {
      try { await sendSaved(id, value); } catch { /* ignore network/db errors */ }
    })();
    setAtState(prev => {
      if (value) return { ...prev, [id]: new Date().toISOString() };
      const { [id]: _omit, ...rest } = prev;
      return rest;
    });
  }, []);

  const toggleSaved = useCallback((id: string) => {
    setSetState(prev => {
      const next = new Set(prev);
      const willBeSaved = !next.has(id);
      if (willBeSaved) next.add(id); else next.delete(id);
      // Best-effort persist to server DB snapshots
      (async () => {
        try { await sendSaved(id, willBeSaved); } catch { /* ignore */ }
      })();
      return next;
    });
    setAtState(prev => {
      const willBeSaved = !savedSet.has(id);
      if (willBeSaved) return { ...prev, [id]: new Date().toISOString() };
      const { [id]: _omit, ...rest } = prev;
      return rest;
    });
  }, [savedSet]);

  useEffect(() => { saveSet(savedSet); }, [savedSet]);
  useEffect(() => { saveDates(atState); }, [atState]);

  return { savedSet, isSaved, setSaved, toggleSaved, getSavedAt } as const;
}
