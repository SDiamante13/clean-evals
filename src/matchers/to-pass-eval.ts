import type { JudgeProvider } from '../judges/judge-provider.js';
import { evaluateOutput } from '../evaluate-output.js';
import { runWithSamples } from '../run-with-samples.js';
import type { SamplesConfig } from '../run-with-samples.js';
import type { MatcherResult } from './types.js';
import { buildSampledMatcherResult } from './types.js';
import { LLM_PASS_THRESHOLD } from '../defaults.js';

export interface PassEvalOptions {
  rubric: string;
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
  samples?: SamplesConfig;
}

export async function toPassEval(output: string, options: PassEvalOptions): Promise<MatcherResult> {
  const passThreshold = options.passThreshold ?? LLM_PASS_THRESHOLD;

  const samplesConfig = options.samples;
  if (samplesConfig) {
    return runSampled(output, options, passThreshold, samplesConfig);
  }

  return runSingle(output, options, passThreshold);
}

async function runSingle(output: string, options: PassEvalOptions, passThreshold: number): Promise<MatcherResult> {
  const result = await evaluateOutput({
    output,
    rubric: options.rubric,
    judge: options.judge,
    passThreshold,
  });

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
    const result = await evaluateOutput({
      output,
      rubric: options.rubric,
      judge: options.judge,
      passThreshold,
    });
    return { pass: result.pass, score: result.score };
  }, samplesConfig);

  return buildSampledMatcherResult(sampled);
}
