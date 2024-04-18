import {
  ExpVars,
  ExpVarsFixedPrompt,
  GenericExpTypes,
  Prompt,
  TrialResult,
} from "../../experiment/types";
import {
  DataCorrect,
  DataIncomplete,
  DataIncorrect,
  DataPartiallyIncorrect,
  ValidData,
} from "../../../evaluation";
import { DsPartition } from "src/lib/dataset-adapters/DsPartition";
import { Static } from "@sinclair/typebox";
import query from "./query";
import { ModelTool, ToolSchema } from "src/lib/models";
import Experiment from "../../experiment";

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

interface ExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  Evaluation: Static<typeof query.responseSchema>;
  DataSchema: typeof query.responseSchema;
}

async function runTrial(
  this: Experiment<ExpTypes>,
  vars: ExpVarsFixedPrompt,
  toolSchema: ToolSchema,
  maxRetries: number = 3
): Promise<TrialResult<ExpTypes["Data"]>> {
  const tool: ModelTool = {
    name: "evaluate_sample",
    description: "evaluates the pairs sampled from the dataset.",
    schema: toolSchema,
  };

  const res = await this.getResponse(vars, tool, maxRetries);
  return res;
}

async function evaluateTrial(dpart: DsPartition, got: ExpTypes["Data"]) {
  const expectedDict: { [word: string]: { [word: string]: boolean } } = {};

  for (const { term1, term2 } of dpart.data) {
    const w1 = term1.toLowerCase();
    const w2 = term2.toLowerCase();

    expectedDict[w1] = expectedDict[w1] || {};
    expectedDict[w1][w2] = true;
    expectedDict[w2] = expectedDict[w2] || {};
    expectedDict[w2][w1] = true;
  }
  let i = 0;
  let dataIncorrect = false;
  for (const [term1, term2] of got.pairs) {
    const w1 = term1.toLowerCase();
    const w2 = term2.toLowerCase();

    if (expectedDict[w1]?.[w2] || expectedDict[w2]?.[w1]) {
      i++;
      expectedDict[w1][w2] = false;
      expectedDict[w2][w1] = false;
    } else {
      dataIncorrect = true;
    }
  }

  const expected: ExpTypes["Data"] = {
    pairs: Object.keys(expectedDict).flatMap(w1 =>
      Object.keys(expectedDict[w1]).map(w2 => [w1, w2] as [string, string])
    ),
  };
  if (i === 0) {
    return new DataIncorrect(got, expected);
  }
  if (dataIncorrect) {
    return new DataPartiallyIncorrect(i / numPairs, got, expected);
  }
  if (i < numPairs) {
    return new DataIncomplete(i / numPairs, got, expected);
  }
  return new DataCorrect(got, expected);
}

export default new Experiment(
  name,
  description,
  query,
  runTrial,
  evaluateTrial,
  [promptGen]
);
