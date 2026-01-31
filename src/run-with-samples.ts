export interface SamplesConfig {
  count: number;
}

export interface SampledResult {
  pass: boolean;
  scores: number[];
  min: number;
  max: number;
  mean: number;
  passCount: number;
}

export async function runWithSamples(
  evalFn: () => Promise<{ pass: boolean; score: number }>,
  config: SamplesConfig
): Promise<SampledResult> {
  const scores: number[] = [];
  let passCount = 0;

  for (let i = 0; i < config.count; i++) {
    const result = await evalFn();
    scores.push(result.score);
    if (result.pass) passCount++;
  }

  return {
    pass: passCount >= 1,
    scores,
    min: Math.min(...scores),
    max: Math.max(...scores),
    mean: scores.reduce((a, b) => a + b, 0) / scores.length,
    passCount,
  };
}

export function formatSampledMessage(sampled: SampledResult, passCase: boolean): string {
  const stats = `pass@${sampled.scores.length}: ${sampled.passCount}/${sampled.scores.length} passed | min=${sampled.min}, max=${sampled.max}, mean=${sampled.mean.toFixed(2)}`;

  if (passCase) {
    return `Expected NOT to pass but ${stats}`;
  }
  return `Expected at least 1 pass but ${stats}`;
}
