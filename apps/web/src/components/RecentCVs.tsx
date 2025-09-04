import React from 'react';
import type { CVMeta } from '../idb';

export default function RecentCVs(props: {
  recent: CVMeta[];
  recentSelectedId: string;
  onChangeSelected: (id: string) => void;
  onUseSelected: () => void | Promise<void>;
  fullWidth?: boolean;
}) {
  const { recent, recentSelectedId, onChangeSelected, onUseSelected, fullWidth = true } = props;
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' as any : undefined, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#334155', fontWeight: 600 }}>
        <span>Recent CVs</span>
        <select
          value={recentSelectedId}
          onChange={e => onChangeSelected(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', minWidth: 240 }}
        >
          <option value="">Choose…</option>
          {recent.map(m => (
            <option key={m.id} value={String(m.id)}>
              {m.name} • {(m.size/1024).toFixed(0)} KB • {new Date(m.addedAt).toLocaleString()}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={onUseSelected}
        disabled={!recentSelectedId}
        style={{ padding: '10px 12px', borderRadius: 8, border: 'none', background: recentSelectedId ? '#2a62ff' : '#a3b3ff', color: '#fff', fontWeight: 600 }}
      >
        Use selected
      </button>
    </div>
  );
}
