import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import { saveRawJobs, saveScoredJobs, listJobs, updateFeedback } from '../src/services/job-db.js';
import type { JobItem } from '../src/types.js';

let tmpDir: string;

async function rmrf(dir: string) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(entries.map(async (e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await rmrf(p);
      else await fs.unlink(p);
    }));
    await fs.rmdir(dir);
  } catch (e) {
    // ignore
  }
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jora-db-'));
});

afterEach(async () => {
  await rmrf(tmpDir);
});

function makeJob(id: string, title: string, url: string): JobItem {
  return { id, title, url, company: 'Acme', listedAgo: '1 day ago', description: 'Test' };
}

describe('job-db service', () => {
  it('saves raw jobs and lists them', async () => {
    const jobs: JobItem[] = [
      makeJob('https://au.jora.com/j/123', 'Software Engineer', 'https://au.jora.com/j/123'),
      makeJob('https://au.jora.com/j/456', 'Frontend Developer', 'https://au.jora.com/j/456'),
    ];
    await saveRawJobs('req-1', tmpDir, jobs);
    const listed = await listJobs(tmpDir);
    expect(listed.length).toBe(2);
    const keys = listed.map(j => j.key).sort();
    expect(keys[0]).toContain('/j/123');
    expect(keys[1]).toContain('/j/456');
  });

  it('prefers scored over raw and exposes modelScore', async () => {
    const j = makeJob('https://au.jora.com/j/999', 'Full Stack', 'https://au.jora.com/j/999');
    await saveRawJobs('req-1', tmpDir, [j]);
    await saveScoredJobs('req-2', tmpDir, [{ ...j, score: 87, reason: 'mock' }]);
    const listed = await listJobs(tmpDir);
    const found = listed.find(x => (x.url || '').includes('/j/999')) as any;
    expect(found).toBeTruthy();
    expect(found.modelScore).toBe(87);
  });

  it('updateFeedback updates latest record for a key', async () => {
    const j = makeJob('https://au.jora.com/j/777', 'Data Engineer', 'https://au.jora.com/j/777');
    await saveRawJobs('req-1', tmpDir, [j]);
    const res = await updateFeedback('req-3', tmpDir, j.url, 42);
    expect(res.updated).toBe(true);
    const listed = await listJobs(tmpDir);
    const found = listed.find(x => (x.url || '').includes('/j/777')) as any;
    expect(found).toBeTruthy();
    expect(found.userScore).toBe(42);
  });
});
