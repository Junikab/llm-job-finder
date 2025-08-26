import type { FastifyInstance } from 'fastify';
import path from 'path';
import pLimit from 'p-limit';
import { scrapeJora } from 'scraper';
import { bufferToText } from '../lib/cv.js';
import { parseListedAgoToDays } from '../lib/utils.js';
import { saveRawJobs, saveScoredJobs } from '../services/job-db.js';
import type { CVAnalysis, JobItem, RankedJob } from '../types.js';

function analyzeCV(cvText: string): CVAnalysis {
  const summary = cvText.slice(0, 200);
  const lower = cvText.toLowerCase();

  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const count = (phrase: string) => {
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
  urls.push(makeUrl([titleOr, ...skills].join(' ')));
  if (skills.length > 0) urls.push(makeUrl(`${titlesQuoted[0]} ${skills[0]}`));
  if (titlesQuoted.length > 1) urls.push(makeUrl(skills.length > 0 ? `${titlesQuoted[1]} ${skills[0]}` : `${titlesQuoted[1]}`));
  return Array.from(new Set(urls));
}

async function scoreJob(_analysis: CVAnalysis, _job: JobItem): Promise<Pick<RankedJob,'score'|'reason'>> {
  return { score: Math.floor(Math.random() * 101), reason: 'Mock score' };
}

export default async function registerJobsRoutes(app: FastifyInstance) {
  app.get('/health', async () => ({ ok: true }));

  app.post('/api/jobs/find', async (req, reply) => {
    try {
      const data = await (req as any).file();
      const fields = (data as any)?.fields || (req as any).body || {};
      const location = typeof fields.location === 'string' ? fields.location : undefined;
      const days = fields.days ? Math.max(1, Math.min(60, Number(fields.days))) : undefined;
      const maxJobs = Number(process.env.MAX_JOBS || 40);

      if (!data) return reply.code(400).send({ error: 'cv file required' });
      if (!/\.(pdf|docx|txt)$/i.test(data.filename)) {
        return reply.code(400).send({ error: 'Unsupported file type. Allowed: pdf, docx, txt' });
      }

      const buf = await data.toBuffer();
      (req as any).log?.info?.({ filename: data.filename, bytes: buf.length, location, days }, 'cv upload received');
      const cvText = await bufferToText(data.filename, buf);

      const analysis = analyzeCV(cvText);
      const searchUrls = toJoraSearchUrls(analysis, { location, days });
      const effectiveTitles = (analysis.titles && analysis.titles.length ? analysis.titles : ['software developer', 'frontend developer']).slice(0, 3);
      const effectiveSkills = (analysis.topSkills && analysis.topSkills.length ? analysis.topSkills.slice(0, 4) : []);
      ;(req as any).log?.info?.({ titles: effectiveTitles, topSkills: effectiveSkills, urlCount: searchUrls.length, urls: searchUrls }, 'queries built');

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
        (req as any).log?.warn?.({ err }, 'scrape attempt 1 failed, retrying once');
        rawJobs = await scrapeJora(searchUrls, {
          headless: (process.env.SCRAPER_HEADLESS || 'true') === 'true',
          maxPages: Number(process.env.MAX_PAGES || 3),
          maxJobs,
          totalTimeoutMs: process.env.SCRAPE_TOTAL_TIMEOUT_MS ? Number(process.env.SCRAPE_TOTAL_TIMEOUT_MS) : undefined,
        });
      }
      const scrapeMs = Date.now() - t0;
      (req as any).log?.info?.({ scrapeMs, rawCount: rawJobs.length }, 'scrape finished');

      if ((process.env.JOB_DB_WRITE || 'false') === 'false') {
        const dir = process.env.JOB_DB_DIR || path.resolve(process.cwd(), 'db');
        try {
          await saveRawJobs((req as any).id, dir, rawJobs);
          (req as any).log?.info?.({ dir: path.join(dir, 'raw'), count: rawJobs.length }, 'db write completed');
        } catch (err) {
          (req as any).log?.warn?.({ err }, 'db write failed');
        }
      }

      const filteredJobs = typeof days === 'number'
        ? rawJobs.filter(j => {
            const d = parseListedAgoToDays(j.listedAgo);
            return d === null || d <= days;
          })
        : rawJobs;

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
      scored.sort((a, b) => (b.score || 0) - (a.score || 0));

      if ((process.env.JOB_DB_WRITE || 'false') === 'false') {
        const dir = process.env.JOB_DB_DIR || path.resolve(process.cwd(), 'db');
        try {
          await saveScoredJobs((req as any).id, dir, scored as any);
          (req as any).log?.info?.({ dir: path.join(dir, 'scored'), count: scored.length }, 'db scored write completed');
        } catch (err) {
          (req as any).log?.warn?.({ err }, 'db scored write failed');
        }
      }

      return reply.send({ analysis, searchUrls, total: scored.length, results: scored });
    } catch (err: any) {
      (req as any).log?.error?.({ err }, 'jobs.find failed');
      return reply.code(500).send({ error: 'Failed to process request' });
    }
  });
}
