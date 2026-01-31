import { wilsonInterval, type ConfidenceInterval } from './wilson-interval.js';

export interface SamplesConfig {
  count: number;
  confidenceLevel?: number;
}

export interface SampledResult {
  pass: boolean;
  scores: number[];
  min: number;
  max: number;
  mean: number;
  passCount: number;
  confidenceInterval: ConfidenceInterval;
}

export async function runWithSamples(
  evalFn: () => Promise<{ pass: boolean; score: number }>,
  config: SamplesConfig
): Promise<SampledResult> {
  const scores: number[] = [];
  let passCount = 0;

  for (let i = 0; i < config.count; i++) {
    try {
      const result = await evalFn();
      scores.push(result.score);
      if (result.pass) passCount++;
    } catch {
      scores.push(0);
    }
  }

  const level = config.confidenceLevel ?? 0.95;
  const ci = wilsonInterval(passCount, scores.length, level);

  return {
    pass: passCount >= 1,
    scores,
    min: Math.min(...scores),
    max: Math.max(...scores),
    mean: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    passCount,
    confidenceInterval: ci,
  };
}

export function formatSampledMessage(
  sampled: SampledResult,
  passCase: boolean
): string {
  const ci = sampled.confidenceInterval;
  const ciStr = `${Math.round(ci.level * 100)}% CI: ${ci.lower.toFixed(2)}–${ci.upper.toFixed(2)}`;
  const stats = `pass@${sampled.scores.length}: ${sampled.passCount}/${sampled.scores.length} passed (${ciStr}) | min=${sampled.min}, max=${sampled.max}, mean=${sampled.mean.toFixed(2)}`;

  if (passCase) {
    return `Expected NOT to pass but ${stats}`;
  }
  return `Expected at least 1 pass but ${stats}`;
}
