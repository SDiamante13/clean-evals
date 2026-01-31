import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { findToolCalls, ToolCall } from './find-tool-calls.js';

export interface ExpectedCall {
  toolName: string;
  args?: Record<string, unknown>;
}

export interface TraceEvalResult {
  pass: boolean;
  score: number;
  details: string[];
}

export function evaluateTrace(params: {
  spans: ReadableSpan[];
  expected: ExpectedCall[];
}): TraceEvalResult {
  const { spans, expected } = params;
  const actual = findToolCalls(spans);
  const details: string[] = [];
  let matched = 0;

  for (const exp of expected) {
    const match = findMatch(actual, exp);
    if (match) {
      matched++;
      details.push(`✓ ${exp.toolName} matched`);
    } else {
      details.push(buildMismatchDetail(exp, actual));
    }
  }

  const score = expected.length === 0 ? 1.0 : matched / expected.length;
  return { pass: score === 1.0, score, details };
}

function findMatch(actual: ToolCall[], expected: ExpectedCall): boolean {
  return actual.some(
    (call) => call.toolName === expected.toolName && argsMatch(expected.args, call.args),
  );
}

function argsMatch(
  expected: Record<string, unknown> | undefined,
  actual: Record<string, unknown> | undefined,
): boolean {
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

function buildMismatchDetail(exp: ExpectedCall, actual: ToolCall[]): string {
  const nameMatch = actual.find((c) => c.toolName === exp.toolName);
  if (nameMatch && exp.args) {
    return `✗ ${exp.toolName} found but args mismatch`;
  }
  return `✗ ${exp.toolName} not found`;
}
