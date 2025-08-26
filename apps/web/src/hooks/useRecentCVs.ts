import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { listCVs, getCVFile, saveCV, removeCV, type CVMeta } from '../idb';

export function useRecentCVs() {
  const [file, setFile] = useState<File | null>(null);
  const [recent, setRecent] = useState<CVMeta[]>([]);
  const [recentSelectedId, setRecentSelectedId] = useState<string>('');

  const refreshRecent = useCallback(async () => {
    try {
      setRecent(await listCVs());
    } catch {}
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
      } catch {}
    }
  }, [refreshRecent]);

  const useSelectedRecent = useCallback(async () => {
    const id = parseInt(recentSelectedId, 10);
    if (!id) return;
    try {
      const f = await getCVFile(id);
      if (f) setFile(f);
    } catch {}
  }, [recentSelectedId]);

  const removeSelectedRecent = useCallback(async () => {
    const id = parseInt(recentSelectedId, 10);
    if (!id) return;
    try {
      await removeCV(id);
      setRecentSelectedId('');
      await refreshRecent();
    } catch {}
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
