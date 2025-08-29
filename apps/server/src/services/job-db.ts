import path from 'path';
import fs from 'fs/promises';
import type { JobItem } from '../types.js';
import { normalizeJobKey, safeFileName, shortHash, getJobKey } from '../lib/job-keys.js';
import { readJsonFiles, pickLatest } from '../lib/utils.js';

export async function saveRawJobs(reqId: string, dir: string, rawJobs: JobItem[]) {
  const rawDir = path.join(dir, 'raw');
  await fs.mkdir(rawDir, { recursive: true });
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
      reqId,
      'job-description': (job as any).description ?? null,
      data: job,
    };
    await fs.writeFile(path.join(rawDir, fname), JSON.stringify(record, null, 2), 'utf8');
  }));
}

export async function saveScoredJobs(
  reqId: string,
  dir: string,
  scoredJobs: Array<JobItem & { score?: number; reason?: string }>
) {
  const scoredDir = path.join(dir, 'scored');
  await fs.mkdir(scoredDir, { recursive: true });
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
      reqId,
      'job-description': (job as any).description ?? null,
      reason: (job as any).reason ?? null,
      data: job,
    };
    await fs.writeFile(path.join(scoredDir, fname), JSON.stringify(record, null, 2), 'utf8');
  }));
}

export async function listJobs(dir: string) {
  const all = [
    ...(await readJsonFiles(dir)),
    ...(await readJsonFiles(path.join(dir, 'raw'))),
    ...(await readJsonFiles(path.join(dir, 'scored'))),
  ];
  const groups = new Map<string, any[]>();
  for (const rec of all) {
    const key = getJobKey(rec);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(rec);
  }
  const merged: any[] = [];
  for (const [key, arr] of groups) {
    const raw = pickLatest(arr.filter(r => r.scrapedAt), 'scrapedAt');
    const scored = pickLatest(arr.filter(r => r.scoredAt), 'scoredAt');
    const feedback = pickLatest(arr.filter(r => r.userScoredAt), 'userScoredAt');
    const base = scored || raw || arr[0];
    merged.push({
      id: base?.id || key,
      key,
      modelScore: scored?.modelScore ?? null,
      userScore: feedback?.userScore ?? null,
      title: base?.data?.title || base?.data?.jobTitle || null,
      url: base?.data?.url || null,
      company: base?.data?.company || null,
      listedAgo: base?.data?.listedAgo || null,
      source: base?.source || 'jora',
      data: base?.data || null,
    });
  }
  return merged;
}

export async function updateFeedback(reqId: string, dir: string, jobId: string, userScore: number) {
  const rawDir = path.join(dir, 'raw');
  const scoredDir = path.join(dir, 'scored');
  await fs.mkdir(rawDir, { recursive: true });
  await fs.mkdir(scoredDir, { recursive: true });
  const key = normalizeJobKey(jobId);

  // Find existing record files for this job key
  const scanDirs = [dir, rawDir, scoredDir];
  const matches: { path: string; rec: any }[] = [];
  for (const d of scanDirs) {
    let entries: any[] = [];
    try { entries = await fs.readdir(d, { withFileTypes: true }); } catch {}
    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith('.json')) continue;
      const filePath = path.join(d, e.name);
      try {
        const text = await fs.readFile(filePath, 'utf8');
        const rec = JSON.parse(text);
        const recKey = getJobKey(rec);
        if (recKey === key) matches.push({ path: filePath, rec });
      } catch {}
    }
  }

  // Choose target: prefer latest scored, else latest raw
  let target: { path: string; rec: any } | null = null;
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

  // As a last fallback, try the stable filenames if nothing matched (e.g. legacy files not yet present)
  if (!target) {
    const base = safeFileName(key);
    const candidates = [
      path.join(scoredDir, `${base}_${shortHash(key)}_scored.json`),
      path.join(rawDir, `${base}_${shortHash(key)}_raw.json`),
      // legacy locations
      path.join(dir, `${base}_${shortHash(key)}_scored.json`),
      path.join(dir, `${base}_${shortHash(key)}_raw.json`),
    ];
    for (const p of candidates) {
      try {
        const text = await fs.readFile(p, 'utf8');
        const rec = JSON.parse(text);
        target = { path: p, rec };
        break;
      } catch {}
    }
  }

  if (!target) {
    return { updated: false };
  }

  target.rec.userScoredAt = new Date().toISOString();
  target.rec.userScore = userScore;
  target.rec.reqId = reqId;
  await fs.writeFile(target.path, JSON.stringify(target.rec, null, 2), 'utf8');
  return { updated: true, file: target.path };
}
