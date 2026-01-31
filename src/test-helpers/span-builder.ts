import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';

interface SpanBuilderOptions {
  toolName?: string;
  args?: Record<string, unknown>;
  attrPrefix?: 'tool' | 'gen_ai' | 'llm';
  startTimeMs?: number;
  result?: string;
}

export function buildToolSpan(options: SpanBuilderOptions = {}): ReadableSpan {
  const { toolName = 'test-tool', args, attrPrefix = 'tool', startTimeMs, result } = options;
  const attributes: Record<string, string> = {};

  const nameKey = getNameKey(attrPrefix);
  const argsKey = getArgsKey(attrPrefix);

  attributes[nameKey] = toolName;
  if (args !== undefined) {
    attributes[argsKey] = JSON.stringify(args);
  }
  if (result !== undefined) {
    attributes['tool.result'] = result;
  }

  return createFakeSpan(attributes, startTimeMs);
}

function getNameKey(prefix: string): string {
  if (prefix === 'gen_ai') return 'gen_ai.request.function_call.name';
  if (prefix === 'llm') return 'llm.function_call.name';
  return 'tool.name';
}

function getArgsKey(prefix: string): string {
  if (prefix === 'gen_ai') return 'gen_ai.request.function_call.arguments';
  if (prefix === 'llm') return 'llm.function_call.arguments';
  return 'tool.arguments';
}

function createFakeSpan(attributes: Record<string, string>, startTimeMs?: number): ReadableSpan {
  const now = startTimeMs ?? Date.now();
  return {
    name: 'test-span',
    kind: SpanKind.INTERNAL,
    spanContext: () => ({
      traceId: '0'.repeat(32),
      spanId: '0'.repeat(16),
      traceFlags: 0,
    }),
    startTime: [Math.floor(now / 1000), (now % 1000) * 1_000_000],
    endTime: [Math.floor(now / 1000), (now % 1000) * 1_000_000],
    status: { code: SpanStatusCode.OK },
    attributes,
    links: [],
    events: [],
    duration: [0, 0],
    ended: true,
    resource: { attributes: {} },
    instrumentationLibrary: { name: 'test' },
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
    parentSpanId: undefined,
  } as unknown as ReadableSpan;
}
