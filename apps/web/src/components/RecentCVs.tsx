import React from 'react';
import type { CVMeta } from '../idb';

export default function RecentCVs(props: {
  recent: CVMeta[];
  recentSelectedId: string;
  onChangeSelected: (id: string) => void;
  onUseSelected: () => void | Promise<void>;
  onRemoveSelected: () => void | Promise<void>;
  fullWidth?: boolean;
}) {
  const { recent, recentSelectedId, onChangeSelected, onUseSelected, onRemoveSelected, fullWidth = true } = props;
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' as any : undefined, display: 'flex', gap: 8, alignItems: 'center' }}>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span>Recent CVs</span>
        <select value={recentSelectedId} onChange={e => onChangeSelected(e.target.value)}>
          <option value="">Choose…</option>
          {recent.map(m => (
            <option key={m.id} value={String(m.id)}>
              {m.name} • {(m.size/1024).toFixed(0)} KB • {new Date(m.addedAt).toLocaleString()}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={onUseSelected} disabled={!recentSelectedId}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: recentSelectedId ? '#111' : '#ccc', color: '#fff' }}>
        Use selected
      </button>
      <button type="button" onClick={onRemoveSelected} disabled={!recentSelectedId}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7' }}>
        Remove
      </button>
    </div>
  );
}
