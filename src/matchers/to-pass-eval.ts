import type { JudgeProvider } from '../judges/judge-provider.js';
import type { Criterion, EvaluateOutputOptions } from '../evaluate-output.js';
import { evaluateOutput } from '../evaluate-output.js';
import { runWithSamples } from '../run-with-samples.js';
import type { SamplesConfig } from '../run-with-samples.js';
import type { MatcherResult } from './types.js';
import { buildSampledMatcherResult } from './types.js';
import { LLM_PASS_THRESHOLD } from '../defaults.js';

interface PassEvalBaseOptions {
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
  samples?: SamplesConfig;
}

export interface PassEvalRubricOptions extends PassEvalBaseOptions {
  rubric: string;
  criteria?: never;
}

export interface PassEvalCriteriaOptions extends PassEvalBaseOptions {
  rubric?: never;
  criteria: Criterion[];
}

export type PassEvalOptions = PassEvalRubricOptions | PassEvalCriteriaOptions;

export async function toPassEval(output: string, options: PassEvalOptions): Promise<MatcherResult> {
  const passThreshold = options.passThreshold ?? LLM_PASS_THRESHOLD;

  const samplesConfig = options.samples;
  if (samplesConfig) {
    return runSampled(output, options, passThreshold, samplesConfig);
  }

  return runSingle(output, options, passThreshold);
}

function buildEvalOptions(output: string, options: PassEvalOptions, passThreshold: number): EvaluateOutputOptions {
  if (options.criteria) {
    return { output, criteria: options.criteria, judge: options.judge, passThreshold };
  }
  return { output, rubric: options.rubric!, judge: options.judge, passThreshold };
}

function formatCriteriaMessage(
  result: { pass: boolean; score: number; reasoning: string; criteriaResults?: { name: string; pass: boolean; reasoning: string }[] },
  passThreshold: number
): string {
  const criteriaResults = result.criteriaResults ?? [];
  const lines = criteriaResults.map((cr) => `  ${cr.pass ? 'PASS' : 'FAIL'} ${cr.name}: ${cr.reasoning}`);

  if (result.pass) {
    return `Expected output NOT to pass eval\nAll criteria passed:\n${lines.join('\n')}`;
  }

  return `Expected output to pass eval (threshold: ${passThreshold}) but got score ${result.score}\nCriteria results:\n${lines.join('\n')}`;
}

async function runSingle(output: string, options: PassEvalOptions, passThreshold: number): Promise<MatcherResult> {
  const evalOpts = buildEvalOptions(output, options, passThreshold);
  const result = await evaluateOutput(evalOpts);

  if (result.criteriaResults) {
    return {
      pass: result.pass,
      message: (): string => formatCriteriaMessage(result, passThreshold),
    };
  }

  return {
    pass: result.pass,
    message: (): string =>
      result.pass
        ? `Expected output NOT to pass eval but got score ${result.score}\nReasoning: ${result.reasoning}`
        : `Expected output to pass eval (threshold: ${passThreshold}) but got score ${result.score}\nReasoning: ${result.reasoning}`,
  };
}

async function runSampled(
  output: string,
  options: PassEvalOptions,
  passThreshold: number,
  samplesConfig: SamplesConfig
): Promise<MatcherResult> {
  const sampled = await runWithSamples(async () => {
    const evalOpts = buildEvalOptions(output, options, passThreshold);
    const result = await evaluateOutput(evalOpts);
    return { pass: result.pass, score: result.score };
  }, samplesConfig);

  return buildSampledMatcherResult(sampled);
}
