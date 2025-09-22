import type { CVAnalysis } from '@shared/types';

// Heuristic CV analysis (fallback when LLM enrichment unavailable)
export function analyzeCVHeuristic(cvText: string): CVAnalysis {
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

  // Keep tech skill synonyms but drop ambiguous tokens like 'next', 'rest', 'go'
  const SKILL_SYNONYMS: Record<string, string> = {
    'javascript': 'JavaScript', 'js': 'JavaScript',
    'typescript': 'TypeScript', 'ts': 'TypeScript',
    'react': 'React', 'react.js': 'React', 'reactjs': 'React',
    'node': 'Node.js', 'node.js': 'Node.js', 'nodejs': 'Node.js',
    'express': 'Express', 'express.js': 'Express',
    'next.js': 'Next.js', 'nextjs': 'Next.js',
    'graphql': 'GraphQL',
    'restful': 'REST',
    'html': 'HTML', 'css': 'CSS', 'sass': 'Sass', 'scss': 'Sass',
    'webpack': 'Webpack', 'vite': 'Vite', 'babel': 'Babel',
    'jest': 'Jest', 'testing library': 'Testing Library', 'cypress': 'Cypress', 'playwright': 'Playwright',
    'docker': 'Docker', 'kubernetes': 'Kubernetes', 'k8s': 'Kubernetes',
    'aws': 'AWS', 'azure': 'Azure', 'gcp': 'GCP',
    'python': 'Python', 'django': 'Django', 'flask': 'Flask',
    'java': 'Java', 'spring': 'Spring',
    'golang': 'Go',
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
