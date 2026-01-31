# Code Review Issues — agent-eval library

Identified during review of `ralph/agent-eval-library` branch. All issues are in `src/`.

---

## HIGH — Code Duplication

### 1. `MatcherResult` interface defined 3 times

The same interface exists independently in three matcher files:

- `src/matchers/to-pass-trace-eval.ts:16-19`
- `src/matchers/to-pass-eval.ts:14-17`
- `src/matchers/to-pass-hybrid-eval.ts:18-21`

```ts
interface MatcherResult {
  pass: boolean;
  message: () => string;
}
```

**Fix:** Move `MatcherResult` into `src/matchers/types.ts` (which already exists but only has Vitest module augmentation). Export it and import in all three matchers.

### 2. `hasToolAttributes` logic duplicated across files

`src/find-tool-calls.ts:50-53` defines `hasToolAttributes`:

```ts
function hasToolAttributes(span: ReadableSpan): boolean {
  const attributes = span.attributes;
  return !!(attributes['tool.name'] || attributes['gen_ai.request.function_call.name'] || attributes['llm.function_call.name']);
}
```

`src/distill-trace.ts:23-26` defines `hasToolName` with identical logic:

```ts
function hasToolName(span: ReadableSpan): boolean {
  const attributes = span.attributes;
  return !!(attributes['tool.name'] || attributes['gen_ai.request.function_call.name'] || attributes['llm.function_call.name']);
}
```

**Fix:** Export `hasToolAttributes` from `find-tool-calls.ts` and import it in `distill-trace.ts`. Delete `hasToolName`.

### 3. `runSampled` pattern repeated in all 3 matchers

Each matcher file has its own `runSampled` function with nearly identical structure: call `runWithSamples` with an eval function, return `{ pass, message }`. The only difference is the eval function body.

- `src/matchers/to-pass-trace-eval.ts:64-86`
- `src/matchers/to-pass-eval.ts:48-63`
- `src/matchers/to-pass-hybrid-eval.ts:48-68`

**Fix:** Extract a generic `buildSampledMatcherResult` function that takes an eval function and `SamplesConfig`, calls `runWithSamples`, and returns a `MatcherResult`. Place it in a shared file (e.g. `src/matchers/sampled-matcher.ts`).

---

## HIGH — Dead / Redundant Code

### 4. `matchers/register.ts` duplicates `setupAgentEval.ts`

`src/matchers/register.ts` does exactly the same thing as `src/setup-agent-eval.ts`:

```ts
// register.ts
import { expect } from 'vitest';
import { toPassTraceEval } from './to-pass-trace-eval.js';
import { toPassEval } from './to-pass-eval.js';
import { toPassHybridEval } from './to-pass-hybrid-eval.js';
expect.extend({ toPassTraceEval, toPassEval, toPassHybridEval });
```

It's not imported anywhere and has no purpose now that `setupAgentEval` exists.

**Fix:** Delete `src/matchers/register.ts`.

### 5. Empty type export in `index.ts`

`src/index.ts:12` has:

```ts
export type {} from './matchers/types.js';
```

This exports nothing. The file `matchers/types.ts` contains Vitest module augmentation (`declare module 'vitest'`) which needs to be visible to consumers, but an empty export doesn't achieve that.

**Fix:** Remove this line. The module augmentation in `types.ts` takes effect when consumers include it in their `tsconfig.json` types or import the package. Instead, ensure the declaration augmentation file is included in the package's `types` field or documented in setup instructions.

### 6. `judges/index.ts` barrel file is unused

`src/judges/index.ts` re-exports everything from the judge files, but `src/index.ts` imports directly from individual judge files, not from the barrel.

**Fix:** Delete `src/judges/index.ts`. The root `index.ts` already handles all exports.

---

## MEDIUM — Scattered Threshold Defaults

### 7. Pass threshold defaults defined in 3 places with different values

- `src/matchers/to-pass-trace-eval.ts:23` → `DEFAULT_PASS_THRESHOLD = 1.0`
- `src/matchers/to-pass-eval.ts:19` → `DEFAULT_PASS_THRESHOLD = 0.7`
- `src/evaluate-output.ts:38` → `options.passThreshold ?? 0.7`

The deterministic threshold is 1.0 (exact match required) while LLM thresholds are 0.7 (fuzzy). This is intentional but undocumented and scattered.

**Fix:** Create `src/defaults.ts` that exports named constants with doc comments explaining the rationale:

```ts
/** Deterministic evaluations require all expected tool calls to match. */
export const DETERMINISTIC_PASS_THRESHOLD = 1.0;

/** LLM judge evaluations use a lower threshold to account for scoring variance. */
export const LLM_PASS_THRESHOLD = 0.7;

export const DEFAULT_WARN_THRESHOLD = 0.5;
```

Import these in the matcher and evaluate files instead of local magic numbers.

---

## MEDIUM — Type Safety (`as` casts)

### 8. Unsafe `as string` cast on OTel attributes

`src/find-tool-calls.ts:58`:

```ts
const toolName = (attributes['tool.name'] ?? ... ?? '') as string;
```

OpenTelemetry `AttributeValue` can be `string | number | boolean | (string | number | boolean)[]`. Casting directly to `string` is unsafe.

`src/distill-trace.ts:36`:

```ts
const result = (span.attributes['tool.result'] as string) ?? 'undefined';
```

Same issue.

**Fix:** Use `String(value)` coercion or add a helper `function attributeAsString(value: AttributeValue | undefined): string`.

### 9. Redundant double cast in type guard

`src/judges/parse-judge-response.ts:24-25`:

```ts
typeof (value as JudgeResult).score === 'number' &&
typeof (value as JudgeResult).reasoning === 'string'
```

Inside a type guard that already checked `'score' in value`, the `as JudgeResult` is unnecessary. Use `(value as Record<string, unknown>).score` or restructure the guard.

### 10. Non-null assertion on guarded value

`src/matchers/to-pass-trace-eval.ts:81`:

```ts
const sampled = await runWithSamples(evalFn, options.samples!);
```

The `!` is technically safe because it's inside an `if (options.samples)` guard, but non-null assertions are a code smell. Assign to a local variable first:

```ts
const samplesConfig = options.samples;
if (samplesConfig) {
  return runSampled(spans, expected, options, passThreshold, samplesConfig);
}
```

Same pattern in `to-pass-eval.ts:57` and `to-pass-hybrid-eval.ts:63`.

---

## MEDIUM — Error Handling

### 11. `runWithSamples` crashes on first error

`src/run-with-samples.ts:39-43`:

```ts
for (let i = 0; i < config.count; i++) {
  const result = await evalFn();
  scores.push(result.score);
  if (result.pass) passCount++;
}
```

If `evalFn()` throws on any sample, the entire function fails with no partial results. For a pass@k system where flakiness is expected, this is problematic.

**Fix:** Wrap each call in try-catch. Failed samples should be recorded as `score: 0, pass: false` (or expose the error count in `SampledResult`).

### 12. Unguarded array destructure in `distillTrace`

`src/distill-trace.ts:34`:

```ts
const [toolCall] = findToolCalls([span]);
```

If `findToolCalls` returns an empty array (which it shouldn't since the span was filtered, but defensively), `toolCall` would be `undefined` and the next line would throw.

**Fix:** Add a guard or use the `toolCall!` pattern with a comment explaining why it's safe.

### 13. Error messages include full response text

`src/judges/parse-judge-response.ts:6,12`:

```ts
throw new Error(`Judge response is not valid JSON: ${text}`);
throw new Error(`Judge response missing score or reasoning: ${text}`);
```

LLM responses can be very large. Including the full text in error messages creates noisy stack traces.

**Fix:** Truncate to first 200 characters: `${text.slice(0, 200)}...`

---

## LOW — Naming

### 14. `distillTrace` is vague

The name doesn't convey what it does (converts spans to a numbered plain-text narrative). Consider `traceToNarrative` or `formatTraceStory`.

### 15. Inconsistent `eval` abbreviation

Matcher names use abbreviation (`toPassEval`, `toPassTraceEval`) while functions use full word (`evaluateTrace`, `evaluateOutput`). Not blocking but creates cognitive load.

---

## LOW — Leaking Internals

### 16. Implementation details exported as public API

`src/index.ts:25-26`:

```ts
export { JUDGE_SYSTEM_PROMPT } from './judges/system-prompt.js';
export { parseJudgeResponse } from './judges/parse-judge-response.js';
```

These are internal implementation details of the judge providers. Exporting them increases the API surface that must be maintained and signals to consumers that they should use these directly.

**Fix:** Remove these exports. If custom judge providers need to reuse the system prompt, document that pattern separately.

---

## Verification

After all changes, run:

```sh
npm run type-check
npm test
npm run lint
npm run build
```

All 80 tests must still pass. No new type errors.
