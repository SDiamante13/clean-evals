# Agent Eval Library - Development Guide

## Design Philosophy

This library tends towards **ease of use** and **clean code** above all else.

## Judge Provider Architecture

All LLM judge providers implement `JudgeProvider` interface from `src/judges/judge-provider.ts`. Shared components:
- `JUDGE_SYSTEM_PROMPT` from `system-prompt.ts` - instructs LLM to return JSON
- `parseJudgeResponse()` from `parse-judge-response.ts` - extracts and validates JSON from LLM output

New providers should reuse these shared components.

## Test Mocking Pattern for Judge Providers

Use `vi.mock()` with module default export for SDK clients (e.g., `openai`). Mock the completion/chat methods and return JSON string responses for `parseJudgeResponse()` to handle.

Example:
```typescript
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = { completions: { create: mockCreate } };
    },
  };
});
```

## Ralph Autonomous Workflow

When running as Ralph agent:
1. Commit after each story using `/commit` skill
2. Update PRD `passes: true`
3. Append progress.txt with **Learnings for future iterations** section documenting reusable patterns, gotchas, and useful context
4. Invoke `/remember` and immediately apply useful suggestions to CLAUDE.md without asking permission

**Autonomous mode**: Ralph runs unattended with no human interaction. Never ask questions, never ask for permission, make decisions autonomously.

**Already-implemented stories**: When a US has `passes: false` but code exists, verify quality checks pass, update PRD to `passes: true`, append progress, commit as metadata-only update.

**Completion check**: After committing a story, run `grep -c '"passes": false' scripts/ralph/prd.json`. If count is 0, all stories are done — reply with `<promise>COMPLETE</promise>`.

## Pre-commit Hooks

The codebase uses husky with prettier and eslint pre-commit hooks. These run automatically on every commit and auto-format code. Expect formatting changes in commit output—this is normal.

## Quality Checks

Run three checks before committing (all must pass with zero errors):
1. `npm run lint` - eslint (catches formatting and complexity issues)
2. `./node_modules/.bin/tsc --noEmit` - typecheck (validates types after lint fixes)
3. `./node_modules/.bin/vitest run` - tests (validates behavior)

Execute in this exact order. Fix all errors at each step before proceeding to the next.

## Codebase Patterns

- Use `createTestTracer()` for isolated per-test OpenTelemetry spans
- Export types separately with `export type` from index.ts
- Span attribute keys: generic (`tool.name`, `tool.arguments`), OpenAI (`gen_ai.request.function_call.*`), LLM (`llm.function_call.*`)
- Custom Vitest matchers: implementation in `src/matchers/`, registered in `register.ts`, types in `types.ts`
- Type augmentation for custom matchers uses `declare module 'vitest'` with `Assertion<T>` and `AsymmetricMatchersContaining`
- Test helpers use builder pattern: `buildToolSpan()` from `src/test-helpers/span-builder.ts`
- Test builder pattern for judges: Use `buildFakeJudge(result)` functions to create test doubles
- Default threshold: All evaluation functions use `passThreshold ?? 0.7` as default
- Grading prompt format: `## Rubric\n{rubric}\n\n## Agent Output\n{output}`
- Evaluation modules: Core function in `src/evaluate-*.ts`, tests in `src/evaluate-*.test.ts`, exports in `src/index.ts`
- Test file splitting: When tests approach 150-line limit, split into separate files with descriptive suffixes (e.g., `-criteria.test.ts`, `-html.test.ts`)
- Type guards for union result types: Use helper functions with `in` operator (`if ('score' in result)`) to safely access variant-specific fields
- HTML security: Always escape user content with `escapeHtml()` replacing `&`, `<`, `>` to prevent XSS
- Union type helpers: Extract getter functions (`getScore()`, `getReasoning()`) for fields that don't exist on all variants rather than inline checking
- Wilson confidence intervals: Uses pre-computed Z-scores (0.9, 0.95, 0.99 supported). Edge case: 0 trials returns `{ lower: 0, upper: 0 }`. CI formatting uses en-dash: `${level*100}% CI: ${lower.toFixed(2)}–${upper.toFixed(2)}`
- Failure matrix pattern: Use `Map<string, Stats>` with string keys for transition tracking. Key format: `${from} → ${to}`. First-step failures use `'(start)'` as the 'from' key. Class methods return filtered/sorted arrays rather than exposing the Map directly.
- Test helper builder functions: When writing tests that need mock result objects, create inline builder functions (e.g., `buildTraceResult(firstFailureIndex)`) that return properly-shaped objects. Keeps test setup DRY.

## Project Structure

- Ralph automation files in `scripts/ralph/` (prd.json, progress.txt)
- Source code in `src/`
- Must run `npm install` first—node_modules not committed
