import Experiment, { ExpVars, ExpVarsFixedPrompt, Prompt } from "../experiment";
import {
  DataCorrect,
  DataIncomplete,
  DataIncorrect,
  DataPartiallyIncorrect,
  JsonSchemaError,
  JsonSyntaxError,
  NoData,
} from "../../evaluation";
import Ajv, { JSONSchemaType } from "ajv";
import { DsPartition } from "../../dataset-adapters/DsPartition";
const ajv = new Ajv();

const numPairs = 5;

const name = "ds-sample-from-ds-name";
const description =
  "Check if LLM knows a dataset by asking it to list 5 pairs included in the dataset";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    const year = vars.dpart.dataset.metadata.date.substring(0, 4);
    const measureTypes = vars.dpart.measureType;
    return {
      id: `${name}-prompt`,
      type: vars.dpart.measureType,
      language: "en" as const,
      text:
        `${vars.dpart.dataset.metadata.name} is a gold standard dataset published in ${year}. ` +
        `It is composed of pairs of concepts and their semantic ${measureTypes} score as reported by humans, ` +
        `and can be used to evaluate semantic measures. ` +
        `Please list ${numPairs} pairs of concepts sampled from this dataset.`,
    };
  },
};
const resultSchema = {
  type: "object",
  properties: {
    pairs: {
      type: "array",
      items: {
        type: "array",
        items: {
          type: "string",
        },
      },
    },
  },
  required: ["pairs"],
};

type ResultSchema = JSONSchemaType<typeof resultSchema>;

const validateSchema = ajv.compile<ResultSchema>(resultSchema);

async function runTrial(
  vars: ExpVarsFixedPrompt,
  schema: any // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  const f = {
    name: "evaluate_sample",
    description: "evaluates the pairs sampled from the dataset.",
    schema,
  };

  const result = await vars.model.makeRequest(vars.prompt.text, {
    function: f,
  });
  return result;
}

async function evaluateTrial(dpart: DsPartition, data: string) {
  if (!data.trim()) {
    return new NoData();
  }
  try {
    const got = JSON.parse(data);
    if (!validateSchema(got)) {
      return new JsonSchemaError(data);
    }
    const expected: { [word: string]: { [word: string]: boolean } } = {};

    for (const { term1, term2 } of dpart.data) {
      const w1 = term1.toLowerCase();
      const w2 = term2.toLowerCase();

      expected[w1] = expected[w1] || {};
      expected[w1][w2] = true;
      expected[w2] = expected[w2] || {};
      expected[w2][w1] = true;
    }
    let i = 0;
    let dataIncorrect = false;
    for (const [term1, term2] of got.pairs) {
      const w1 = term1.toLowerCase();
      const w2 = term2.toLowerCase();

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
      return new DataPartiallyIncorrect(i / numPairs, got);
    }
    if (i < numPairs) {
      return new DataIncomplete(i / numPairs, got);
    }
    return new DataCorrect(got);
  } catch (e) {
    return new JsonSyntaxError(data);
  }
}

export default new Experiment(
  name,
  description,
  resultSchema,
  runTrial,
  evaluateTrial,
  [promptGen]
);
