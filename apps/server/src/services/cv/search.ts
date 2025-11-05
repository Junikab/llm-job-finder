import type { CVAnalysis } from '@shared/types';

export function toJoraSearchUrls(analysis: CVAnalysis, opts: { location?: string }): string[] {
  const region = process.env.JORA_REGION || 'au';
  const base = `https://${region}.jora.com/j`;
  const titlesRaw = (analysis.titles && analysis.titles.length ? analysis.titles : ['software developer', 'frontend developer']).slice(0, 3);
  const queryMode = (process.env.SEARCH_QUERY_MODE || 'rich').toLowerCase(); // 'rich' | 'simple'

  // Determine effective location strictly from user choice:
  // - If opts.location is an empty string, treat as "no location" (omit &l param)
  // - Else use explicit opts.location if provided
  // - Else if analysis.worldwide is true, omit &l
  // - Else omit &l (no fallback or hints)
  const locRaw = (opts.location !== undefined) ? opts.location : (analysis.worldwide ? '' : undefined);
  const locParam = (typeof locRaw === 'string' && locRaw !== '') ? `&l=${encodeURIComponent(locRaw)}` : '';

  const makeUrl = (query: string) => {
    const q = encodeURIComponent(query.trim());
    return `${base}?q=${q}${locParam}`;
  };

  if (queryMode === 'simple') {
    const simpleTitle = (titlesRaw[0] || 'frontend developer');
    return [makeUrl(simpleTitle)];
  }

  const titlesQuoted = titlesRaw.map(t => `"${t}"`);
  const titleOr = titlesQuoted.length > 1 ? `(${titlesQuoted.join(' OR ')})` : titlesQuoted[0];
  const skills = (analysis.topSkills && analysis.topSkills.length ? analysis.topSkills.slice(0, 4) : []);

  const urls: string[] = [];
  urls.push(makeUrl([titleOr, ...skills].join(' ')));
  if (skills.length > 0) urls.push(makeUrl(`${titlesQuoted[0]} ${skills[0]}`));
  if (titlesQuoted.length > 1) urls.push(makeUrl(skills.length > 0 ? `${titlesQuoted[1]} ${skills[0]}` : `${titlesQuoted[1]}`));
  return Array.from(new Set(urls));
}
