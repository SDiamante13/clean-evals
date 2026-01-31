import { describe, it, expect } from 'vitest';
import { buildToolSpan } from './test-helpers/span-builder.js';
import type { JudgeProvider } from './judges/judge-provider.js';
import { setupAgentEval } from './setup-agent-eval.js';

function buildFakeJudge(result: { score: number; reasoning: string }): JudgeProvider {
  return { judge: async () => result };
}

describe('setupAgentEval', () => {
  it('is a function that can be called without error', () => {
    expect(typeof setupAgentEval).toBe('function');
    setupAgentEval();
  });

  it('matchers work after calling setupAgentEval', async () => {
    setupAgentEval();

    const spans = [buildToolSpan({ toolName: 'search', args: '{}' })];
    await expect(spans).toPassTraceEval([{ toolName: 'search' }]);
  });

  it('toPassEval works after setup', async () => {
    setupAgentEval();

    const judge = buildFakeJudge({ score: 0.9, reasoning: 'Good' });
    await expect('test output').toPassEval({
      rubric: 'Be good',
      judge,
    });
  });
});
