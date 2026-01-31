import { describe, it, expect } from 'vitest';
import { distillTrace } from './distill-trace.js';
import { buildToolSpan } from './test-helpers/span-builder.js';

describe('distillTrace', () => {
  it('returns empty string for no spans', () => {
    expect(distillTrace([])).toBe('');
  });

  it('formats a single tool span', () => {
    const span = buildToolSpan({
      toolName: 'search',
      args: { query: 'hello' },
      result: '"found 3 results"',
    });

    const result = distillTrace([span]);

    expect(result).toBe('1. [search] called with {"query":"hello"} → returned "found 3 results"');
  });

  it('orders spans by start time', () => {
    const first = buildToolSpan({ toolName: 'step-one', startTimeMs: 1000 });
    const second = buildToolSpan({ toolName: 'step-two', startTimeMs: 2000 });
    const third = buildToolSpan({ toolName: 'step-three', startTimeMs: 3000 });

    const result = distillTrace([third, first, second]);

    expect(result).toContain('1. [step-one]');
    expect(result).toContain('2. [step-two]');
    expect(result).toContain('3. [step-three]');
  });

  it('handles spans without args or result', () => {
    const span = buildToolSpan({ toolName: 'ping', startTimeMs: 1000 });

    const result = distillTrace([span]);

    expect(result).toBe('1. [ping] called with {} → returned undefined');
  });

  it('filters out non-tool spans', () => {
    const toolSpan = buildToolSpan({ toolName: 'search', startTimeMs: 1000 });
    const plainSpan = buildToolSpan({ toolName: 'test-tool', startTimeMs: 500 });

    // buildToolSpan always has tool.name, so create a truly plain span
    const noToolSpan = {
      ...plainSpan,
      attributes: {},
    } as typeof plainSpan;

    const result = distillTrace([noToolSpan, toolSpan]);

    expect(result).toBe('1. [search] called with {} → returned undefined');
  });

  it('produces correct output with nested spans', () => {
    const spans = [
      buildToolSpan({
        toolName: 'read_file',
        args: { path: '/tmp/data.json' },
        result: '{"items": []}',
        startTimeMs: 1000,
      }),
      buildToolSpan({
        toolName: 'write_file',
        args: { path: '/tmp/out.json', content: '[]' },
        result: 'ok',
        startTimeMs: 2000,
      }),
      buildToolSpan({
        toolName: 'notify',
        args: { message: 'done' },
        result: 'sent',
        startTimeMs: 3000,
      }),
    ];

    const result = distillTrace(spans);
    const lines = result.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('[read_file]');
    expect(lines[1]).toContain('[write_file]');
    expect(lines[2]).toContain('[notify]');
  });
});
