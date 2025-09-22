import type { CVAnalysis } from '@shared/types';
import { buildCVSummaryPrompt, buildCVAnalysisExtractPrompt } from '../prompt.js';
import { getLLMConfig, callOpenAIChatText, callOpenAIChatJSON, LLM_DEBUG, formatLLMError } from '../llm.js';

export async function enrichAnalysisWithLLM(cvText: string, analysis: CVAnalysis, log?: any): Promise<CVAnalysis> {
  try {
    const cfg = getLLMConfig();
    if (!cfg.apiKey) return analysis;
    const scoreMode = (process.env.SCORE_MODE || 'random').toLowerCase();
    const enrichFlag = (process.env.LLM_ENRICH_CV || 'false') === 'true';
    if (!enrichFlag && scoreMode !== 'llm') return analysis;

    // Summarize
    const { system: sysSum, user: usrSum } = buildCVSummaryPrompt(cvText);
    if (LLM_DEBUG) log?.info?.({ userLen: usrSum.length, model: cfg.model }, 'llm summarize prompt');
    const { content: contentSum } = await callOpenAIChatText(cfg, sysSum, usrSum);
    const summaryLLM = String(contentSum || '').trim();
    if (summaryLLM) {
      analysis.summary = summaryLLM;
      if (LLM_DEBUG) log?.info?.({ summaryLen: summaryLLM.length }, 'llm summarize ok');
    }

    // Extract structured fields
    const { system: sysExt, user: usrExt } = buildCVAnalysisExtractPrompt(cvText);
    if (LLM_DEBUG) log?.info?.({ userLen: usrExt.length, model: cfg.model }, 'llm cv extract prompt');
    const { content: contentExt } = await callOpenAIChatJSON(cfg, sysExt, usrExt);
    let parsed: any = null;
    try { parsed = JSON.parse(contentExt || '{}'); } catch { parsed = null; }

    const normStrArr = (arr: any, max: number) => Array.isArray(arr)
      ? Array.from(new Set(arr.map((x: any) => String(x || '').trim()).filter((s: string) => s))).slice(0, max)
      : [];
    const extTitles = normStrArr(parsed?.titles, 3);
    const extSkills = normStrArr(parsed?.topSkills, 8);
    const extLocs = normStrArr(parsed?.locationHints, 3);

    if (extTitles.length) analysis.titles = extTitles;
    if (extSkills.length) analysis.topSkills = extSkills;
    if (extLocs.length) analysis.locationHints = extLocs;
    if (LLM_DEBUG) log?.info?.({ titles: analysis.titles, topSkills: analysis.topSkills, locationHints: analysis.locationHints }, 'llm cv extract ok');
    return analysis;
  } catch (err: any) {
    if (LLM_DEBUG) {
      const logObj = (typeof err === 'object' && err) ? err : { err };
      log?.warn?.({ err: formatLLMError(err) || logObj }, 'llm cv enrichment failed');
    }
    return analysis; // keep heuristics
  }
}
