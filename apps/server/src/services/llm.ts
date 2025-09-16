// (removed unused imports)

// Shared LLM debug flag
export const LLM_DEBUG = (process.env.LLM_LOG || '').toLowerCase() === 'debug';

export type LLMConfig = {
  mode: 'off' | 'replace';
  concurrency: number;
  timeoutMs: number;
  apiKey?: string;
  model: string;
};

export function getLLMConfig(): LLMConfig {
  const modeRaw = (process.env.LLM_MODE || 'off').toLowerCase();
  const mode: LLMConfig['mode'] = modeRaw === 'replace' ? 'replace' : 'off';
  const concurrency = Math.max(1, Math.min(5, Number(process.env.LLM_CONCURRENCY || 2)));
  const timeoutMs = Math.max(1000, Math.min(60000, Number(process.env.LLM_TIMEOUT_MS || 8000)));
  const apiKey = process.env.OPENAI_API_KEY || undefined;
  const model = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();
  return { mode, concurrency, timeoutMs, apiKey, model };
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Chat call for JSON-only responses
export async function callOpenAIChatJSON(
  cfg: LLMConfig,
  system: string,
  user: string
): Promise<{ content: string }> {
  const attempts = Math.max(1, Math.min(5, Number(process.env.LLM_RETRIES || 2)));
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), cfg.timeoutMs);
    try {
      const tStart = Date.now();
      const res = await fetch(url, {
        method: 'POST',
        headers,
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
        const status = (res as any).status;
        const txt = await (res as any).text?.();
        const bodyShort = String(txt || '').slice(0, 200);
        if (LLM_DEBUG) {
          console.warn('[llm] openai http error', { status, attempt, body: bodyShort });
        }
        const retriable = status === 429 || (status >= 500 && status <= 599);
        if (!retriable || attempt === attempts) {
          throw new Error(`openai http ${status}: ${txt || ''}`.trim());
        }
        const backoff = Math.min(4000, 250 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 150);
        await sleep(backoff);
        continue;
      }
      const data: any = await (res as any).json();
      const content = data?.choices?.[0]?.message?.content || '';
      if (LLM_DEBUG) {
        console.log('[llm] openai ok', { ms: Date.now() - tStart, contentLen: content.length, attempt });
      }
      return { content };
    } catch (err: any) {
      lastErr = err;
      const isAbort = err && typeof err === 'object' && (err as any).name === 'AbortError';
      if (LLM_DEBUG) console.warn('[llm] fetch error', { attempt, err: formatLLMError(err) });
      if (attempt === attempts) throw err;
      const backoff = Math.min(4000, 250 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 150);
      await sleep(backoff);
      continue;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr || new Error('openai error');
}

// Chat call for plain text responses (no JSON response_format), suitable for single-number scoring.
export async function callOpenAIChatText(
  cfg: LLMConfig,
  system: string,
  user: string
): Promise<{ content: string }> {
  const attempts = Math.max(1, Math.min(5, Number(process.env.LLM_RETRIES || 2)));
  const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.apiKey) headers['Authorization'] = `Bearer ${cfg.apiKey}`;
  let lastErr: any = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), cfg.timeoutMs);
    try {
      const tStart = Date.now();
      const res = await fetch(url, {
        method: 'POST',
        headers,
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
        const status = (res as any).status;
        const txt = await (res as any).text?.();
        const bodyShort = String(txt || '').slice(0, 200);
        if (LLM_DEBUG) {
          console.warn('[llm] openai http error', { status, attempt, body: bodyShort });
        }
        const retriable = status === 429 || (status >= 500 && status <= 599);
        if (!retriable || attempt === attempts) {
          throw new Error(`openai http ${status}: ${txt || ''}`.trim());
        }
        const backoff = Math.min(4000, 250 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 150);
        await sleep(backoff);
        continue;
      }
      const data: any = await (res as any).json();
      const content = data?.choices?.[0]?.message?.content || '';
      if (LLM_DEBUG) {
        console.log('[llm] openai ok', { ms: Date.now() - tStart, contentLen: content.length, attempt });
      }
      return { content };
    } catch (err: any) {
      lastErr = err;
      const isAbort = err && typeof err === 'object' && (err as any).name === 'AbortError';
      if (LLM_DEBUG) console.warn('[llm] fetch error', { attempt, err: formatLLMError(err) });
      if (attempt === attempts) throw err;
      const backoff = Math.min(4000, 250 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 150);
      await sleep(backoff);
      continue;
    } finally {
      clearTimeout(t);
    }
  }
  throw lastErr || new Error('openai error');
}
