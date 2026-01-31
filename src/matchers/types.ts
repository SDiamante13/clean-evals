import { formatSampledMessage } from '../run-with-samples.js';
import type { SampledResult } from '../run-with-samples.js';
import type { ExpectedCall } from '../evaluate-trace.js';
import type { Guardrail } from '../evaluate-guardrails.js';
import type { TraceEvalOptions } from './to-pass-trace-eval.js';
import type { PassEvalOptions } from './to-pass-eval.js';
import type { HybridEvalOptions } from './to-pass-hybrid-eval.js';

export interface MatcherResult {
  pass: boolean;
  message: () => string;
}

export function buildSampledMatcherResult(sampled: SampledResult): MatcherResult {
  return {
    pass: sampled.pass,
    message: (): string => formatSampledMessage(sampled, sampled.pass),
  };
}

declare module 'vitest' {
  interface Assertion<T> {
    toPassTraceEval(expected: ExpectedCall[], options?: TraceEvalOptions): Promise<T>;
    toPassEval(options: PassEvalOptions): Promise<T>;
    toPassHybridEval(options: HybridEvalOptions): Promise<T>;
    toPassGuardrails(guardrails: Guardrail[]): T;
  }
  interface AsymmetricMatchersContaining {
    toPassTraceEval(expected: ExpectedCall[], options?: TraceEvalOptions): void;
    toPassEval(options: PassEvalOptions): void;
    toPassHybridEval(options: HybridEvalOptions): void;
    toPassGuardrails(guardrails: Guardrail[]): void;
  }
}
