import { describe, it, expect, afterEach } from 'vitest';
import { createTestTracer } from './tracer.js';
import { findToolCalls } from './find-tool-calls.js';

describe('findToolCalls', () => {
  const tracers: Awaited<ReturnType<typeof createTestTracer>>[] = [];

  afterEach(async () => {
    for (const testTracer of tracers) {
      await testTracer.shutdown();
    }
    tracers.length = 0;
  });

  it('extracts tool calls using generic tool.name / tool.arguments', async () => {
    const testTracer = await createTestTracer();
    tracers.push(testTracer);

    const span = testTracer.tracer.startSpan('tool-call');
    span.setAttribute('tool.name', 'calculator');
    span.setAttribute('tool.arguments', JSON.stringify({ a: 1, b: 2 }));
    span.end();

    await testTracer.forceFlush();
    const result = findToolCalls(testTracer.exporter.getFinishedSpans());

    expect(result).toEqual([{ toolName: 'calculator', args: { a: 1, b: 2 } }]);
  });

  it('extracts tool calls using gen_ai semantic convention (OpenAI/OpenLLMetry)', async () => {
    const testTracer = await createTestTracer();
    tracers.push(testTracer);

    const span = testTracer.tracer.startSpan('function-call');
    span.setAttribute('gen_ai.request.function_call.name', 'get_weather');
    span.setAttribute('gen_ai.request.function_call.arguments', JSON.stringify({ city: 'NYC' }));
    span.end();

    await testTracer.forceFlush();
    const result = findToolCalls(testTracer.exporter.getFinishedSpans());

    expect(result).toEqual([{ toolName: 'get_weather', args: { city: 'NYC' } }]);
  });

  it('extracts tool calls using llm.function_call convention', async () => {
    const testTracer = await createTestTracer();
    tracers.push(testTracer);

    const span = testTracer.tracer.startSpan('llm-call');
    span.setAttribute('llm.function_call.name', 'search');
    span.setAttribute('llm.function_call.arguments', JSON.stringify({ query: 'hello' }));
    span.end();

    await testTracer.forceFlush();
    const result = findToolCalls(testTracer.exporter.getFinishedSpans());

    expect(result).toEqual([{ toolName: 'search', args: { query: 'hello' } }]);
  });

  it('returns undefined args when no arguments attribute present', async () => {
    const testTracer = await createTestTracer();
    tracers.push(testTracer);

    const span = testTracer.tracer.startSpan('tool-call');
    span.setAttribute('tool.name', 'noop');
    span.end();

    await testTracer.forceFlush();
    const result = findToolCalls(testTracer.exporter.getFinishedSpans());

    expect(result).toEqual([{ toolName: 'noop', args: undefined }]);
  });

  it('ignores spans without tool attributes', async () => {
    const testTracer = await createTestTracer();
    tracers.push(testTracer);

    const httpSpan = testTracer.tracer.startSpan('regular-span');
    httpSpan.setAttribute('http.method', 'GET');
    httpSpan.end();

    const toolSpan = testTracer.tracer.startSpan('tool-span');
    toolSpan.setAttribute('tool.name', 'fetch');
    toolSpan.end();

    await testTracer.forceFlush();
    const result = findToolCalls(testTracer.exporter.getFinishedSpans());

    expect(result).toHaveLength(1);
    expect(result[0].toolName).toBe('fetch');
  });

  it('extracts multiple tool calls from multiple spans', async () => {
    const testTracer = await createTestTracer();
    tracers.push(testTracer);

    const searchSpan = testTracer.tracer.startSpan('call-1');
    searchSpan.setAttribute('tool.name', 'search');
    searchSpan.setAttribute('tool.arguments', JSON.stringify({ q: 'test' }));
    searchSpan.end();

    const readFileSpan = testTracer.tracer.startSpan('call-2');
    readFileSpan.setAttribute('tool.name', 'read_file');
    readFileSpan.setAttribute('tool.arguments', JSON.stringify({ path: '/a.ts' }));
    readFileSpan.end();

    await testTracer.forceFlush();
    const result = findToolCalls(testTracer.exporter.getFinishedSpans());

    expect(result).toHaveLength(2);
    expect(result[0].toolName).toBe('search');
    expect(result[1].toolName).toBe('read_file');
  });
});
