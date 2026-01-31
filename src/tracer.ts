import { Tracer } from '@opentelemetry/api';
import { BasicTracerProvider, InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

export interface TestTracer {
  tracer: Tracer;
  exporter: InMemorySpanExporter;
  forceFlush: () => Promise<void>;
  shutdown: () => Promise<void>;
}

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
