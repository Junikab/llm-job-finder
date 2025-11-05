import { describe, it, expect } from 'vitest';
import { buildJobRelevancePrompt, formatJobForPrompt, parseRelevanceScore } from '../src/services/prompt.js';
import type { JobItem } from '@shared/types';

function makeJob(): JobItem {
  return {
    id: 'job-1',
    title: 'Frontend Developer (React/TypeScript)',
    company: 'Acme Corp',
    location: 'Sydney NSW',
    url: 'https://example.com/jobs/frontend-developer',
    listedAgo: '3 days ago',
    description: 'React, TypeScript, testing, collaboration with designers.'
  };
}

describe('prompt services', () => {
  it('formatJobForPrompt builds a stable, readable block', () => {
    const job = makeJob();
    const block = formatJobForPrompt(job);
    expect(block).toContain('Title: Frontend Developer (React/TypeScript)');
    expect(block).toContain('Company: Acme Corp');
    expect(block).toContain('Location: Sydney NSW');
    expect(block).toContain('Listed: 3 days ago');
    expect(block).toContain('URL: https://example.com/jobs/frontend-developer');
    expect(block).toContain('Description:');
    expect(block).toContain('React, TypeScript, testing, collaboration with designers.');
  });

  it('buildJobRelevancePrompt composes sections with CV summary and job details', () => {
    const job = makeJob();
    const analysis = { summary: 'Senior frontend engineer skilled in React and TypeScript.' };
    const prompt = buildJobRelevancePrompt(analysis, job);

    // Structure markers (updated rubric-based prompt)
    expect(prompt).toContain('You are an expert job relevance scorer.');
    expect(prompt).toContain('Candidate profile (CV summary):');
    expect(prompt).toContain('Scoring rubric (apply cumulatively, 0–100 scale):');
    expect(prompt).toContain('Calibration examples (concise):');
    expect(prompt).toContain('Now score the job below');
    expect(prompt).toContain('Respond with JSON only');

    // Content presence
    expect(prompt).toContain(analysis.summary);
    expect(prompt).toContain(job.title);
    expect(prompt).toContain(job.url);
  });

  it('parseRelevanceScore extracts, rounds, and clamps score', () => {
    expect(parseRelevanceScore('87')).toBe(87);
    expect(parseRelevanceScore('  45.8% match')).toBe(46); // rounds
    expect(parseRelevanceScore('-20')).toBe(0); // clamps low
    expect(parseRelevanceScore('150 highly relevant')).toBe(100); // clamps high
    expect(parseRelevanceScore('no number here')).toBeNull();
  });
});
