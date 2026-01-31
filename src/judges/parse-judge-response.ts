import type { JudgeResult } from './judge-provider.js';

export function parseJudgeResponse(text: string): JudgeResult {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Judge response is not valid JSON: ${text}`);
  }

  const parsed: unknown = JSON.parse(jsonMatch[0]);

  if (!isJudgeResult(parsed)) {
    throw new Error(`Judge response missing score or reasoning: ${text}`);
  }

  return { score: parsed.score, reasoning: parsed.reasoning };
}

function isJudgeResult(value: unknown): value is JudgeResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    'score' in value &&
    'reasoning' in value &&
    typeof (value as JudgeResult).score === 'number' &&
    typeof (value as JudgeResult).reasoning === 'string'
  );
}
