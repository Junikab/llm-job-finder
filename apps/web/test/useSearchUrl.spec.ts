import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearchUrl } from '../src/hooks/useSearchUrl';

describe('useSearchUrl', () => {
  beforeEach(() => {
    // reset storage
    localStorage.clear();
  });

  it('initializes from localStorage and persists changes', async () => {
    localStorage.setItem('searchUrl', 'https://jora/A');
    localStorage.setItem('searchUrlHistory', JSON.stringify(['https://jora/A']));

    const { result } = renderHook(() => useSearchUrl());

    expect(result.current.searchUrl).toBe('https://jora/A');
    expect(result.current.history).toEqual(['https://jora/A']);
    expect(result.current.customMode).toBe(false);
    expect(result.current.selectValue).toBe('https://jora/A');

    act(() => {
      result.current.setSearchUrl('https://jora/B');
    });

    // selectValue goes to '__custom__' as B not in history
    expect(result.current.selectValue).toBe('__custom__');
    expect(localStorage.getItem('searchUrl')).toBe('https://jora/B');
  });

  it('updateHistory dedupes and caps at 5', async () => {
    const { result } = renderHook(() => useSearchUrl());

    act(() => {
      result.current.updateHistory('u1');
      result.current.updateHistory('u2');
      result.current.updateHistory('u3');
      result.current.updateHistory('u4');
      result.current.updateHistory('u5');
      result.current.updateHistory('u2'); // move to front
      result.current.updateHistory('u6'); // cap to 5
    });

    expect(result.current.history).toEqual(['u6', 'u2', 'u5', 'u4', 'u3']);
    expect(JSON.parse(localStorage.getItem('searchUrlHistory') || '[]')).toEqual(['u6', 'u2', 'u5', 'u4', 'u3']);
  });

  it('onSelectChange toggles custom mode and sets URL from history', async () => {
    localStorage.setItem('searchUrlHistory', JSON.stringify(['h1']));
    const { result } = renderHook(() => useSearchUrl());

    act(() => {
      result.current.onSelectChange('h1');
    });
    expect(result.current.searchUrl).toBe('h1');
    expect(result.current.customMode).toBe(false);

    act(() => {
      result.current.onSelectChange('__custom__');
    });
    expect(result.current.customMode).toBe(true);
  });
});
