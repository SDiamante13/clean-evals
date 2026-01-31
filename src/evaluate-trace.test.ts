import { describe, it, expect } from 'vitest';
import { evaluateTrace } from './evaluate-trace.js';
import { buildToolSpan } from './test-helpers/span-builder.js';

describe('evaluateTrace', () => {
  it('returns full match when all expected tools are found', () => {
    const spans = [
      buildToolSpan({ toolName: 'search', args: { q: 'test' } }),
      buildToolSpan({ toolName: 'read_file', args: { path: '/a.ts' } }),
    ];

    const result = evaluateTrace({
      spans,
      expected: [
        { toolName: 'search', args: { q: 'test' } },
        { toolName: 'read_file', args: { path: '/a.ts' } },
      ],
    });

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
    expect(result.details).toHaveLength(2);
  });

  it('returns partial match score', () => {
    const spans = [buildToolSpan({ toolName: 'search', args: { q: 'test' } })];

    const result = evaluateTrace({
      spans,
      expected: [
        { toolName: 'search', args: { q: 'test' } },
        { toolName: 'write_file', args: { path: '/b.ts' } },
      ],
    });

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0.5);
  });

  it('returns zero score when no tools match', () => {
    const spans = [buildToolSpan({ toolName: 'unrelated' })];

    const result = evaluateTrace({
      spans,
      expected: [
        { toolName: 'search' },
        { toolName: 'write_file' },
      ],
    });

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
  });

  it('detects args mismatch even when tool name matches', () => {
    const spans = [buildToolSpan({ toolName: 'search', args: { q: 'wrong' } })];

    const result = evaluateTrace({
      spans,
      expected: [{ toolName: 'search', args: { q: 'correct' } }],
    });

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.details[0]).toContain('args mismatch');
  });

  it('matches tool name only when expected has no args', () => {
    const spans = [buildToolSpan({ toolName: 'search', args: { q: 'anything' } })];

    const result = evaluateTrace({
      spans,
      expected: [{ toolName: 'search' }],
    });

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('handles empty expected array', () => {
    const spans = [buildToolSpan({ toolName: 'search' })];

    const result = evaluateTrace({ spans, expected: [] });

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });
});
