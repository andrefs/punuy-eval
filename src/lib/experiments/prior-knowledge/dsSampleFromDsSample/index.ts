import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  ExperimentData,
  GenericExpTypes,
  Prompt,
  TrialResult,
} from "../../experiment";
import {
  DataCorrect,
  DataIncomplete,
  DataIncorrect,
  DataPartiallyIncorrect,
} from "../../../evaluation";
import { DsPartition } from "../../../dataset-partitions/DsPartition";
import { Static } from "@sinclair/typebox";
import { ToolSchema } from "src/lib/models";
import query from "./query";
import logger from "src/lib/logger";
import { getRandom } from "src/lib/utils";

const sampleSize = 10;
const askSize = 5;

const name = "ds-sample-from-ds-sample";
const description =
  "Check if LLM knows a dataset by giving it 10 pairs and asking for 5 more. Ignore word case and pair word order.";
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
        `I only have ${sampleSize} of the pairs included in the dataset. Please give me a list of ${askSize} other pairs of concepts belonging to the same dataset but not included on my list.\n` +
        getRandom(vars.dpart.data, sampleSize)
          .map(({ term1, term2 }) => `${term1} ${term2}`)
          .join("\n"),
    };
  },
};
export interface ExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  Evaluation: Static<typeof query.responseSchema>;
  DataSchema: typeof query.responseSchema;
}

async function runTrial(
  this: Experiment<ExpTypes>,
  vars: ExpVars | ExpVarsFixedPrompt,
  toolSchema: ToolSchema,
  maxRetries: number = 3
): Promise<TrialResult<ExpTypes["Data"]>> {
  const tool = {
    name: "evaluate_sample",
    description: "evaluates the pairs sampled from the dataset.",
    schema: toolSchema,
  };

  const prompt =
    "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;
  logger.debug(`Prompt (${prompt.id}): ${prompt.text}`);

  const res = await this.getResponse({ ...vars, prompt }, tool, maxRetries);
  return res;
}

async function evaluateTrial(dpart: DsPartition, got: ExpTypes["Data"]) {
  const expectedDict: { [word: string]: { [word: string]: boolean } } = {};
  const gotDict: { [word: string]: { [word: string]: boolean } } = {};

  const baseLine = Math.max(got.pairs.length, askSize);
  for (const { term1, term2 } of dpart.data) {
    const w1 = term1.toLowerCase();
    const w2 = term2.toLowerCase();

    expectedDict[w1] = expectedDict[w1] || {};
    expectedDict[w1][w2] = true;
    expectedDict[w2] = expectedDict[w2] || {};
    expectedDict[w2][w1] = true;
  }
  let i = 0;
  let foundWrongPair = false;
  for (const [term1, term2] of got.pairs) {
    const w1 = term1.toLowerCase();
    const w2 = term2.toLowerCase();

    // pair is repeated
    if (gotDict[w1]?.[w2] || gotDict[w2]?.[w1]) {
      continue;
    }
    gotDict[w1] = gotDict[w1] || {};
    gotDict[w1][w2] = true;

    if (expectedDict[w1]?.[w2] || expectedDict[w2]?.[w1]) {
      i++;
    } else {
      foundWrongPair = true;
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
  if (foundWrongPair) {
    return new DataPartiallyIncorrect(i / baseLine, got, expected);
  }
  if (i < baseLine) {
    return new DataIncomplete(i / baseLine, got, expected);
  }
  return new DataCorrect(got, expected);
}

function expDataToExpScore(
  this: Experiment<ExpTypes>,
  data: ExperimentData<ExpTypes>
) {
  return {
    variables: data.variables,
    score: data.results.aggregated!.avg,
  };
}

export default new Experiment(
  name,
  description,
  query,
  runTrial,
  evaluateTrial,
  expDataToExpScore,
  [promptGen]
);
