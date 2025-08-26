import { useCallback, useEffect, useMemo, useState } from 'react';

export function useSearchUrl() {
  const [searchUrl, setSearchUrl] = useState<string>(() => (typeof window !== 'undefined' ? (localStorage.getItem('searchUrl') || '') : ''));
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('searchUrlHistory');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter((x: any) => typeof x === 'string').slice(0, 5) : [];
    } catch { return []; }
  });
  const [customMode, setCustomMode] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('searchUrl', searchUrl); } catch {}
  }, [searchUrl]);

  useEffect(() => {
    try { localStorage.setItem('searchUrlHistory', JSON.stringify(history.slice(0, 5))); } catch {}
  }, [history]);

  useEffect(() => {
    const inHistory = searchUrl && history.includes(searchUrl);
    setCustomMode(!!searchUrl && !inHistory);
  }, [searchUrl, history]);

  const updateHistory = useCallback((url: string) => {
    const su = (url || '').trim();
    if (!su) return;
    setHistory(prev => [su, ...prev.filter(u => u !== su)].slice(0, 5));
  }, []);

  const selectValue = useMemo(() => {
    if (customMode) return '__custom__';
    if (!searchUrl) return '';
    return history.includes(searchUrl) ? searchUrl : '__custom__';
  }, [customMode, searchUrl, history]);

  const onSelectChange = useCallback((value: string) => {
    if (value === '__custom__') {
      setCustomMode(true);
    } else {
      setCustomMode(false);
      setSearchUrl(value);
    }
  }, []);

  return {
    searchUrl,
    setSearchUrl,
    history,
    setHistory,
    customMode,
    setCustomMode,
    selectValue,
    onSelectChange,
    updateHistory,
  } as const;
}
