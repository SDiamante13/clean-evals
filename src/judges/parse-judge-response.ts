import type { JudgeResult } from './judge-provider.js';

export function parseJudgeResponse(text: string): JudgeResult {
  const parsed = extractJson(text);
  if (!parsed) {
    throw new Error(`Judge response is not valid JSON: ${text.slice(0, 200)}`);
  }

  if (!isJudgeResult(parsed)) {
    throw new Error(`Judge response missing score or reasoning: ${text.slice(0, 200)}`);
  }

  return { score: parsed.score, reasoning: parsed.reasoning };
}

function extractJson(text: string): unknown | null {
  const candidates = text.matchAll(/\{[\s\S]*?\}/g);
  for (const match of candidates) {
    try {
      return JSON.parse(match[0]);
    } catch {
      continue;
    }
  }
  return null;
}

function isJudgeResult(value: unknown): value is JudgeResult {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.score === 'number' && typeof record.reasoning === 'string';
}
