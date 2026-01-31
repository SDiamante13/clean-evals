import type { JudgeProvider } from './judges/judge-provider.js';
import { LLM_PASS_THRESHOLD } from './defaults.js';

export interface Criterion {
  name: string;
  check: string;
}

export interface CriterionResult {
  name: string;
  pass: boolean;
  reasoning: string;
}

interface BaseOptions {
  output: string;
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
}

export interface RubricOptions extends BaseOptions {
  rubric: string;
  criteria?: never;
}

export interface CriteriaOptions extends BaseOptions {
  rubric?: never;
  criteria: Criterion[];
}

export type EvaluateOutputOptions = RubricOptions | CriteriaOptions;

/**
 * Result of an LLM-judged output evaluation.
 */
export interface OutputEvalResult {
  pass: boolean;
  score: number;
  reasoning: string;
  criteriaResults?: CriterionResult[];
}

/**
 * Evaluates agent output quality using an LLM judge and a rubric or criteria.
 *
 * When `criteria` is provided, the judge is called once per criterion with a
 * focused prompt. Overall pass = all criteria pass, score = fraction passed.
 *
 * When `rubric` is provided, the judge is called once with the full rubric.
 */
export async function evaluateOutput(options: EvaluateOutputOptions): Promise<OutputEvalResult> {
  if (options.rubric && options.criteria) {
    throw new Error('criteria and rubric are mutually exclusive — provide one or the other');
  }

  if (options.criteria) {
    return evaluateWithCriteria(options as CriteriaOptions);
  }

  return evaluateWithRubric(options as RubricOptions);
}

async function evaluateWithRubric(options: RubricOptions): Promise<OutputEvalResult> {
  const { output, rubric, judge } = options;
  const passThreshold = options.passThreshold ?? LLM_PASS_THRESHOLD;

  const prompt = `## Rubric\n${rubric}\n\n## Agent Output\n${output}`;
  const result = await judge.judge(prompt);

  return {
    pass: result.score >= passThreshold,
    score: result.score,
    reasoning: result.reasoning,
  };
}

async function evaluateWithCriteria(options: CriteriaOptions): Promise<OutputEvalResult> {
  const { output, criteria, judge } = options;

  const criteriaResults: CriterionResult[] = await Promise.all(
    criteria.map(async (criterion) => {
      const prompt = `## Criterion: ${criterion.name}\n${criterion.check}\n\n## Agent Output\n${output}`;
      const result = await judge.judge(prompt);
      return {
        name: criterion.name,
        pass: result.score >= 0.5,
        reasoning: result.reasoning,
      };
    }),
  );

  const passedCount = criteriaResults.filter((r) => r.pass).length;

  return {
    pass: criteriaResults.every((r) => r.pass),
    score: criteria.length > 0 ? passedCount / criteria.length : 1,
    reasoning: criteriaResults.map((r) => `${r.name}: ${r.pass ? 'PASS' : 'FAIL'} — ${r.reasoning}`).join('\n'),
    criteriaResults,
  };
}
