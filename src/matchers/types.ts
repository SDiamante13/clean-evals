import type { ExpectedCall } from '../evaluate-trace.js';
import type { JudgeProvider } from '../judges/judge-provider.js';

interface TraceEvalOptions {
  passThreshold?: number;
  warnThreshold?: number;
  judge?: JudgeProvider;
  rubric?: string;
}

interface PassEvalOptions {
  rubric: string;
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
}

interface HybridEvalOptions {
  expected: ExpectedCall[];
  output: string;
  rubric: string;
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
}

declare module 'vitest' {
  interface Assertion<T> {
    toPassTraceEval(expected: ExpectedCall[], options?: TraceEvalOptions): Promise<T>;
    toPassEval(options: PassEvalOptions): Promise<T>;
    toPassHybridEval(options: HybridEvalOptions): Promise<T>;
  }
  interface AsymmetricMatchersContaining {
    toPassTraceEval(expected: ExpectedCall[], options?: TraceEvalOptions): void;
    toPassEval(options: PassEvalOptions): void;
    toPassHybridEval(options: HybridEvalOptions): void;
  }
}
