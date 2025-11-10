import { useCallback, useEffect, useMemo, useState } from 'react';

import { sendApplied } from '../api';

const STORAGE_KEY = 'appliedJobs:v1';
const STORAGE_KEY_AT = 'appliedJobsAt:v1';

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
  } catch (_e) { void 0; }
}

function loadDatesFromStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AT);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (obj && typeof obj === 'object') {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'string') out[k] = v;
      }
      return out;
    }
    return {};
  } catch {
    return {};
  }
}

function saveDatesToStorage(rec: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY_AT, JSON.stringify(rec));
  } catch (_e) { void 0; }
}

export function useAppliedJobs() {
  const [setState, setSetState] = useState<Set<string>>(() => loadFromStorage());
  const [atState, setAtState] = useState<Record<string, string>>(() => loadDatesFromStorage());

  // Derived memo for quick lookup
  const appliedSet = useMemo(() => setState, [setState]);

  const isApplied = useCallback((id: string) => appliedSet.has(id), [appliedSet]);
  const getAppliedAt = useCallback((id: string) => atState[id] ?? null, [atState]);

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
    // Track appliedAt locally
    setAtState(prev => {
      if (value) return { ...prev, [id]: new Date().toISOString() };
      const { [id]: _omit, ...rest } = prev;
      return rest;
    });
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
    setAtState(prev => {
      const willBeApplied = !appliedSet.has(id);
      if (willBeApplied) return { ...prev, [id]: new Date().toISOString() };
      const { [id]: _omit, ...rest } = prev;
      return rest;
    });
  }, [appliedSet]);

  // Persist on change
  useEffect(() => {
    saveToStorage(appliedSet);
  }, [appliedSet]);

  useEffect(() => {
    saveDatesToStorage(atState);
  }, [atState]);

  return { appliedSet, isApplied, setApplied, toggleApplied, getAppliedAt };
}
