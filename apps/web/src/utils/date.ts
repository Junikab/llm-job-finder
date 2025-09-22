export function parseListedDays(text?: string | null): number | null {
  if (!text) return null;
  const m = text.match(/(\d+)\s*(day|days|d|week|weeks|w|hour|hours|h)/i);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  if (unit.startsWith('hour') || unit === 'h') return 0;
  if (unit.startsWith('week') || unit === 'w') return n * 7;
  return n;
}

export function formatAppliedDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString();
  } catch {
    return null;
  }
}
