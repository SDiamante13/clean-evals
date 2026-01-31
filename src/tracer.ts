import { Tracer } from '@opentelemetry/api';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

/**
 * An isolated tracer instance for capturing spans in tests.
 */
export interface TestTracer {
  tracer: Tracer;
  exporter: InMemorySpanExporter;
  forceFlush: () => Promise<void>;
  shutdown: () => Promise<void>;
}

/**
 * Creates an isolated tracer with an in-memory span exporter for testing.
 *
 * Each call returns an independent tracer/exporter pair so spans from
 * different tests never leak into each other. Call {@link TestTracer.shutdown}
 * in your test teardown to clean up.
 *
 * @example
 * ```ts
 * const { tracer, exporter, shutdown } = await createTestTracer();
 * const span = tracer.startSpan('my-operation');
 * span.end();
 * await forceFlush();
 * const spans = exporter.getFinishedSpans();
 * await shutdown();
 * ```
 */
export async function createTestTracer(): Promise<TestTracer> {
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });

  const tracer = provider.getTracer('agent-eval-test');

  const forceFlush = async (): Promise<void> => {
    await provider.forceFlush();
  };

  const shutdown = async (): Promise<void> => {
    await provider.forceFlush();
    await provider.shutdown();
  };

  return { tracer, exporter, forceFlush, shutdown };
}
