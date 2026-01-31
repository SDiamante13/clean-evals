import { expect } from 'vitest';
import { toPassTraceEval } from './matchers/to-pass-trace-eval.js';
import { toPassEval } from './matchers/to-pass-eval.js';
import { toPassHybridEval } from './matchers/to-pass-hybrid-eval.js';

export function setupAgentEval(): void {
  expect.extend({ toPassTraceEval, toPassEval, toPassHybridEval });
}
