import path from 'path';
import type { JobItem, SavedJob } from '../types.js';
import { normalizeJobKey, safeFileName, shortHash } from '../lib/job-keys.js';
import { readJsonFiles, pickLatest } from '../lib/utils.js';
import { ensureDbDirs, selectUpdateTarget, writeRecord, groupByKey, type SnapshotRecord, type SnapshotJobData } from './job-db-utils.js';

export async function saveRawJobs(reqId: string, dir: string, rawJobs: JobItem[]) {
  const { raw: rawDir } = await ensureDbDirs(dir);
  await Promise.all(rawJobs.map(async (job, idx) => {
    const stableKey = normalizeJobKey(job.url || (job as any).id || '');
    const base = safeFileName(stableKey || job.title || `job-${idx}`);
    const fname = `${base}_${shortHash(stableKey || base)}_raw.json`;
    const record = {
      id: stableKey || null,
      source: 'jora',
      scrapedAt: new Date().toISOString(),
      modelScore: null as number | null,
      userScore: null as number | null,
      applied: null as boolean | null,
      reqId,
      'job-description': (job as any).description ?? null,
      data: job,
    };
    await writeRecord(path.join(rawDir, fname), record);
  }));
}

export async function updateApplied(reqId: string, dir: string, jobId: string, applied: boolean) {
  const dirs = await ensureDbDirs(dir);
  const key = normalizeJobKey(jobId);
  const target = await selectUpdateTarget(dirs, key);
  if (!target) return { updated: false };

  target.rec.appliedAt = new Date().toISOString();
  target.rec.applied = !!applied;
  target.rec.reqId = reqId;
  await writeRecord(target.path, target.rec);
  return { updated: true, file: target.path };
}

export async function saveScoredJobs(
  reqId: string,
  dir: string,
  scoredJobs: Array<JobItem & { score?: number; reason?: string }>
) {
  const { scored: scoredDir } = await ensureDbDirs(dir);
  await Promise.all(scoredJobs.map(async (job, idx) => {
    const stableKey = normalizeJobKey(job.url || (job as any).id || '');
    const base = safeFileName(stableKey || job.title || `job-${idx}`);
    const fname = `${base}_${shortHash(stableKey || base)}_scored.json`;
    const record = {
      id: stableKey || null,
      source: 'jora',
      scoredAt: new Date().toISOString(),
      modelScore: (job as any).score ?? null,
      userScore: null as number | null,
      applied: null as boolean | null,
      reqId,
      'job-description': (job as any).description ?? null,
      reason: (job as any).reason ?? null,
      data: job,
    };
    await writeRecord(path.join(scoredDir, fname), record);
  }));
}

export async function listJobs(dir: string): Promise<SavedJob[]> {
  const baseArr = await readJsonFiles(dir);
  const rawArr = await readJsonFiles(path.join(dir, 'raw'));
  const scoredArr = await readJsonFiles(path.join(dir, 'scored'));
  const all = [...baseArr, ...rawArr, ...scoredArr] as SnapshotRecord[];
  const groups = groupByKey(all);
  const merged: SavedJob[] = [];
  for (const [key, arr] of groups) {
    const raw = pickLatest(arr.filter(r => r.scrapedAt), 'scrapedAt');
    const scored = pickLatest(arr.filter(r => r.scoredAt), 'scoredAt');
    const feedback = pickLatest(arr.filter(r => r.userScoredAt), 'userScoredAt');
    const appliedRec = pickLatest(arr.filter(r => r.appliedAt), 'appliedAt');
    const base = scored || raw || arr[0];
    const data = (base?.data ?? null) as SnapshotJobData | null;
    merged.push({
      id: base?.id || key,
      key,
      modelScore: scored?.modelScore ?? null,
      userScore: feedback?.userScore ?? null,
      applied: (appliedRec && typeof appliedRec.applied !== 'undefined') ? !!appliedRec.applied : (base?.applied ?? null),
      appliedAt: appliedRec?.appliedAt ?? (base?.appliedAt ?? null),
      title: data?.title || data?.jobTitle || null,
      url: data?.url || null,
      company: data?.company || null,
      location: data?.location || null,
      listedAgo: data?.listedAgo || null,
      reason: scored?.reason ?? null,
      source: base?.source || 'jora',
      data: data || null,
    });
  }
  return merged;
}

export async function updateFeedback(reqId: string, dir: string, jobId: string, userScore: number) {
  const dirs = await ensureDbDirs(dir);
  const key = normalizeJobKey(jobId);
  const target = await selectUpdateTarget(dirs, key);
  if (!target) return { updated: false };

  target.rec.userScoredAt = new Date().toISOString();
  target.rec.userScore = userScore;
  target.rec.reqId = reqId;
  await writeRecord(target.path, target.rec);
  return { updated: true, file: target.path };
}
