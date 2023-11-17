import Experiment, { ExperimentResult } from "../experiment";
import { Model } from "../../models";
import { DatasetProfile } from "../../types";
import { DataCorrect, DataIncomplete, DataIncorrect, DataPartiallyIncorrect, JsonSyntaxError } from "../../validation";


const name = 'ds-sample-from-ds-name';
const description = 'Check if LLM knows a dataset by asking it to list 5 pairs included in the dataset';
const genPrompt = (ds: DatasetProfile) => {
  const year = ds.metadata.date.split('-')[0];
  const measureTypes = ds.metadata.measureTypes.join(' and ');
  return `${ds.metadata.name} is a semantic measure gold standard dataset, published in ${year}. It is composed of pairs of concepts and their semantic ${measureTypes} score as reported by humans. Please list 5 pairs of words included in this dataset.`
}
const resultSchema = {
  "type": "object",
  "properties": {
    "entries": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "word1": {
            "type": "string",
          },
          "word2": {
            "type": "string"
          }
        }
      }
    }
  }
}

async function run(prompt: string, schema: any, _: DatasetProfile, model: Model) {
  const f = {
    name: 'list_5_pairs',
    description: 'List 5 pairs of words included in this dataset',
    parameters: schema
  };

  const result = await model.makeRequest(prompt, { function: f });
  return result;
}


async function validate(ds: DatasetProfile, result: ExperimentResult) {
  try {
    const got = JSON.parse(result.choices[0].message.function_call?.arguments || '');
    const expected: { [word: string]: { [word: string]: boolean } } = {};

    for (let { word1, word2 } of ds.partitions[0].data) {
      const w1 = word1.toLowerCase();
      const w2 = word2.toLowerCase();

      expected[w1] = expected[w1] || {};
      expected[w1][w2] = true;
      expected[w2] = expected[w2] || {};
      expected[w2][w1] = true;
    }
    let i = 0;
    let dataIncorrect = false;
    for (let { word1, word2 } of got.entries) {
      const w1 = word1.toLowerCase();
      const w2 = word2.toLowerCase();

      if (expected[w1]?.[w2] || expected[w2]?.[w1]) {
        i++;
        expected[w1][w2] = false;
        expected[w2][w1] = false;
      } else {
        dataIncorrect = true;
      }
    }

    if (i === 0) {
      return new DataIncorrect(got);
    }
    if (dataIncorrect) {
      return new DataPartiallyIncorrect(i / 5, got);
    }
    if (i < 5) {
      return new DataIncomplete(i / 5, got);
    }
    return new DataCorrect(got);

  } catch (e) {
    return new JsonSyntaxError(result.choices[0].message.function_call?.arguments);
  }

}

export default new Experiment(
  name,
  description,
  genPrompt,
  resultSchema,
  run,
  validate
);



