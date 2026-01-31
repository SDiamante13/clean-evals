import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest';
import { buildToolSpan } from '../test-helpers/span-builder.js';
import '../matchers/register.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

function spyOnConsoleWarn(): MockInstance {
  return vi.spyOn(globalThis.console, 'warn').mockImplementation(() => {});
}

describe('toPassTraceEval', () => {
  it('passes when all expected tools match', () => {
    const spans = [
      buildToolSpan({ toolName: 'search', args: { q: 'test' } }),
      buildToolSpan({ toolName: 'read_file' }),
    ];

    expect(spans).toPassTraceEval([
      { toolName: 'search', args: { q: 'test' } },
      { toolName: 'read_file' },
    ]);
  });

  it('fails when expected tools are missing', () => {
    const spans = [buildToolSpan({ toolName: 'search' })];

    expect(() => {
      expect(spans).toPassTraceEval([
        { toolName: 'search' },
        { toolName: 'write_file' },
      ]);
    }).toThrow(/score 0.5/);
  });

  it('supports custom pass threshold', () => {
    const spans = [buildToolSpan({ toolName: 'search' })];

    expect(spans).toPassTraceEval(
      [{ toolName: 'search' }, { toolName: 'write_file' }],
      { passThreshold: 0.5 },
    );
  });

  it('logs warning when score is between warn and pass thresholds', () => {
    const warnSpy = spyOnConsoleWarn();
    const spans = [buildToolSpan({ toolName: 'search' })];

    expect(() => {
      expect(spans).toPassTraceEval(
        [{ toolName: 'search' }, { toolName: 'write_file' }],
        { warnThreshold: 0.4, passThreshold: 0.8 },
      );
    }).toThrow();

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Warning: score 0.5'),
    );
  });

  it('does not warn when score is below warn threshold', () => {
    const warnSpy = spyOnConsoleWarn();
    const spans = [buildToolSpan({ toolName: 'unrelated' })];

    expect(() => {
      expect(spans).toPassTraceEval(
        [{ toolName: 'search' }, { toolName: 'write_file' }],
        { warnThreshold: 0.5 },
      );
    }).toThrow();

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('works with .not negation', () => {
    const spans = [buildToolSpan({ toolName: 'search' })];

    expect(spans).not.toPassTraceEval([
      { toolName: 'search' },
      { toolName: 'write_file' },
    ]);
  });
});
