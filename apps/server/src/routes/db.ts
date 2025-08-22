import type { FastifyInstance } from 'fastify';
import path from 'path';
import { listJobs, updateFeedback } from '../services/job-db.js';

export default async function registerDbRoutes(app: FastifyInstance) {
  // Aggregate latest jobs from JSON snapshots
  app.get('/api/db/jobs', async (req, reply) => {
    try {
      const dir = process.env.JOB_DB_DIR || path.resolve(process.cwd(), 'db');
      const merged = await listJobs(dir);
      return reply.send({ total: merged.length, results: merged });
    } catch (err) {
      (req as any).log?.error?.({ err }, 'db list failed');
      return reply.code(500).send({ error: 'Failed to list db jobs' });
    }
  });

  // Accept user feedback and update existing job JSON (prefer scored)
  app.post('/api/db/feedback', async (req, reply) => {
    try {
      const body = (req as any).body || {};
      const jobId = body.jobId?.toString();
      const userScore = body.userScore != null ? Number(body.userScore) : null;
      if (!jobId || userScore == null || isNaN(userScore)) {
        return reply.code(400).send({ error: 'jobId and numeric userScore are required' });
      }
      const dir = process.env.JOB_DB_DIR || path.resolve(process.cwd(), 'db');
      const result = await updateFeedback((req as any).id, dir, jobId, userScore);
      if (!result.updated) {
        return reply.code(404).send({ error: 'job record not found to update' });
      }
      (req as any).log?.info?.({ jobId, userScore, file: result.file }, 'feedback updated');
      return reply.send({ ok: true });
    } catch (err) {
      (req as any).log?.error?.({ err }, 'feedback failed');
      return reply.code(500).send({ error: 'Failed to store feedback' });
    }
  });
}
