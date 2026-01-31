import { describe, it, expect } from 'vitest';
import { buildFailureMatrix } from './failure-matrix.js';
import type { TraceEvalResult } from './evaluate-trace.js';

function buildTraceResult(firstFailureIndex: number | null): TraceEvalResult {
  return {
    pass: firstFailureIndex === null,
    score: 1.0,
    details: [],
    firstFailureIndex,
    firstFailure: null,
  };
}

describe('buildFailureMatrix', () => {
  it('returns no hotspots when all traces pass', () => {
    const results = [
      {
        expected: [{ toolName: 'search' }, { toolName: 'summarize' }],
        traceResult: buildTraceResult(null),
      },
      {
        expected: [{ toolName: 'search' }, { toolName: 'summarize' }],
        traceResult: buildTraceResult(null),
      },
    ];

    const matrix = buildFailureMatrix(results);
    expect(matrix.hotspots()).toHaveLength(0);
    expect(matrix.summary()).toBe('No failures detected.');
  });

  it('tracks failure on first step using (start) as from key', () => {
    const results = [
      {
        expected: [{ toolName: 'search' }, { toolName: 'summarize' }],
        traceResult: buildTraceResult(0),
      },
      {
        expected: [{ toolName: 'search' }, { toolName: 'summarize' }],
        traceResult: buildTraceResult(null),
      },
    ];

    const matrix = buildFailureMatrix(results);
    const hotspots = matrix.hotspots();

    expect(hotspots).toHaveLength(1);
    expect(hotspots[0].transition).toBe('(start) → search');
    expect(hotspots[0].failures).toBe(1);
    expect(hotspots[0].total).toBe(2);
    expect(hotspots[0].rate).toBe(0.5);
  });

  it('tracks mid-sequence transition failures', () => {
    const results = [
      {
        expected: [{ toolName: 'search' }, { toolName: 'summarize' }],
        traceResult: buildTraceResult(1),
      },
      {
        expected: [{ toolName: 'search' }, { toolName: 'summarize' }],
        traceResult: buildTraceResult(null),
      },
    ];

    const matrix = buildFailureMatrix(results);
    const hotspots = matrix.hotspots();

    expect(hotspots).toHaveLength(1);
    expect(hotspots[0].transition).toBe('search → summarize');
    expect(hotspots[0].failures).toBe(1);
    expect(hotspots[0].total).toBe(2);
    expect(hotspots[0].rate).toBe(0.5);
  });

  it('sorts hotspots by failure rate descending', () => {
    const results = [
      {
        expected: [{ toolName: 'search' }, { toolName: 'summarize' }, { toolName: 'format' }],
        traceResult: buildTraceResult(0),
      },
      {
        expected: [{ toolName: 'search' }, { toolName: 'summarize' }, { toolName: 'format' }],
        traceResult: buildTraceResult(0),
      },
      {
        expected: [{ toolName: 'search' }, { toolName: 'summarize' }, { toolName: 'format' }],
        traceResult: buildTraceResult(2),
      },
      {
        expected: [{ toolName: 'search' }, { toolName: 'summarize' }, { toolName: 'format' }],
        traceResult: buildTraceResult(null),
      },
    ];

    const matrix = buildFailureMatrix(results);
    const hotspots = matrix.hotspots();

    expect(hotspots).toHaveLength(2);
    expect(hotspots[0].transition).toBe('(start) → search');
    expect(hotspots[0].rate).toBe(0.5);
    expect(hotspots[1].transition).toBe('summarize → format');
    expect(hotspots[1].rate).toBe(0.25);
  });

  it('formats summary with percentage', () => {
    const results = [
      {
        expected: [{ toolName: 'search' }],
        traceResult: buildTraceResult(0),
      },
      {
        expected: [{ toolName: 'search' }],
        traceResult: buildTraceResult(0),
      },
      {
        expected: [{ toolName: 'search' }],
        traceResult: buildTraceResult(null),
      },
    ];

    const matrix = buildFailureMatrix(results);
    const summary = matrix.summary();

    expect(summary).toContain('(start) → search');
    expect(summary).toContain('2/3 failed');
    expect(summary).toContain('67%');
  });

  it('handles empty input', () => {
    const matrix = buildFailureMatrix([]);
    expect(matrix.hotspots()).toHaveLength(0);
    expect(matrix.summary()).toBe('No failures detected.');
  });
});
