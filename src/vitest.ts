export { toPassTraceEval } from './matchers/to-pass-trace-eval.js';
export { toPassEval } from './matchers/to-pass-eval.js';
export { toPassHybridEval } from './matchers/to-pass-hybrid-eval.js';
export { toPassGuardrails } from './matchers/to-pass-guardrails.js';
export type { MatcherResult } from './matchers/types.js';

// Side-effect: pulls in the `declare module 'vitest'` augmentation from types.ts
// TypeScript users need BOTH steps for full type + runtime support:
//   1. Add 'clean-evals/vitest' to vitest setup files (types)
//   2. Call setupAgentEval() in test setup (registers matchers)
// JavaScript users only need setupAgentEval().
