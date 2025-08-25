import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import os from 'os';
import fs from 'fs/promises';
import path from 'path';
import registerDbRoutes from '../src/routes/db.js';
import { saveRawJobs, saveScoredJobs, listJobs } from '../src/services/job-db.js';

let tmpDir: string;
let prevEnvDir: string | undefined;

async function rmrf(dir: string) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(entries.map(async (e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await rmrf(p);
      else await fs.unlink(p);
    }));
    await fs.rmdir(dir);
  } catch {}
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'jora-db-routes-'));
  prevEnvDir = process.env.JOB_DB_DIR;
  process.env.JOB_DB_DIR = tmpDir;
});

afterEach(async () => {
  process.env.JOB_DB_DIR = prevEnvDir;
  await rmrf(tmpDir);
});

function buildApp() {
  const app = Fastify({ logger: false });
  app.register(registerDbRoutes);
  return app;
}

describe('routes/db', () => {
  it('GET /api/db/jobs returns aggregated jobs', async () => {
    // seed: one raw and one scored job (same id should prefer scored)
    const jobs = [
      { id: 'https://example.com/a', title: 'A', company: 'X', location: 'Sydney', url: 'https://example.com/a', listedAgo: '1 day ago', description: '...', score: 55, reason: 'ok' },
      { id: 'https://example.com/b', title: 'B', company: 'Y', location: 'Melbourne', url: 'https://example.com/b', listedAgo: '2 days ago', description: '...', score: 65, reason: 'good' },
    ];
    await saveRawJobs('t1', tmpDir, jobs as any);
    // score only first job
    const scored = [
      { ...jobs[0], score: 88, reason: 'great', modelScore: 88 },
    ];
    await saveScoredJobs('t1', tmpDir, scored as any);

    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/api/db/jobs' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results.length).toBe(2);
    const a = body.results.find((r: any) => r.key?.includes('example.com/a'));
    const b = body.results.find((r: any) => r.key?.includes('example.com/b'));
    expect(a.modelScore).toBe(88);
    expect(b.modelScore).toBe(null);
  });

  it('POST /api/db/feedback updates userScore and returns ok', async () => {
    // seed one scored job
    const job = { id: 'https://example.com/c', title: 'C', company: 'Z', location: 'Sydney', url: 'https://example.com/c', listedAgo: '3 days ago', description: '...', score: 70, reason: 'nice', modelScore: 70 };
    await saveScoredJobs('t2', tmpDir, [job] as any);

    const app = buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/db/feedback',
      payload: { jobId: job.id, userScore: 42 },
      headers: { 'content-type': 'application/json' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    // verify persisted aggregate reflects update
    const merged = await listJobs(tmpDir);
    const found = merged.find(m => m.key.includes('example.com/c'));
    expect(found?.userScore).toBe(42);
  });

  it('POST /api/db/feedback validates payload', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/db/feedback', payload: {}, headers: { 'content-type': 'application/json' } });
    expect(res.statusCode).toBe(400);
  });
});
