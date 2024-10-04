/**
 * Converts a value from a source scale to a target scale.
 * @param value The value to normalize.
 * @param sourceScale The source scale.
 * @param targetScale The target scale.
 * @returns The normalized value.
 */
export function normalizeScale(
  value: number,
  sourceScale: { min: number; max: number },
  targetScale: { min: number; max: number }
) {
  return (
    targetScale.min +
    ((value - sourceScale.min) * (targetScale.max - targetScale.min)) /
    (sourceScale.max - sourceScale.min)
  );
}

/**
 * Converts a list of pairs of words to a hash.
 * @param pairs The pairs of words.
 * @returns The hash.
 */
export function pairsToHash(pairs: [string, string][]) {
  const res = {} as {
    [key: string]: { [key: string]: boolean };
  };
  for (const [w1, w2] of pairs) {
    res[w1] = res[w1] || {};
    res[w1][w2] = true;
  }
  return res;
}
