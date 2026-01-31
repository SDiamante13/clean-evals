import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { findToolCalls, hasToolAttributes } from './find-tool-calls.js';

/**
 * Converts OpenTelemetry spans into a chronological plain-text narrative.
 *
 * Filters for spans that contain tool call attributes (see {@link findToolCalls}),
 * sorts them by start time, and formats each as a numbered step. The output is
 * designed to be fed into an LLM judge prompt for trajectory grading.
 *
 * @example
 * ```ts
 * const story = distillTrace(exporter.getFinishedSpans());
 * // '1. [search] called with {"query":"hello"} → returned "3 results"'
 * ```
 */
export function distillTrace(spans: ReadableSpan[]): string {
  const toolSpans = spans.filter((span) => hasToolAttributes(span)).sort((a, b) => compareStartTimes(a.startTime, b.startTime));

  return toolSpans.map((span, index) => formatStep(span, index + 1)).join('\n');
}

function compareStartTimes(a: [number, number], b: [number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  return a[1] - b[1];
}

function formatStep(span: ReadableSpan, stepNumber: number): string {
  const [toolCall] = findToolCalls([span]);
  const argsString = toolCall.args ? JSON.stringify(toolCall.args) : '{}';
  const result = String(span.attributes['tool.result'] ?? 'undefined');
  return `${stepNumber}. [${toolCall.toolName}] called with ${argsString} → returned ${result}`;
}
