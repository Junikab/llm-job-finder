import React from 'react';
import type { SavedJob } from '@shared/types';

export type SavedJobCardProps = {
  job: SavedJob;
  jobKey: string; // stable key for applied toggle and element ids
  applied: boolean;
  appliedAtText: string | null;
  onAppliedChange: (checked: boolean) => void;
  draftScore: number;
  onDraftScoreChange: (value: number) => void;
  onCommitScore: () => void;
};

export default function SavedJobCard(props: SavedJobCardProps) {
  const { job, jobKey, applied, appliedAtText, onAppliedChange, draftScore, onDraftScoreChange, onCommitScore } = props;
  const checkboxId = `applied-${jobKey}`;
  const location = job.location || '';
  const reason = job.reason || '';
  const title = job.title || job.id;
  const modelScoreText = job.modelScore != null ? Math.round(job.modelScore) : '–';

  return (
    <li style={{ border: '1px solid #eee', borderRadius: 12, padding: 12 }}>
      {/* Header: title + big model score */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
        {job.url
          ? <a href={job.url} target="_blank" style={{ fontWeight: 600, color: '#0b5' }}>{title}</a>
          : <span style={{ fontWeight: 600 }}>{title}</span>
        }
        <div style={{ fontWeight: 700 }}>Model score: {modelScoreText}/100</div>
      </div>

      {/* Meta row: company · location · listedAgo + applied toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#555', marginTop: 4, gap: 8 }}>
        <div>{job.company || 'Unknown'} · {location || '—'} · {job.listedAgo || '—'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input id={checkboxId} type="checkbox" checked={applied} onChange={(e) => onAppliedChange(e.target.checked)} />
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 10 }}>
            <label htmlFor={checkboxId} style={{ fontSize: 12, color: '#222' }}>Applied</label>
            {applied && appliedAtText && (
              <span style={{ fontSize: 11, color: '#777' }}>{appliedAtText}</span>
            )}
          </div>
        </div>
      </div>

      {/* Reason (when available) */}
      {!!reason && <div style={{ marginTop: 8, color: '#333' }}>{reason}</div>}

      {/* Rating control */}
      <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 90, color: '#333' }}>Your score:</span>
          <input
            type="range"
            min={0}
            max={100}
            value={draftScore}
            onChange={e => onDraftScoreChange(Number(e.target.value))}
            onPointerUp={onCommitScore}
            onBlur={onCommitScore}
            style={{ width: 160 }}
          />
          <span style={{ width: 36, textAlign: 'right', color: '#333' }}>{draftScore}</span>
        </label>
      </div>
    </li>
  );
}
