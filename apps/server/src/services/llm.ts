import type { CVAnalysis, JobItem } from '../types.js';

// Shared LLM debug flag
export const LLM_DEBUG = (process.env.LLM_LOG || '').toLowerCase() === 'debug';

export type LLMConfig = {
  mode: 'off' | 'rerank' | 'replace';
  topN: number;
  concurrency: number;
  timeoutMs: number;
  apiKey?: string;
  model: string;
};

export function getLLMConfig(): LLMConfig {
  const modeRaw = (process.env.LLM_MODE || 'off').toLowerCase();
  const mode: LLMConfig['mode'] = modeRaw === 'rerank' || modeRaw === 'replace' ? (modeRaw as any) : 'off';
  const topN = Math.max(1, Math.min(50, Number(process.env.LLM_TOP_N || 10)));
  const concurrency = Math.max(1, Math.min(5, Number(process.env.LLM_CONCURRENCY || 2)));
  const timeoutMs = Math.max(1000, Math.min(60000, Number(process.env.LLM_TIMEOUT_MS || 8000)));
  const apiKey = process.env.OPENAI_API_KEY || undefined;
  const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
  return { mode, topN, concurrency, timeoutMs, apiKey, model };
}

export function formatLLMError(err: any): string {
  try {
    if (err && typeof err === 'object' && (err as any).name === 'AbortError') return 'timeout';
    const msg = (err && (err as any).message) ? (err as any).message : String(err);
    return String(msg).replace(/\s+/g, ' ').slice(0, 140);
  } catch {
    return 'unknown-error';
  }
}

// Chat call for JSON-only responses
export async function callOpenAIChatJSON(
  cfg: LLMConfig,
  system: string,
  user: string
): Promise<{ content: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const tStart = Date.now();
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      }),
      signal: controller.signal as any
    } as any);
    if (!res.ok) {
      const txt = await (res as any).text?.();
      if (LLM_DEBUG) {
        console.warn('[llm] openai http error', { status: (res as any).status, body: String(txt || '').slice(0, 200) });
      }
      throw new Error(`openai http ${res.status}: ${txt || ''}`.trim());
    }
    const data: any = await (res as any).json();
    const content = data?.choices?.[0]?.message?.content || '';
    if (LLM_DEBUG) {
      console.log('[llm] openai ok', { ms: Date.now() - tStart, contentLen: content.length });
    }
    return { content };
  } finally {
    clearTimeout(t);
  }
}

// Chat call for plain text responses (no JSON response_format), suitable for single-number scoring.
export async function callOpenAIChatText(
  cfg: LLMConfig,
  system: string,
  user: string
): Promise<{ content: string }> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const tStart = Date.now();
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      }),
      signal: controller.signal as any
    } as any);
    if (!res.ok) {
      const txt = await (res as any).text?.();
      if (LLM_DEBUG) {
        console.warn('[llm] openai http error', { status: (res as any).status, body: String(txt || '').slice(0, 200) });
      }
      throw new Error(`openai http ${res.status}: ${txt || ''}`.trim());
    }
    const data: any = await (res as any).json();
    const content = data?.choices?.[0]?.message?.content || '';
    if (LLM_DEBUG) {
      console.log('[llm] openai ok', { ms: Date.now() - tStart, contentLen: content.length });
    }
    return { content };
  } finally {
    clearTimeout(t);
  }
}
