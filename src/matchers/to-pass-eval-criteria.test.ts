import { describe, it, expect, vi } from 'vitest';
import { toPassEval } from './to-pass-eval.js';
import type { JudgeProvider, JudgeResult } from '../judges/judge-provider.js';

function buildFakeJudge(result: JudgeResult): JudgeProvider {
  return { judge: async () => result };
}

function buildFlakyJudge(scores: number[]): JudgeProvider {
  let i = 0;
  return {
    judge: vi.fn().mockImplementation(async () => ({
      score: scores[i++],
      reasoning: `Call ${i}`,
    })),
  };
}

describe('toPassEval with criteria', () => {
  it('passes when all criteria pass', async () => {
    const judge = buildFakeJudge({ score: 0.8, reasoning: 'Good' });

    const result = await toPassEval('agent output', {
      criteria: [
        { name: 'Accuracy', check: 'Is the output accurate?' },
        { name: 'Completeness', check: 'Is the output complete?' },
      ],
      judge,
    });

    expect(result.pass).toBe(true);
  });

  it('fails when any criterion fails', async () => {
    let callCount = 0;
    const judge: JudgeProvider = {
      judge: vi.fn().mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? { score: 0.8, reasoning: 'Accurate' } : { score: 0.2, reasoning: 'Incomplete' };
      }),
    };

    const result = await toPassEval('agent output', {
      criteria: [
        { name: 'Accuracy', check: 'Is the output accurate?' },
        { name: 'Completeness', check: 'Is the output complete?' },
      ],
      judge,
    });

    expect(result.pass).toBe(false);
  });

  it('lists per-criterion results in failure message', async () => {
    let callCount = 0;
    const judge: JudgeProvider = {
      judge: vi.fn().mockImplementation(async () => {
        callCount++;
        return callCount === 1 ? { score: 0.8, reasoning: 'Looks accurate' } : { score: 0.2, reasoning: 'Missing details' };
      }),
    };

    const result = await toPassEval('agent output', {
      criteria: [
        { name: 'Accuracy', check: 'Is the output accurate?' },
        { name: 'Completeness', check: 'Is the output complete?' },
      ],
      judge,
    });

    const msg = result.message();
    expect(msg).toContain('PASS Accuracy');
    expect(msg).toContain('FAIL Completeness');
    expect(msg).toContain('Missing details');
  });

  it('shows all criteria passed in success message', async () => {
    const judge = buildFakeJudge({ score: 0.9, reasoning: 'Great' });

    const result = await toPassEval('agent output', {
      criteria: [{ name: 'Quality', check: 'Is it good?' }],
      judge,
    });

    expect(result.pass).toBe(true);
    const msg = result.message();
    expect(msg).toContain('All criteria passed');
    expect(msg).toContain('PASS Quality');
  });

  it('works with samples option', async () => {
    const judge = buildFlakyJudge([0.8, 0.8, 0.2, 0.8]);

    const result = await toPassEval('output', {
      criteria: [{ name: 'Check', check: 'Is it ok?' }],
      judge,
      samples: { count: 2 },
    });

    expect(result.pass).toBe(true);
    expect(result.message()).toContain('pass@2');
  });
});
