import fs from 'fs/promises';
import path from 'path';

function getEnv(name: string, fallback?: string) {
  return process.env[name] ?? fallback;
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

async function main() {
  const dir = getEnv('JOB_DB_DIR', path.resolve(process.cwd(), 'db'))!;
  const outDir = path.join(dir, 'compiled');
  await fs.mkdir(outDir, { recursive: true });
  const all = await readJsonFiles(dir);
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
  const outPath = path.join(outDir, 'jobs-latest.json');
  await fs.writeFile(outPath, JSON.stringify({ total: merged.length, results: merged }, null, 2), 'utf8');
  console.log(`Wrote ${merged.length} jobs to ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
