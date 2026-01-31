import { ReadableSpan } from '@opentelemetry/sdk-trace-base';

/**
 * A tool call extracted from an OpenTelemetry span.
 */
export interface ToolCall {
  toolName: string;
  args: Record<string, unknown> | undefined;
}

/**
 * Supported OpenTelemetry semantic conventions for tool/function call attributes.
 *
 * Different LLM instrumentation libraries use different attribute naming conventions.
 * This library supports three conventions, checked in priority order:
 *
 * 1. **`tool.*`** — Generic tool calling convention.
 *    - `tool.name`, `tool.arguments`, `tool.result`
 *    - Used by: general-purpose OpenTelemetry instrumentation
 *
 * 2. **`gen_ai.request.function_call.*`** — OpenAI Semantic Conventions.
 *    - `gen_ai.request.function_call.name`, `gen_ai.request.function_call.arguments`
 *    - Used by: OpenAI SDK instrumentation, OpenLLMetry
 *    - Spec: https://opentelemetry.io/docs/specs/semconv/gen-ai/
 *
 * 3. **`llm.function_call.*`** — Alternative LLM convention.
 *    - `llm.function_call.name`, `llm.function_call.arguments`
 *    - Used by: some community instrumentation libraries
 */
export type AttributeConvention = 'tool' | 'gen_ai' | 'llm';

/**
 * Extracts tool calls from OpenTelemetry spans.
 *
 * Scans each span's attributes for tool/function call data using any of the
 * three supported {@link AttributeConvention | semantic conventions}, and returns
 * the extracted tool name and parsed arguments.
 *
 * @example
 * ```ts
 * const spans = exporter.getFinishedSpans();
 * const toolCalls = findToolCalls(spans);
 * // [{ toolName: 'calculator', args: { a: 1, b: 2 } }]
 * ```
 */
export function findToolCalls(spans: ReadableSpan[]): ToolCall[] {
  return spans.filter((span) => hasToolAttributes(span)).map((span) => extractToolCall(span));
}

export function hasToolAttributes(span: ReadableSpan): boolean {
  const attributes = span.attributes;
  return !!(attributes['tool.name'] || attributes['gen_ai.request.function_call.name'] || attributes['llm.function_call.name']);
}

function extractToolCall(span: ReadableSpan): ToolCall {
  const attributes = span.attributes;

  const toolName = String(
    attributes['tool.name'] ?? attributes['gen_ai.request.function_call.name'] ?? attributes['llm.function_call.name'] ?? ''
  );

  const rawArgs =
    attributes['tool.arguments'] ?? attributes['gen_ai.request.function_call.arguments'] ?? attributes['llm.function_call.arguments'];

  const args = parseArgs(rawArgs);

  return { toolName, args };
}

function parseArgs(raw: unknown): Record<string, unknown> | undefined {
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
