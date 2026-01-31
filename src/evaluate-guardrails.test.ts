import { describe, it, expect } from 'vitest';
import {
  evaluateGuardrails,
  matchesRegex,
  matchesJsonSchema,
  containsNone,
} from './evaluate-guardrails.js';

describe('evaluateGuardrails', () => {
  it('passes when all guardrails pass', () => {
    const result = evaluateGuardrails('hello world', [
      { name: 'has hello', check: (o) => o.includes('hello') },
      { name: 'has world', check: (o) => o.includes('world') },
    ]);
    expect(result.pass).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results.every((r) => r.pass)).toBe(true);
  });

  it('fails when any guardrail fails', () => {
    const result = evaluateGuardrails('hello world', [
      { name: 'has hello', check: (o) => o.includes('hello') },
      { name: 'has foo', check: (o) => o.includes('foo') },
    ]);
    expect(result.pass).toBe(false);
    expect(result.results[1].pass).toBe(false);
  });

  it('supports object return from check', () => {
    const result = evaluateGuardrails('test', [
      { name: 'custom', check: () => ({ pass: false, reason: 'nope' }) },
    ]);
    expect(result.pass).toBe(false);
    expect(result.results[0].reason).toBe('nope');
  });
});

describe('matchesRegex', () => {
  it('passes when pattern matches', () => {
    const check = matchesRegex(/^\d{3}-\d{4}$/);
    expect(check('123-4567').pass).toBe(true);
  });

  it('fails when pattern does not match', () => {
    const check = matchesRegex(/^\d+$/);
    expect(check('abc').pass).toBe(false);
  });
});

describe('matchesJsonSchema', () => {
  it('passes for valid JSON with correct types', () => {
    const check = matchesJsonSchema({ name: 'string', age: 'number' });
    const result = check('{"name":"Alice","age":30}');
    expect(result.pass).toBe(true);
  });

  it('fails for missing key', () => {
    const check = matchesJsonSchema({ name: 'string', age: 'number' });
    const result = check('{"name":"Alice"}');
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('Missing key: age');
  });

  it('fails for wrong type', () => {
    const check = matchesJsonSchema({ name: 'string' });
    const result = check('{"name":42}');
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('expected string');
  });

  it('fails for invalid JSON', () => {
    const check = matchesJsonSchema({ name: 'string' });
    const result = check('not json');
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('not valid JSON');
  });
});

describe('containsNone', () => {
  it('passes when no forbidden strings found', () => {
    const check = containsNone(['password', 'secret']);
    expect(check('hello world').pass).toBe(true);
  });

  it('fails when forbidden string found', () => {
    const check = containsNone(['password', 'secret']);
    const result = check('my password is 123');
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('password');
  });
});
