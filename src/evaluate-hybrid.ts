import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { evaluateTrace, ExpectedCall, FirstFailure } from './evaluate-trace.js';
import { evaluateOutput, OutputEvalResult } from './evaluate-output.js';
import type { JudgeProvider } from './judges/judge-provider.js';

export interface EvaluateHybridOptions {
  spans: ReadableSpan[];
  expected: ExpectedCall[];
  output: string;
  rubric: string;
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
}

export interface HybridEvalResult {
  pass: boolean;
  deterministicScore: number;
  llmResult?: OutputEvalResult;
  details: string[];
  skippedLlm: boolean;
  firstFailureIndex: number | null;
  firstFailure: FirstFailure | null;
}

/**
 * Combines deterministic trace evaluation with LLM-judged output evaluation.
 *
 * Uses a fail-fast strategy: if the deterministic check fails, the LLM judge
 * is never called, saving cost and latency. Only when the trace matches all
 * expected tool calls does the LLM judge run to grade output quality.
 *
 * @example
 * ```ts
 * const result = await evaluateHybrid({
 *   spans: exporter.getFinishedSpans(),
 *   expected: [{ toolName: 'search' }],
 *   output: agent.lastResponse,
 *   rubric: 'Response is helpful and accurate.',
 *   judge: new OpenAIJudgeProvider(),
 * });
 * if (result.skippedLlm) {
 *   console.log('Deterministic check failed — LLM judge was not invoked');
 * }
 * ```
 */
export async function evaluateHybrid(options: EvaluateHybridOptions): Promise<HybridEvalResult> {
  const { spans, expected, output, rubric, judge, passThreshold, warnThreshold } = options;

  const traceResult = evaluateTrace({ spans, expected });

  if (!traceResult.pass) {
    return {
      pass: false,
      deterministicScore: traceResult.score,
      details: [...traceResult.details, 'LLM judge skipped: deterministic check failed'],
      skippedLlm: true,
      firstFailureIndex: traceResult.firstFailureIndex,
      firstFailure: traceResult.firstFailure,
    };
  }

  const llmResult = await evaluateOutput({ output, rubric, judge, passThreshold, warnThreshold });

  return {
    pass: llmResult.pass,
    deterministicScore: traceResult.score,
    llmResult,
    details: [...traceResult.details, `LLM judge score: ${llmResult.score}`],
    skippedLlm: false,
    firstFailureIndex: null,
    firstFailure: null,
  };
}
