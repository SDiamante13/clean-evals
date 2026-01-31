import { describe, it, expect, vi } from 'vitest';
import { evaluateOutput } from './evaluate-output.js';
import type { JudgeProvider, JudgeResult } from './judges/judge-provider.js';

function buildFakeJudge(result: JudgeResult): JudgeProvider {
  return { judge: vi.fn(async () => result) };
}

describe('evaluateOutput with criteria', () => {
  it('passes when all criteria pass', async () => {
    const judge = buildFakeJudge({ score: 0.8, reasoning: 'Criterion met' });

    const result = await evaluateOutput({
      output: 'Hello! Here is a summary of the data.',
      criteria: [
        { name: 'has_greeting', check: 'Output includes a greeting' },
        { name: 'has_summary', check: 'Output includes a summary' },
      ],
      judge,
    });

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
    expect(result.criteriaResults).toHaveLength(2);
    expect(result.criteriaResults![0].pass).toBe(true);
  });

  it('fails when one criterion fails', async () => {
    let callCount = 0;
    const judge: JudgeProvider = {
      judge: vi.fn(async () => {
        callCount++;
        return callCount === 1
          ? { score: 0.9, reasoning: 'Greeting found' }
          : { score: 0.3, reasoning: 'No summary found' };
      }),
    };

    const result = await evaluateOutput({
      output: 'Hello!',
      criteria: [
        { name: 'has_greeting', check: 'Output includes a greeting' },
        { name: 'has_summary', check: 'Output includes a summary' },
      ],
      judge,
    });

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0.5);
    expect(result.criteriaResults![0].pass).toBe(true);
    expect(result.criteriaResults![1].pass).toBe(false);
  });

  it('calls judge once per criterion', async () => {
    const judge = buildFakeJudge({ score: 0.8, reasoning: 'OK' });

    await evaluateOutput({
      output: 'Test output',
      criteria: [
        { name: 'c1', check: 'Check 1' },
        { name: 'c2', check: 'Check 2' },
        { name: 'c3', check: 'Check 3' },
      ],
      judge,
    });

    expect(judge.judge).toHaveBeenCalledTimes(3);
  });

  it('includes criterion name in prompt', async () => {
    const capturedPrompts: string[] = [];
    const judge: JudgeProvider = {
      judge: vi.fn(async (prompt: string) => {
        capturedPrompts.push(prompt);
        return { score: 0.8, reasoning: 'OK' };
      }),
    };

    await evaluateOutput({
      output: 'Test',
      criteria: [{ name: 'accuracy', check: 'Output is factually accurate' }],
      judge,
    });

    expect(capturedPrompts[0]).toContain('accuracy');
    expect(capturedPrompts[0]).toContain('Output is factually accurate');
  });

  it('score is fraction of passed criteria', async () => {
    let callCount = 0;
    const judge: JudgeProvider = {
      judge: vi.fn(async () => {
        callCount++;
        return callCount <= 2
          ? { score: 0.8, reasoning: 'Pass' }
          : { score: 0.2, reasoning: 'Fail' };
      }),
    };

    const result = await evaluateOutput({
      output: 'Test',
      criteria: [
        { name: 'c1', check: 'Check 1' },
        { name: 'c2', check: 'Check 2' },
        { name: 'c3', check: 'Check 3' },
      ],
      judge,
    });

    expect(result.score).toBeCloseTo(2 / 3);
    expect(result.pass).toBe(false);
  });

  it('throws when both rubric and criteria provided', async () => {
    const judge = buildFakeJudge({ score: 0.8, reasoning: 'OK' });

    await expect(
      evaluateOutput({
        output: 'Test',
        rubric: 'Some rubric',
        criteria: [{ name: 'c1', check: 'Check' }],
        judge,
      } as any),
    ).rejects.toThrow('criteria and rubric are mutually exclusive');
  });
});
