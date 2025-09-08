import React from 'react';
import type { CVMeta } from '../idb';

export default function RecentCVs(props: {
  recent: CVMeta[];
  recentSelectedId: string;
  onChangeSelected: (id: string) => void;
  fullWidth?: boolean;
}) {
  const { recent, recentSelectedId, onChangeSelected } = props;
  const isEmpty = recent.length === 0;
  return (
    <div className="lf-field">
      <label className="lf-label" htmlFor="lf-recent-cv">Recent CVs</label>
      <select
        id="lf-recent-cv"
        className="lf-select lf-control"
        value={recentSelectedId}
        onChange={e => onChangeSelected(e.target.value)}
        disabled={isEmpty}
      >
        {isEmpty ? (
          <option value="">No recent CVs yet</option>
        ) : (
          <>
            <option value="">Choose…</option>
            {recent.map(m => (
              <option key={m.id} value={String(m.id)}>
                {m.name} • {(m.size/1024).toFixed(0)} KB • {new Date(m.addedAt).toLocaleString()}
              </option>
            ))}
          </>
        )}
      </select>
    </div>
  );
}
