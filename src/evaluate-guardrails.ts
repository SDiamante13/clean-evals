export interface Guardrail {
  name: string;
  check: (output: string) => boolean | { pass: boolean; reason: string };
}

export interface GuardrailResult {
  name: string;
  pass: boolean;
  reason?: string;
}

export interface GuardrailsEvalResult {
  pass: boolean;
  results: GuardrailResult[];
}

export function evaluateGuardrails(output: string, guardrails: Guardrail[]): GuardrailsEvalResult {
  const results: GuardrailResult[] = guardrails.map((g) => {
    const result = g.check(output);
    if (typeof result === 'boolean') {
      return { name: g.name, pass: result };
    }
    return { name: g.name, pass: result.pass, reason: result.reason };
  });

  return {
    pass: results.every((r) => r.pass),
    results,
  };
}

export function matchesRegex(pattern: RegExp): (output: string) => { pass: boolean; reason: string } {
  return (output: string) => {
    const pass = pattern.test(output);
    return {
      pass,
      reason: pass ? `Matches ${pattern}` : `Does not match ${pattern}`,
    };
  };
}

export function matchesJsonSchema(schema: Record<string, string>): (output: string) => { pass: boolean; reason: string } {
  return (output: string) => {
    try {
      const parsed: unknown = JSON.parse(output);
      if (typeof parsed !== 'object' || parsed === null) {
        return { pass: false, reason: 'Output is not a JSON object' };
      }
      const obj = parsed as Record<string, unknown>;
      for (const [key, type] of Object.entries(schema)) {
        if (!(key in obj)) {
          return { pass: false, reason: `Missing key: ${key}` };
        }
        if (typeof obj[key] !== type) {
          return { pass: false, reason: `Key "${key}" expected ${type}, got ${typeof obj[key]}` };
        }
      }
      return { pass: true, reason: 'All keys present with correct types' };
    } catch {
      return { pass: false, reason: 'Output is not valid JSON' };
    }
  };
}

export function containsNone(forbidden: string[]): (output: string) => { pass: boolean; reason: string } {
  return (output: string) => {
    const found = forbidden.filter((f) => output.includes(f));
    if (found.length > 0) {
      return { pass: false, reason: `Contains forbidden: ${found.join(', ')}` };
    }
    return { pass: true, reason: 'No forbidden strings found' };
  };
}
