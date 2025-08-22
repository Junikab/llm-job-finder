import path from 'path';
import fs from 'fs/promises';

export async function readJsonFiles(dir: string): Promise<any[]> {
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

export function pickLatest<T extends { [k: string]: any }>(arr: T[], dateKey: string): T | null {
  if (!arr.length) return null;
  return arr.reduce((best, x) => {
    const a = Date.parse((best as any)?.[dateKey] || '');
    const b = Date.parse((x as any)?.[dateKey] || '');
    return isNaN(a) || (!isNaN(b) && b > a) ? x : best;
  });
}

export function parseListedAgoToDays(text?: string): number | null {
  if (!text) return null;
  const m = text.match(/(\d+)\s*(day|days|d|week|weeks|w|hour|hours|h)/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit.startsWith('hour') || unit === 'h') return 0;
  if (unit.startsWith('week') || unit === 'w') return n * 7;
  return n;
}
