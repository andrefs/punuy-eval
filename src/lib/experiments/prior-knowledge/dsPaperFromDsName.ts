import Experiment, { ExperimentResult } from "../experiment";
import { Model } from "../../models";
import { DatasetProfile } from "../../types";
import { DataCorrect, DataIncomplete, DataIncorrect, DataPartiallyIncorrect, JsonSyntaxError } from "../../validation";
import { distance } from 'fastest-levenshtein';



const name = 'ds-paper-from-ds-name';
const description = 'Check if LLM can, when given a dataset name, identify the scientific paper describing it';
const genPrompt = (ds: DatasetProfile) => {
  const year = ds.metadata.date.split('-')[0];
  return `${ds.metadata.name} is a semantic measure gold standard dataset, published in ${year}. Please return the title of the scientific article describing this dataset.`
}
const resultSchema = {
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
    }
  }
}

async function run(prompt: string, schema: any, _: DatasetProfile, model: Model) {
  const f = {
    name: 'return-paper-name',
    description: 'Return the title of the scientific article describing this dataset',
    parameters: schema
  }
  const result = await model.makeRequest(prompt, { function: f });
  return result;
}


async function validate(ds: DatasetProfile, result: ExperimentResult) {
  try {
    const got = JSON.parse(result.choices[0].message.function_call?.arguments || '');
    const expected = ds.metadata.papers.map(p => p.title.toLowerCase());

    const scores = expected.map(e => distance(e, got.title.toLowerCase()));

    console.log('XXXXXXXXXXXXXX titles', { expected, got, scores })

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



