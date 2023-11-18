import loadDataset from "../load-dataset";

interface DatasetScores {
  [word1: string]: {
    [word2: string]: {
      [dataset: string]: number;
    }
  }
}

const loadDatasetScores = async () => {
  const mc30 = await loadDataset('mc30');
  const rg65 = await loadDataset('rg65');
  const ws353 = await loadDataset('ws353');

  const pairs: DatasetScores = {};

  for (const part of mc30.partitions) {
    for (const entry of part.data) {
      pairs[entry.word1] = pairs[entry.word1] || {};
      pairs[entry.word1][entry.word2] = pairs[entry.word1][entry.word2] || {};
      if ('value' in entry) {
        pairs[entry.word1][entry.word2]['mc30'] = entry.value;
      } else {
        pairs[entry.word1][entry.word2]['mc30'] = entry.values.reduce((a, b) => a + b, 0) / entry.values.length;
      }
    }
  }

  for (const ds of [rg65, ws353]) {
    for (const part of ds.partitions) {
      for (const entry of part.data) {
        const value = 'value' in entry ? entry.value : entry.values.reduce((a, b) => a + b, 0) / entry.values.length;

        if (entry.word1 in pairs && entry.word2 in pairs[entry.word1]) {
          pairs[entry.word1][entry.word2][ds.id] = value;
        } else if (entry.word2 in pairs && entry.word1 in pairs[entry.word2]) {
          pairs[entry.word2][entry.word1][ds.id] = value;
        }
      }
    }
  }

  // chord vs cord
  // see http://dx.doi.org/10.1162/coli.2006.32.1.13
  delete pairs['chord'];

  return pairs;
}

const getPairs = async (scores: DatasetScores) => {
  const pairs: [string, string][] = [];

  for (const word1 in scores) {
    for (const word2 in scores[word1]) {
      pairs.push([word1, word2]);
    }
  }

  return pairs;
}

loadDatasetScores().then(async (scores) => {
  const pairs = await getPairs(scores);

  console.log(`Loaded ${pairs.length} pairs`);
  console.log(pairs);

  console.log(scores);
});


