import type { JudgeProvider } from '../judges/judge-provider.js';
import { evaluateOutput } from '../evaluate-output.js';

export interface PassEvalOptions {
  rubric: string;
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
}

interface MatcherResult {
  pass: boolean;
  message: () => string;
}

const DEFAULT_PASS_THRESHOLD = 0.7;

export async function toPassEval(output: string, options: PassEvalOptions): Promise<MatcherResult> {
  const passThreshold = options.passThreshold ?? DEFAULT_PASS_THRESHOLD;
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
