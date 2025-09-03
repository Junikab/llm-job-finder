import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { listCVs, getCVFile, saveCV, removeCV, type CVMeta } from '../idb';

export function useRecentCVs() {
  const [file, setFile] = useState<File | null>(null);
  const [recent, setRecent] = useState<CVMeta[]>([]);
  const [recentSelectedId, setRecentSelectedId] = useState<string>('');

  // Best-effort: request persistent storage so browsers are less likely to clear data
  useEffect(() => {
    (async () => {
      try {
        if (typeof navigator !== 'undefined' && (navigator as any).storage?.persist) {
          await (navigator as any).storage.persist();
        }
      } catch (e) {
        console.warn('recentCVs: storage.persist() failed', e);
      }
    })();
  }, []);

  const refreshRecent = useCallback(async () => {
    try {
      setRecent(await listCVs());
    } catch (e) {
      console.warn('recentCVs: list failed', e);
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    refreshRecent();
  }, [refreshRecent]);

  const onFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      try {
        const existing = await listCVs();
        const has = existing.some(m => m.name === f.name && m.size === f.size);
        if (!has) await saveCV(f);
        await refreshRecent();
      } catch (e1) {
        console.warn('recentCVs: save/list failed, attempting direct save', e1);
        try {
          await saveCV(f);
          await refreshRecent();
        } catch (e2) {
          console.warn('recentCVs: direct save failed', e2);
        }
      }
    }
  }, [refreshRecent]);

  const useSelectedRecent = useCallback(async () => {
    const id = parseInt(recentSelectedId, 10);
    if (!id) return;
    try {
      const f = await getCVFile(id);
      if (f) setFile(f);
    } catch (e) {
      console.warn('recentCVs: get selected failed', e);
    }
  }, [recentSelectedId]);

  const removeSelectedRecent = useCallback(async () => {
    const id = parseInt(recentSelectedId, 10);
    if (!id) return;
    try {
      await removeCV(id);
      setRecentSelectedId('');
      await refreshRecent();
    } catch (e) {
      console.warn('recentCVs: remove failed', e);
    }
  }, [recentSelectedId, refreshRecent]);

  return {
    file,
    setFile,
    recent,
    recentSelectedId,
    setRecentSelectedId,
    refreshRecent,
    onFileChange,
    useSelectedRecent,
    removeSelectedRecent,
  } as const;
}
