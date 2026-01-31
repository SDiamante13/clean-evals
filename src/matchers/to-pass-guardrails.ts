import { evaluateGuardrails } from '../evaluate-guardrails.js';
import type { Guardrail } from '../evaluate-guardrails.js';
import type { MatcherResult } from './types.js';

export function toPassGuardrails(output: string, guardrails: Guardrail[]): MatcherResult {
  const result = evaluateGuardrails(output, guardrails);

  const lines = result.results.map((r) => `  ${r.pass ? 'PASS' : 'FAIL'} ${r.name}${r.reason ? `: ${r.reason}` : ''}`);

  return {
    pass: result.pass,
    message: (): string =>
      result.pass
        ? `Expected output NOT to pass guardrails\nAll guardrails passed:\n${lines.join('\n')}`
        : `Expected output to pass guardrails\nGuardrail results:\n${lines.join('\n')}`,
  };
}
