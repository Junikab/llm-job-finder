import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Load env from repo root so there is a single source of configuration.
const rootEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env');
dotenv.config({ path: rootEnvPath });

// Import routes AFTER dotenv so any env-derived constants in their modules
// (e.g. LLM_DEBUG) are computed with the correct values from .env
const { default: registerJobsRoutes } = await import('./routes/jobs.js');
const { default: registerDbRoutes } = await import('./routes/db.js');
const { default: registerProfileRoutes } = await import('./routes/profiles.js');

const app = Fastify({ logger: true });
await app.register(cors, { origin: process.env.NODE_ENV === 'production' ? (process.env.CORS_ORIGIN || false) : true });
await app.register(formbody);
await app.register(multipart, {
  // attachFieldsToBody disabled to support req.file() in dev testing
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
});

const PORT = Number(process.env.PORT || 5174);
// OpenAI disabled – using simple mocks for rapid iteration

// Register route modules
await app.register(registerJobsRoutes);
await app.register(registerDbRoutes);
await app.register(registerProfileRoutes);

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  console.log(`API listening on http://localhost:${PORT}`);
});
