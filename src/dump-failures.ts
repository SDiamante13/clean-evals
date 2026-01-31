import { writeFileSync } from 'node:fs';
import type { OutputEvalResult } from './evaluate-output.js';
import type { TraceEvalResult } from './evaluate-trace.js';
import type { HybridEvalResult } from './evaluate-hybrid.js';
import type { GuardrailsEvalResult } from './evaluate-guardrails.js';

export type EvalResult = OutputEvalResult | TraceEvalResult | HybridEvalResult | GuardrailsEvalResult;

export interface FailureEntry {
  input: string;
  output: string;
  evalResult: EvalResult;
  metadata?: Record<string, unknown>;
}

export interface DumpFailuresOptions {
  path?: string;
}

export function dumpFailures(results: FailureEntry[], options?: DumpFailuresOptions): void {
  const failures = results.filter((r) => !r.evalResult.pass);
  const outputPath = options?.path ?? './eval-failures.json';
  writeFileSync(outputPath, JSON.stringify(failures, null, 2), 'utf-8');
}
