import Experiment, {
  ExpVars,
  ExpVarsFixedPrompt,
  ExperimentData,
  GenericExpTypes,
  Prompt,
  TrialResult,
  TurnPrompt,
} from "../../experiment";
import {
  DataCorrect,
  DataIncomplete,
  DataIncorrect,
  DataPartiallyIncorrect,
  NonUsableData,
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
    const pairs = getRandom(vars.dpart.data, sampleSize).map(
      ({ term1, term2 }) => [term1, term2] as [string, string]
    );
    return {
      id: `${name}-${vars.dpart.id}-prompt`,
      language: "en" as const,
      jobType: "allPairs" as const,
      pairs,
      turns: [
        {
          pairs,
          text:
            `A published semantic measure gold standard dataset is composed of ${numberOfPairs} pairs of concepts and their semantic ${vars.dpart.measureType} score as reported by humans. ` +
            `I only have ${sampleSize} of the pairs included in the dataset. Please give me a list of ${askSize} other pairs of concepts belonging to the same dataset but not included on my list.\n` +
            pairs.map(([term1, term2]) => `${term1} ${term2}`).join("\n"),
        },
      ],
    };
  },
};
export interface SFSExpTypes extends GenericExpTypes {
  Data: Static<typeof query.responseSchema>;
  Evaluation: Static<typeof query.responseSchema>;
  DataSchema: typeof query.responseSchema;
}

async function runTrial(
  this: Experiment<SFSExpTypes>,
  vars: ExpVars | ExpVarsFixedPrompt,
  toolSchema: ToolSchema,
  maxRetries: number = 3
): Promise<TrialResult<SFSExpTypes["Data"]>> {
  const tool = {
    name: "evaluate_sample",
    description: "evaluates the pairs sampled from the dataset.",
    schema: toolSchema,
  };

  const prompt =
    "generate" in vars.prompt ? vars.prompt.generate(vars) : vars.prompt;
  logger.debug(`  ❓ Prompt ${prompt.id}`);

  const res = await this.iterateConversation(
    { ...vars, prompt },
    tool,
    maxRetries
  );
  return res;
}

async function evaluateTrial(
  this: Experiment<SFSExpTypes>,
  dpart: DsPartition,
  got: { data: SFSExpTypes["Data"]; prompt: TurnPrompt }[]
) {
  const expectedDict: { [word: string]: { [word: string]: boolean } } = {};
  const gotDict: { [word: string]: { [word: string]: boolean } } = {};
  const askedDict: { [word: string]: { [word: string]: boolean } } = {};
  const expectedPairs = got.flatMap(({ prompt }) => prompt.pairs);

  for (const [term1, term2] of expectedPairs) {
    const w1 = term1.toLowerCase();
    const w2 = term2.toLowerCase();
    askedDict[w1] = askedDict[w1] || {};
    askedDict[w1][w2] = true;
    askedDict[w2] = askedDict[w2] || {};
    askedDict[w2][w1] = true;
  }

  for (const { term1, term2 } of dpart.data) {
    const w1 = term1.toLowerCase();
    const w2 = term2.toLowerCase();

    expectedDict[w1] = expectedDict[w1] || {};
    expectedDict[w1][w2] = true;
    expectedDict[w2] = expectedDict[w2] || {};
    expectedDict[w2][w1] = true;
  }

  let correctPairs = 0;
  let validPairs = 0;
  let foundWrongPair = false;

  const gotPairs = got.flatMap(({ data }) => data.pairs);
  for (const [term1, term2] of gotPairs) {
    const w1 = term1.toLowerCase();
    const w2 = term2.toLowerCase();

    // pair  belongs to asked pairs
    if (askedDict[w1]?.[w2] || askedDict[w2]?.[w1]) {
      continue;
    }
    // pair is repeated
    if (gotDict[w1]?.[w2] || gotDict[w2]?.[w1]) {
      continue;
    }
    validPairs++;

    gotDict[w1] = gotDict[w1] || {};
    gotDict[w1][w2] = true;

    if (expectedDict[w1]?.[w2] || expectedDict[w2]?.[w1]) {
      correctPairs++;
    } else {
      foundWrongPair = true;
    }
  }

  const baseLine = Math.max(validPairs, askSize);
  const expected: SFSExpTypes["Data"] = {
    pairs: Object.keys(expectedDict).flatMap(w1 =>
      Object.keys(expectedDict[w1]).map(w2 => [w1, w2] as [string, string])
    ),
  };

  if (validPairs === 0) {
    return new NonUsableData({ pairs: gotPairs }, expected);
  }
  if (correctPairs === 0) {
    return new DataIncorrect({ pairs: gotPairs }, expected);
  }
  if (foundWrongPair) {
    return new DataPartiallyIncorrect(
      correctPairs / baseLine,
      { pairs: gotPairs },
      expected
    );
  }
  if (correctPairs < baseLine) {
    return new DataIncomplete(
      correctPairs / baseLine,
      { pairs: gotPairs },
      expected
    );
  }
  return new DataCorrect({ pairs: gotPairs }, expected);
}

function expDataToExpScore(
  this: Experiment<SFSExpTypes>,
  data: ExperimentData<SFSExpTypes>
) {
  return {
    variables: data.variables,
    score: data.results.aggregated!.okDataAvg,
  };
}

export default new Experiment<SFSExpTypes>(
  name,
  description,
  query,
  runTrial,
  evaluateTrial,
  { expDataToExpScore, prompts: [promptGen] }
);
