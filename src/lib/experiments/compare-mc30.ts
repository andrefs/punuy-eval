import loadDataset from "../load-dataset";
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

const getPairs = async (scores: DatasetScores) => {
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
const genPrompt = () =>
  'Please rate the similarity of the following pairs of words on a scale of 0 to 4, where 0 means "completely unrelated" and 4 means "very similar". Decimals are ok.\n\n' +
  'car automobile\n' +
  'gem jewel\n' +
  'journey voyage\n' +
  'journey car\n' +
  'boy lad\n' +
  'coast shore\n' +
  'coast hill\n' +
  'coast forest\n' +
  'asylum madhouse\n' +
  'magician wizard\n' +
  'midday noon\n' +
  'furnace stove\n' +
  'food fruit\n' +
  'food rooster\n' +
  'bird cock\n' +
  'bird crane\n' +
  'tool implement\n' +
  'brother monk\n' +
  'lad brother\n' +
  'lad wizard\n' +
  'crane implement\n' +
  'monk oracle\n' +
  'monk slave\n' +
  'cemetery woodland\n' +
  'forest graveyard\n' +
  'shore woodland\n' +
  'glass magician\n' +
  'rooster voyage\n' +
  'noon string\n';


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

async function run(model: Model) {
  const f = {
    name: 'evaluate_scores',
    description: 'Evaluate the word similarity scores.',
    parameters: resultSchema
  };

  const prompt = genPrompt();
  console.warn(`Running experiment ${name} on model (${model.modelId}).`);
  console.warn(`Prompt: ${prompt}`);
  const result = await model.makeRequest(prompt, { function: f });
  if (result.type === 'openai') {
    return result.data.choices[0].message.tool_calls?.[0].function.arguments || '';
  }
  return '';
}

async function validate(data: string) {
  if (!data.trim()) { return new NoData(); }
  try {
    const got = JSON.parse(data);

    return new DataCorrect(got);
  } catch (e) {
    return new JsonSyntaxError(data);
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
