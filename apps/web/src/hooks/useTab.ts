import { useEffect, useState } from 'react';

export function useTab() {
  const [tab, setTab] = useState<'live' | 'saved'>(() => {
    try {
      if (typeof window !== 'undefined') return (localStorage.getItem('tab') === 'saved' ? 'saved' : 'live');
    } catch {}
    return 'live';
  });

  useEffect(() => {
    try { localStorage.setItem('tab', tab); } catch {}
  }, [tab]);

  return { tab, setTab } as const;
}
