import { writeFileSync } from 'node:fs';
import type { OutputEvalResult } from './evaluate-output.js';
import type { TraceEvalResult } from './evaluate-trace.js';
import type { HybridEvalResult } from './evaluate-hybrid.js';

export type EvalResult = OutputEvalResult | TraceEvalResult | HybridEvalResult;

export interface FailureEntry {
  input: string;
  output: string;
  evalResult: EvalResult;
  metadata?: Record<string, unknown>;
}

export interface DumpFailuresOptions {
  path?: string;
  format?: 'json' | 'html';
}

export function dumpFailures(results: FailureEntry[], options?: DumpFailuresOptions): void {
  const failures = results.filter((r) => !r.evalResult.pass);
  const format = options?.format ?? 'json';
  const defaultPath = format === 'html' ? './eval-failures.html' : './eval-failures.json';
  const outputPath = options?.path ?? defaultPath;

  const content = format === 'html' ? renderHtml(failures) : JSON.stringify(failures, null, 2);
  writeFileSync(outputPath, content, 'utf-8');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderHtml(failures: FailureEntry[]): string {
  const rows = failures.map((f) => renderRow(f)).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Eval Failures</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; background: #f8f9fa; }
  h1 { color: #333; }
  table { width: 100%; border-collapse: collapse; background: #fff; }
  th, td { border: 1px solid #dee2e6; padding: 0.75rem; text-align: left; vertical-align: top; }
  th { background: #e9ecef; }
  pre { white-space: pre-wrap; margin: 0; font-size: 0.85rem; }
  .score { font-weight: bold; color: #dc3545; }
</style>
</head>
<body>
<h1>Eval Failures (${failures.length})</h1>
<table>
<thead><tr><th>Input</th><th>Output</th><th>Reasoning</th><th>Score</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
</body>
</html>`;
}

function getScore(result: EvalResult): number {
  if ('score' in result) return result.score;
  return result.deterministicScore;
}

function getReasoning(result: EvalResult): string {
  if ('reasoning' in result) return String(result.reasoning);
  if ('details' in result) return result.details.join('\n');
  return '';
}

function renderRow(entry: FailureEntry): string {
  return `<tr>
<td><pre>${escapeHtml(entry.input)}</pre></td>
<td><pre>${escapeHtml(entry.output)}</pre></td>
<td><pre>${escapeHtml(getReasoning(entry.evalResult))}</pre></td>
<td class="score">${getScore(entry.evalResult).toFixed(2)}</td>
</tr>`;
}
