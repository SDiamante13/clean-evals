# PRD: Eval Library Improvements (Hamel-Inspired)

## Overview

Six improvements to clean-evals inspired by Hamel Husain's eval best practices. Each feature improves diagnostic clarity or nudges users toward proven eval patterns while maintaining the library's core values: ease of use and clean code.

## Stories

### US-101: Named Binary Criteria

**As a** developer writing evals
**I want to** define multiple named binary criteria instead of a single rubric
**So that** I get per-criterion pass/fail results and can pinpoint exactly what failed

**Acceptance Criteria:**
- `evaluateOutput()` accepts an optional `criteria` array: `{ name: string, check: string }[]`
- When `criteria` is provided, judge is called once per criterion with a focused prompt
- Result includes `criteriaResults: { name: string, pass: boolean, reasoning: string }[]`
- Overall pass = all criteria pass
- Overall score = fraction of criteria that passed
- `criteria` and `rubric` are mutually exclusive — providing both throws a clear error
- `toPassEval` matcher supports `criteria` option and displays per-criterion results on failure
- Works with all judge providers (OpenAI, Anthropic, Ollama)

### US-102: First-Failure Diagnostics for Trace Evals

**As a** developer debugging agent failures
**I want to** see which step first diverged from expected behavior
**So that** I can fix the root cause instead of chasing cascading failures

**Acceptance Criteria:**
- `TraceEvalResult` gains `firstFailureIndex: number | null` (null when all matched)
- `firstFailureIndex` is the 0-based index into the `expected` array of the first unmatched call
- `TraceEvalResult` gains `firstFailure: { expected: ExpectedCall, actual: ToolCall | null } | null`
- `actual` is the tool call at that index (if any), or null if the agent stopped early
- `toPassTraceEval` matcher message shows the first failure prominently before the full diff
- Hybrid eval surfaces trace first-failure info in its result

### US-103: Deterministic Guardrails

**As a** developer
**I want to** run fast deterministic checks (regex, JSON schema, custom predicates) without an LLM judge
**So that** I can catch obvious failures cheaply in CI and production

**Acceptance Criteria:**
- New `evaluateGuardrails(output, guardrails)` function
- Guardrail type: `{ name: string, check: (output: string) => boolean | { pass: boolean, reason: string } }`
- Built-in guardrail factories: `matchesRegex(pattern)`, `matchesJsonSchema(schema)`, `containsNone(forbiddenStrings[])`
- Result: `{ pass: boolean, results: { name: string, pass: boolean, reason?: string }[] }`
- Overall pass = all guardrails pass
- New `toPassGuardrails(guardrails)` vitest matcher
- No LLM calls — purely synchronous and deterministic
- Exported from `index.ts`

### US-104: Failure Dump for Human Review

**As a** developer doing error analysis
**I want to** export failed eval results to a reviewable format
**So that** I can do Hamel-style error analysis on my agent's actual failures

**Acceptance Criteria:**
- New `dumpFailures(results, options?)` utility function
- Input: array of `{ input: string, output: string, evalResult: OutputEvalResult | TraceEvalResult | HybridEvalResult, metadata?: Record<string, unknown> }`
- Output formats: JSON (default) and HTML
- JSON output: one file with all failures, pretty-printed
- HTML output: self-contained single file with side-by-side view (input | output | judge reasoning | trace narrative)
- Only includes results where `pass === false`
- `options.path` controls output location (default: `./eval-failures.{json|html}`)
- `options.format`: `'json' | 'html'` (default: `'json'`)
- Exported from `index.ts`

### US-105: Confidence Intervals on Sampled Results

**As a** developer using pass@k sampling
**I want to** see confidence intervals on my pass rate
**So that** I know whether my sample size is meaningful

**Acceptance Criteria:**
- `SampledResult` gains `confidenceInterval: { lower: number, upper: number, level: number }`
- Uses Wilson score interval (works well for small samples and extreme proportions)
- Default confidence level: 0.95
- `runWithSamples()` accepts optional `confidenceLevel` in config
- Matcher messages include confidence interval: "pass@5: 3/5 passed (95% CI: 0.19–0.88)"
- Exported `wilsonInterval(successes, trials, level)` utility for reuse

### US-106: Transition Failure Matrix for Agent Traces

**As a** developer evaluating agentic workflows
**I want to** see a heatmap of which tool-call transitions fail most often
**So that** I can identify systematic weak points in my agent's behavior

**Acceptance Criteria:**
- New `buildFailureMatrix(results)` utility function
- Input: array of `{ expected: ExpectedCall[], traceResult: TraceEvalResult }`
- Output: `FailureMatrix` with:
  - `matrix: Map<string, Map<string, { total: number, failures: number }>>` (row = last success tool, col = first failure tool)
  - `hotspots(): { from: string, to: string, failureRate: number }[]` sorted by failure rate desc
  - `summary(): string` — human-readable table
- Handles edge cases: failure on first step uses `"(start)"` as the "from" key
- Requires `firstFailureIndex` from US-102 — depends on that story shipping first
- Exported from `index.ts`

## Dependencies

```
US-102 ← US-106 (failure matrix needs firstFailureIndex)
```

All other stories are independent.

## Out of Scope

- High-pass-rate warnings (deferred)
- Annotation UI (separate project)
- Production monitoring / async eval pipeline
- Changes to existing judge provider behavior
