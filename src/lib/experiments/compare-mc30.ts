import mc30 from 'grillo-datasets/mc30';
import rg65 from 'grillo-datasets/rg65';
import ws353 from 'grillo-datasets/ws353';

import { Model, gpt35turbo, gpt4, gpt4turbo } from '../models'
import { DatasetProfile } from "../types";
import { DataCorrect, JsonSyntaxError, NoData } from "../validation";
import Experiment from "./experiment";

interface DatasetScores {
  [word1: string]: {
    [word2: string]: {
      [dataset: string]: number;
    }
  }
}

interface ModelsResults {
  gpt35turbo: string;
  gpt4: string;
  gpt4turbo: string;
}


const loadDatasetScores = async () => {
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

async function run() {
  const scores = await loadDatasetScores();
  const pairs = getPairs(scores);

  const f = {
    name: 'evaluate_scores',
    description: 'Evaluate the word similarity scores.',
    parameters: resultSchema
  };

  const models = [gpt35turbo, gpt4, gpt4turbo];

  const prompt = genPrompt(pairs);
  console.warn(`Running experiment ${name} on models ${models.map(m => m.modelId).join(", ")}.`);
  console.warn(`Prompt: ${prompt}`);


  const gpt35turbo_res = await gpt35turbo.makeRequest(prompt, { function: f });
  const gpt4_res = await gpt4.makeRequest(prompt, { function: f });
  const gpt4turbo_res = await gpt4turbo.makeRequest(prompt, { function: f });

  return {
    gpt35turbo: gpt35turbo_res.data.choices[0].message.tool_calls?.[0].function.arguments || '',
    gpt4: gpt4_res.data.choices[0].message.tool_calls?.[0].function.arguments || '',
    gpt4turbo: gpt4turbo_res.data.choices[0].message.tool_calls?.[0].function.arguments || '',
  }

}

async function validate(res: ModelsResults, humanScores: DatasetScores) {
  try {
    const gpt35turbo = JSON.parse(res.gpt35turbo);
    const gpt4 = JSON.parse(res.gpt4);
    const gpt4turbo = JSON.parse(res.gpt4turbo);



  } catch (e) {
    return new JsonSyntaxError(res);
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
  run,
  validate
}

export default CompareMC30Experiment;
