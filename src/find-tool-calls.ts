import { ReadableSpan } from '@opentelemetry/sdk-trace-base';

export interface ToolCall {
  toolName: string;
  args: Record<string, unknown> | undefined;
}

export function findToolCalls(spans: ReadableSpan[]): ToolCall[] {
  return spans
    .filter((span) => hasToolAttributes(span))
    .map((span) => extractToolCall(span));
}

function hasToolAttributes(span: ReadableSpan): boolean {
  const attrs = span.attributes;
  return !!(
    attrs['tool.name'] ||
    attrs['gen_ai.request.function_call.name'] ||
    attrs['llm.function_call.name']
  );
}

function extractToolCall(span: ReadableSpan): ToolCall {
  const attrs = span.attributes;

  const toolName = (attrs['tool.name'] ??
    attrs['gen_ai.request.function_call.name'] ??
    attrs['llm.function_call.name'] ??
    '') as string;

  const rawArgs =
    attrs['tool.arguments'] ??
    attrs['gen_ai.request.function_call.arguments'] ??
    attrs['llm.function_call.arguments'];

  const args = parseArgs(rawArgs);

  return { toolName, args };
}

function parseArgs(
  raw: unknown,
): Record<string, unknown> | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  return undefined;
}
