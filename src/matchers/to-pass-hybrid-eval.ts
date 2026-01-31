import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { evaluateHybrid } from '../evaluate-hybrid.js';
import type { ExpectedCall } from '../evaluate-trace.js';
import type { JudgeProvider } from '../judges/judge-provider.js';

export interface HybridEvalOptions {
  expected: ExpectedCall[];
  output: string;
  rubric: string;
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
}

interface MatcherResult {
  pass: boolean;
  message: () => string;
}

export async function toPassHybridEval(
  spans: ReadableSpan[],
  options: HybridEvalOptions
): Promise<MatcherResult> {
  const result = await evaluateHybrid({
    spans,
    expected: options.expected,
    output: options.output,
    rubric: options.rubric,
    judge: options.judge,
    passThreshold: options.passThreshold,
    warnThreshold: options.warnThreshold,
  });

  return {
    pass: result.pass,
    message: (): string => buildMessage(result.pass, result),
  };
}

function buildMessage(
  pass: boolean,
  result: { deterministicScore: number; skippedLlm: boolean; llmResult?: { score: number; reasoning: string } }
): string {
  if (result.skippedLlm) {
    return pass
      ? `Expected NOT to pass hybrid eval but deterministic score was ${result.deterministicScore}`
      : `Deterministic check failed (score: ${result.deterministicScore}). LLM judge was skipped.`;
  }

  const llmScore = result.llmResult?.score ?? 0;
  const reasoning = result.llmResult?.reasoning ?? '';

  return pass
    ? `Expected NOT to pass hybrid eval but got deterministic=${result.deterministicScore}, llm=${llmScore}\nReasoning: ${reasoning}`
    : `Expected to pass hybrid eval but got deterministic=${result.deterministicScore}, llm=${llmScore}\nReasoning: ${reasoning}`;
}
