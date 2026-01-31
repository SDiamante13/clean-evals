import type { JudgeResult } from './judge-provider.js';

export function parseJudgeResponse(text: string): JudgeResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Judge response is not valid JSON: ${text.slice(0, 200)}`);
  }

  const parsed: unknown = JSON.parse(jsonMatch[0]);

  if (!isJudgeResult(parsed)) {
    throw new Error(`Judge response missing score or reasoning: ${text.slice(0, 200)}`);
  }

  return { score: parsed.score, reasoning: parsed.reasoning };
}

function isJudgeResult(value: unknown): value is JudgeResult {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.score === 'number' && typeof record.reasoning === 'string';
}
