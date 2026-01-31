import { describe, it, expect, afterEach } from 'vitest';
import { createTestTracer } from './tracer.js';

describe('createTestTracer', () => {
  const tracers: Awaited<ReturnType<typeof createTestTracer>>[] = [];

  afterEach(async () => {
    for (const t of tracers) {
      await t.shutdown();
    }
    tracers.length = 0;
  });

  it('should return a tracer, exporter, forceFlush, and shutdown function', async () => {
    const result = await createTestTracer();
    tracers.push(result);

    expect(result).toHaveProperty('tracer');
    expect(result).toHaveProperty('exporter');
    expect(result).toHaveProperty('forceFlush');
    expect(result).toHaveProperty('shutdown');
    expect(typeof result.forceFlush).toBe('function');
    expect(typeof result.shutdown).toBe('function');
  });

  it('should capture spans created by the tracer', async () => {
    const testTracer = await createTestTracer();
    tracers.push(testTracer);
    const { tracer, exporter, forceFlush } = testTracer;

    const span = tracer.startSpan('test-span');
    span.setAttribute('tool.name', 'calculator');
    span.end();

    await forceFlush();

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('test-span');
    expect(spans[0].attributes['tool.name']).toBe('calculator');
  });

  it('should isolate spans between separate tracer instances', async () => {
    const tracer1 = await createTestTracer();
    const tracer2 = await createTestTracer();
    tracers.push(tracer1, tracer2);

    const span1 = tracer1.tracer.startSpan('span-from-tracer-1');
    span1.end();

    const span2 = tracer2.tracer.startSpan('span-from-tracer-2');
    span2.end();

    await tracer1.forceFlush();
    await tracer2.forceFlush();

    const spans1 = tracer1.exporter.getFinishedSpans();
    const spans2 = tracer2.exporter.getFinishedSpans();

    expect(spans1).toHaveLength(1);
    expect(spans1[0].name).toBe('span-from-tracer-1');

    expect(spans2).toHaveLength(1);
    expect(spans2[0].name).toBe('span-from-tracer-2');
  });
});
