import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { findToolCalls } from './find-tool-calls.js';

export function distillTrace(spans: ReadableSpan[]): string {
  const toolSpans = spans
    .filter((span) => hasToolName(span))
    .sort((a, b) => compareStartTimes(a.startTime, b.startTime));

  return toolSpans
    .map((span, index) => formatStep(span, index + 1))
    .join('\n');
}

function hasToolName(span: ReadableSpan): boolean {
  const attrs = span.attributes;
  return !!(
    attrs['tool.name'] ||
    attrs['gen_ai.request.function_call.name'] ||
    attrs['llm.function_call.name']
  );
}

function compareStartTimes(a: [number, number], b: [number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  return a[1] - b[1];
}

function formatStep(span: ReadableSpan, stepNumber: number): string {
  const [toolCall] = findToolCalls([span]);
  const argsStr = toolCall.args ? JSON.stringify(toolCall.args) : '{}';
  const result = (span.attributes['tool.result'] as string) ?? 'undefined';
  return `${stepNumber}. [${toolCall.toolName}] called with ${argsStr} → returned ${result}`;
}
