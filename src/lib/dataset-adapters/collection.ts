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
      const w1 = row.term1.toLowerCase();
      const w2 = row.term2.toLowerCase();

      col[w1] = col[w1] || {};
      col[w1][w2] = col[w1][w2] || {};
      if ("value" in row && row.value !== undefined) {
        col[w1][w2][dataset] = [row.value];
        continue;
      }
      if ("values" in row && Array.isArray(row.values)) {
        col[w1][w2][dataset] = row.values.filter(
          v => v !== undefined && v !== null
        ) as number[];
      }
    }
  }
}

export default col;
