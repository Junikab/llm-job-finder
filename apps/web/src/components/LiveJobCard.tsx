import React from 'react';
import type { RankedJob } from '@shared/types';
import { formatAppliedDate } from '../utils/date';

export type LiveJobCardProps = {
  job: RankedJob;
  jobKey?: string;
  isApplied: (key: string) => boolean;
  getAppliedAt: (key: string) => string | null;
  setApplied: (key: string, v: boolean) => void;
  isSaved: (key: string) => boolean;
  getSavedAt: (key: string) => string | null;
  setSaved: (key: string, v: boolean) => void;
};

export function LiveJobCard(props: LiveJobCardProps) {
  const { job, jobKey, isApplied, getAppliedAt, setApplied, isSaved, getSavedAt, setSaved } = props;
  const k = jobKey ?? ((job as any).key ?? job.id);
  const applied = isApplied(k);
  const appliedAtText = formatAppliedDate(getAppliedAt(k));
  const checkboxId = `applied-${k}`;
  const saved = isSaved(k);
  const savedAtText = formatAppliedDate(getSavedAt(k));
  const savedCheckboxId = `saved-${k}`;

  return (
    <li className="job-card">
      <div className="job-card__header">
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="job-card__titleLink">{job.title}</a>
        <div className="job-card__score">{Math.round(job.score)}/100</div>
      </div>
      <div className="job-card__metaRow">
        <div>{job.company} · {job.location} · {job.listedAgo}</div>
        <div className="job-card__togglesRow">
          <div className="job-card__appliedGroup">
            <input id={checkboxId} type="checkbox" checked={applied} onChange={(e) => setApplied(k, e.target.checked)} />
            <div className="job-card__appliedText">
              <label htmlFor={checkboxId} className="job-card__appliedLabel">Applied</label>
              {applied && appliedAtText && (
                <span className="job-card__appliedDate">{appliedAtText}</span>
              )}
            </div>
          </div>
          <div className="job-card__savedGroup">
            <input id={savedCheckboxId} type="checkbox" checked={saved} onChange={(e) => setSaved(k, e.target.checked)} />
            <div className="job-card__savedText">
              <label htmlFor={savedCheckboxId} className="job-card__savedLabel">Save for later</label>
              {saved && savedAtText && (
                <span className="job-card__savedDate">{savedAtText}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="job-card__reason">{job.reason}</div>
    </li>
  );
}
