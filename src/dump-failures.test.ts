import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dumpFailures, FailureEntry } from './dump-failures.js';
import { writeFileSync } from 'node:fs';

vi.mock('node:fs', () => ({
  writeFileSync: vi.fn(),
}));

const mockWriteFileSync = vi.mocked(writeFileSync);

function buildEntry(pass: boolean, overrides?: Partial<FailureEntry>): FailureEntry {
  return {
    input: overrides?.input ?? 'test input',
    output: overrides?.output ?? 'test output',
    evalResult: { pass, score: pass ? 0.9 : 0.3, reasoning: 'test reasoning' },
    ...overrides,
  };
}

function lastWrittenJson(): FailureEntry[] {
  const raw = mockWriteFileSync.mock.calls[0][1] as string;
  return JSON.parse(raw) as FailureEntry[];
}

describe('dumpFailures', () => {
  beforeEach(() => {
    mockWriteFileSync.mockClear();
  });

  it('filters to only failing results', () => {
    dumpFailures([buildEntry(true), buildEntry(false), buildEntry(true)]);
    const written = lastWrittenJson();
    expect(written).toHaveLength(1);
    expect(written[0].evalResult.pass).toBe(false);
  });

  it('writes to default path when none specified', () => {
    dumpFailures([buildEntry(false)]);
    expect(mockWriteFileSync).toHaveBeenCalledWith('./eval-failures.json', expect.any(String), 'utf-8');
  });

  it('writes to custom path', () => {
    dumpFailures([buildEntry(false)], { path: '/tmp/custom.json' });
    expect(mockWriteFileSync).toHaveBeenCalledWith('/tmp/custom.json', expect.any(String), 'utf-8');
  });

  it('outputs pretty-printed JSON', () => {
    dumpFailures([buildEntry(false)]);
    const raw = mockWriteFileSync.mock.calls[0][1] as string;
    expect(raw).toContain('\n');
    expect(() => JSON.parse(raw) as unknown).not.toThrow();
  });

  it('preserves metadata in output', () => {
    dumpFailures([buildEntry(false, { metadata: { run: 42 } })]);
    const written = lastWrittenJson();
    expect(written[0].metadata).toEqual({ run: 42 });
  });

  it('writes empty array when all pass', () => {
    dumpFailures([buildEntry(true), buildEntry(true)]);
    expect(lastWrittenJson()).toEqual([]);
  });
});
