import type { JudgeProvider } from './judges/judge-provider.js';

export interface EvaluateOutputOptions {
  output: string;
  rubric: string;
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
}

export interface OutputEvalResult {
  pass: boolean;
  score: number;
  reasoning: string;
}

export async function evaluateOutput(options: EvaluateOutputOptions): Promise<OutputEvalResult> {
  const { output, rubric, judge } = options;
  const passThreshold = options.passThreshold ?? 0.7;

  const prompt = buildGradingPrompt(rubric, output);
  const result = await judge.judge(prompt);

  return {
    pass: result.score >= passThreshold,
    score: result.score,
    reasoning: result.reasoning,
  };
}

function buildGradingPrompt(rubric: string, output: string): string {
  return `## Rubric\n${rubric}\n\n## Agent Output\n${output}`;
}
