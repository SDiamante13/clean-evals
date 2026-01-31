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

function lastWrittenHtml(): string {
  return mockWriteFileSync.mock.calls[0][1] as string;
}

describe('dumpFailures HTML format', () => {
  beforeEach(() => {
    mockWriteFileSync.mockClear();
  });

  it('writes HTML to default .html path', () => {
    dumpFailures([buildEntry(false)], { format: 'html' });
    expect(mockWriteFileSync).toHaveBeenCalledWith('./eval-failures.html', expect.any(String), 'utf-8');
  });

  it('produces self-contained HTML with inline CSS', () => {
    dumpFailures([buildEntry(false)], { format: 'html' });
    const html = lastWrittenHtml();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<style>');
    expect(html).toContain('</style>');
  });

  it('shows input, output, reasoning, and score sections', () => {
    dumpFailures([buildEntry(false, { input: 'my input', output: 'my output' })], { format: 'html' });
    const html = lastWrittenHtml();
    expect(html).toContain('my input');
    expect(html).toContain('my output');
    expect(html).toContain('test reasoning');
    expect(html).toContain('0.30');
  });

  it('escapes HTML in content', () => {
    dumpFailures([buildEntry(false, { input: '<script>alert("xss")</script>' })], { format: 'html' });
    const html = lastWrittenHtml();
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });

  it('only includes failing entries in HTML', () => {
    dumpFailures([buildEntry(true, { input: 'pass-input' }), buildEntry(false, { input: 'fail-input' })], {
      format: 'html',
    });
    const html = lastWrittenHtml();
    expect(html).toContain('fail-input');
    expect(html).not.toContain('pass-input');
  });

  it('shows failure count in heading', () => {
    dumpFailures([buildEntry(false), buildEntry(false)], { format: 'html' });
    const html = lastWrittenHtml();
    expect(html).toContain('Eval Failures (2)');
  });
});
