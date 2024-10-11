import {
  ExpVars,
  ExpVarsFixedPrompt,
  ExperimentData,
  GenericExpTypes,
  Prompt,
  TrialResult,
} from "../../experiment/types";
import {
  DataCorrect,
  DataIncomplete,
  DataIncorrect,
  DataPartiallyIncorrect,
} from "src/lib/evaluation";
import { DsPartition } from "src/lib/dataset-partitions/DsPartition";
import { Static } from "@sinclair/typebox";
import query from "./query";
import { ModelTool, ToolSchema } from "src/lib/models/model";
import Experiment from "../../experiment";
import logger from "src/lib/logger";

const numPairs = 5;

const name = "ds-sample-from-ds-name";
const description =
  "Check if LLM knows a dataset by asking it to list 5 pairs included in the dataset. Ignore word case and pair word order.";
const promptGen = {
  id: `${name}-prompt`,
  language: "en" as const,
  generate: (vars: Omit<ExpVars, "prompt">): Prompt => {
    const year = vars.dpart.dataset.metadata.date.substring(0, 4);
    const measureTypes = vars.dpart.measureType;
    return {
      id: `${name}-prompt`,
      measureType: vars.dpart.measureType,
      language: "en" as const,
      text:
        `${vars.dpart.dataset.metadata.name} is a gold standard dataset published in ${year}. ` +
        `It is composed of pairs of concepts and their semantic ${measureTypes} score as reported by humans, ` +
        `and can be used to evaluate semantic measures. ` +
        `Please list ${numPairs} pairs of concepts sampled from this dataset.`,
    };
  },
};

interface SFNExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  Evaluation: Static<typeof query.responseSchema>;
  DataSchema: typeof query.responseSchema;
}

async function runTrial(
  this: Experiment<SFNExpTypes>,
  vars: ExpVars | ExpVarsFixedPrompt,
  toolSchema: ToolSchema,
  maxRetries: number = 3
): Promise<TrialResult<SFNExpTypes["Data"]>> {
  const tool: ModelTool = {
    name: "evaluate_sample",
    description: "evaluates the pairs sampled from the dataset.",
    schema: toolSchema,
  };
  const prompt =
    "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;
  logger.debug(`Prompt (${prompt.id}): ${prompt.text}`);

  const res = await this.getTurnResponse({ ...vars, prompt }, tool, maxRetries);
  return res;
}

async function evaluateTrial(
  this: Experiment<SFNExpTypes>,
  dpart: DsPartition,
  prompt: Prompt,
  got: SFNExpTypes["Data"]
) {
  const expectedDict: { [word: string]: { [word: string]: boolean } } = {};
  const gotDict: { [word: string]: { [word: string]: boolean } } = {};

  const baseLine = Math.max(got.pairs.length, numPairs);
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

  const expected: SFNExpTypes["Data"] = {
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
  this: Experiment<SFNExpTypes>,
  data: ExperimentData<SFNExpTypes>
) {
  return {
    variables: data.variables,
    score: data.results.aggregated!.okDataAvg,
  };
}

export default new Experiment(
  name,
  description,
  query,
  runTrial,
  evaluateTrial,
  {
    expDataToExpScore,
    prompts: [promptGen],
  }
);
