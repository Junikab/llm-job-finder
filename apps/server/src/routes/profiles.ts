import type { FastifyInstance } from 'fastify';
import path from 'path';
import type { CVAnalysis } from '@shared/types';
import { getProfile, listProfiles, saveProfile, touchProfile } from '../services/profile-db.js';

export default async function registerProfileRoutes(app: FastifyInstance) {
  // List profiles
  app.get('/api/profiles', async (req, reply) => {
    try {
      const dir = process.env.JOB_DB_DIR || path.resolve(process.cwd(), 'db');
      const items = await listProfiles(dir);
      return reply.send({ total: items.length, results: items });
    } catch (err) {
      (req as any).log?.error?.({ err }, 'profiles list failed');
      return reply.code(500).send({ error: 'Failed to list profiles' });
    }
  });

  // Get single profile by id
  app.get('/api/profiles/:id', async (req, reply) => {
    try {
      const id = (req.params as any)?.id?.toString();
      if (!id) return reply.code(400).send({ error: 'id required' });
      const dir = process.env.JOB_DB_DIR || path.resolve(process.cwd(), 'db');
      const p = await getProfile(dir, id);
      if (!p) return reply.code(404).send({ error: 'profile not found' });
      // touch last used
      await touchProfile(dir, id).catch(() => {});
      return reply.send(p);
    } catch (err) {
      (req as any).log?.error?.({ err }, 'profiles get failed');
      return reply.code(500).send({ error: 'Failed to get profile' });
    }
  });

  // Create or update a profile
  app.post('/api/profiles', async (req, reply) => {
    try {
      const body = (req as any).body || {};
      const id = body.id ? String(body.id) : undefined;
      const label = typeof body.label === 'string' ? body.label : undefined;
      const analysis = body.analysis as CVAnalysis | undefined;
      if (!analysis || typeof analysis.summary !== 'string') {
        return reply.code(400).send({ error: 'analysis with summary is required' });
      }
      const dir = process.env.JOB_DB_DIR || path.resolve(process.cwd(), 'db');
      const saved = await saveProfile((req as any).id, dir, { id, label, analysis });
      return reply.send(saved);
    } catch (err) {
      (req as any).log?.error?.({ err }, 'profiles save failed');
      return reply.code(500).send({ error: 'Failed to save profile' });
    }
  });
}
