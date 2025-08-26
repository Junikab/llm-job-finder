import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRecentCVs } from '../src/hooks/useRecentCVs';
import * as idb from '../src/idb';

vi.mock('../src/idb', () => ({
  listCVs: vi.fn(),
  saveCV: vi.fn(),
  getCVFile: vi.fn(),
  removeCV: vi.fn(),
}));

const meta = (id: number) => ({ id, name: `cv${id}.txt`, size: 10 * id, type: 'text/plain', addedAt: Date.now() - id });

describe('useRecentCVs', () => {
  beforeEach(() => {
    (idb.listCVs as any).mockReset();
    (idb.saveCV as any).mockReset();
    (idb.getCVFile as any).mockReset();
    (idb.removeCV as any).mockReset();
    (idb.listCVs as any).mockResolvedValue([]);
  });

  it('loads recent CVs on mount', async () => {
    const m1 = meta(1);
    (idb.listCVs as any).mockResolvedValue([m1]);
    const { result } = renderHook(() => useRecentCVs());
    await waitFor(() => expect(result.current.recent).toEqual([m1]));
  });

  it('onFileChange sets file and saves if new, then refreshes recent', async () => {
    const { result } = renderHook(() => useRecentCVs());

    const file = new File(['hello'], 'cv.txt', { type: 'text/plain' });

    // First listCVs call inside onFileChange (dedupe check) => empty
    ;(idb.listCVs as any).mockResolvedValueOnce([]);
    // After saveCV, refreshRecent triggers another listCVs => return one meta
    const m2 = meta(2);
    ;(idb.listCVs as any).mockResolvedValueOnce([m2]);

    await act(async () => {
      await result.current.onFileChange({ target: { files: [file] } } as any);
    });

    expect(idb.saveCV).toHaveBeenCalledOnce();
    expect(idb.saveCV).toHaveBeenCalledWith(file);
    expect(result.current.file).toBe(file);
    await waitFor(() => expect(result.current.recent).toEqual([m2]));
  });

  it('useSelectedRecent fetches file and sets it', async () => {
    const { result } = renderHook(() => useRecentCVs());
    const f = new File(['x'], 'stored.pdf', { type: 'application/pdf' });
    ;(idb.getCVFile as any).mockResolvedValue(f);

    act(() => {
      result.current.setRecentSelectedId('1');
    });

    await act(async () => {
      await result.current.useSelectedRecent();
    });

    expect(idb.getCVFile).toHaveBeenCalledWith(1);
    expect(result.current.file).toBe(f);
  });

  it('removeSelectedRecent removes and refreshes, clearing selection', async () => {
    const { result } = renderHook(() => useRecentCVs());

    // refresh recent after removal
    ;(idb.listCVs as any).mockResolvedValueOnce([]);

    act(() => {
      result.current.setRecentSelectedId('3');
    });

    await act(async () => {
      await result.current.removeSelectedRecent();
    });

    expect(idb.removeCV).toHaveBeenCalledWith(3);
    expect(result.current.recentSelectedId).toBe('');
    await waitFor(() => expect(result.current.recent).toEqual([]));
  });
});
