import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { evaluateTrace, ExpectedCall } from '../evaluate-trace.js';
import { distillTrace } from '../distill-trace.js';
import type { JudgeProvider } from '../judges/judge-provider.js';
import { runWithSamples, formatSampledMessage } from '../run-with-samples.js';
import type { SamplesConfig } from '../run-with-samples.js';

export interface TraceEvalOptions {
  passThreshold?: number;
  warnThreshold?: number;
  judge?: JudgeProvider;
  rubric?: string;
  samples?: SamplesConfig;
}

interface MatcherResult {
  pass: boolean;
  message: () => string;
}

declare const console: { warn: (msg: string) => void };

const DEFAULT_PASS_THRESHOLD = 1.0;
const DEFAULT_WARN_THRESHOLD = 0.5;

export async function toPassTraceEval(
  spans: ReadableSpan[],
  expected: ExpectedCall[],
  options: TraceEvalOptions = {}
): Promise<MatcherResult> {
  const passThreshold = options.passThreshold ?? DEFAULT_PASS_THRESHOLD;
  const warnThreshold = options.warnThreshold ?? DEFAULT_WARN_THRESHOLD;

  if (options.samples) {
    return runSampled(spans, expected, options, passThreshold);
  }

  return runSingle(spans, expected, options, passThreshold, warnThreshold);
}

async function runSingle(
  spans: ReadableSpan[],
  expected: ExpectedCall[],
  options: TraceEvalOptions,
  passThreshold: number,
  warnThreshold: number
): Promise<MatcherResult> {
  const deterministicResult = evaluateTrace({ spans, expected });
  logWarningIfNeeded(deterministicResult.score, warnThreshold, passThreshold);
  const deterministicPass = deterministicResult.score >= passThreshold;

  if (!options.judge || !options.rubric) {
    return buildResult(deterministicPass, deterministicResult.score, passThreshold, deterministicResult.details);
  }

  const story = distillTrace(spans);
  const prompt = buildJudgePrompt(options.rubric, story);
  const judgeResult = await options.judge.judge(prompt);
  const judgePass = judgeResult.score >= passThreshold;

  return buildJudgeResult(judgePass, judgeResult.score, passThreshold, judgeResult.reasoning);
}

async function runSampled(
  spans: ReadableSpan[],
  expected: ExpectedCall[],
  options: TraceEvalOptions,
  passThreshold: number
): Promise<MatcherResult> {
  const evalFn = async (): Promise<{ pass: boolean; score: number }> => {
    const deterministicResult = evaluateTrace({ spans, expected });
    if (!options.judge || !options.rubric) {
      return { pass: deterministicResult.score >= passThreshold, score: deterministicResult.score };
    }
    const story = distillTrace(spans);
    const prompt = buildJudgePrompt(options.rubric, story);
    const judgeResult = await options.judge.judge(prompt);
    return { pass: judgeResult.score >= passThreshold, score: judgeResult.score };
  };

  const sampled = await runWithSamples(evalFn, options.samples!);
  return {
    pass: sampled.pass,
    message: (): string => formatSampledMessage(sampled, sampled.pass),
  };
}

function logWarningIfNeeded(score: number, warnThreshold: number, passThreshold: number): void {
  if (score >= warnThreshold && score < passThreshold) {
    console.warn(`[agent-eval] Warning: score ${score} is between warn (${warnThreshold}) and pass (${passThreshold}) thresholds`);
  }
}

function buildResult(pass: boolean, score: number, passThreshold: number, details: string[]): MatcherResult {
  return {
    pass,
    message: (): string =>
      pass
        ? `Expected trace NOT to pass eval but got score ${score}\n${details.join('\n')}`
        : `Expected trace to pass eval (threshold: ${passThreshold}) but got score ${score}\n${details.join('\n')}`,
  };
}

function buildJudgePrompt(rubric: string, story: string): string {
  return `## Rubric\n${rubric}\n\n## Agent Trace\n${story}`;
}

function buildJudgeResult(pass: boolean, score: number, passThreshold: number, reasoning: string): MatcherResult {
  return {
    pass,
    message: (): string =>
      pass
        ? `Expected trace NOT to pass LLM eval but got score ${score}\nReasoning: ${reasoning}`
        : `Expected trace to pass LLM eval (threshold: ${passThreshold}) but got score ${score}\nReasoning: ${reasoning}`,
  };
}
