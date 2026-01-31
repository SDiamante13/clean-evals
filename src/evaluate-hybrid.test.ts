import { describe, it, expect, vi } from 'vitest';
import { evaluateHybrid } from './evaluate-hybrid.js';
import { buildToolSpan } from './test-helpers/span-builder.js';
import type { JudgeProvider } from './judges/judge-provider.js';
import type { JudgeResult } from './judges/judge-provider.js';

function buildFakeJudge(result: JudgeResult): JudgeProvider {
  return { judge: vi.fn().mockResolvedValue(result) };
}

describe('evaluateHybrid', () => {
  const spans = [buildToolSpan({ toolName: 'search' }), buildToolSpan({ toolName: 'answer' })];
  const expected = [{ toolName: 'search' }, { toolName: 'answer' }];

  it('runs LLM judge when deterministic check passes', async () => {
    const judge = buildFakeJudge({ score: 0.9, reasoning: 'Good' });

    const result = await evaluateHybrid({
      spans,
      expected,
      output: 'some output',
      rubric: 'be helpful',
      judge,
    });

    expect(result.pass).toBe(true);
    expect(result.deterministicScore).toBe(1.0);
    expect(result.skippedLlm).toBe(false);
    expect(result.llmResult?.score).toBe(0.9);
  });

  it('skips LLM judge when deterministic check fails', async () => {
    const judge = buildFakeJudge({ score: 0.9, reasoning: 'Good' });

    const result = await evaluateHybrid({
      spans,
      expected: [{ toolName: 'search' }, { toolName: 'missing-tool' }],
      output: 'some output',
      rubric: 'be helpful',
      judge,
    });

    expect(result.pass).toBe(false);
    expect(result.skippedLlm).toBe(true);
    expect(result.llmResult).toBeUndefined();
    expect(judge.judge).not.toHaveBeenCalled();
  });

  it('fails when LLM judge score is below threshold', async () => {
    const judge = buildFakeJudge({ score: 0.3, reasoning: 'Poor' });

    const result = await evaluateHybrid({
      spans,
      expected,
      output: 'bad output',
      rubric: 'be helpful',
      judge,
    });

    expect(result.pass).toBe(false);
    expect(result.skippedLlm).toBe(false);
    expect(result.llmResult?.score).toBe(0.3);
  });

  it('respects custom passThreshold', async () => {
    const judge = buildFakeJudge({ score: 0.5, reasoning: 'Okay' });

    const result = await evaluateHybrid({
      spans,
      expected,
      output: 'some output',
      rubric: 'be helpful',
      judge,
      passThreshold: 0.4,
    });

    expect(result.pass).toBe(true);
    expect(result.llmResult?.score).toBe(0.5);
  });
});
