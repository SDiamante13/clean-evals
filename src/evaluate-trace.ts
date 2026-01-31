import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { findToolCalls, ToolCall } from './find-tool-calls.js';

/**
 * A tool call that the agent is expected to have made.
 * When {@link args} is omitted, only the tool name is matched.
 */
export interface ExpectedCall {
  toolName: string;
  args?: Record<string, unknown>;
}

/**
 * Result of a deterministic trace evaluation.
 *
 * - `score` ranges from 0.0 (no matches) to 1.0 (all expected calls found).
 * - `details` contains a per-expectation breakdown of matches and mismatches.
 */
export interface TraceEvalResult {
  pass: boolean;
  score: number;
  details: string[];
}

/**
 * Deterministically evaluates agent behavior by comparing actual tool calls
 * in OpenTelemetry spans against a list of expected calls.
 *
 * Score = (matched calls) / (expected calls). Pass requires a perfect 1.0.
 *
 * @example
 * ```ts
 * const result = evaluateTrace({
 *   spans: exporter.getFinishedSpans(),
 *   expected: [
 *     { toolName: 'search', args: { query: 'weather' } },
 *     { toolName: 'summarize' },
 *   ],
 * });
 * // { pass: true, score: 1.0, details: ['✓ search matched', '✓ summarize matched'] }
 * ```
 */
export function evaluateTrace(params: { spans: ReadableSpan[]; expected: ExpectedCall[] }): TraceEvalResult {
  const { spans, expected } = params;
  const actual = findToolCalls(spans);
  const details: string[] = [];
  let matched = 0;

  for (const expectedCall of expected) {
    const match = findMatch(actual, expectedCall);
    if (match) {
      matched++;
      details.push(`✓ ${expectedCall.toolName} matched`);
    } else {
      details.push(buildMismatchDetail(expectedCall, actual));
    }
  }

  const score = expected.length === 0 ? 1.0 : matched / expected.length;
  return { pass: score === 1.0, score, details };
}

function findMatch(actual: ToolCall[], expected: ExpectedCall): boolean {
  return actual.some((call) => call.toolName === expected.toolName && argsMatch(expected.args, call.args));
}

function argsMatch(expected: Record<string, unknown> | undefined, actual: Record<string, unknown> | undefined): boolean {
  if (expected === undefined) return true;
  try {
    return JSON.stringify(sortKeys(expected)) === JSON.stringify(sortKeys(actual ?? {}));
  } catch {
    return false;
  }
}

function sortKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}

function buildMismatchDetail(expectedCall: ExpectedCall, actual: ToolCall[]): string {
  const nameMatch = actual.find((call) => call.toolName === expectedCall.toolName);
  if (nameMatch && expectedCall.args) {
    return `✗ ${expectedCall.toolName} found but args mismatch`;
  }
  return `✗ ${expectedCall.toolName} not found`;
}
