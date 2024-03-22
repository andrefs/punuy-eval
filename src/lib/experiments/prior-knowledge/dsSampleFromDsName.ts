import Experiment, { ExpVars, ExpVarsFixedPrompt, Prompt } from "../experiment";
import { DatasetProfile } from "../../types";
import {
  DataCorrect,
  DataIncomplete,
  DataIncorrect,
  DataPartiallyIncorrect,
  JsonSyntaxError,
  NoData,
} from "../../validation";

const name = "ds-sample-from-ds-name";
const description =
  "Check if LLM knows a dataset by asking it to list 5 pairs included in the dataset";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    const year = vars.dataset.metadata.date.split("-")[0];
    const measureTypes = vars.dataset.metadata.measureTypes.join(" and ");
    return {
      id: `${name}-prompt`,
      type: vars.dataset.metadata.measureTypes[0],
      language: "en" as const,
      text:
        `${vars.dataset.metadata.name} is a gold standard dataset published in ${year}. ` +
        `It is composed of pairs of concepts and their semantic ${measureTypes} score as reported by humans, ` +
        `and can be used to evaluate semantic measures. ` +
        `Please list 5 pairs of concepts sampled from this dataset.`,
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
};

async function runTrial(
  vars: ExpVarsFixedPrompt,
  schema: any // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  const f = {
    name: "validate_sample",
    description: "Validates the pairs sampled from the dataset.",
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
    const expected: { [word: string]: { [word: string]: boolean } } = {};

    for (const { term1, term2 } of ds.partitions[0].data) {
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
      return new DataPartiallyIncorrect(i / 5, got);
    }
    if (i < 5) {
      return new DataIncomplete(i / 5, got);
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
  validateTrial,
  [promptGen]
);
