import { describe, it, expect } from 'vitest';
import { runWithSamples, formatSampledMessage } from './run-with-samples.js';

describe('runWithSamples', () => {
  it('passes when at least one sample passes (pass@k)', async () => {
    let callCount = 0;
    const evalFn = async () => {
      callCount++;
      return { pass: callCount === 2, score: callCount === 2 ? 0.9 : 0.3 };
    };

    const result = await runWithSamples(evalFn, { count: 3 });

    expect(result.pass).toBe(true);
    expect(result.passCount).toBe(1);
    expect(result.scores).toHaveLength(3);
  });

  it('fails when no samples pass', async () => {
    const evalFn = async () => ({ pass: false, score: 0.2 });
    const result = await runWithSamples(evalFn, { count: 3 });
    expect(result.pass).toBe(false);
    expect(result.passCount).toBe(0);
  });

  it('reports min, max, mean scores', async () => {
    const scores = [0.3, 0.7, 0.5];
    let i = 0;
    const evalFn = async () => ({ pass: scores[i] >= 0.7, score: scores[i++] });
    const result = await runWithSamples(evalFn, { count: 3 });
    expect(result.min).toBe(0.3);
    expect(result.max).toBe(0.7);
    expect(result.mean).toBeCloseTo(0.5);
  });

  it('runs eval function exactly k times', async () => {
    let callCount = 0;
    const evalFn = async () => {
      callCount++;
      return { pass: true, score: 1.0 };
    };
    await runWithSamples(evalFn, { count: 5 });
    expect(callCount).toBe(5);
  });

  it('includes confidence interval in result', async () => {
    const evalFn = async () => ({ pass: true, score: 0.9 });
    const result = await runWithSamples(evalFn, { count: 5 });
    expect(result.confidenceInterval).toBeDefined();
    expect(result.confidenceInterval.level).toBe(0.95);
    expect(result.confidenceInterval.lower).toBeGreaterThan(0.5);
    expect(result.confidenceInterval.upper).toBe(1);
  });

  it('accepts custom confidence level', async () => {
    const evalFn = async () => ({ pass: true, score: 0.9 });
    const result = await runWithSamples(evalFn, { count: 5, confidenceLevel: 0.9 });
    expect(result.confidenceInterval.level).toBe(0.9);
  });
});

describe('formatSampledMessage', () => {
  const baseSampled = {
    pass: false,
    scores: [0.2, 0.3],
    min: 0.2,
    max: 0.3,
    mean: 0.25,
    passCount: 0,
    confidenceInterval: { lower: 0, upper: 0.34, level: 0.95 },
  };

  it('formats failure message with CI', () => {
    const msg = formatSampledMessage(baseSampled, false);
    expect(msg).toContain('Expected at least 1 pass');
    expect(msg).toContain('0/2 passed');
    expect(msg).toContain('95% CI: 0.00–0.34');
  });

  it('formats negated pass message with CI', () => {
    const sampled = {
      ...baseSampled,
      pass: true,
      scores: [0.9, 0.8],
      min: 0.8,
      max: 0.9,
      mean: 0.85,
      passCount: 2,
      confidenceInterval: { lower: 0.34, upper: 1, level: 0.95 },
    };
    const msg = formatSampledMessage(sampled, true);
    expect(msg).toContain('Expected NOT to pass');
    expect(msg).toContain('2/2 passed');
    expect(msg).toContain('95% CI');
  });
});
