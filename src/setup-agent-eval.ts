import { expect } from 'vitest';
import { toPassTraceEval } from './matchers/to-pass-trace-eval.js';
import { toPassEval } from './matchers/to-pass-eval.js';
import { toPassHybridEval } from './matchers/to-pass-hybrid-eval.js';
import { toPassGuardrails } from './matchers/to-pass-guardrails.js';

/**
 * Registers all agent-eval custom matchers with Vitest.
 *
 * Call this once in your `vitest.setup.ts` file to enable
 * `toPassTraceEval`, `toPassEval`, `toPassHybridEval`, and `toPassGuardrails` matchers.
 *
 * @example
 * ```ts
 * // vitest.setup.ts
 * import { setupAgentEval } from 'agent-eval';
 * setupAgentEval();
 * ```
 */
export function setupAgentEval(): void {
  expect.extend({ toPassTraceEval, toPassEval, toPassHybridEval, toPassGuardrails });
}
