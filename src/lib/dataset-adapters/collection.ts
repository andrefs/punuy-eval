// import { DatasetProfile } from "punuy-datasets/types";

export interface MultiDatasetScores {
  [w1: string]: {
    [w2: string]: {
      [dataset: string]: number;
    };
  };
}

// interface DatasetScores {
//   [w1: string]: {
//     [w2: string]: number;
//   };
// }
//
// async function loadDatasetScores(dsId: string) {
//   const d = (await import(`punuy-datasets/datasets/${dsId}`)) as DatasetProfile;
//   const res = {} as DatasetScores;
//   for (const part of d.partitions) {
//     for (const row of part.data) {
//       const w1 = row.term1.toLowerCase();
//       const w2 = row.term2.toLowerCase();
//       if ("value" in row && row.value !== undefined) {
//         res[w1] = res[w1] || {};
//         res[w1][w2] = row.value;
//         continue;
//       }
//       if ("values" in row && Array.isArray(row.values)) {
//         const vals = row.values.filter(v => typeof v === "number") as number[];
//         res[w1] = res[w1] || {};
//         res[w1][w2] = vals.reduce((a, b) => a + b, 0) / vals.length;
//       }
//     }
//   }
//   return res;
// }
//
// async function loadAllDatasetScores() {
//   const ds = (await import("punuy-datasets")).default;
//   const res = {} as MultiDatasetScores;
//
//   for (const dataset in ds) {
//     const d = ds[dataset as keyof typeof ds];
//     for (const part of d.partitions) {
//       for (const row of part.data) {
//         const w1 = row.term1.toLowerCase();
//         const w2 = row.term2.toLowerCase();
//
//         res[w1] = res[w1] || {};
//         res[w1][w2] = res[w1][w2] || {};
//         if ("value" in row && row.value !== undefined) {
//           res[w1][w2][dataset] = row.value;
//           continue;
//         }
//         if ("values" in row && Array.isArray(row.values)) {
//           const vals = row.values.filter(
//             v => typeof v === "number"
//           ) as number[];
//           res[w1][w2][dataset] = vals.reduce((a, b) => a + b, 0) / vals.length;
//         }
//       }
//     }
//   }
//   return res;
// }
