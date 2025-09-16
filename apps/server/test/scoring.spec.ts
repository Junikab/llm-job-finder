import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { scoreJob } from '../src/services/scoring.js';
import type { CVAnalysis, JobItem } from '../src/types.js';

const baseAnalysis: CVAnalysis = {
  summary: 'Senior frontend engineer skilled in React and TypeScript. Built dashboards and design systems.',
  titles: ['Frontend Developer', 'Software Engineer'],
  topSkills: ['React', 'TypeScript', 'Testing']
};

function makeJob(overrides: Partial<JobItem> = {}): JobItem {
  return {
    id: 'job-1',
    title: 'Frontend Developer (React/TypeScript)',
    company: 'Acme Corp',
    location: 'Sydney NSW',
    url: 'https://example.com/jobs/frontend-developer',
    listedAgo: '1 day ago',
    description: 'Work with React, TypeScript, and testing. Remote friendly. Salary $120k.',
    ...overrides,
  };
}

let prevMode: string | undefined;
beforeEach(() => {
  prevMode = process.env.SCORE_MODE;
});
afterEach(() => {
  if (prevMode === undefined) delete process.env.SCORE_MODE; else process.env.SCORE_MODE = prevMode;
});

describe('scoring service', () => {
  it('random mode returns 0..100 and reason random', async () => {
    process.env.SCORE_MODE = 'random';
    const out = await scoreJob(baseAnalysis, makeJob());
    expect(typeof out.score).toBe('number');
    expect(out.score).toBeGreaterThanOrEqual(0);
    expect(out.score).toBeLessThanOrEqual(100);
    expect(out.reason).toBe('random');
  });

  it('llm disabled returns random with annotation when SCORE_MODE=llm', async () => {
    process.env.SCORE_MODE = 'llm';
    const out = await scoreJob(baseAnalysis, makeJob());
    expect(typeof out.score).toBe('number');
    expect(out.score).toBeGreaterThanOrEqual(0);
    expect(out.score).toBeLessThanOrEqual(100);
    expect(out.reason).toContain('llm-disabled');
    expect(out.reason).toContain('random');
  });

  it('llm mode falls back to random and annotates reason when disabled', async () => {
    process.env.SCORE_MODE = 'llm';
    const out = await scoreJob(baseAnalysis, makeJob());
    expect(out.score).toBeGreaterThanOrEqual(0);
    expect(out.reason).toContain('llm-disabled');
    expect(out.reason).toContain('random');
  });
});
