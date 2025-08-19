
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import formbody from '@fastify/formbody';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import mammoth from 'mammoth';
// import pdfParse from 'pdf-parse';
import path from 'path';
import pLimit from 'p-limit';
import type { CVAnalysis, JobItem, RankedJob } from './types.js';
import { z } from 'zod';
import { scrapeJora } from 'scraper';

dotenv.config();

const app = Fastify({ logger: true });
await app.register(cors, { origin: process.env.NODE_ENV === 'production' ? (process.env.CORS_ORIGIN || false) : true });
await app.register(formbody);
await app.register(multipart, {
  attachFieldsToBody: true,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
});

const PORT = Number(process.env.PORT || 5174);
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- schemas ---
const CVAnalysisSchema = z.object({
  summary: z.string().min(1).max(1000),
  titles: z.array(z.string()).max(10).default([]),
  topSkills: z.array(z.string()).max(30).default([]),
  niceToHave: z.array(z.string()).max(30).default([]),
  locationHints: z.array(z.string()).optional()
});

const ScoreSchema = z.object({
  score: z.number().min(0).max(100),
  reason: z.string().min(1).max(2000)
});

// --- utils ---
async function bufferToText(filename: string, buf: Buffer): Promise<string> {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.pdf') {
    const pdfData = await pdfParse(buf);
    return pdfData.text;
  }
  if (ext === '.docx') {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value;
  }
  return buf.toString('utf8');
}

async function analyzeCV(cvText: string): Promise<CVAnalysis> {
  const prompt = `You are a recruitment analyst. Read the CV text and extract concise structured data.
Return JSON with keys: summary (2 sentences), titles (array of up to 6 likely job titles), topSkills (8-20 core hard skills), niceToHave (optional/secondary 3-10), locationHints (optional cities or regions).`;
  const content = `${prompt}\n\nCV:\n"""\n${cvText.slice(0, 10000)}\n"""`;

  const resp = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Return STRICT JSON only.' },
      { role: 'user', content }
    ],
    temperature: 0.2,
  });
  const raw = resp.choices[0]?.message?.content?.trim() || '{}';
  const parsed = CVAnalysisSchema.safeParse(JSON.parse(raw));
  if (parsed.success) return parsed.data;
  return { summary: cvText.slice(0, 200), titles: [], topSkills: [], niceToHave: [] };
}

function toJoraSearchUrls(analysis: CVAnalysis, opts: { location?: string; days?: number; }): string[] {
  const region = process.env.JORA_REGION || 'au';
  const base = `https://${region}.jora.com/j`;
  const titles = analysis.titles.length ? analysis.titles : ['software developer', 'frontend developer'];
  const qParts = [titles.slice(0, 3).join(' OR ')];
  if (analysis.topSkills?.length) {
    qParts.push(analysis.topSkills.slice(0, 4).join(' '));
  }
  const q = encodeURIComponent(qParts.join(' '));
  const l = encodeURIComponent(opts.location || (analysis.locationHints?.[0] || 'Sydney NSW'));
  const params = (extra: string = '') => `${base}?q=${q}&l=${l}${extra}`;
  const urls: string[] = [];
  urls.push(params());
  if (analysis.topSkills?.length) {
    const alt = encodeURIComponent(`${titles[0]} ${analysis.topSkills[0]}`);
    urls.push(`${base}?q=${alt}&l=${l}`);
  }
  return urls;
}

async function scoreJob(analysis: CVAnalysis, job: JobItem): Promise<Pick<RankedJob,'score'|'reason'>> {
  const prompt = `Score how well this job matches the candidate. Return JSON: {"score": 0-100, "reason": short string}. Consider alignment on title, seniority, stack/skills, location (soft), and responsibilities.`;
  const user = `CV Summary: ${analysis.summary}
Top Skills: ${analysis.topSkills?.join(', ') || 'n/a'}

JOB:
Title: ${job.title}
Company: ${job.company || ''}
Location: ${job.location || ''}
Desc: ${job.description?.slice(0, 3000) || ''}`;
  const r = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: 'json_object' },
    messages: [ { role: 'system', content: 'Return STRICT JSON only.' }, { role: 'user', content: `${prompt}\n\n${user}` } ],
    temperature: 0.2,
  });
  const raw = r.choices[0]?.message?.content?.trim() || '{}';
  const parsed = ScoreSchema.safeParse(JSON.parse(raw));
  if (parsed.success) return parsed.data;
  return { score: 50, reason: 'Heuristic default' };
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
    const fields = (req as any).body || {};
    const location = typeof fields.location === 'string' ? fields.location : undefined;
    const days = fields.days ? Math.max(1, Math.min(60, Number(fields.days))) : undefined;
    const maxJobs = Number(process.env.MAX_JOBS || 40);

    if (!data) return reply.code(400).send({ error: 'cv file required' });
    if (!/\.(pdf|docx|txt)$/i.test(data.filename)) {
      return reply.code(400).send({ error: 'Unsupported file type. Allowed: pdf, docx, txt' });
    }

    const buf = await data.toBuffer();
    const cvText = await bufferToText(data.filename, buf);

    const analysis = await analyzeCV(cvText);
    const searchUrls = toJoraSearchUrls(analysis, { location, days });

    const rawJobs: JobItem[] = await scrapeJora(searchUrls, {
      headless: (process.env.SCRAPER_HEADLESS || 'true') === 'true',
      maxPages: Number(process.env.MAX_PAGES || 3),
      maxJobs,
    });

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
    return reply.send({ analysis, searchUrls, total: scored.length, results: scored });
  } catch (err: any) {
    req.log.error({ err }, 'jobs.find failed');
    return reply.code(500).send({ error: 'Failed to process request' });
  }
});

app.get('/health', async () => ({ ok: true }));

app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  console.log(`API listening on http://localhost:${PORT}`);
});
