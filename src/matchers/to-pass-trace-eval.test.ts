import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest';
import { buildToolSpan } from '../test-helpers/span-builder.js';
import type { JudgeProvider, JudgeResult } from '../judges/judge-provider.js';
import '../matchers/register.js';

beforeEach(() => {
  vi.restoreAllMocks();
});

function spyOnConsoleWarn(): MockInstance {
  return vi.spyOn(globalThis.console, 'warn').mockImplementation(() => {});
}

function buildFakeJudge(result: JudgeResult): JudgeProvider {
  return { judge: vi.fn().mockResolvedValue(result) };
}

describe('toPassTraceEval', () => {
  it('passes when all expected tools match', async () => {
    const spans = [buildToolSpan({ toolName: 'search', args: { q: 'test' } }), buildToolSpan({ toolName: 'read_file' })];

    await expect(spans).toPassTraceEval([{ toolName: 'search', args: { q: 'test' } }, { toolName: 'read_file' }]);
  });

  it('fails when expected tools are missing', async () => {
    const spans = [buildToolSpan({ toolName: 'search' })];

    await expect(expect(spans).toPassTraceEval([{ toolName: 'search' }, { toolName: 'write_file' }])).rejects.toThrow(/score 0.5/);
  });

  it('supports custom pass threshold', async () => {
    const spans = [buildToolSpan({ toolName: 'search' })];

    await expect(spans).toPassTraceEval([{ toolName: 'search' }, { toolName: 'write_file' }], { passThreshold: 0.5 });
  });

  it('logs warning when score is between warn and pass thresholds', async () => {
    const warnSpy = spyOnConsoleWarn();
    const spans = [buildToolSpan({ toolName: 'search' })];

    await expect(
      expect(spans).toPassTraceEval([{ toolName: 'search' }, { toolName: 'write_file' }], {
        warnThreshold: 0.4,
        passThreshold: 0.8,
      })
    ).rejects.toThrow();

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: score 0.5'));
  });

  it('does not warn when score is below warn threshold', async () => {
    const warnSpy = spyOnConsoleWarn();
    const spans = [buildToolSpan({ toolName: 'unrelated' })];

    await expect(
      expect(spans).toPassTraceEval([{ toolName: 'search' }, { toolName: 'write_file' }], { warnThreshold: 0.5 })
    ).rejects.toThrow();

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('works with .not negation', async () => {
    const spans = [buildToolSpan({ toolName: 'search' })];

    await expect(spans).not.toPassTraceEval([{ toolName: 'search' }, { toolName: 'write_file' }]);
  });
});

describe('toPassTraceEval with LLM judge', () => {
  it('includes distilled story in judge prompt', async () => {
    const judge = buildFakeJudge({ score: 0.9, reasoning: 'Good trace' });
    const spans = [
      buildToolSpan({ toolName: 'search', args: { q: 'test' }, result: 'found', startTimeMs: 1000 }),
      buildToolSpan({ toolName: 'read_file', args: { path: '/a.ts' }, result: 'contents', startTimeMs: 2000 }),
    ];

    await expect(spans).toPassTraceEval([{ toolName: 'search' }, { toolName: 'read_file' }], {
      judge,
      rubric: 'Agent should search then read',
      passThreshold: 0.8,
    });

    const prompt = (judge.judge as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(prompt).toContain('## Rubric');
    expect(prompt).toContain('Agent should search then read');
    expect(prompt).toContain('## Agent Trace');
    expect(prompt).toContain('[search]');
    expect(prompt).toContain('[read_file]');
  });

  it('fails when judge score is below threshold', async () => {
    const judge = buildFakeJudge({ score: 0.3, reasoning: 'Poor execution' });
    const spans = [buildToolSpan({ toolName: 'search' })];

    await expect(
      expect(spans).toPassTraceEval([{ toolName: 'search' }], { judge, rubric: 'Should be thorough', passThreshold: 0.7 })
    ).rejects.toThrow(/score 0.3/);
  });

  it('includes reasoning in failure message', async () => {
    const judge = buildFakeJudge({ score: 0.2, reasoning: 'Missed critical steps' });
    const spans = [buildToolSpan({ toolName: 'search' })];

    await expect(
      expect(spans).toPassTraceEval([{ toolName: 'search' }], { judge, rubric: 'Complete all steps', passThreshold: 0.7 })
    ).rejects.toThrow(/Missed critical steps/);
  });

  it('skips judge when rubric is missing', async () => {
    const judge = buildFakeJudge({ score: 0.9, reasoning: 'Good' });
    const spans = [buildToolSpan({ toolName: 'search' })];

    await expect(spans).toPassTraceEval([{ toolName: 'search' }], { judge });

    expect(judge.judge).not.toHaveBeenCalled();
  });
});
