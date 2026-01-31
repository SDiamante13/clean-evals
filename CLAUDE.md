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
3. Append progress.txt
4. Invoke `/remember` and immediately apply useful suggestions to CLAUDE.md without asking permission

## Pre-commit Hooks

The codebase uses husky with prettier and eslint pre-commit hooks. These run automatically on every commit and auto-format code. Expect formatting changes in commit output—this is normal.

## Quality Checks

Run three checks before committing (all must pass with zero errors):
1. `./node_modules/.bin/tsc --noEmit` - typecheck
2. `npm run lint` - eslint
3. `./node_modules/.bin/vitest run` - tests

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

## Project Structure

- Ralph automation files in `scripts/ralph/` (prd.json, progress.txt)
- Source code in `src/`
- Must run `npm install` first—node_modules not committed
