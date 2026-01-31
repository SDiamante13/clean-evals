import { describe, it, expect } from 'vitest';
import { setupAgentEval } from '../setup-agent-eval.js';
import { matchesRegex, containsNone } from '../evaluate-guardrails.js';
import type { Guardrail } from '../evaluate-guardrails.js';

setupAgentEval();

describe('toPassGuardrails', () => {
  const guardrails: Guardrail[] = [
    { name: 'no-profanity', check: containsNone(['badword', 'terrible']) },
    { name: 'has-greeting', check: matchesRegex(/^hello/i) },
  ];

  it('passes when all guardrails pass', () => {
    expect('Hello world').toPassGuardrails(guardrails);
  });

  it('fails when a guardrail fails', () => {
    expect(() => expect('Goodbye world').toPassGuardrails(guardrails)).toThrow('Expected output to pass guardrails');
  });

  it('shows per-guardrail results on failure', () => {
    try {
      expect('Goodbye badword').toPassGuardrails(guardrails);
    } catch (e: unknown) {
      const msg = (e as Error).message;
      expect(msg).toContain('FAIL no-profanity');
      expect(msg).toContain('FAIL has-greeting');
      return;
    }
    throw new Error('Expected assertion to fail');
  });

  it('works with boolean-returning guardrails', () => {
    const boolGuardrails: Guardrail[] = [{ name: 'non-empty', check: (o) => o.length > 0 }];
    expect('some output').toPassGuardrails(boolGuardrails);
  });

  it('negated assertion passes when guardrails fail', () => {
    expect('Goodbye world').not.toPassGuardrails(guardrails);
  });
});
