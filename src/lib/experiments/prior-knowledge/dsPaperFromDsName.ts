import Experiment, { ExpVars, ExpVarsFixedPrompt, Prompt } from "../experiment";
import { DatasetProfile } from "../../types";
import {
  DataCorrect,
  DataIncorrect,
  JsonSchemaError,
  JsonSyntaxError,
  NoData,
} from "../../validation";
import { distance } from "fastest-levenshtein";
import Ajv, { JSONSchemaType } from "ajv";
const ajv = new Ajv();

const name = "ds-paper-from-ds-name";
const description =
  "Check if LLM can, when given a dataset name, identify the scientific paper describing it";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    const year = vars.dataset.metadata.date.split("-")[0];
    return {
      id: `${name}-${vars.dataset.id}-prompt`,
      language: "en" as const,
      text: `${vars.dataset.metadata.name} is a semantic measure gold standard dataset, published in ${year}. Please return the title of the scientific article describing this dataset.`,
    };
  },
};
const resultSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
    },
  },
};
type ResultSchema = JSONSchemaType<typeof resultSchema>;

const validateSchema = ajv.compile<ResultSchema>(resultSchema);

async function runTrial(
  vars: ExpVarsFixedPrompt,
  schema: any // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  const f = {
    name: "return-paper-name",
    description:
      "Return the title of the scientific article describing this dataset",
    parameters: schema,
  };
  const result = await vars.model.makeRequest(vars.prompt.text, {
    function: f,
  });
  return result;
}

async function validateTrial(ds: DatasetProfile, data: string) {
  if (!data.trim()) {
    return new NoData();
  }

  try {
    const got = JSON.parse(data);
    if (!validateSchema(got)) {
      return new JsonSchemaError(data);
    }
    const expected = ds.metadata.papers.map(p => ({ title: p.title }));

    let bestScore = 1;
    // let bestIndex = -1

    for (const [, exp] of expected.entries()) {
      const e = exp.title.toLowerCase().trim();
      const g = got.title.toLowerCase().trim();
      const d = distance(e, g) / ((e.length + g.length) / 2);
      if (d < bestScore) {
        bestScore = d;
        // bestIndex = i
      }
    }

    const threshold = 0.2;
    if (bestScore < threshold) {
      return new DataCorrect(got.title);
    }
    return new DataIncorrect({
      got: got.title,
      expected: expected.map(e => e.title),
    });
  } catch (e) {
    return new JsonSyntaxError(data);
  }
}

export default new Experiment(
  name,
  description,
  resultSchema,
  runTrial,
  validateTrial,
  [promptGen]
);
