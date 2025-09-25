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
    <li className="job-card">
      {/* Header: title + big model score */}
      <div className="job-card__header">
        {job.url
          ? <a href={job.url} target="_blank" rel="noopener noreferrer" className="job-card__titleLink">{title}</a>
          : <span className="job-card__titleLink">{title}</span>
        }
        <div className="job-card__score">Model score: {modelScoreText}/100</div>
      </div>

      {/* Meta row: company · location · listedAgo + applied toggle */}
      <div className="job-card__metaRow">
        <div>{job.company || 'Unknown'} · {location || '—'} · {job.listedAgo || '—'}</div>
        <div className="job-card__appliedGroup">
          <input id={checkboxId} type="checkbox" checked={applied} onChange={(e) => onAppliedChange(e.target.checked)} />
          <div className="job-card__appliedText">
            <label htmlFor={checkboxId} className="job-card__appliedLabel">Applied</label>
            {applied && appliedAtText && (
              <span className="job-card__appliedDate">{appliedAtText}</span>
            )}
          </div>
        </div>
      </div>

      {/* Reason (when available) */}
      {!!reason && <div className="job-card__reason">{reason}</div>}

      {/* Rating control */}
      <div className="job-card__ratingRow">
        <label className="job-card__ratingLabel">
          <span className="job-card__ratingLabelText">Your score:</span>
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
          <span className="job-card__ratingValue">{draftScore}</span>
        </label>
      </div>
    </li>
  );
}
