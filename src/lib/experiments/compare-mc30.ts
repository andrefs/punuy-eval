import mc30 from 'punuy-datasets/mc30';
import rg65 from 'punuy-datasets/rg65';
import ws353 from 'punuy-datasets/ws353';
import PearsonPair from 'pearson-pair';

import { Model, ModelIds, gpt35turbo, gpt4, gpt4turbo } from '../models'
import { JsonSyntaxError } from "../validation";
import logger from '../logger';

interface DatasetScores {
  [word1: string]: {
    [word2: string]: {
      [dataset: string]: number;
    }
  }
}

type ModelsResults = {
  [key in ModelIds]: string[];
}


export const loadDatasetScores = async () => {
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

  for (const part of rg65.partitions) {
    for (const entry of part.data) {
      const value = 'value' in entry ? entry.value : entry.values.reduce((a, b) => a + b, 0) / entry.values.length;

      if (entry.word1 in pairs && entry.word2 in pairs[entry.word1]) {
        pairs[entry.word1][entry.word2][rg65.id] = value;
      } else if (entry.word2 in pairs && entry.word1 in pairs[entry.word2]) {
        pairs[entry.word2][entry.word1][rg65.id] = value;
      }
    }
  }

  for (const part of ws353.partitions) {
    for (const entry of part.data) {
      const value = 'value' in entry ? entry.value : entry.values.reduce((a, b) => a + b, 0) / entry.values.length;

      if (entry.word1 in pairs && entry.word2 in pairs[entry.word1]) {
        pairs[entry.word1][entry.word2][ws353.id] = value * (4 / 10);
      } else if (entry.word2 in pairs && entry.word1 in pairs[entry.word2]) {
        pairs[entry.word2][entry.word1][ws353.id] = value * (4 / 10);
      }
    }
  }

  // chord vs cord
  // see http://dx.doi.org/10.1162/coli.2006.32.1.13
  delete pairs['chord'];

  return pairs;
}

const getPairs = (scores: DatasetScores) => {
  const pairs: [string, string][] = [];

  for (const word1 in scores) {
    for (const word2 in scores[word1]) {
      pairs.push([word1, word2]);
    }
  }

  return pairs;
}


const name = 'compare-mc30';
const description = 'Compare the scores of multiple AI models with the scores from multiple human annotations of the MC30 pair set.';
const genPrompt = (pairs: string[][]) =>
  'Please rate the similarity of the following pairs of words on a scale of 0 to 4, where 0 means "completely unrelated" and 4 means "very similar". Fractional values are allowed.\n\n' +
  pairs.map(([w1, w2]) => `${w1} ${w2}`).join('\n');



// TODO fix when OpenAI supports items with tuple definition in JSON schema
// https://community.openai.com/t/json-schema-tuple-validation-support/273554
const resultSchema = {
  "type": "object",
  "properties": {
    "scores": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "words": { "type": "array", "items": { "type": "string" } },
          "score": { "type": "number" }
        }
      }
    }
  }
}

async function runTrialModel(model: Model, prompt: string) {
  const f = {
    name: 'evaluate_scores',
    description: 'Evaluate the word similarity scores.',
    parameters: resultSchema
  };

  const res = await model.makeRequest(prompt, { function: f });
  return res;
}

async function runTrialsModel(trials: number, model: Model, prompt: string) {
  logger.info(`  model ${model.modelId}.`);
  logger.debug(`Prompt: ${prompt}`);
  const results = [];
  for (let i = 0; i < trials; i++) {
    logger.info(`    trial #${i + 1} of ${trials}`)
    const res = await runTrialModel(model, prompt);
    results.push(res.type === 'openai' ? res.data.choices[0].message.tool_calls?.[0].function.arguments || '' : '');
  }
  return results;
}

async function runTrials(trials: number) {
  const scores = await loadDatasetScores();
  const pairs = getPairs(scores);
  const prompt = genPrompt(pairs);

  const models = [gpt35turbo, gpt4, gpt4turbo];
  logger.info(`Running experiment ${name} ${trials} times.`);

  const gpt35turbo_res = await runTrialsModel(trials, gpt35turbo, prompt);
  const gpt4_res = await runTrialsModel(trials, gpt4, prompt);
  const gpt4turbo_res = await runTrialsModel(trials, gpt4turbo, prompt);


  return {
    gpt35turbo: gpt35turbo_res,
    gpt4: gpt4_res,
    gpt4turbo: gpt4turbo_res
  }

}

interface MC30Results {
  [word1: string]: {
    [word2: string]: {
      models: {
        [model: string]: {
          avg: number;
          values: number[];
          sum: number;
          count: number;
        }
      },
      human: {
        [dataset: string]: number;
      }
    }
  }

}

function resultsToArrays(results: MC30Results) {
  const res = {
    gpt35turbo: [] as number[],
    gpt4: [] as number[],
    gpt4turbo: [] as number[],
    mc30: [] as number[],
    rg65: [] as number[],
    ws353: [] as number[]
  };

  for (const w1 in results) {
    for (const w2 in results[w1]) {
      res.gpt35turbo.push(results[w1][w2].models.gpt35turbo.avg);
      res.gpt4.push(results[w1][w2].models.gpt4.avg);
      res.gpt4turbo.push(results[w1][w2].models.gpt4turbo.avg);
      res.mc30.push(results[w1][w2].human.mc30);
      res.rg65.push(results[w1][w2].human.rg65);
      res.ws353.push(results[w1][w2].human.ws353);
    }
  }

  return res;
}


async function validate(modelsRes: ModelsResults, humanScores: DatasetScores) {
  console.log('XXXXXXXXXXXXXX 1');
  let res = {} as MC30Results;

  try {
    console.log('XXXXXXXXXXXXXX 2');

    const gpt35turbo = modelsRes.gpt35turbo.map((r) => JSON.parse(r)); // TODO cast to resultSchema somehow
    const gpt4 = modelsRes.gpt4.map((r) => JSON.parse(r));
    const gpt4turbo = modelsRes.gpt4turbo.map((r) => JSON.parse(r));

    let modelName = 'gpt35turbo';
    for (const score of gpt35turbo.flatMap(({ scores }) => [...scores])) {
      const [w1, w2] = score.words;
      res[w1] = res[w1] || {};
      res[w1][w2] = res[w1][w2] || { human: {}, models: {} };
      res[w1][w2].models[modelName] = res[w1][w2].models[modelName] || { values: [] };
      res[w1][w2].models[modelName].values.push(score.score);
    }
    for (const w1 in res) {
      for (const w2 in res[w1]) {
        res[w1][w2].models[modelName].avg = res[w1][w2].models[modelName].values.reduce((a, b) => a + b, 0) / res[w1][w2].models[modelName].values.length;
      }
    }

    console.log('XXXXXXXXXXXXXX 3');

    modelName = 'gpt4';
    for (const score of gpt4.flatMap(({ scores }) => [...scores])) {
      const [w1, w2] = score.words;
      res[w1] = res[w1] || {};
      res[w1][w2] = res[w1][w2] || { human: {}, models: {} };
      res[w1][w2].models[modelName] = res[w1][w2].models[modelName] || { values: [] };
      res[w1][w2].models[modelName].values.push(score.score);
    }
    for (const w1 in res) {
      for (const w2 in res[w1]) {
        //gpt4_avg[w1][w2].avg = gpt4_avg[w1][w2].sum / gpt4_avg[w1][w2].count;
        res[w1][w2].models[modelName].avg = res[w1][w2].models[modelName].values.reduce((a, b) => a + b, 0) / res[w1][w2].models[modelName].values.length;
      }
    }

    console.log('XXXXXXXXXXXXXX 4');

    modelName = 'gpt4turbo';
    for (const score of gpt4turbo.flatMap(({ scores }) => [...scores])) {
      const [w1, w2] = score.words;
      res[w1] = res[w1] || {};
      res[w1][w2] = res[w1][w2] || { human: {}, models: {} };
      res[w1][w2].models[modelName] = res[w1][w2].models[modelName] || { values: [] };
      res[w1][w2].models[modelName].values.push(score.score);
    }
    for (const w1 in res) {
      for (const w2 in res[w1]) {
        //gpt4turbo_avg[w1][w2].avg = gpt4turbo_avg[w1][w2].sum / gpt4turbo_avg[w1][w2].count;
        res[w1][w2].models[modelName].avg = res[w1][w2].models[modelName].values.reduce((a, b) => a + b, 0) / res[w1][w2].models[modelName].values.length;
      }
    }

    console.log('XXXXXXXXXXXXXX 5');

    for (const w1 in humanScores) {
      for (const w2 in humanScores[w1]) {
        res[w1][w2].human = humanScores[w1][w2];
      }
    }
    console.log('XXXXXXXXXXXXXX 6');

    const arrs = resultsToArrays(res);
    console.log('XXXXXXXXXXXXXX 7', Object.keys(arrs));
    const pcor = PearsonPair(Object.values(arrs));
    console.log('XXXXXXXXXXXXXX 8', pcor.corr);


    console.log('XXXXXXXXXXXXXX', JSON.stringify(arrs, null, 2))

  } catch (e) {
    console.log('XXXXXXXXXXXXXX 10', e);
    return new JsonSyntaxError();
  }
}



//loadDatasetScores().then(async (scores) => {
//  const pairs = await getPairs(scores);
//
//  console.log(`Loaded ${pairs.length} pairs`);
//  console.log(pairs);
//
//  console.log(scores);
//});

const CompareMC30Experiment = {
  name,
  description,
  genPrompt,
  schema: resultSchema,
  runTrials,
  validate
}

export default CompareMC30Experiment;
