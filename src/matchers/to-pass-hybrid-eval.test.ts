import { describe, it, expect, vi } from 'vitest';
import { buildToolSpan } from '../test-helpers/span-builder.js';
import type { JudgeProvider } from '../judges/judge-provider.js';
import type { JudgeResult } from '../judges/judge-provider.js';
import { setupAgentEval } from '../setup-agent-eval.js';
setupAgentEval();

function buildFakeJudge(result: JudgeResult): JudgeProvider {
  return { judge: vi.fn().mockResolvedValue(result) };
}

describe('toPassHybridEval', () => {
  const spans = [buildToolSpan({ toolName: 'search' }), buildToolSpan({ toolName: 'answer' })];
  const expected = [{ toolName: 'search' }, { toolName: 'answer' }];

  it('passes when both deterministic and LLM checks pass', async () => {
    const judge = buildFakeJudge({ score: 0.9, reasoning: 'Good output' });

    await expect(spans).toPassHybridEval({
      expected,
      output: 'great result',
      rubric: 'be helpful',
      judge,
    });
  });

  it('fails fast when deterministic check fails, skipping LLM judge', async () => {
    const judge = buildFakeJudge({ score: 0.9, reasoning: 'Good' });

    await expect(spans).not.toPassHybridEval({
      expected: [{ toolName: 'search' }, { toolName: 'missing-tool' }],
      output: 'some output',
      rubric: 'be helpful',
      judge,
    });

    expect(judge.judge).not.toHaveBeenCalled();
  });

  it('fails when LLM judge score is below threshold', async () => {
    const judge = buildFakeJudge({ score: 0.3, reasoning: 'Poor quality' });

    await expect(spans).not.toPassHybridEval({
      expected,
      output: 'bad output',
      rubric: 'be helpful',
      judge,
    });
  });

  it('includes reasoning in failure message', async () => {
    const judge = buildFakeJudge({ score: 0.2, reasoning: 'Very poor' });

    try {
      await expect(spans).toPassHybridEval({
        expected,
        output: 'bad',
        rubric: 'be helpful',
        judge,
      });
    } catch (error: unknown) {
      const err = error as Error;
      expect(err.message).toContain('Very poor');
      expect(err.message).toContain('Reasoning');
    }
  });

  it('shows skipped LLM message when deterministic fails', async () => {
    const judge = buildFakeJudge({ score: 0.9, reasoning: 'Good' });

    try {
      await expect(spans).toPassHybridEval({
        expected: [{ toolName: 'nonexistent' }],
        output: 'output',
        rubric: 'rubric',
        judge,
      });
    } catch (error: unknown) {
      const err = error as Error;
      expect(err.message).toContain('LLM judge was skipped');
    }
  });
});
