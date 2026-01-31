import type { JudgeProvider } from '../judges/judge-provider.js';
import { evaluateOutput } from '../evaluate-output.js';
import { runWithSamples, formatSampledMessage } from '../run-with-samples.js';
import type { SamplesConfig } from '../run-with-samples.js';

export interface PassEvalOptions {
  rubric: string;
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
  samples?: SamplesConfig;
}

interface MatcherResult {
  pass: boolean;
  message: () => string;
}

const DEFAULT_PASS_THRESHOLD = 0.7;

export async function toPassEval(output: string, options: PassEvalOptions): Promise<MatcherResult> {
  const passThreshold = options.passThreshold ?? DEFAULT_PASS_THRESHOLD;

  if (options.samples) {
    return runSampled(output, options, passThreshold);
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

async function runSampled(output: string, options: PassEvalOptions, passThreshold: number): Promise<MatcherResult> {
  const sampled = await runWithSamples(
    async () => {
      const r = await evaluateOutput({
        output,
        rubric: options.rubric,
        judge: options.judge,
        passThreshold,
      });
      return { pass: r.pass, score: r.score };
    },
    options.samples!
  );

  return {
    pass: sampled.pass,
    message: (): string => formatSampledMessage(sampled, sampled.pass),
  };
}
