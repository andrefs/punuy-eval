import mc30 from 'punuy-datasets/mc30';
import rg65 from 'punuy-datasets/rg65';
import ws353 from 'punuy-datasets/ws353';

import { Model, ModelIds, gpt35turbo, gpt4, gpt4turbo } from '../models'
import { DatasetProfile } from "../types";
import { DataCorrect, JsonSyntaxError, NoData } from "../validation";
import Experiment from "./experiment";
import logger from '../logger';
logger.level = 'debug';

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
  'Please rate the similarity of the following pairs of words on a scale of 0 to 4, where 0 means "completely unrelated" and 4 means "very similar".You can use decimals.\n\n' +
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
  logger.info(`Running experiment ${name} ${trials} times on model ${model.modelId}.`);
  logger.info(`Prompt: ${prompt}`);
  const results = [];
  for (let i = 0; i < trials; i++) {
    logger.info(`  trial #${i + 1} of ${trials}`)
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

  const gpt35turbo_res = await runTrialsModel(trials, gpt35turbo, prompt);
  const gpt4_res = await runTrialsModel(trials, gpt4, prompt);
  const gpt4turbo_res = await runTrialsModel(trials, gpt4turbo, prompt);


  return {
    gpt35turbo: gpt35turbo_res,
    gpt4: gpt4_res,
    gpt4turbo: gpt4turbo_res
  }

}

async function validate(res: ModelsResults, humanScores: DatasetScores) {
  try {
    const gpt35turbo = res.gpt35turbo.map((r) => JSON.parse(r)); // TODO cast to resultSchema somehow
    const gpt4 = res.gpt4.map((r) => JSON.parse(r));
    const gpt4turbo = res.gpt4turbo.map((r) => JSON.parse(r));

    const gpt35turbo_avg = {} as { [w1: string]: { [w2: string]: { sum: number, count: number, avg?: number } } };
    for (const score of gpt35turbo.flatMap(({ scores }) => [...scores])) {
      const [w1, w2] = score.words;
      gpt35turbo_avg[w1] = gpt35turbo_avg[w1] || {};
      gpt35turbo_avg[w1][w2] = gpt35turbo_avg[w1][w2] || { sum: 0, count: 0 };
      gpt35turbo_avg[w1][w2].sum += score.score;
      gpt35turbo_avg[w1][w2].count++;
    }
    for (const w1 in gpt35turbo_avg) {
      for (const w2 in gpt35turbo_avg[w1]) {
        gpt35turbo_avg[w1][w2].avg = gpt35turbo_avg[w1][w2].sum / gpt35turbo_avg[w1][w2].count;
      }
    }

    const gpt4_avg = {} as { [w1: string]: { [w2: string]: { sum: number, count: number, avg?: number } } };
    for (const score of gpt4.flatMap(({ scores }) => [...scores])) {
      const [w1, w2] = score.words;
      gpt4_avg[w1] = gpt4_avg[w1] || {};
      gpt4_avg[w1][w2] = gpt4_avg[w1][w2] || { sum: 0, count: 0 };
      gpt4_avg[w1][w2].sum += score.score;
      gpt4_avg[w1][w2].count++;
    }
    for (const w1 in gpt4_avg) {
      for (const w2 in gpt4_avg[w1]) {
        gpt4_avg[w1][w2].avg = gpt4_avg[w1][w2].sum / gpt4_avg[w1][w2].count;
      }
    }

    const gpt4turbo_avg = {} as { [w1: string]: { [w2: string]: { sum: number, count: number, avg?: number } } };
    for (const score of gpt4turbo.flatMap(({ scores }) => [...scores])) {
      const [w1, w2] = score.words;
      gpt4turbo_avg[w1] = gpt4turbo_avg[w1] || {};
      gpt4turbo_avg[w1][w2] = gpt4turbo_avg[w1][w2] || { sum: 0, count: 0 };
      gpt4turbo_avg[w1][w2].sum += score.score;
      gpt4turbo_avg[w1][w2].count++;
    }
    for (const w1 in gpt4turbo_avg) {
      for (const w2 in gpt4turbo_avg[w1]) {
        gpt4turbo_avg[w1][w2].avg = gpt4turbo_avg[w1][w2].sum / gpt4turbo_avg[w1][w2].count;
      }
    }

    console.log('XXXXXXXXXXXXXX', JSON.stringify({ gpt35turbo_avg, gpt4_avg, gpt4turbo_avg, humanScores }, null, 2))
  } catch (e) {
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
