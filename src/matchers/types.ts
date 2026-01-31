import type { ExpectedCall } from '../evaluate-trace.js';
import type { JudgeProvider } from '../judges/judge-provider.js';

interface TraceEvalOptions {
  passThreshold?: number;
  warnThreshold?: number;
}

interface PassEvalOptions {
  rubric: string;
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
}

declare module 'vitest' {
  interface Assertion<T> {
    toPassTraceEval(expected: ExpectedCall[], options?: TraceEvalOptions): T;
    toPassEval(options: PassEvalOptions): Promise<T>;
  }
  interface AsymmetricMatchersContaining {
    toPassTraceEval(expected: ExpectedCall[], options?: TraceEvalOptions): void;
    toPassEval(options: PassEvalOptions): void;
  }
}
