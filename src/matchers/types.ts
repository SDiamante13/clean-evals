import type { ExpectedCall } from '../evaluate-trace.js';

interface TraceEvalOptions {
  passThreshold?: number;
  warnThreshold?: number;
}

declare module 'vitest' {
  interface Assertion<T> {
    toPassTraceEval(expected: ExpectedCall[], options?: TraceEvalOptions): T;
  }
  interface AsymmetricMatchersContaining {
    toPassTraceEval(expected: ExpectedCall[], options?: TraceEvalOptions): void;
  }
}
