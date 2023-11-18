import Experiment, { ExperimentResult } from "../experiment";
import { Model } from "../../models";
import { DatasetProfile } from "../../types";
import { DataCorrect, DataIncomplete, DataIncorrect, DataPartiallyIncorrect, JsonSyntaxError, NoData } from "../../validation";


const name = 'ds-name-from-ds-sample';
const description = 'Check if LLM knows a dataset by giving it 10 pairs and asking for 5 more.';
const genPrompt = (ds: DatasetProfile) => {
  return `Which semantic measures evaluation dataset do these pairs of concepts belong to?\n` +
    ds.partitions[0].data.slice(0, 10).map(({ word1, word2 }) => `${word1} ${word2}`).join('\n');
}
const resultSchema = {
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
    },
    "year": {
      "type": "string",
    },
    "authors": {
      "type": "array",
      "items": {
        type: 'string'
      }
    }
  }
}

async function run(prompt: string, schema: any, _: DatasetProfile, model: Model) {
  const f = {
    name: 'validate_dataset',
    description: 'Validates the dataset information.',
    parameters: schema
  };

  const result = await model.makeRequest(prompt, { function: f });
  return result;
}


async function validate(ds: DatasetProfile, data: string) {
  if (!data.trim()) { return new NoData(); }
  try {
    const got = JSON.parse(data);

    console.log('XXXXXXXXXXXXXXX', JSON.stringify(got, null, 2));
    return new DataCorrect(got);
  } catch (e) {
    return new JsonSyntaxError(data);
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



