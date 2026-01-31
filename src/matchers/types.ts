import { formatSampledMessage } from '../run-with-samples.js';
import type { SampledResult } from '../run-with-samples.js';
import type { ExpectedCall } from '../evaluate-trace.js';
import type { JudgeProvider } from '../judges/judge-provider.js';
import type { SamplesConfig } from '../run-with-samples.js';
import type { Guardrail } from '../evaluate-guardrails.js';

interface TraceEvalOptions {
  passThreshold?: number;
  warnThreshold?: number;
  judge?: JudgeProvider;
  rubric?: string;
  samples?: SamplesConfig;
}

interface PassEvalOptions {
  rubric?: string;
  criteria?: { name: string; check: string }[];
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
  samples?: SamplesConfig;
}

interface HybridEvalOptions {
  expected: ExpectedCall[];
  output: string;
  rubric: string;
  judge: JudgeProvider;
  passThreshold?: number;
  warnThreshold?: number;
  samples?: SamplesConfig;
}

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
