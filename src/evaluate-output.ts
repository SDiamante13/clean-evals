import type { JudgeProvider } from './judges/judge-provider.js';

export interface EvaluateOutputOptions {
  output: string;
  rubric: string;
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
}

/**
 * Result of an LLM-judged output evaluation.
 */
export interface OutputEvalResult {
  pass: boolean;
  score: number;
  reasoning: string;
}

/**
 * Evaluates agent output quality using an LLM judge and a rubric.
 *
 * Constructs a grading prompt that embeds the rubric and agent output,
 * then delegates scoring to the provided {@link JudgeProvider}.
 *
 * @example
 * ```ts
 * const result = await evaluateOutput({
 *   output: agent.lastResponse,
 *   rubric: 'Response should include a greeting and a summary.',
 *   judge: new OpenAIJudgeProvider(),
 * });
 * // { pass: true, score: 0.9, reasoning: 'Clear greeting and concise summary.' }
 * ```
 */
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
