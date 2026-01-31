export interface ConfidenceInterval {
  lower: number;
  upper: number;
  level: number;
}

const Z_SCORES: Record<number, number> = {
  0.9: 1.6449,
  0.95: 1.96,
  0.99: 2.5758,
};

function getZScore(level: number): number {
  const z = Z_SCORES[level];
  if (z !== undefined) return z;
  throw new Error(
    `Unsupported confidence level: ${level}. Use 0.9, 0.95, or 0.99.`
  );
}

export function wilsonInterval(
  successes: number,
  trials: number,
  level = 0.95
): ConfidenceInterval {
  if (trials === 0) {
    return { lower: 0, upper: 0, level };
  }

  const z = getZScore(level);
  const p = successes / trials;
  const z2 = z * z;
  const denominator = 1 + z2 / trials;
  const center = p + z2 / (2 * trials);
  const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * trials)) / trials);

  return {
    lower: Math.max(0, (center - spread) / denominator),
    upper: Math.min(1, (center + spread) / denominator),
    level,
  };
}
