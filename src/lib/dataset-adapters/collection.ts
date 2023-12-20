import * as ds from "punuy-datasets";

interface DatasetColPairs {
  [w1: string]: {
    [w2: string]: {
      [dataset: string]: number[];
    };
  };
}

const col = {} as DatasetColPairs;

for (const dataset in ds) {
  const d = ds[dataset as keyof typeof ds];
  for (const part of d.partitions) {
    for (const row of part.data) {
      const w1 = row.word1.toLowerCase();
      const w2 = row.word2.toLowerCase();

      col[w1] = col[w1] || {};
      col[w1][w2] = col[w1][w2] || {};
      if ("value" in row) {
        col[w1][w2][dataset] = [row.value];
        continue;
      }
      if ("values" in row) {
        col[w1][w2][dataset] = row.values;
      }
    }
  }
}

export default col;
