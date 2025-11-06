import path from 'path';
import fs from 'fs/promises';
import { getJobKey, safeFileName, shortHash } from '../lib/job-keys.js';
import type { JobItem } from '@shared/types';

export type DbDirs = { base: string; raw: string; scored: string };

/** Snapshot JSON shape we persist in db/raw and db/scored. */
export type SnapshotJobData = Partial<JobItem> & { jobTitle?: string };

export type SnapshotRecord = {
  id: string | null;
  source: string;
  scrapedAt?: string; // raw snapshot timestamp
  scoredAt?: string;  // scored snapshot timestamp
  applied?: boolean | null;
  appliedAt?: string | null;
  saved?: boolean | null;
  savedAt?: string | null;
  userScore?: number | null;
  userScoredAt?: string | null;
  reqId?: string;
  'job-description'?: string | null;
  reason?: string | null;
  modelScore?: number | null;
  data?: SnapshotJobData | null;
};

export type RecordMatch = { path: string; rec: SnapshotRecord };

/** Ensure raw/ and scored/ subdirectories exist; returns useful dir paths. */
export async function ensureDbDirs(baseDir: string): Promise<DbDirs> {
  const raw = path.join(baseDir, 'raw');
  const scored = path.join(baseDir, 'scored');
  await fs.mkdir(raw, { recursive: true });
  await fs.mkdir(scored, { recursive: true });
  return { base: baseDir, raw, scored };
}

/** Group snapshot records by their normalized job key. */
export function groupByKey(records: SnapshotRecord[]): Map<string, SnapshotRecord[]> {
  const groups = new Map<string, SnapshotRecord[]>();
  for (const rec of records) {
    const key = getJobKey(rec);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(rec);
  }
  return groups;
}

/** Scan base/, base/raw, base/scored for JSON files belonging to the given normalized job key. */
export async function collectMatchesByKey(dirs: DbDirs, normalizedKey: string): Promise<RecordMatch[]> {
  const scanDirs = [dirs.base, dirs.raw, dirs.scored];
  const matches: RecordMatch[] = [];
  for (const d of scanDirs) {
    let entries: any[] = [];
    try { entries = await fs.readdir(d, { withFileTypes: true }); } catch {}
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith('.json')) continue;
      const filePath = path.join(d, e.name);
      try {
        const text = await fs.readFile(filePath, 'utf8');
        const rec = JSON.parse(text) as SnapshotRecord;
        const recKey = getJobKey(rec);
        if (recKey === normalizedKey) matches.push({ path: filePath, rec });
      } catch {}
    }
  }
  return matches;
}

/** Pick the newest scored record; if none, pick the newest raw record. */
export function chooseLatestTarget(matches: RecordMatch[]): RecordMatch | null {
  let target: RecordMatch | null = null;
  for (const m of matches) {
    if (m.rec?.scoredAt) {
      if (!target || Date.parse(m.rec.scoredAt) > Date.parse(target.rec.scoredAt || '')) target = m;
    }
  }
  if (!target) {
    for (const m of matches) {
      if (m.rec?.scrapedAt) {
        if (!target || Date.parse(m.rec.scrapedAt) > Date.parse(target.rec.scrapedAt || '')) target = m;
      }
    }
  }
  return target;
}

/**
 * Fallback: if scanning didn't find a record, try the stable filenames for the normalized key
 * in scored/, raw/, and legacy base/ locations.
 */
export async function findStableCandidate(dirs: DbDirs, normalizedKey: string): Promise<RecordMatch | null> {
  const base = safeFileName(normalizedKey);
  const candidates = [
    path.join(dirs.scored, `${base}_${shortHash(normalizedKey)}_scored.json`),
    path.join(dirs.raw, `${base}_${shortHash(normalizedKey)}_raw.json`),
    // legacy locations
    path.join(dirs.base, `${base}_${shortHash(normalizedKey)}_scored.json`),
    path.join(dirs.base, `${base}_${shortHash(normalizedKey)}_raw.json`),
  ];
  for (const p of candidates) {
    try {
      const text = await fs.readFile(p, 'utf8');
      const rec = JSON.parse(text) as SnapshotRecord;
      return { path: p, rec };
    } catch {}
  }
  return null;
}

/** Full selection pipeline used by update mutations. */
export async function selectUpdateTarget(dirs: DbDirs, normalizedKey: string): Promise<RecordMatch | null> {
  const matches = await collectMatchesByKey(dirs, normalizedKey);
  const latest = chooseLatestTarget(matches);
  if (latest) return latest;
  return await findStableCandidate(dirs, normalizedKey);
}

/** Persist JSON with pretty formatting. */
export async function writeRecord(filePath: string, rec: SnapshotRecord) {
  await fs.writeFile(filePath, JSON.stringify(rec, null, 2), 'utf8');
}
