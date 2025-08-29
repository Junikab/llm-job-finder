import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { maybeRerankWithLLM } from '../src/services/rerank.js';
import type { CVAnalysis, JobItem } from '../src/types.js';

const analysis: CVAnalysis = {
  summary: 'Frontend engineer with React and Node experience',
  titles: ['Frontend Developer'],
  topSkills: ['React', 'JavaScript']
};

function job(id: string, title: string): JobItem & { score: number; reason: string } {
  return {
    id,
    title,
    company: 'Acme',
    location: 'Sydney',
    url: `https://example.com/${id}`,
    listedAgo: '1 day ago',
    description: `${title} role using React and JS`,
    score: 50,
    reason: 'base'
  };
}

const originalEnv = { ...process.env };
let originalFetch: any;

beforeEach(() => {
  originalFetch = (globalThis as any).fetch;
  process.env.SCORE_MODE = 'llm';
  process.env.LLM_MODE = 'rerank';
  process.env.OPENAI_API_KEY = 'test-key';
  process.env.OPENAI_MODEL = 'gpt-4o-mini';
  process.env.LLM_TOP_N = '2';
});

afterEach(() => {
  (globalThis as any).fetch = originalFetch;
  // restore env
  for (const k of Object.keys(process.env)) delete (process.env as any)[k];
  Object.assign(process.env, originalEnv);
});

describe('maybeRerankWithLLM', () => {
  it('annotates error details when OpenAI returns non-OK', async () => {
    (globalThis as any).fetch = async () => ({ ok: false, status: 401, text: async () => 'unauthorized' });
    const scored = [job('job-1', 'A'), job('job-2', 'B'), job('job-3', 'C')];
    const out = await maybeRerankWithLLM(analysis, scored);
    expect(out[0].reason).toMatch(/llm-rerank-error:/);
    expect(out[1].reason).toMatch(/llm-rerank-error:/);
    expect(out[2].reason).not.toMatch(/llm-rerank-error/);
  });

  it('annotates no-order when content has no order array', async () => {
    (globalThis as any).fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{}' } }] })
    });
    const scored = [job('job-1', 'A'), job('job-2', 'B')];
    const out = await maybeRerankWithLLM(analysis, scored);
    expect(out[0].reason).toContain('llm-rerank-error: no-order');
    expect(out[1].reason).toContain('llm-rerank-error: no-order');
  });

  it('reorders top-N and annotates pos with reasons on success', async () => {
    const content = JSON.stringify({ order: ['example.com/job-2', 'example.com/job-1'], reasons: { 'example.com/job-2': 'better match', 'example.com/job-1': 'ok' } });
    (globalThis as any).fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content } }] })
    });
    const scored = [job('job-1', 'A'), job('job-2', 'B'), job('job-3', 'C')];
    const out = await maybeRerankWithLLM(analysis, scored);
    // Top 2 reordered per order array
    expect(out[0].id).toContain('job-2');
    expect(out[1].id).toContain('job-1');
    expect(out[0].reason).toContain('llm-rerank pos 1');
    expect(out[0].reason).toContain('llm: better match');
    // Remaining entries preserved
    expect(out[2].id).toContain('job-3');
  });
});
