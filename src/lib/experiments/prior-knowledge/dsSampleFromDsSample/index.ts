import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  GenericExpTypes,
  Prompt,
  TrialResult,
} from "../../experiment";
import {
  DataCorrect,
  DataIncomplete,
  DataIncorrect,
  DataPartiallyIncorrect,
  ValidData,
} from "../../../evaluation";
import { DsPartition } from "../../../dataset-adapters/DsPartition";
import { Static } from "@sinclair/typebox";
import { ToolSchema } from "src/lib/models";
import query from "./query";

const name = "ds-sample-from-ds-sample";
const description =
  "Check if LLM knows a dataset by giving it 10 pairs and asking for 5 more.";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    const numberOfPairs = vars.dpart.data.length;
    return {
      id: `${name}-${vars.dpart.id}-prompt`,
      language: "en" as const,
      text:
        `A published semantic measure gold standard dataset is composed of ${numberOfPairs} pairs of concepts and their semantic ${vars.dpart.measureType} score as reported by humans. ` +
        `I only have 10 of the pairs included in the dataset. Please give me a list of 5 other pairs of concepts belonging to the same dataset but not included in my list.\n` +
        vars.dpart.data
          .slice(0, 10)
          .map(({ term1, term2 }) => `${term1} ${term2}`)
          .join("\n"),
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
  const tool = {
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
    return new DataPartiallyIncorrect(i / 5, got, expected);
  }
  if (i < 5) {
    return new DataIncomplete(i / 5, got, expected);
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
