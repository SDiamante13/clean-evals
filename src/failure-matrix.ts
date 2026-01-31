import { ExpectedCall, TraceEvalResult } from './evaluate-trace.js';

export interface FailureMatrixInput {
  expected: ExpectedCall[];
  traceResult: TraceEvalResult;
}

interface TransitionStats {
  failures: number;
  total: number;
  rate: number;
}

export class FailureMatrix {
  private readonly matrix = new Map<string, TransitionStats>();

  constructor(results: FailureMatrixInput[]) {
    for (const { expected, traceResult } of results) {
      if (traceResult.firstFailureIndex === null) continue;

      const failureIndex = traceResult.firstFailureIndex;
      const from = failureIndex === 0 ? '(start)' : expected[failureIndex - 1].toolName;
      const to = expected[failureIndex].toolName;
      const key = this.makeKey(from, to);

      this.recordFailure(key);
    }

    for (const { expected } of results) {
      for (let i = 0; i < expected.length; i++) {
        const from = i === 0 ? '(start)' : expected[i - 1].toolName;
        const to = expected[i].toolName;
        const key = this.makeKey(from, to);
        this.recordTotal(key);
      }
    }
  }

  private makeKey(from: string, to: string): string {
    return `${from} → ${to}`;
  }

  private recordFailure(key: string): void {
    const stats = this.matrix.get(key) ?? { failures: 0, total: 0, rate: 0 };
    stats.failures++;
    this.matrix.set(key, stats);
  }

  private recordTotal(key: string): void {
    const stats = this.matrix.get(key) ?? { failures: 0, total: 0, rate: 0 };
    stats.total++;
    stats.rate = stats.failures / stats.total;
    this.matrix.set(key, stats);
  }

  /**
   * Returns transitions sorted by failure rate (highest first).
   */
  hotspots(): Array<{ transition: string; failures: number; total: number; rate: number }> {
    return Array.from(this.matrix.entries())
      .map(([transition, stats]) => ({ transition, ...stats }))
      .filter((entry) => entry.failures > 0)
      .sort((a, b) => b.rate - a.rate);
  }

  /**
   * Returns a human-readable summary of failure hotspots.
   */
  summary(): string {
    const spots = this.hotspots();
    if (spots.length === 0) {
      return 'No failures detected.';
    }

    const lines = spots.map((s) => {
      const pct = (s.rate * 100).toFixed(0);
      return `${s.transition}: ${s.failures}/${s.total} failed (${pct}%)`;
    });

    return lines.join('\n');
  }
}

/**
 * Analyzes which tool-call transitions fail most often across multiple trace evaluations.
 *
 * @example
 * ```ts
 * const matrix = buildFailureMatrix([
 *   { expected: [{ toolName: 'search' }, { toolName: 'summarize' }], traceResult },
 *   { expected: [{ toolName: 'search' }, { toolName: 'summarize' }], traceResult2 },
 * ]);
 * console.log(matrix.summary());
 * // "(start) → search: 2/5 failed (40%)"
 * ```
 */
export function buildFailureMatrix(results: FailureMatrixInput[]): FailureMatrix {
  return new FailureMatrix(results);
}
