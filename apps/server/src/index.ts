import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import dotenv from 'dotenv';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import path from 'path';
import fs from 'fs/promises';
import { createHash } from 'crypto';
import pLimit from 'p-limit';
import type { CVAnalysis, JobItem, RankedJob } from './types.js';
import { scrapeJora } from 'scraper';

dotenv.config();

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

// --- schemas ---
// (mock) schemas removed as OpenAI calls are disabled

// --- utils ---
async function bufferToText(filename: string, buf: Buffer): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') {
    const data: any = await pdfParse(buf);
    return data.text as string;
  }
  if (ext === '.docx') {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value;
  }
  return buf.toString('utf8');
}

function safeFileName(input: string): string {
  return input.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function shortHash(input: string): string {
  return createHash('md5').update(input).digest('hex').slice(0, 8);
}

async function readJsonFiles(dir: string): Promise<any[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries.filter(e => e.isFile() && e.name.endsWith('.json')).map(e => path.join(dir, e.name));
    const items = await Promise.all(files.map(async f => {
      try { return JSON.parse(await fs.readFile(f, 'utf8')); } catch { return null; }
    }));
    return items.filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeJobKey(value: string): string {
  const raw = String(value).trim();
  try {
    const u = raw.startsWith('http') ? new URL(raw) : new URL('https://' + raw.replace(/^\/+/, ''));
    return `${u.host}${u.pathname}`.toLowerCase();
  } catch {
    const noQuery = raw.split('?')[0];
    return noQuery.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
  }
}

function getJobKey(rec: any): string | null {
  const v = rec?.id || rec?.data?.url || rec?.data?.id || null;
  return v ? normalizeJobKey(v) : null;
}

function pickLatest<T extends { [k: string]: any }>(arr: T[], dateKey: string): T | null {
  if (!arr.length) return null;
  return arr.reduce((best, x) => {
    const a = Date.parse(best?.[dateKey] || '');
    const b = Date.parse(x?.[dateKey] || '');
    return isNaN(a) || (!isNaN(b) && b > a) ? x : best;
  });
}

async function analyzeCV(cvText: string): Promise<CVAnalysis> {
  // Step 2: tiny titles heuristic (skills left empty)
  const summary = cvText.slice(0, 200);
  const lower = cvText.toLowerCase();

  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const count = (phrase: string) => {
    // avoid lookbehind for broad Node compatibility
    const re = new RegExp(`(?:^|[^a-z0-9])${escapeRe(phrase)}(?:$|[^a-z0-9])`, 'g');
    return lower.match(re)?.length || 0;
  };

  const TITLE_SYNONYMS: Record<string, string> = {
    'software engineer': 'Software Engineer',
    'software developer': 'Software Developer',
    'frontend developer': 'Frontend Developer', 'front end developer': 'Frontend Developer', 'front-end developer': 'Frontend Developer', 'frontend engineer': 'Frontend Developer',
    'backend developer': 'Backend Developer', 'back end developer': 'Backend Developer', 'back-end developer': 'Backend Developer',
    'full stack developer': 'Full Stack Developer', 'full-stack developer': 'Full Stack Developer', 'fullstack developer': 'Full Stack Developer',
    'react developer': 'Frontend Developer', 'node developer': 'Backend Developer', 'node.js developer': 'Backend Developer',
    'data engineer': 'Data Engineer', 'devops engineer': 'DevOps Engineer',
    'site reliability engineer': 'Site Reliability Engineer', 'sre': 'Site Reliability Engineer',
    'qa engineer': 'QA Engineer', 'quality assurance engineer': 'QA Engineer', 'test engineer': 'QA Engineer',
    'mobile developer': 'Mobile Developer', 'ios developer': 'Mobile Developer', 'android developer': 'Mobile Developer',
  };

  const tallies = new Map<string, number>();
  for (const [syn, canon] of Object.entries(TITLE_SYNONYMS)) {
    const c = count(syn);
    if (c > 0) tallies.set(canon, (tallies.get(canon) || 0) + c);
  }
  const titles = Array.from(tallies.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([canon]) => canon)
    .slice(0, 3);

  // Tiny skills heuristic: map common synonyms to canonical skills and tally
  const SKILL_SYNONYMS: Record<string, string> = {
    'javascript': 'JavaScript', 'js': 'JavaScript',
    'typescript': 'TypeScript', 'ts': 'TypeScript',
    'react': 'React', 'react.js': 'React', 'reactjs': 'React',
    'node': 'Node.js', 'node.js': 'Node.js', 'nodejs': 'Node.js',
    'express': 'Express', 'express.js': 'Express',
    'next': 'Next.js', 'next.js': 'Next.js', 'nextjs': 'Next.js',
    'graphql': 'GraphQL',
    'rest': 'REST', 'restful': 'REST',
    'html': 'HTML', 'css': 'CSS', 'sass': 'Sass', 'scss': 'Sass',
    'webpack': 'Webpack', 'vite': 'Vite', 'babel': 'Babel',
    'jest': 'Jest', 'testing library': 'Testing Library', 'cypress': 'Cypress', 'playwright': 'Playwright',
    'docker': 'Docker', 'kubernetes': 'Kubernetes', 'k8s': 'Kubernetes',
    'aws': 'AWS', 'azure': 'Azure', 'gcp': 'GCP',
    'python': 'Python', 'django': 'Django', 'flask': 'Flask',
    'java': 'Java', 'spring': 'Spring',
    'go': 'Go', 'golang': 'Go',
    'postgres': 'PostgreSQL', 'postgresql': 'PostgreSQL', 'mysql': 'MySQL', 'sqlite': 'SQLite', 'mongodb': 'MongoDB', 'mongo': 'MongoDB',
    'ci/cd': 'CI/CD', 'ci cd': 'CI/CD',
  };

  const skillTallies = new Map<string, number>();
  for (const [syn, canon] of Object.entries(SKILL_SYNONYMS)) {
    const c = count(syn);
    if (c > 0) skillTallies.set(canon, (skillTallies.get(canon) || 0) + c);
  }
  const topSkills = Array.from(skillTallies.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([canon]) => canon)
    .slice(0, 8);

  return { summary, titles, topSkills, niceToHave: [] };
}

function toJoraSearchUrls(analysis: CVAnalysis, opts: { location?: string; days?: number; }): string[] {
  const region = process.env.JORA_REGION || 'au';
  const base = `https://${region}.jora.com/j`;
  const titlesRaw = (analysis.titles && analysis.titles.length ? analysis.titles : ['software developer', 'frontend developer']).slice(0, 3);
  const titlesQuoted = titlesRaw.map(t => `"${t}"`);
  const titleOr = titlesQuoted.length > 1 ? `(${titlesQuoted.join(' OR ')})` : titlesQuoted[0];

  const skills = (analysis.topSkills && analysis.topSkills.length ? analysis.topSkills.slice(0, 4) : []);
  const l = encodeURIComponent(opts.location || (analysis.locationHints?.[0] || 'Sydney NSW'));

  const makeUrl = (query: string) => {
    const q = encodeURIComponent(query.trim());
    return `${base}?q=${q}&l=${l}`;
  };

  const urls: string[] = [];
  // Variant 1: OR across titles + up to 4 skills
  urls.push(makeUrl([titleOr, ...skills].join(' ')));

  // Variant 2: first title + first skill
  if (skills.length > 0) {
    urls.push(makeUrl(`${titlesQuoted[0]} ${skills[0]}`));
  }

  // Variant 3: second title + first skill (or just second title)
  if (titlesQuoted.length > 1) {
    urls.push(makeUrl(skills.length > 0 ? `${titlesQuoted[1]} ${skills[0]}` : `${titlesQuoted[1]}`));
  }

  // Ensure uniqueness
  return Array.from(new Set(urls));
}

async function scoreJob(analysis: CVAnalysis, job: JobItem): Promise<Pick<RankedJob,'score'|'reason'>> {
  // Minimal mock: random score for quick iteration
  return { score: Math.floor(Math.random() * 101), reason: 'Mock score' };
}

function parseListedAgoToDays(text?: string): number | null {
  if (!text) return null;
  const m = text.match(/(\d+)\s*(day|days|d|week|weeks|w|hour|hours|h)/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit.startsWith('hour') || unit === 'h') return 0;
  if (unit.startsWith('week') || unit === 'w') return n * 7;
  return n;
}

app.post('/api/jobs/find', async (req, reply) => {
  try {
    const data = await req.file();
    const fields = (data as any)?.fields || (req as any).body || {};
    const location = typeof fields.location === 'string' ? fields.location : undefined;
    const days = fields.days ? Math.max(1, Math.min(60, Number(fields.days))) : undefined;
    const maxJobs = Number(process.env.MAX_JOBS || 40);

    if (!data) return reply.code(400).send({ error: 'cv file required' });
    if (!/\.(pdf|docx|txt)$/i.test(data.filename)) {
      return reply.code(400).send({ error: 'Unsupported file type. Allowed: pdf, docx, txt' });
    }

    const buf = await data.toBuffer();
    // Structured log for upload details (M1 acceptance)
    req.log.info({ filename: data.filename, bytes: buf.length, location, days }, 'cv upload received');
    const cvText = await bufferToText(data.filename, buf);

    const analysis = await analyzeCV(cvText);
    const searchUrls = toJoraSearchUrls(analysis, { location, days });
    // Step 1: add structured log for queries built (using effective fallbacks)
    const effectiveTitles = (analysis.titles && analysis.titles.length ? analysis.titles : ['software developer', 'frontend developer']).slice(0, 3);
    const effectiveSkills = (analysis.topSkills && analysis.topSkills.length ? analysis.topSkills.slice(0, 4) : []);
    req.log.info({ titles: effectiveTitles, topSkills: effectiveSkills, urlCount: searchUrls.length, urls: searchUrls }, 'queries built');

    const t0 = Date.now();
    let rawJobs: JobItem[];
    try {
      rawJobs = await scrapeJora(searchUrls, {
        headless: (process.env.SCRAPER_HEADLESS || 'true') === 'true',
        maxPages: Number(process.env.MAX_PAGES || 3),
        maxJobs,
        totalTimeoutMs: process.env.SCRAPE_TOTAL_TIMEOUT_MS ? Number(process.env.SCRAPE_TOTAL_TIMEOUT_MS) : undefined,
      });
    } catch (err) {
      req.log.warn({ err }, 'scrape attempt 1 failed, retrying once');
      rawJobs = await scrapeJora(searchUrls, {
        headless: (process.env.SCRAPER_HEADLESS || 'true') === 'true',
        maxPages: Number(process.env.MAX_PAGES || 3),
        maxJobs,
        totalTimeoutMs: process.env.SCRAPE_TOTAL_TIMEOUT_MS ? Number(process.env.SCRAPE_TOTAL_TIMEOUT_MS) : undefined,
      });
    }
    const scrapeMs = Date.now() - t0;
    req.log.info({ scrapeMs, rawCount: rawJobs.length }, 'scrape finished');

    // Step DB-1: optionally persist raw scraped jobs as per-job JSON files with empty modelScore
    if ((process.env.JOB_DB_WRITE || 'false') === 'true') {
      const dir = process.env.JOB_DB_DIR || path.resolve(process.cwd(), 'db');
      try {
        const rawDir = path.join(dir, 'raw');
        await fs.mkdir(rawDir, { recursive: true });
        await Promise.all(rawJobs.map(async (job, idx) => {
          const stableKey = normalizeJobKey(job.url || job.id || '');
          const base = safeFileName(stableKey || job.title || `job-${idx}`);
          const fname = `${base}_${shortHash(stableKey || base)}_raw.json`;
          const record = {
            id: stableKey || null,
            source: 'jora',
            scrapedAt: new Date().toISOString(),
            modelScore: null as number | null,
            userScore: null as number | null,
            reqId: (req as any).id,
            data: job,
          };
          await fs.writeFile(path.join(rawDir, fname), JSON.stringify(record, null, 2), 'utf8');
        }));
        req.log.info({ dir: path.join(dir, 'raw'), count: rawJobs.length }, 'db write completed');
      } catch (err) {
        req.log.warn({ err }, 'db write failed');
      }
    }

    // optional post-filter by days
    const filteredJobs = typeof days === 'number'
      ? rawJobs.filter(j => {
          const d = parseListedAgoToDays(j.listedAgo);
          return d === null || d <= days; // keep unknowns; drop clearly older
        })
      : rawJobs;

    // Pre-trim to reduce cost: keep top 30 by naive heuristic (title/skill match)
    const skills = new Set(analysis.topSkills.map(s => s.toLowerCase()));
    const titleTokens = new Set(analysis.titles.map(t => t.toLowerCase()));
    const heuristicSorted = [...filteredJobs].sort((a, b) => {
      const score = (j: JobItem) => {
        const t = (j.title || '').toLowerCase();
        let s = 0;
        for (const tok of titleTokens) if (t.includes(tok)) s += 2;
        for (const sk of skills) if ((j.description || '').toLowerCase().includes(sk)) s += 1;
        return s;
      };
      return score(b) - score(a);
    });
    const toScore = heuristicSorted.slice(0, Math.min(filteredJobs.length, 30));

    const limit = pLimit(3);
    const scored = await Promise.all(
      toScore.map(job => limit(async () => ({ ...job, ...(await scoreJob(analysis, job)) })))
    );
    scored.sort((a, b) => b.score - a.score);
    // Step DB-2: optionally persist scored jobs as per-job JSON files with modelScore filled
    if ((process.env.JOB_DB_WRITE || 'false') === 'true') {
      const dir = process.env.JOB_DB_DIR || path.resolve(process.cwd(), 'db');
      try {
        const scoredDir = path.join(dir, 'scored');
        await fs.mkdir(scoredDir, { recursive: true });
        await Promise.all(scored.map(async (job, idx) => {
          const stableKey = normalizeJobKey(((job as any).url || (job as any).id || '') as string);
          const base = safeFileName(stableKey || job.title || `job-${idx}`);
          const fname = `${base}_${shortHash(stableKey || base)}_scored.json`;
          const record = {
            id: stableKey || null,
            source: 'jora',
            scoredAt: new Date().toISOString(),
            modelScore: typeof job.score === 'number' ? job.score : null,
            userScore: null as number | null,
            reqId: (req as any).id,
            reason: job.reason,
            data: job,
          };
          await fs.writeFile(path.join(scoredDir, fname), JSON.stringify(record, null, 2), 'utf8');
        }));
        req.log.info({ dir: path.join(dir, 'scored'), count: scored.length }, 'db scored write completed');
      } catch (err) {
        req.log.warn({ err }, 'db scored write failed');
      }
    }
    return reply.send({ analysis, searchUrls, total: scored.length, results: scored });
  } catch (err: any) {
    req.log.error({ err }, 'jobs.find failed');
    return reply.code(500).send({ error: 'Failed to process request' });
  }
});

app.get('/health', async () => ({ ok: true }));

// DB-3: aggregate latest jobs from JSON snapshots
app.get('/api/db/jobs', async (req, reply) => {
  try {
    const dir = process.env.JOB_DB_DIR || path.resolve(process.cwd(), 'db');
    const all = [
      ...(await readJsonFiles(dir)),
      ...(await readJsonFiles(path.join(dir, 'raw'))),
      ...(await readJsonFiles(path.join(dir, 'scored'))),
    ];
    // group by job key
    const groups = new Map<string, any[]>();
    for (const rec of all) {
      const key = getJobKey(rec);
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(rec);
    }
    const merged = [] as any[];
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
    return reply.send({ total: merged.length, results: merged });
  } catch (err) {
    (req as any).log?.error?.({ err }, 'db list failed');
    return reply.code(500).send({ error: 'Failed to list db jobs' });
  }
});

// DB-3: accept user feedback (userScore) and update the existing job JSON (prefer scored) in-place
app.post('/api/db/feedback', async (req, reply) => {
  try {
    const body = (req as any).body || {};
    const jobId = body.jobId?.toString();
    const userScore = body.userScore != null ? Number(body.userScore) : null;
    if (!jobId || userScore == null || isNaN(userScore)) {
      return reply.code(400).send({ error: 'jobId and numeric userScore are required' });
    }
    const dir = process.env.JOB_DB_DIR || path.resolve(process.cwd(), 'db');
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
      return reply.code(404).send({ error: 'job record not found to update' });
    }

    // Update in-place
    target.rec.userScoredAt = new Date().toISOString();
    target.rec.userScore = userScore;
    target.rec.reqId = (req as any).id;
    await fs.writeFile(target.path, JSON.stringify(target.rec, null, 2), 'utf8');
    (req as any).log?.info?.({ jobId: key, userScore, file: target.path }, 'feedback updated');
    return reply.send({ ok: true });
  } catch (err) {
    (req as any).log?.error?.({ err }, 'feedback failed');
    return reply.code(500).send({ error: 'Failed to store feedback' });
  }
});

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  console.log(`API listening on http://localhost:${PORT}`);
});
