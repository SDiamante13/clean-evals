import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { evaluateTrace, ExpectedCall } from '../evaluate-trace.js';

export interface TraceEvalOptions {
  passThreshold?: number;
  warnThreshold?: number;
}

interface MatcherResult {
  pass: boolean;
  message: () => string;
}

declare const console: { warn: (msg: string) => void };

const DEFAULT_PASS_THRESHOLD = 1.0;
const DEFAULT_WARN_THRESHOLD = 0.5;

export function toPassTraceEval(spans: ReadableSpan[], expected: ExpectedCall[], options: TraceEvalOptions = {}): MatcherResult {
  const passThreshold = options.passThreshold ?? DEFAULT_PASS_THRESHOLD;
  const warnThreshold = options.warnThreshold ?? DEFAULT_WARN_THRESHOLD;
  const result = evaluateTrace({ spans, expected });

  if (result.score >= warnThreshold && result.score < passThreshold) {
    console.warn(`[agent-eval] Warning: score ${result.score} is between warn (${warnThreshold}) and pass (${passThreshold}) thresholds`);
  }

  const pass = result.score >= passThreshold;

  return {
    pass,
    message: (): string =>
      pass
        ? `Expected trace NOT to pass eval but got score ${result.score}\n${result.details.join('\n')}`
        : `Expected trace to pass eval (threshold: ${passThreshold}) but got score ${result.score}\n${result.details.join('\n')}`,
  };
}
