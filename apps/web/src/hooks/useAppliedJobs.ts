import { useCallback, useEffect, useMemo, useState } from 'react';
import { sendApplied } from '../api';

const STORAGE_KEY = 'appliedJobs:v1';

function loadFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map(String));
    if (arr && typeof arr === 'object') return new Set(Object.keys(arr));
    return new Set();
  } catch {
    return new Set();
  }
}

function saveToStorage(set: Set<string>) {
  try {
    const arr = Array.from(set.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch {}
}

export function useAppliedJobs() {
  const [setState, setSetState] = useState<Set<string>>(() => loadFromStorage());

  // Derived memo for quick lookup
  const appliedSet = useMemo(() => setState, [setState]);

  const isApplied = useCallback((id: string) => appliedSet.has(id), [appliedSet]);

  const setApplied = useCallback((id: string, value: boolean) => {
    setSetState(prev => {
      const next = new Set(prev);
      if (value) next.add(id); else next.delete(id);
      return next;
    });
    // Best-effort persist to server DB snapshots
    (async () => {
      try { await sendApplied(id, value); } catch { /* ignore network/db errors */ }
    })();
  }, []);

  const toggleApplied = useCallback((id: string) => {
    setSetState(prev => {
      const next = new Set(prev);
      const willBeApplied = !next.has(id);
      if (willBeApplied) next.add(id); else next.delete(id);
      // Best-effort persist to server DB snapshots
      (async () => {
        try { await sendApplied(id, willBeApplied); } catch { /* ignore */ }
      })();
      return next;
    });
  }, []);

  // Persist on change
  useEffect(() => {
    saveToStorage(appliedSet);
  }, [appliedSet]);

  return { appliedSet, isApplied, setApplied, toggleApplied };
}
