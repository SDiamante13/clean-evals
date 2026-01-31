import { describe, it, expect, afterEach } from 'vitest';
import { createTestTracer } from './tracer.js';
import { findToolCalls } from './find-tool-calls.js';

describe('findToolCalls', () => {
  const tracers: Awaited<ReturnType<typeof createTestTracer>>[] = [];

  afterEach(async () => {
    for (const t of tracers) {
      await t.shutdown();
    }
    tracers.length = 0;
  });

  it('extracts tool calls using generic tool.name / tool.arguments', async () => {
    const t = await createTestTracer();
    tracers.push(t);

    const span = t.tracer.startSpan('tool-call');
    span.setAttribute('tool.name', 'calculator');
    span.setAttribute('tool.arguments', JSON.stringify({ a: 1, b: 2 }));
    span.end();

    await t.forceFlush();
    const result = findToolCalls(t.exporter.getFinishedSpans());

    expect(result).toEqual([{ toolName: 'calculator', args: { a: 1, b: 2 } }]);
  });

  it('extracts tool calls using OpenAI function-calling attributes', async () => {
    const t = await createTestTracer();
    tracers.push(t);

    const span = t.tracer.startSpan('function-call');
    span.setAttribute('gen_ai.request.function_call.name', 'get_weather');
    span.setAttribute('gen_ai.request.function_call.arguments', JSON.stringify({ city: 'NYC' }));
    span.end();

    await t.forceFlush();
    const result = findToolCalls(t.exporter.getFinishedSpans());

    expect(result).toEqual([{ toolName: 'get_weather', args: { city: 'NYC' } }]);
  });

  it('extracts tool calls using llm.function_call attributes', async () => {
    const t = await createTestTracer();
    tracers.push(t);

    const span = t.tracer.startSpan('llm-call');
    span.setAttribute('llm.function_call.name', 'search');
    span.setAttribute('llm.function_call.arguments', JSON.stringify({ query: 'hello' }));
    span.end();

    await t.forceFlush();
    const result = findToolCalls(t.exporter.getFinishedSpans());

    expect(result).toEqual([{ toolName: 'search', args: { query: 'hello' } }]);
  });

  it('returns undefined args when no arguments attribute present', async () => {
    const t = await createTestTracer();
    tracers.push(t);

    const span = t.tracer.startSpan('tool-call');
    span.setAttribute('tool.name', 'noop');
    span.end();

    await t.forceFlush();
    const result = findToolCalls(t.exporter.getFinishedSpans());

    expect(result).toEqual([{ toolName: 'noop', args: undefined }]);
  });

  it('ignores spans without tool attributes', async () => {
    const t = await createTestTracer();
    tracers.push(t);

    const span1 = t.tracer.startSpan('regular-span');
    span1.setAttribute('http.method', 'GET');
    span1.end();

    const span2 = t.tracer.startSpan('tool-span');
    span2.setAttribute('tool.name', 'fetch');
    span2.end();

    await t.forceFlush();
    const result = findToolCalls(t.exporter.getFinishedSpans());

    expect(result).toHaveLength(1);
    expect(result[0].toolName).toBe('fetch');
  });

  it('extracts multiple tool calls from multiple spans', async () => {
    const t = await createTestTracer();
    tracers.push(t);

    const s1 = t.tracer.startSpan('call-1');
    s1.setAttribute('tool.name', 'search');
    s1.setAttribute('tool.arguments', JSON.stringify({ q: 'test' }));
    s1.end();

    const s2 = t.tracer.startSpan('call-2');
    s2.setAttribute('tool.name', 'read_file');
    s2.setAttribute('tool.arguments', JSON.stringify({ path: '/a.ts' }));
    s2.end();

    await t.forceFlush();
    const result = findToolCalls(t.exporter.getFinishedSpans());

    expect(result).toHaveLength(2);
    expect(result[0].toolName).toBe('search');
    expect(result[1].toolName).toBe('read_file');
  });
});
