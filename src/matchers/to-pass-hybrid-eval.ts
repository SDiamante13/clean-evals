import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { evaluateHybrid } from '../evaluate-hybrid.js';
import type { ExpectedCall } from '../evaluate-trace.js';
import type { JudgeProvider } from '../judges/judge-provider.js';
import { runWithSamples } from '../run-with-samples.js';
import type { SamplesConfig } from '../run-with-samples.js';
import type { MatcherResult } from './types.js';
import { buildSampledMatcherResult } from './types.js';

export interface HybridEvalOptions {
  expected: ExpectedCall[];
  output: string;
  rubric: string;
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
  samples?: SamplesConfig;
}

export async function toPassHybridEval(spans: ReadableSpan[], options: HybridEvalOptions): Promise<MatcherResult> {
  const samplesConfig = options.samples;
  if (samplesConfig) {
    return runSampled(spans, options, samplesConfig);
  }

  return runSingle(spans, options);
}

async function runSingle(spans: ReadableSpan[], options: HybridEvalOptions): Promise<MatcherResult> {
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

async function runSampled(
  spans: ReadableSpan[],
  options: HybridEvalOptions,
  samplesConfig: SamplesConfig
): Promise<MatcherResult> {
  const evalFn = async (): Promise<{ pass: boolean; score: number }> => {
    const result = await evaluateHybrid({
      spans,
      expected: options.expected,
      output: options.output,
      rubric: options.rubric,
      judge: options.judge,
      passThreshold: options.passThreshold,
      warnThreshold: options.warnThreshold,
    });
    const score = result.llmResult ? result.llmResult.score : result.deterministicScore;
    return { pass: result.pass, score };
  };

  const sampled = await runWithSamples(evalFn, samplesConfig);
  return buildSampledMatcherResult(sampled);
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
