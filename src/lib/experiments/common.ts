export interface RawResult {
  words: string[];
  score: string;
}
export interface Scores {
  [key: string]: { [key: string]: number };
}

export function rawResultsToAvg(parsed: RawResult[][]) {
  const values = {} as { [key: string]: { [key: string]: number[] } };
  for (const r of parsed) {
    if (!r) {
      continue;
    }
    for (const { words, score } of r) {
      if (words.length !== 2 || !score?.length || isNaN(Number(score))) {
        continue;
      }
      values[words[0]] = values[words[0]] || {};
      values[words[0]][words[1]] = values[words[0]][words[1]] || [];
      values[words[0]][words[1]].push(Number(score));
    }
  }

  const res = {} as Scores;
  for (const w1 in values) {
    res[w1] = {};
    for (const w2 in values[w1]) {
      res[w1][w2] =
        values[w1][w2].reduce((a, b) => a + b, 0) / values[w1][w2].length;
    }
  }
  return res;
}

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
