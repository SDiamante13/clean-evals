import { describe, it, expect } from 'vitest';
import { evaluateOutput } from './evaluate-output.js';
import type { JudgeProvider, JudgeResult } from './judges/judge-provider.js';

function buildFakeJudge(result: JudgeResult): JudgeProvider {
  return { judge: async () => result };
}

describe('evaluateOutput', () => {
  it('passes when score meets threshold', async () => {
    const judge = buildFakeJudge({ score: 0.9, reasoning: 'Good output' });

    const result = await evaluateOutput({
      output: 'Agent produced correct answer',
      rubric: 'Output should be correct',
      judge,
    });

    expect(result.pass).toBe(true);
    expect(result.score).toBe(0.9);
    expect(result.reasoning).toBe('Good output');
  });

  it('fails when score is below threshold', async () => {
    const judge = buildFakeJudge({ score: 0.3, reasoning: 'Poor output' });

    const result = await evaluateOutput({
      output: 'Wrong answer',
      rubric: 'Output should be correct',
      judge,
    });

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0.3);
  });

  it('uses custom passThreshold', async () => {
    const judge = buildFakeJudge({ score: 0.5, reasoning: 'Mediocre' });

    const result = await evaluateOutput({
      output: 'Some output',
      rubric: 'Be good',
      judge,
      passThreshold: 0.4,
    });

    expect(result.pass).toBe(true);
  });

  it('fails at exact threshold boundary (below)', async () => {
    const judge = buildFakeJudge({ score: 0.69, reasoning: 'Close' });

    const result = await evaluateOutput({
      output: 'Almost',
      rubric: 'Be good',
      judge,
    });

    expect(result.pass).toBe(false);
  });

  it('passes at exact threshold boundary', async () => {
    const judge = buildFakeJudge({ score: 0.7, reasoning: 'Just enough' });

    const result = await evaluateOutput({
      output: 'Okay',
      rubric: 'Be good',
      judge,
    });

    expect(result.pass).toBe(true);
  });

  it('constructs grading prompt with rubric and output', async () => {
    let capturedPrompt = '';
    const judge: JudgeProvider = {
      judge: async (prompt: string) => {
        capturedPrompt = prompt;
        return { score: 1.0, reasoning: 'Perfect' };
      },
    };

    await evaluateOutput({
      output: 'My agent output',
      rubric: 'Check correctness',
      judge,
    });

    expect(capturedPrompt).toContain('Check correctness');
    expect(capturedPrompt).toContain('My agent output');
  });
});
