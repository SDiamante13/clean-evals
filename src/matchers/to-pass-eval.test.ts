import { describe, it, expect } from 'vitest';
import { toPassEval } from './to-pass-eval.js';
import type { JudgeProvider, JudgeResult } from '../judges/judge-provider.js';

function buildFakeJudge(result: JudgeResult): JudgeProvider {
  return { judge: async () => result };
}

describe('toPassEval', () => {
  it('passes when judge score meets threshold', async () => {
    const judge = buildFakeJudge({ score: 0.9, reasoning: 'Good' });

    const result = await toPassEval('agent output', {
      rubric: 'Be correct',
      judge,
    });

    expect(result.pass).toBe(true);
  });

  it('fails when judge score is below threshold', async () => {
    const judge = buildFakeJudge({ score: 0.3, reasoning: 'Poor quality' });

    const result = await toPassEval('bad output', {
      rubric: 'Be correct',
      judge,
    });

    expect(result.pass).toBe(false);
  });

  it('includes reasoning in failure message', async () => {
    const judge = buildFakeJudge({ score: 0.2, reasoning: 'Missing key details' });

    const result = await toPassEval('incomplete', {
      rubric: 'Be thorough',
      judge,
    });

    expect(result.pass).toBe(false);
    expect(result.message()).toContain('Missing key details');
    expect(result.message()).toContain('0.2');
  });

  it('includes reasoning in negated pass message', async () => {
    const judge = buildFakeJudge({ score: 0.9, reasoning: 'Well done' });

    const result = await toPassEval('great output', {
      rubric: 'Be correct',
      judge,
    });

    expect(result.pass).toBe(true);
    expect(result.message()).toContain('Well done');
    expect(result.message()).toContain('NOT to pass');
  });

  it('uses custom passThreshold', async () => {
    const judge = buildFakeJudge({ score: 0.5, reasoning: 'Okay' });

    const result = await toPassEval('output', {
      rubric: 'Be correct',
      judge,
      passThreshold: 0.4,
    });

    expect(result.pass).toBe(true);
  });

  it('shows threshold in failure message', async () => {
    const judge = buildFakeJudge({ score: 0.5, reasoning: 'Not enough' });

    const result = await toPassEval('output', {
      rubric: 'Be correct',
      judge,
      passThreshold: 0.8,
    });

    expect(result.pass).toBe(false);
    expect(result.message()).toContain('0.8');
  });
});
