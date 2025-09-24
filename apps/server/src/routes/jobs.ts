import type { FastifyInstance } from 'fastify';
import path from 'path';
import { bufferToText } from '../lib/cv.js';
import { saveRawJobs, saveScoredJobs } from '../services/job-db.js';
import type { CVAnalysis, JobItem, RankedJob } from '@shared/types';
import { buildJobRelevancePromptPreview } from '../services/prompt.js';
import {
  analyzeCVHeuristic,
  enrichAnalysisWithLLM,
  toJoraSearchUrls,
  dedupeJobs,
  filterByDays,
  preSortByKeywordSignals,
  scrapeWithRetry,
  scoreJobs,
} from '../services/cv.js';

export default async function registerJobsRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ ok: true }));

  app.post('/api/jobs/find', async (req, reply) => {
    try {
      const data = await (req as any).file();
      const fields = (data as any)?.fields || (req as any).body || {};
      const getField = (obj: any, key: string) => {
        const v = obj?.[key];
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object' && typeof v.value === 'string') return v.value;
        return undefined;
      };
      const location = getField(fields, 'location');
      const daysRaw = getField(fields, 'days');
      const days = daysRaw ? Math.max(1, Math.min(60, Number(daysRaw))) : undefined;
      const manualSearchUrl = getField(fields, 'searchUrl');
      const maxJobs = Number(process.env.MAX_JOBS || 40);

      if (!data) return reply.code(400).send({ error: 'cv file required' });
      if (!/\.(pdf|docx|txt)$/i.test(data.filename)) {
        return reply.code(400).send({ error: 'Unsupported file type. Allowed: pdf, docx, txt' });
      }

      const buf = await data.toBuffer();
      (req as any).log?.info?.({ filename: data.filename, bytes: buf.length, location, days }, 'cv upload received');
      const cvText = await bufferToText(data.filename, buf);

      let analysis: CVAnalysis = analyzeCVHeuristic(cvText);

      // Optional enrichment (summary + structured fields) using LLM
      analysis = await enrichAnalysisWithLLM(cvText, analysis, (req as any).log);
      const manualUrls = (manualSearchUrl && manualSearchUrl.trim()) ? [manualSearchUrl.trim()] : [];
      const searchUrls = manualUrls.length > 0
        ? manualUrls
        : toJoraSearchUrls(analysis, { location });
      const effectiveTitles = (analysis.titles && analysis.titles.length ? analysis.titles : ['software developer', 'frontend developer']).slice(0, 3);
      const effectiveSkills = (analysis.topSkills && analysis.topSkills.length ? analysis.topSkills.slice(0, 4) : []);
      ;(req as any).log?.info?.({ titles: effectiveTitles, topSkills: effectiveSkills, urlCount: searchUrls.length, urls: searchUrls }, 'queries built');

      const t0 = Date.now();
      const rawJobs = await scrapeWithRetry(searchUrls, {
        headless: (process.env.SCRAPER_HEADLESS || 'true') === 'true',
        maxPages: Number(process.env.MAX_PAGES || 3),
        maxJobs,
        totalTimeoutMs: process.env.SCRAPE_TOTAL_TIMEOUT_MS ? Number(process.env.SCRAPE_TOTAL_TIMEOUT_MS) : undefined,
      });
      const scrapeMs = Date.now() - t0;

      // Defensive de-dupe by canonical key (host + pathname, lowercase, no trailing slash)
      const rawJobsUnique = dedupeJobs(rawJobs);

      (req as any).log?.info?.({ scrapeMs, rawCount: rawJobs.length, uniqueCount: rawJobsUnique.length, deduped: rawJobs.length - rawJobsUnique.length }, 'scrape finished');

      if ((process.env.JOB_DB_WRITE || 'false') === 'false') {
        const dir = process.env.JOB_DB_DIR || path.resolve(process.cwd(), 'db');
        try {
          await saveRawJobs((req as any).id, dir, rawJobsUnique);
          (req as any).log?.info?.({ dir: path.join(dir, 'raw'), count: rawJobsUnique.length }, 'db write completed');
        } catch (err) {
          (req as any).log?.warn?.({ err }, 'db write failed');
        }
      }

      const filteredJobs = filterByDays(rawJobsUnique, days);
      const preSorted = preSortByKeywordSignals(filteredJobs, analysis);
      const maxScoreJobs = Math.max(0, Math.min(100, Number(process.env.LLM_MAX_SCORE_JOBS || 30)));
      const toScore = preSorted.slice(0, Math.min(filteredJobs.length, maxScoreJobs));
      const scored = await scoreJobs(analysis, toScore);

      if ((process.env.JOB_DB_WRITE || 'false') === 'false') {
        const dir = process.env.JOB_DB_DIR || path.resolve(process.cwd(), 'db');
        try {
          await saveScoredJobs((req as any).id, dir, scored as any);
          (req as any).log?.info?.({ dir: path.join(dir, 'scored'), count: scored.length }, 'db scored write completed');
        } catch (err) {
          (req as any).log?.warn?.({ err }, 'db scored write failed');
        }
      }

      const preview = buildJobRelevancePromptPreview(analysis);
      return reply.send({
        analysis,
        searchUrls,
        llmGoodTraits: (process.env.LLM_GOOD_TRAITS || '').trim(),
        llmBadTraits: (process.env.LLM_BAD_TRAITS || '').trim(),
        llmPromptUserPreview: preview?.user,
        llmPromptSystem: preview?.system,
        total: scored.length,
        results: scored,
      });
    } catch (err: any) {
      (req as any).log?.error?.({ err }, 'jobs.find failed');
      return reply.code(500).send({ error: 'Failed to process request' });
    }
  });

  // Rescore endpoint: accepts a user-edited analysis and a list of jobs to rescore
  app.post('/api/jobs/rescore', async (req, reply) => {
    try {
      const body = (req as any).body || {};
      const analysis = body.analysis as CVAnalysis | undefined;
      const jobs = Array.isArray(body.jobs) ? (body.jobs as JobItem[]) : [];
      if (!analysis || !Array.isArray(jobs) || jobs.length === 0) {
        return reply.code(400).send({ error: 'analysis and jobs are required' });
      }
      const scored: RankedJob[] = await scoreJobs(analysis, jobs);
      const preview = buildJobRelevancePromptPreview(analysis);
      return reply.send({
        total: scored.length,
        results: scored,
        llmPromptUserPreview: preview?.user,
        llmPromptSystem: preview?.system,
      });
    } catch (err: any) {
      (req as any).log?.error?.({ err }, 'jobs.rescore failed');
      return reply.code(500).send({ error: 'Failed to rescore' });
    }
  });
}
