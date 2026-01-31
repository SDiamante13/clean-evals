import { describe, it, expect } from 'vitest';
import { wilsonInterval } from './wilson-interval.js';

describe('wilsonInterval', () => {
  it('returns zero interval for zero trials', () => {
    const ci = wilsonInterval(0, 0);
    expect(ci.lower).toBe(0);
    expect(ci.upper).toBe(0);
    expect(ci.level).toBe(0.95);
  });

  it('handles 0/n (all failures)', () => {
    const ci = wilsonInterval(0, 10);
    expect(ci.lower).toBe(0);
    expect(ci.upper).toBeGreaterThan(0);
    expect(ci.upper).toBeLessThan(0.5);
  });

  it('handles n/n (all successes)', () => {
    const ci = wilsonInterval(10, 10);
    expect(ci.lower).toBeGreaterThan(0.5);
    expect(ci.upper).toBe(1);
  });

  it('computes reasonable interval for small samples', () => {
    const ci = wilsonInterval(3, 5, 0.95);
    expect(ci.lower).toBeGreaterThan(0.1);
    expect(ci.upper).toBeLessThan(1);
    expect(ci.lower).toBeLessThan(ci.upper);
    expect(ci.level).toBe(0.95);
  });

  it('uses custom confidence level', () => {
    const ci90 = wilsonInterval(3, 5, 0.9);
    const ci99 = wilsonInterval(3, 5, 0.99);
    expect(ci90.upper - ci90.lower).toBeLessThan(ci99.upper - ci99.lower);
  });

  it('throws for unsupported confidence level', () => {
    expect(() => wilsonInterval(1, 2, 0.5)).toThrow('Unsupported confidence level');
  });
});
