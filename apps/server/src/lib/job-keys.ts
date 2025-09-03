import { createHash } from 'crypto';

export function safeFileName(input: string): string {
  return input.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export function shortHash(input: string): string {
  return createHash('md5').update(input).digest('hex').slice(0, 8);
}

export function normalizeJobKey(value: string): string {
  const raw = String(value).trim();
  try {
    const u = raw.startsWith('http') ? new URL(raw) : new URL('https://' + raw.replace(/^\/+/, ''));
    const pathname = u.pathname.replace(/\/+$/, '');
    return `${u.host}${pathname}`.toLowerCase();
  } catch {
    const noQuery = raw.split('?')[0];
    return noQuery.replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
  }
}

export function getJobKey(rec: any): string | null {
  const v = (rec as any)?.id || (rec as any)?.data?.url || (rec as any)?.data?.id || null;
  return v ? normalizeJobKey(v) : null;
}
