import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { evaluateTrace, ExpectedCall } from './evaluate-trace.js';
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
}

export async function evaluateHybrid(options: EvaluateHybridOptions): Promise<HybridEvalResult> {
  const { spans, expected, output, rubric, judge, passThreshold, warnThreshold } = options;

  const traceResult = evaluateTrace({ spans, expected });

  if (!traceResult.pass) {
    return {
      pass: false,
      deterministicScore: traceResult.score,
      details: [...traceResult.details, 'LLM judge skipped: deterministic check failed'],
      skippedLlm: true,
    };
  }

  const llmResult = await evaluateOutput({ output, rubric, judge, passThreshold, warnThreshold });

  return {
    pass: llmResult.pass,
    deterministicScore: traceResult.score,
    llmResult,
    details: [...traceResult.details, `LLM judge score: ${llmResult.score}`],
    skippedLlm: false,
  };
}
